"""Verify retained windows and analytic geometry without network access."""

import hashlib
import json
import math
from pathlib import Path

# pi-lens-ignore: reportMissingImports
import numpy as np

# pi-lens-ignore: reportMissingImports
import pyproj

# pi-lens-ignore: reportMissingImports
import rasterio

ROOT = Path(__file__).parent
R = 1737400.0
record = json.loads((ROOT / "results.json").read_text(encoding="utf-8"))
checks = []


def check(name, condition):
    if not condition:
        raise AssertionError(name)
    checks.append(name)


site = record["samples"][0]
elevation = None
heights = None
for layer in ["surf", "slp"]:
    meta = site["layers"][layer]
    path = ROOT / meta["artifact"]
    check(
        f"{layer}: SHA256",
        hashlib.sha256(path.read_bytes()).hexdigest() == meta["sha256"],
    )
    with rasterio.open(path) as ds:
        values = ds.read(1, masked=True)
        check(
            f"{layer}: finite window",
            not np.any(values.mask) and bool(np.all(np.isfinite(values))),
        )
        check(
            f"{layer}: containing cell", float(values[2, 2]) == meta["containingValue"]
        )
        if layer == "surf":
            # Promote before scalar arithmetic: NumPy 2 keeps float32 scalars.
            values = values.astype(np.float64)
            heights = values.copy()
            transform = ds.transform
            inverse = pyproj.Proj(ds.crs)
            col, row = (~transform) * inverse(37.36667, -85.4381)
            col, row = col - 0.5, row - 0.5
            c, r = math.floor(col), math.floor(row)
            fx, fy = col - c, row - r
            elevation = float(
                (values[r, c] * (1 - fx) + values[r, c + 1] * fx) * (1 - fy)
                + (values[r + 1, c] * (1 - fx) + values[r + 1, c + 1] * fx) * fy
            )
            check(
                "bilinear vs previous audit", abs(elevation - 5946.899465547409) < 1e-7
            )

assert elevation is not None and heights is not None

# Test the projection across a synthetic polar domain, not just one coordinate.
projection = pyproj.Proj(proj="stere", lat_0=-90, lon_0=0, k=1, R=R, units="m")
max_residual = 0.0
for lat in [-90, -89.9, -87, -85, -83, -80, -75, -60]:
    for lon in range(-180, 181, 15):
        x, y = projection(lon, lat)
        rho = 2 * R * math.tan(math.pi / 4 + math.radians(lat) / 2)
        residual = math.hypot(
            x - rho * math.sin(math.radians(lon)), y - rho * math.cos(math.radians(lon))
        )
        max_residual = max(max_residual, residual)
check("PROJ vs analytic stereographic: 200 cases", max_residual < 1e-7)


def angle(distance, terrain_height, observer_height):
    theta = distance / R
    return math.degrees(
        math.atan2(
            (R + terrain_height) * math.cos(theta) - (R + observer_height),
            (R + terrain_height) * math.sin(theta),
        )
    )


# The smooth-sphere tangent is a synthetic oracle, not a real lunar skyline.
tangent_distance = R * math.acos(R / (R + 2))
tangent_angle = -math.degrees(math.acos(R / (R + 2)))
check(
    "smooth-sphere tangent", abs(angle(tangent_distance, 0, 2) - tangent_angle) < 1e-9
)

# A planar synthetic ridge catches sign and degree/radian errors.
check("100 m high at 1 km is above horizontal", angle(1000, 100, 2) > 5)
check("sphere below tangent plane", angle(1000, 0, 2) < 0)
check(
    "raising observer lowers obstruction angle",
    angle(1000, 100, 12) < angle(1000, 100, 2),
)

# Rounded ridge coordinate calculation: heights inherited from the audit.
lat1, lon1, lat2, lon2 = map(math.radians, [-85.4381, 37.36667, -85.34185, 36.40708])
dlon = lon2 - lon1
central = 2 * math.asin(
    math.sqrt(
        math.sin((lat2 - lat1) / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    )
)
bearing = (
    math.degrees(
        math.atan2(
            math.sin(dlon) * math.cos(lat2),
            math.cos(lat1) * math.sin(lat2)
            - math.sin(lat1) * math.cos(lat2) * math.cos(dlon),
        )
    )
    % 360
)
ridge_angle = angle(R * central, 6384.412975779019, elevation + 2)
check("inherited ridge geometry", abs(ridge_angle - 6.55719074) < 1e-5)

summary = {
    "passedChecks": checks,
    "projectionCases": 200,
    "maxProjectionResidualM": max_residual,
    "bilinearGroundM": elevation,
    "retained25mWindow": {
        "minimumCellHeightM": float(heights.min()),
        "maximumCellHeightM": float(heights.max()),
        "rangeM": float(heights.max() - heights.min()),
        "note": "5 by 5 cell values, 5 m spacing; not a continuous-surface bound or a centered circular neighborhood.",
    },
    "ridgeUsingInheritedHeight": {
        "distanceM": R * central,
        "bearingDeg": bearing,
        "angleDeg": ridge_angle,
        "heightSource": "LUNAR_RELIABILITY_AUDIT.md section 4.5; NOT freshly read ridge terrain",
    },
    "conditionalFarTerrainBound": {
        "distanceM": 400000,
        "assumedMaximumTerrainHeightM": 12000,
        "observerAltitudeM": elevation + 2,
        "maximumAngleAtCutoffDeg": angle(400000, 12000, elevation + 2),
        "condition": "Illustration only: 12000 m is an assumed cap, not an established bound for this dataset or unresolved terrain. If rMax >= rObserver and terrain is bounded by rMax, its upper angle decreases with central angle from cutoff to antipode.",
    },
    "unverified": "Full profiles, physical accuracy, whole-cap terrain validity, uncertainty propagation and disk visibility remain unverified.",
}
(ROOT / "offline-checks.json").write_text(
    json.dumps(summary, indent=2) + "\n", encoding="utf-8"
)
print(json.dumps(summary, indent=2))
