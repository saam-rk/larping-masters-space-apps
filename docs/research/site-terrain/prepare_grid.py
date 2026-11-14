"""Step 1: crop a polar-stereographic elevation GeoTIFF around a site and
prepare a regular vertex grid for Blender.

Runs outside Blender in a research environment with rasterio, pyproj and
numpy (see requirements.txt). Writes into ``--out-dir``:

- ``<site>.grid.npz``: vertex grid (local meters, NaN for missing samples)
  and the quad validity mask consumed by ``blender_build_scene.py``.
- ``<site>.prep.json``: raster inspection, crop bounds, local frame, marker
  positions and the mesh-simplification analysis.

Usage:
    python prepare_grid.py --config sites/nobile-rim-1.json \
        --raster /path/to/Site06_final_adj_5mpp_surf.tif --out-dir nobile-rim-1
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import platform
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

# pi-lens-ignore: reportMissingImports
import numpy as np

# pi-lens-ignore: reportMissingImports
import pyproj

# pi-lens-ignore: reportMissingImports
import rasterio

from terrain_common import (
    grid_bearing_of_north_deg,
    mesh_height,
    polar_stereographic_scale_factor,
    raster_bilinear,
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def check_crs(crs: Any) -> dict[str, Any]:
    """Require a spherical south-polar stereographic CRS and report its parameters."""
    params = crs.to_dict()
    expected = {"proj": "stere", "lat_0": -90}
    for key, value in expected.items():
        if params.get(key) != value:
            raise ValueError(f"Unexpected CRS parameter {key}={params.get(key)!r}")
    for key in ("x_0", "y_0"):
        if float(params.get(key, 0)) != 0:
            raise ValueError(f"Non-zero false offset {key}")
    if "R" not in params:
        raise ValueError("CRS is not defined on a sphere (no R parameter)")
    return params


def silhouette_profiles(
    sample, origin_xy, observer_z, target_bearing_deg, cfg, max_distance_m
):
    """Maximum terrain elevation angle seen from the observer per grid bearing.

    Planar grid-space geometry (no lunar curvature, grid distances); used only
    to compare the simplified mesh with the source raster in the same geometry.
    """
    half = cfg["azimuthHalfWidthDeg"]
    step = cfg["azimuthStepDeg"]
    bearings = np.arange(-half, half + step / 2, step) + target_bearing_deg
    distances = np.arange(cfg["radialStepM"], max_distance_m, cfg["radialStepM"])
    angles = []
    for bearing in bearings:
        rad = math.radians(bearing)
        xs = origin_xy[0] + distances * math.sin(rad)
        ys = origin_xy[1] + distances * math.cos(rad)
        heights = sample(xs, ys)
        elevation = np.degrees(np.arctan2(heights - observer_z, distances))
        index = int(np.nanargmax(elevation))
        angles.append(
            (
                float(elevation[index]),
                float(distances[index]),
                float(heights[index]),
            )
        )
    return bearings, angles


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Crop an elevation GeoTIFF and prepare a Blender vertex grid."
    )
    parser.add_argument("--config", required=True, type=Path)
    parser.add_argument("--raster", required=True, type=Path)
    parser.add_argument("--out-dir", required=True, type=Path)
    args = parser.parse_args()

    try:
        cfg = json.loads(args.config.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"Cannot read site config {args.config}: {exc}") from exc
    site_id = cfg["siteId"]
    args.out_dir.mkdir(parents=True, exist_ok=True)

    with rasterio.open(args.raster) as ds:
        crs_params = check_crs(ds.crs)
        if ds.count != 1:
            raise ValueError("Expected a single-band elevation raster")
        transform = ds.transform
        if transform.b != 0 or transform.d != 0:
            raise ValueError("Rotated rasters are not supported")
        res_x, res_y = transform.a, -transform.e
        if res_x <= 0 or res_y <= 0 or not math.isclose(res_x, res_y):
            raise ValueError("Expected square north-up pixels")
        res = float(res_x)
        full = ds.read(1, masked=False).astype(np.float64)
        nodata = ds.nodata
        inspection = {
            "file": args.raster.name,
            "sha256": sha256_file(args.raster),
            "bytes": args.raster.stat().st_size,
            "driver": ds.driver,
            "dtype": ds.dtypes[0],
            "width": ds.width,
            "height": ds.height,
            "tiled": bool(ds.profile.get("tiled", False)),
            "compression": str(ds.compression) if ds.compression else None,
            "nodata": "NaN" if nodata is not None and math.isnan(nodata) else nodata,
            "crsWkt": ds.crs.to_wkt(),
            "crsProj4": ds.crs.to_proj4(),
            "crsParameters": crs_params,
            "transformGdal": list(transform.to_gdal()),
            "boundsM": list(ds.bounds),
            "cellSizeM": res,
            "areaOrPoint": ds.tags().get("AREA_OR_POINT"),
            "gmtNodeOffset": ds.tags().get("NC_GLOBAL#node_offset"),
            "gmtHistory": ds.tags().get("NC_GLOBAL#history"),
        }
    if nodata is not None and not math.isnan(nodata):
        full[full == nodata] = np.nan
    inspection["missingSamplesInFile"] = int(np.isnan(full).sum())
    inspection["elevationRangeM"] = [float(np.nanmin(full)), float(np.nanmax(full))]

    radius = float(crs_params["R"])
    proj = pyproj.Proj(
        proj="stere", lat_0=-90, lat_ts=-90, lon_0=crs_params.get("lon_0", 0), R=radius
    )
    inv = ~transform

    def project(lat: float, lon: float) -> tuple[float, float]:
        x, y = proj(lon, lat)
        return float(x), float(y)

    def source_at(xs, ys):
        return raster_bilinear(full, transform, xs, ys)

    # Site and its containing cell.
    site_x, site_y = project(cfg["latitudeDeg"], cfg["longitudeEastDeg"])
    col_f, row_f = inv * (site_x, site_y)
    site_col, site_row = math.floor(col_f), math.floor(row_f)
    if not (0 <= site_col < full.shape[1] and 0 <= site_row < full.shape[0]):
        raise ValueError("Site is outside the raster")
    site_cell = float(full[site_row, site_col])
    site_bilinear = float(source_at(np.array([site_x]), np.array([site_y]))[0])
    if not math.isfinite(site_cell) or not math.isfinite(site_bilinear):
        raise ValueError("Site falls on missing data")

    # Vertex grid on source pixel centers, centered on the site's containing pixel.
    step = int(cfg["mesh"]["stepPixels"])
    n_half = math.ceil(cfg["crop"]["halfSizeM"] / (res * step))
    span = n_half * step
    r0, r1 = site_row - span, site_row + span
    c0, c1 = site_col - span, site_col + span
    if r0 < 0 or c0 < 0 or r1 >= full.shape[0] or c1 >= full.shape[1]:
        raise ValueError("Requested crop extends beyond the raster; reduce halfSizeM")
    window = full[r0 : r1 + 1, c0 : c1 + 1]

    origin = {
        "x": float(round(site_x)),
        "y": float(round(site_y)),
        "z": float(round(site_bilinear)),
    }

    def center_x(col):
        return transform.c + (np.asarray(col) + 0.5) * res

    def center_y(row):
        return transform.f - (np.asarray(row) + 0.5) * res

    rows = np.arange(r0, r1 + 1, step)
    cols = np.arange(c0, c1 + 1, step)
    xs_world = center_x(cols)
    ys_world = center_y(rows)
    z_world = full[np.ix_(rows, cols)]
    vertex_valid = np.isfinite(z_world)

    # A quad is kept only if every source pixel in its footprint is valid, so
    # simplification never bridges a missing-data gap.
    invalid_pixels = ~np.isfinite(window)
    nq = 2 * n_half
    blocks = invalid_pixels[: nq * step, : nq * step].reshape(nq, step, nq, step)
    block_invalid = blocks.any(axis=(1, 3))
    # Include the closing row/column of each footprint (shared edge pixels).
    edge_rows = (
        invalid_pixels[step::step, : nq * step].reshape(nq, nq, step).any(axis=2)
    )
    edge_cols = (
        invalid_pixels[: nq * step, step::step].reshape(nq, step, nq).any(axis=1)
    )
    corner = invalid_pixels[step::step, step::step]
    quad_valid = ~(block_invalid | edge_rows | edge_cols | corner)
    quad_valid &= (
        vertex_valid[:-1, :-1]
        & vertex_valid[1:, :-1]
        & vertex_valid[:-1, 1:]
        & vertex_valid[1:, 1:]
    )

    np.savez_compressed(
        args.out_dir / f"{site_id}.grid.npz",
        x_local=(xs_world - origin["x"]).astype(np.float64),
        y_local=(ys_world - origin["y"]).astype(np.float64),
        z_local=(z_world - origin["z"]).astype(np.float32),
        quad_valid=quad_valid,
    )

    # Points of interest: projected, local and source heights.
    def describe_point(pid, name, lat, lon, source):
        x, y = project(lat, lon)
        inside = bool(
            xs_world[0] <= x <= xs_world[-1] and ys_world[-1] <= y <= ys_world[0]
        )
        cf, rf = inv * (x, y)
        cell = full[math.floor(rf), math.floor(cf)]
        bil = float(source_at(np.array([x]), np.array([y]))[0])
        return {
            "id": pid,
            "name": name,
            "latitudeDeg": lat,
            "longitudeEastDeg": lon,
            "source": source,
            "projectedXM": x,
            "projectedYM": y,
            "containingCell": {"row": math.floor(rf), "col": math.floor(cf)},
            "containingCellElevationM": float(cell),
            "sourceBilinearElevationM": bil,
            "insideMeshExtent": inside,
            "blenderLocalM": [x - origin["x"], y - origin["y"], bil - origin["z"]],
            "gltfLocalM": [x - origin["x"], bil - origin["z"], -(y - origin["y"])],
            "distanceFromSiteGridM": math.hypot(x - site_x, y - site_y),
            "gridBearingFromSiteDeg": math.degrees(math.atan2(x - site_x, y - site_y))
            % 360,
        }

    points = {
        "site": describe_point(
            "site",
            cfg["siteName"],
            cfg["latitudeDeg"],
            cfg["longitudeEastDeg"],
            cfg["siteSource"],
        )
    }
    for ref in cfg.get("referencePoints", []):
        points[ref["id"]] = describe_point(
            ref["id"],
            ref["name"],
            ref["latitudeDeg"],
            ref["longitudeEastDeg"],
            ref["source"],
        )
    for chk in cfg.get("checkPoints", []):
        if chk.get("use"):
            continue
        points[chk["id"]] = describe_point(
            chk["id"],
            chk["name"],
            chk["latitudeDeg"],
            chk["longitudeEastDeg"],
            chk["source"],
        )
    for pid, point in points.items():
        if not point["insideMeshExtent"]:
            raise ValueError(
                f"Point {pid} is outside the mesh extent; enlarge the crop"
            )

    # Crop coverage expressed in projected and geographic coordinates.
    corners_xy = [
        (xs_world[0], ys_world[0]),
        (xs_world[-1], ys_world[0]),
        (xs_world[-1], ys_world[-1]),
        (xs_world[0], ys_world[-1]),
    ]
    corners = []
    for x, y in corners_xy:
        lon, lat = proj(x, y, inverse=True)
        corners.append(
            {
                "xM": float(x),
                "yM": float(y),
                "latitudeDeg": lat,
                "longitudeEastDeg": lon,
            }
        )
    # Dense boundary for geographic min/max (edges are not lat/lon lines).
    t = np.linspace(0, 1, 401)
    bx = np.concatenate(
        [
            xs_world[0] + t * (xs_world[-1] - xs_world[0]),
            np.full_like(t, xs_world[-1]),
            xs_world[-1] - t * (xs_world[-1] - xs_world[0]),
            np.full_like(t, xs_world[0]),
        ]
    )
    by = np.concatenate(
        [
            np.full_like(t, ys_world[0]),
            ys_world[0] - t * (ys_world[0] - ys_world[-1]),
            np.full_like(t, ys_world[-1]),
            ys_world[-1] + t * (ys_world[0] - ys_world[-1]),
        ]
    )
    blon, blat = proj(bx, by, inverse=True)

    # Simplification analysis for candidate steps, against every source pixel
    # center inside the mesh extent (same extent for all steps that divide span).
    full_rows = np.arange(r0, r1 + 1)
    full_cols = np.arange(c0, c1 + 1)
    gx, gy = np.meshgrid(center_x(full_cols), center_y(full_rows))
    source_vals = full[r0 : r1 + 1, c0 : c1 + 1]

    site_xy = (site_x, site_y)
    observer_z = site_bilinear + cfg["silhouette"]["observerHeightM"]
    target = points[cfg["silhouette"]["targetPoint"]]
    target_bearing = target["gridBearingFromSiteDeg"]
    # Stay inside the vertex extent in every direction of the fan.
    max_distance = (
        min(
            site_x - xs_world[0],
            xs_world[-1] - site_x,
            ys_world[0] - site_y,
            site_y - ys_world[-1],
        )
        - res
    )
    max_distance_target = None
    # Extend toward the target as far as the extent allows along the fan.
    bearings_probe = np.radians(
        np.array([-1, 0, 1]) * cfg["silhouette"]["azimuthHalfWidthDeg"] + target_bearing
    )
    limits = []
    for b in bearings_probe:
        dx, dy = math.sin(b), math.cos(b)
        lim = []
        if dx > 1e-12:
            lim.append((xs_world[-1] - site_x) / dx)
        if dx < -1e-12:
            lim.append((xs_world[0] - site_x) / dx)
        if dy > 1e-12:
            lim.append((ys_world[0] - site_y) / dy)
        if dy < -1e-12:
            lim.append((ys_world[-1] - site_y) / dy)
        limits.append(min(lim))
    max_distance_target = max(max_distance, min(limits) - res)

    src_bearings, src_sil = silhouette_profiles(
        source_at,
        site_xy,
        observer_z,
        target_bearing,
        cfg["silhouette"],
        max_distance_target,
    )

    analysis = []
    for s in sorted(set(cfg["mesh"].get("analyzeStepsPixels", [])) | {step}):
        if span % s:
            analysis.append(
                {"stepPixels": s, "skipped": "step does not divide the crop span"}
            )
            continue
        rr = np.arange(r0, r1 + 1, s)
        cc = np.arange(c0, c1 + 1, s)
        vx, vy = center_x(cc), center_y(rr)
        vz = full[np.ix_(rr, cc)]

        def mesh_at(xq, yq, vx=vx, vy=vy, vz=vz):
            return mesh_height(vx, vy, vz, xq, yq)

        diff = mesh_at(gx, gy) - source_vals
        absd = np.abs(diff[np.isfinite(diff)])
        _, mesh_sil = silhouette_profiles(
            mesh_at,
            site_xy,
            observer_z,
            target_bearing,
            cfg["silhouette"],
            max_distance_target,
        )
        ang_diff = np.array(
            [m[0] - o[0] for m, o in zip(mesh_sil, src_sil, strict=True)]
        )
        center_idx = int(np.argmin(np.abs(src_bearings - target_bearing)))
        nverts = len(rr) * len(cc)
        ntris = 2 * (len(rr) - 1) * (len(cc) - 1)
        analysis.append(
            {
                "stepPixels": s,
                "vertexSpacingM": s * res,
                "vertices": nverts,
                "triangles": ntris,
                "estimatedGlbBytesPositionsNormalsUint32Indices": nverts * 24
                + ntris * 12,
                "elevationErrorVsSourcePixelsM": {
                    "comparedPixels": int(absd.size),
                    "mean": float(diff[np.isfinite(diff)].mean()),
                    "rms": float(np.sqrt(np.mean(absd**2))),
                    "p95Abs": float(np.percentile(absd, 95)),
                    "p99Abs": float(np.percentile(absd, 99)),
                    "maxAbs": float(absd.max()),
                },
                "ridgeSilhouette": {
                    "maxAbsElevationAngleDiffDeg": float(np.abs(ang_diff).max()),
                    "meanElevationAngleDiffDeg": float(ang_diff.mean()),
                    "targetBearingAngleDiffDeg": float(ang_diff[center_idx]),
                    "targetBearingMeshAngleDeg": mesh_sil[center_idx][0],
                    "targetBearingMeshHorizonDistanceM": mesh_sil[center_idx][1],
                },
            }
        )

    scale_k = polar_stereographic_scale_factor(cfg["latitudeDeg"])
    center_idx = int(np.argmin(np.abs(src_bearings - target_bearing)))
    prep = {
        "generatedUtc": datetime.now(UTC).isoformat(),
        "versions": {
            "python": platform.python_version(),
            "rasterio": rasterio.__version__,
            "gdal": rasterio.__gdal_version__,
            "pyproj": pyproj.__version__,
            "proj": pyproj.proj_version_str,
            "numpy": np.__version__,
        },
        "config": cfg,
        "rasterInspection": inspection,
        "sphereRadiusM": radius,
        "siteProjection": {
            "projectedXM": site_x,
            "projectedYM": site_y,
            "containingCell": {"row": site_row, "col": site_col},
            "containingCellElevationM": site_cell,
            "sourceBilinearElevationM": site_bilinear,
        },
        "localOrigin": {
            "projectedXM": origin["x"],
            "projectedYM": origin["y"],
            "elevationM": origin["z"],
            "rule": "Site projected X/Y and source bilinear elevation rounded to whole meters",
        },
        "crop": {
            "requestedHalfSizeM": cfg["crop"]["halfSizeM"],
            "sourceWindow": {
                "rowOff": int(r0),
                "colOff": int(c0),
                "height": int(r1 - r0 + 1),
                "width": int(c1 - c0 + 1),
            },
            "sourcePixelEdgeBoundsM": {
                "xMin": float(center_x(c0) - res / 2),
                "xMax": float(center_x(c1) + res / 2),
                "yMin": float(center_y(r1) - res / 2),
                "yMax": float(center_y(r0) + res / 2),
            },
            "meshVertexExtentM": {
                "xMin": float(xs_world[0]),
                "xMax": float(xs_world[-1]),
                "yMin": float(ys_world[-1]),
                "yMax": float(ys_world[0]),
            },
            "meshVertexExtentLocalM": {
                "xMin": float(xs_world[0] - origin["x"]),
                "xMax": float(xs_world[-1] - origin["x"]),
                "yMin": float(ys_world[-1] - origin["y"]),
                "yMax": float(ys_world[0] - origin["y"]),
            },
            "cornersGeographic": corners,
            "geographicEnvelope": {
                "latitudeMinDeg": float(np.min(blat)),
                "latitudeMaxDeg": float(np.max(blat)),
                "longitudeMinEastDeg": float(np.min(blon)),
                "longitudeMaxEastDeg": float(np.max(blon)),
                "note": "Envelope of the projected square; the square itself is the coverage, not this lat/lon box.",
            },
            "missingSourcePixelsInWindow": int(invalid_pixels.sum()),
            "validQuads": int(quad_valid.sum()),
            "totalQuads": int(quad_valid.size),
            "windowElevationRangeM": [
                float(np.nanmin(window)),
                float(np.nanmax(window)),
            ],
        },
        "grid": {
            "stepPixels": step,
            "vertexSpacingM": step * res,
            "rows": len(rows),
            "cols": len(cols),
            "vertexValid": int(vertex_valid.sum()),
            "vertexSampling": "Exact source values at every step-th source pixel center (no averaging)",
            "triangulation": "Each quad split along the diagonal from its north-west vertex to its south-east vertex (grid axes)",
        },
        "points": points,
        "localGeometry": {
            "polarStereographicScaleFactorAtSite": scale_k,
            "gridBearingOfGeographicNorthAtSiteDeg": grid_bearing_of_north_deg(
                cfg["longitudeEastDeg"]
            ),
            "sphereDropAtHalfSizeM": cfg["crop"]["halfSizeM"] ** 2 / (2 * radius),
        },
        "silhouetteSource": {
            "observerElevationM": observer_z,
            "targetGridBearingDeg": target_bearing,
            "maxDistanceM": max_distance_target,
            "targetBearingSourceAngleDeg": src_sil[center_idx][0],
            "targetBearingSourceHorizonDistanceM": src_sil[center_idx][1],
            "targetBearingSourceHorizonHeightM": src_sil[center_idx][2],
            "method": "Planar grid-space rays from the site at +observerHeight; source bilinear sampled every radialStepM; maximum atan2(dz, grid distance). Compares mesh and source in identical geometry only; not a lunar horizon calculation.",
        },
        "simplificationAnalysis": analysis,
    }
    (args.out_dir / f"{site_id}.prep.json").write_text(
        json.dumps(prep, indent=2, allow_nan=False) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {k: prep[k] for k in ("siteProjection", "localOrigin", "crop", "grid")},
            indent=2,
        )
    )
    for item in analysis:
        print(json.dumps(item))


if __name__ == "__main__":
    main()
