"""Bounded research checks, not an operational terrain/visibility service.
Run with Python 3.11+, rasterio, pyproj and numpy; see REPORT.md.
"""

import hashlib
import json
import math
import platform
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, cast

# pi-lens-ignore: reportMissingImports
import numpy as np

# pi-lens-ignore: reportMissingImports
import pyproj

# pi-lens-ignore: reportMissingImports
import rasterio

# pi-lens-ignore: reportMissingImports
from rasterio.windows import Window as RasterWindow

# Rasterio's attrs-generated Window constructor is not inferred by Pyright.
Window = cast(Any, RasterWindow)

OUT = Path(__file__).parent
R = 1737400.0
PROJ = pyproj.Proj(proj="stere", lat_0=-90, lon_0=0, k=1, R=R, units="m")
BASE = "https://pgda.gsfc.nasa.gov/data/"
SITES = [
    ("Site06", -85.4381, 37.36667),
    ("DM2", -83.954, 58.82206),
    ("Site04", -89.7668, -171.87),
]
ENV: dict[str, Any] = {
    "GDAL_DISABLE_READDIR_ON_OPEN": "EMPTY_DIR",
    "CPL_VSIL_CURL_ALLOWED_EXTENSIONS": ".tif,.TIF",
    "GDAL_HTTP_TIMEOUT": "45",
    "GDAL_HTTP_MAX_RETRY": "1",
}
result: dict[str, Any] = {
    "retrievedUtc": datetime.now(UTC).isoformat(),
    "versions": {
        "python": platform.python_version(),
        "rasterio": rasterio.__version__,
        "gdal": rasterio.__gdal_version__,
        "pyproj": pyproj.__version__,
        "proj": pyproj.proj_version_str,
        "numpy": np.__version__,
    },
    "samples": [],
    "failures": [],
}


def save():
    (OUT / "results.json").write_text(
        json.dumps(result, indent=2, allow_nan=False) + "\n", encoding="utf-8"
    )


def archive(ds, window, name, url):
    data = ds.read(1, window=window, masked=True)
    path = OUT / (name + ".tif")
    profile = {
        "driver": "GTiff",
        "width": data.shape[1],
        "height": data.shape[0],
        "count": 1,
        "dtype": data.dtype,
        "crs": ds.crs,
        "transform": ds.window_transform(window),
        "nodata": ds.nodata,
        "compress": "deflate",
    }
    with rasterio.open(path, "w", **profile) as target:
        target.write(data.filled(np.nan), 1)
    return data, {
        "sourceUrl": url,
        "sourceDimensions": [ds.width, ds.height],
        "sourceTransform": list(ds.transform),
        "sourceCrs": ds.crs.to_wkt(),
        "window": list(window.flatten()),
        "artifact": path.name,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "note": "Decoded/re-encoded window, not original TIFF byte ranges or a complete source-file hash.",
    }


def bilinear(data, transform, x, y):
    col, row = (~transform) * (x, y)
    col, row = np.asarray(col) - 0.5, np.asarray(row) - 0.5
    c, r = np.floor(col).astype(int), np.floor(row).astype(int)
    if (
        np.any(c < 0)
        or np.any(r < 0)
        or np.any(c + 1 >= data.shape[1])
        or np.any(r + 1 >= data.shape[0])
    ):
        raise ValueError("Interpolation outside retained window")
    fx, fy = col - c, row - r
    return (data[r, c] * (1 - fx) + data[r, c + 1] * fx) * (1 - fy) + (
        data[r + 1, c] * (1 - fx) + data[r + 1, c + 1] * fx
    ) * fy


def destinations(lat, lon, az, distances):
    p, longitude, a = np.radians([lat, lon, az])
    c = distances / R
    p2 = np.arcsin(np.sin(p) * np.cos(c) + np.cos(p) * np.sin(c) * np.cos(a))
    l2 = longitude + np.arctan2(
        np.sin(a) * np.sin(c) * np.cos(p), np.cos(c) - np.sin(p) * np.sin(p2)
    )
    return np.degrees(l2), np.degrees(p2)


def profiles(data, transform, lat, lon):
    x, y = PROJ(lon, lat)
    ground = float(bilinear(data, transform, x, y))
    records = []
    for body, az, radius in [
        ("sun", 83.301542163, 1941.825 / 7200),
        ("earth", 320.816667632, 6492.343 / 7200),
    ]:
        for offset in [-radius, 0, radius]:
            for step in [5.0, 2.5, 1.25]:
                d = np.arange(step, 5000.0 + step / 2, step)
                lo, la = destinations(lat, lon, az + offset, d)
                xx, yy = PROJ(lo, la)
                heights = bilinear(data, transform, xx, yy)
                angles = np.degrees(
                    np.arctan2(
                        (R + heights) * np.cos(d / R) - (R + ground + 2),
                        (R + heights) * np.sin(d / R),
                    )
                )
                valid = np.isfinite(angles) & ~np.ma.getmaskarray(angles)
                if not np.all(valid):
                    raise ValueError("Missing samples in near-field profile")
                index = int(np.argmax(angles))
                record = {
                    "body": body,
                    "azimuthDeg": az + offset,
                    "stepM": step,
                    "samples": len(d),
                    "missing": 0,
                    "maxAngleDeg": float(angles[index]),
                    "distanceM": float(d[index]),
                    "heightM": float(heights[index]),
                    "groundM": ground,
                    "radialObserverHeightM": 2,
                }
                records.append(record)
                if step == 1.25:
                    name = f"profile-{body}-{offset:.6f}.csv"
                    np.savetxt(
                        OUT / name,
                        np.column_stack([d, heights, angles]),
                        delimiter=",",
                        header="distance_m,terrain_height_m,terrain_angle_deg",
                        comments="",
                    )
    return records


with rasterio.Env(**ENV):
    for site, lat, lon in SITES:
        x, y = PROJ(lon, lat)
        rho = 2 * R * math.tan(math.pi / 4 + math.radians(lat) / 2)
        entry: dict[str, Any] = {
            "site": site,
            "latitudeDeg": lat,
            "longitudeEastDeg": lon,
            "xM": x,
            "yM": y,
            "projectionResidualM": math.hypot(
                x - rho * math.sin(math.radians(lon)),
                y - rho * math.cos(math.radians(lon)),
            ),
            "layers": {},
        }
        result["samples"].append(entry)
        for layer in ["surf", "slp", "toterr", "slperr", "ldec"]:
            url = f"{BASE}LOLA_5mpp/{site}/{site}_final_adj_5mpp_{layer}.tif"
            try:
                with rasterio.open("/vsicurl/" + url) as ds:
                    col_float, row_float = (~ds.transform) * (x, y)
                    row, col = math.floor(row_float), math.floor(col_float)
                    window = Window(col_off=col - 2, row_off=row - 2, width=5, height=5)
                    data, meta = archive(ds, window, f"{site}-{layer}", url)
                    value = data[2, 2]
                    if np.ma.is_masked(value) or not np.isfinite(value):
                        raise ValueError("Invalid containing cell")
                    entry["layers"][layer] = dict(
                        containingValue=float(value), row=row, col=col, **meta
                    )
                    if layer == "surf":
                        entry["bilinearM"] = float(
                            bilinear(data, ds.window_transform(window), x, y)
                        )
                print(
                    site, layer, entry["layers"][layer]["containingValue"], flush=True
                )
            except Exception as exc:
                result["failures"].append(
                    {"stage": f"{site}-{layer}", "error": str(exc)}
                )
            save()
    # A bounded 10.4 km square supports all six near-field rays to 5 km.
    url = f"{BASE}LOLA_5mpp/Site06/Site06_final_adj_5mpp_surf.tif"
    try:
        with rasterio.open("/vsicurl/" + url) as ds:
            x, y = PROJ(37.36667, -85.4381)
            col_float, row_float = (~ds.transform) * (x, y)
            row, col = math.floor(row_float), math.floor(col_float)
            window = Window(
                col_off=col - 1040, row_off=row - 1040, width=2081, height=2081
            )
            data, meta = archive(ds, window, "Site06-near-field", url)
            result["nearField"] = meta
            result["profiles"] = profiles(
                data, ds.window_transform(window), -85.4381, 37.36667
            )
            # Ridge check uses the independent reader and projection, not old cached bytes.
            rx, ry = PROJ(36.40708, -85.34185)
            result["ridgeLocalM"] = float(
                bilinear(data, ds.window_transform(window), rx, ry)
            )
    except Exception as exc:
        result["failures"].append({"stage": "near-field", "error": str(exc)})
    save()
    url = f"{BASE}LOLA_20mpp/LDEM_80S_20MPP_ADJ.TIF"
    try:
        with rasterio.open("/vsicurl/" + url) as ds:
            rx, ry = PROJ(36.40708, -85.34185)
            col_float, row_float = (~ds.transform) * (rx, ry)
            row, col = math.floor(row_float), math.floor(col_float)
            window = Window(col_off=col - 2, row_off=row - 2, width=5, height=5)
            data, meta = archive(ds, window, "ridge-regional", url)
            result["ridgeRegional"] = {
                **meta,
                "bilinearM": float(bilinear(data, ds.window_transform(window), rx, ry)),
            }
    except Exception as exc:
        result["failures"].append({"stage": "regional-ridge", "error": str(exc)})
    save()

# Analytic sensitivity checks, not physical error bounds.
result["geometry"] = {
    "arc400kmDeg": math.degrees(400000 / R),
    "meridianHaloFrom80SDeg": -80 + math.degrees(400000 / R),
    "sphereHorizonAt2mDeg": -math.degrees(math.acos(R / (R + 2))),
    "oneMeterDifferentialHeightAngleApproxDeg": {
        str(d): math.degrees(math.atan2(1, d)) for d in [10, 100, 1000, 10000]
    },
    "terrainHeightAt400kmForHorizontalRayM": (R + 5948.899465547409)
    / math.cos(400000 / R)
    - R,
    "terrainHeightAt400kmForMinus3_8795DegRayM": (R + 5948.899465547409)
    / (math.cos(400000 / R) - math.tan(math.radians(-3.8795)) * math.sin(400000 / R))
    - R,
}
save()
print(
    json.dumps(
        {
            "failures": result["failures"],
            "profiles": result.get("profiles"),
            "geometry": result["geometry"],
        },
        indent=2,
    )
)
