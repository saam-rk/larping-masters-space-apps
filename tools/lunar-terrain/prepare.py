"""Prepare pixel-center terrain samples outside Blender; never synthesize nodata.

The output is an intermediate NPZ and a provenance sidecar, not a GLB.
Run build_blender.py through Blender (or its MCP) to construct the actual mesh.
"""

import argparse
import hashlib
import json
import platform
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, cast

# These packages run in the isolated environment from requirements.txt, not the app LSP interpreter.
# pi-lens-ignore: reportMissingImports
import numpy as np

# pi-lens-ignore: reportMissingImports
import pyproj

# pi-lens-ignore: reportMissingImports
import rasterio

# pi-lens-ignore: reportMissingImports
import scipy

# pi-lens-ignore: reportMissingImports
from rasterio.windows import Window as RasterWindow

# pi-lens-ignore: reportMissingImports
from scipy.spatial import Delaunay

# Rasterio's attrs-generated constructor is not inferred by Pyright (as in the existing research tooling).
Window = cast(Any, RasterWindow)


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write_json(path, value):
    Path(path).write_text(json.dumps(value, indent=2, allow_nan=False) + "\n", encoding="utf-8")


def bilinear(data, transform, x, y):
    """Interpolate four pixel centers; reject missing support and outer half-pixels."""
    col, row = (~transform) * (x, y)
    col, row = col - 0.5, row - 0.5
    c, r = int(np.floor(col)), int(np.floor(row))
    if c < 0 or r < 0 or c + 1 >= data.shape[1] or r + 1 >= data.shape[0]:
        raise ValueError("Coordinate outside pixel-center interpolation domain")
    patch = data[r:r + 2, c:c + 2].astype(np.float64)
    if not np.isfinite(patch).all():
        raise ValueError("Missing terrain support")
    fx, fy = col - c, row - r
    return float(patch[0, 0] * (1-fx) * (1-fy) + patch[0, 1] * fx * (1-fy)
                 + patch[1, 0] * (1-fx) * fy + patch[1, 1] * fx * fy)


def supported_faces(points, faces, valid):
    """Conservative hole preservation: every pixel in each triangle's box must be valid.

    This may enlarge holes; it cannot bridge one. Report the resulting mesh area.
    """
    integral = np.pad((~valid).astype(np.int64), ((1, 0), (1, 0))).cumsum(0).cumsum(1)
    boxes = points[faces]
    lo, hi = boxes.min(axis=1), boxes.max(axis=1) + 1
    x0, y0 = lo.T
    x1, y1 = hi.T
    missing = integral[y1, x1] - integral[y0, x1] - integral[y1, x0] + integral[y0, x0]
    return missing == 0


def sample_triangulation(tri, heights, queries):
    simplex = tri.find_simplex(queries)
    inside = simplex >= 0
    values = np.full(len(queries), np.nan)
    transforms = tri.transform[simplex[inside]]
    weights = np.einsum("ijk,ik->ij", transforms[:, :2], queries[inside] - transforms[:, 2])
    weights = np.column_stack((weights, 1 - weights.sum(axis=1)))
    values[inside] = np.sum(heights[tri.simplices[simplex[inside]]] * weights, axis=1)
    return values, simplex


def prepare(config_path, source_path, output, reference_window=None):
    try:
        config = json.loads(Path(config_path).read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise ValueError(f"Cannot read terrain config: {config_path}") from exc
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    with rasterio.open(source_path) as ds:
        crs = pyproj.CRS(ds.crs)
        projection = pyproj.Proj(crs)
        expected = pyproj.Proj(proj="stere", lat_0=-90, lon_0=0, k=1,
                               R=config["referenceRadiusM"], units="m")
        # The TIFF uses standard-parallel stereographic, PROJ uses scale-at-pole;
        # these are equivalent here but CRS.equals rejects their differing encodings.
        operation, ellipsoid = crs.coordinate_operation, crs.ellipsoid
        assert operation is not None and ellipsoid is not None
        assert "Polar Stereographic" in operation.method_name
        assert ellipsoid.semi_major_metre == config["referenceRadiusM"]
        assert ellipsoid.semi_minor_metre == config["referenceRadiusM"]
        for lon, lat in [(0, -90), (0, -85), (90, -85), (-120, -88)]:
            assert np.allclose(projection(lon, lat), expected(lon, lat), rtol=0, atol=1e-6), "Unexpected projection"
        assert ds.res == (5.0, 5.0), "This pipeline requires the documented 5 m source grid"
        assert ds.transform.b == ds.transform.d == 0 and ds.transform.e < 0
        assert ds.scales == (1.0,) and ds.offsets == (0.0,) and ds.count == 1
        assert ds.nodata is not None and np.isnan(ds.nodata), "Expected NaN nodata"
        cx, cy = config["cropCenterProjectedM"]
        width, height = config["cropSizeM"]
        col, row = (~ds.transform) * (cx - width / 2, cy + height / 2)
        dimensions = [col, row, width / 5, height / 5]
        assert all(abs(v - round(v)) < 1e-6 for v in dimensions), "Align crop edges to pixels"
        col, row, cols, rows = (int(round(v)) for v in dimensions)
        assert col >= 0 and row >= 0 and col + cols <= ds.width and row + rows <= ds.height
        window = Window(col, row, cols, rows)
        transform = ds.window_transform(window)
        data = ds.read(1, window=window, masked=True).filled(np.nan)
        valid = np.isfinite(data)
        assert valid.any(), "No valid source samples in crop"
        source_meta = {
            "provider": "NASA GSFC / LRO LOLA / PGDA product 78",
            "product": Path(source_path).name,
            "url": config["sourceUrl"], "catalogUrl": config["sourceCatalogUrl"],
            "readmeUrl": config["sourceReadmeUrl"],
            "citation": "Barker et al. (2021), Planetary and Space Science 203, 105119",
            "doi": "https://doi.org/10.1016/j.pss.2020.105119",
            "version": "No explicit product version in TIFF; identified by filename and SHA-256",
            "sha256": sha256(source_path), "bytes": Path(source_path).stat().st_size,
            "dimensions": [ds.width, ds.height], "affine": list(ds.transform)[:6],
            "wkt": ds.crs.to_wkt(), "rasterResolutionM": list(ds.res),
            "nodata": "NaN", "dtype": ds.dtypes[0], "scale": ds.scales[0],
            "offset": ds.offsets[0], "registration": "pixel centers; affine maps pixel corners",
            "tags": ds.tags(),
        }
    reference = None
    if reference_window:
        with rasterio.open(reference_window) as small, rasterio.open(source_path) as full:
            c, r = (~full.transform) * (small.transform.c, small.transform.f)
            extracted = full.read(1, window=Window(int(round(c)), int(round(r)), small.width, small.height))
            assert small.crs == full.crs
            assert np.array_equal(extracted, small.read(1), equal_nan=True), "Historical window mismatch"
            reference = {"path": Path(reference_window).as_posix(), "sha256": sha256(reference_window),
                         "dimensions": [small.width, small.height], "exactSampleMatch": True}

    controls = []
    anchors = []
    for name in ("site", "ridge", "third"):
        point = config[name]
        x, y = projection(point["longitudeEastDeg"], point["latitudeDeg"])
        z = bilinear(data, transform, x, y)
        controls.append({"name": name, **point, "projectedM": [x, y], "rasterBilinearM": z})
        # Protect the four source samples around site/ridge; keep third as a holdout.
        if name != "third":
            c, r = (~transform) * (x, y)
            c, r = int(np.floor(c - 0.5)), int(np.floor(r - 0.5))
            anchors.extend([(c, r), (c + 1, r), (c, r + 1), (c + 1, r + 1)])
    base = config["baseStridePixels"]
    cc, rr = np.meshgrid(np.unique(np.r_[np.arange(0, cols, base), cols - 1]),
                         np.unique(np.r_[np.arange(0, rows, base), rows - 1]))
    selected = np.zeros(data.shape, dtype=bool)
    selected[rr, cc] = valid[rr, cc]
    for c, r in anchors:
        selected[r, c] = True
    # Optional camera-led support: retain every measured grid sample near the
    # initial view, then relax the seed spacing in bands with distance.
    detail = config.get("nearDetail")
    if detail:
        dcx, dcy = detail["centerProjectedM"]
        xx = transform.c + (np.arange(cols) + 0.5) * 5
        yy = transform.f - (np.arange(rows) + 0.5) * 5
        distance = np.hypot(xx[None, :] - dcx, yy[:, None] - dcy)
        grid_r, grid_c = np.indices(data.shape)
        for radius, step in detail["seedBandsRadiusMStridePixels"]:
            selected |= (distance <= radius) & (grid_r % step == 0) & (grid_c % step == 0) & valid
    stride = config["candidateStridePixels"]
    cc, rr = np.meshgrid(np.arange(0, cols, stride), np.arange(0, rows, stride))
    candidates = np.column_stack([cc.ravel(), rr.ravel()])
    candidates = candidates[valid[candidates[:, 1], candidates[:, 0]]]
    target = config["targetVertices"]
    assert 0 < selected.sum() < target < 65535
    assert len(candidates) + selected.sum() >= target
    x = transform.c + (candidates[:, 0] + 0.5) * 5
    y = transform.f - (candidates[:, 1] + 0.5) * 5
    ridge_x, ridge_y = controls[1]["projectedM"]
    distance2 = (x - ridge_x)**2 + (y - ridge_y)**2
    priority = 1 + (config["ridgePriorityMultiplier"] - 1) * np.exp(
        -distance2 / (2 * config["ridgePriorityRadiusM"]**2))
    if detail:
        dcx, dcy = detail["centerProjectedM"]
        distance = np.hypot(x - dcx, y - dcy)
        priority *= 1 + detail["residualPriorityBoost"] * np.exp(
            -distance**2 / (2 * detail["residualPriorityRadiusM"]**2))
    history = []
    while selected.sum() < target:
        r, c = np.nonzero(selected)
        points = np.column_stack((c, r))
        tri = Delaunay(points)
        predicted, simplex = sample_triangulation(tri, data[r, c], candidates)
        residual = np.abs(predicted - data[candidates[:, 1], candidates[:, 0]])
        score = np.nan_to_num(residual, nan=0.0) * priority
        # High error identifies slope breaks; ridge weighting preserves its shape preferentially.
        score[selected[candidates[:, 1], candidates[:, 0]]] = -np.inf
        if not valid.all():
            support = supported_faces(points, tri.simplices, valid)
            score[(simplex < 0) | ~support[np.maximum(simplex, 0)]] = -np.inf
        available = np.flatnonzero(np.isfinite(score))
        count = min(config["refinementBatchSize"], target - int(selected.sum()), len(available))
        if count == 0:
            raise ValueError("Not enough supported candidates for requested vertex target")
        order = available[np.argsort(-score[available], kind="stable")[:count]]
        selected[candidates[order, 1], candidates[order, 0]] = True
        history.append({"verticesBefore": len(points), "added": count,
                        "candidateMaxErrorM": float(np.nanmax(residual))})
        print(history[-1], flush=True)
    r, c = np.nonzero(selected)
    points = np.column_stack((c, r))
    tri = Delaunay(points)
    keep = supported_faces(points, tri.simplices, valid)
    faces = tri.simplices[keep][:, [0, 2, 1]]  # Row-down becomes Y-up: reverse winding.
    used, inverse = np.unique(faces, return_inverse=True)
    faces = inverse.reshape(-1, 3).astype(np.uint32)
    points = points[used]
    ox, oy, oz = config["originProjectedM"]
    vertices = np.column_stack((transform.c + (points[:, 0] + 0.5) * 5 - ox,
                                transform.f - (points[:, 1] + 0.5) * 5 - oy,
                                data[points[:, 1], points[:, 0]] - oz)).astype(np.float32)
    np.savez_compressed(output / "mesh-input.npz", vertices=vertices, faces=faces)
    face_points = vertices[faces].astype(np.float64)
    edges1, edges2 = face_points[:, 1] - face_points[:, 0], face_points[:, 2] - face_points[:, 0]
    areas = np.cross(edges1, edges2)[:, 2] / 2
    assert (areas > 0).all(), "Invalid orientation or degenerate triangle"
    center_bounds = [transform.c + 2.5, transform.f - height + 2.5,
                     transform.c + width - 2.5, transform.f - 2.5]
    metadata = {
        "schemaVersion": 1, "id": config["id"], "generatedUtc": datetime.now(UTC).isoformat(),
        "source": source_meta, "historicalWindowCheck": reference,
        "frame": {"name": config["frame"], "evidence": config["sourceReadmeUrl"],
                  "note": "Frame realization comes from NASA README, not the generic TIFF datum name. No frame transformation performed.",
                  "latitude": "planetocentric degrees, north positive", "longitude": "degrees, east positive"},
        "crs": {"proj": expected.srs, "referenceRadiusM": config["referenceRadiusM"],
                "projection": "south polar stereographic", "latitudeOriginDeg": -90,
                "centralMeridianDeg": 0, "scaleAtPole": 1, "falseEastingM": 0, "falseNorthingM": 0},
        "units": "meters", "vertical": {"scale": 1, "reference": "radial elevation above 1737400 m lunar sphere",
            "evidence": "docs/LUNAR_SOUTH_POLE_RESEARCH.md and its LOLA elevation-definition references",
            "model": "Projected height field, not body-fixed Cartesian or true local ENU. Lunar curvature is not embedded."},
        "origin": {"projectedXM": ox, "projectedYM": oy, "radialElevationM": oz},
        "axes": {"blender": ["X = projected X - origin X", "Y = projected Y - origin Y", "Z = height - origin height"],
                 "glb": ["X = projected X - origin X", "Y = height - origin height", "Z = -(projected Y - origin Y)"],
                 "note": "Projection grid directions are NOT geographic east/north at this longitude. Do not align ephemeris azimuths directly."},
        "markerTransform": {"projection": "rho = 2*R*tan(pi/4 + latitudeRadians/2); X = rho*sin(longitudeRadians); Y = rho*cos(longitudeRadians)",
            "position": "[X-originX, meshHeight-originHeight+heightAboveMeshM, -(Y-originY)]",
            "heightMethod": "Downward ray intersection with exported GLB triangles; barycentric height, not nearest vertex",
            "validity": "Reject outside mesh center bounds or without a triangle hit. No extrapolation, no site-ID restriction.",
            "implementation": "tools/lunar-terrain/marker.mjs"},
        "coverage": {"cropPixelOuterBoundsM": [transform.c, transform.f-height, transform.c+width, transform.f],
            "meshPixelCenterBoundsM": center_bounds, "boundsOrder": "minX,minY,maxX,maxY",
            "sourceWindow": [col, row, cols, rows], "cropAffine": list(transform)[:6],
            "validPixels": int(valid.sum()), "totalPixels": int(valid.size),
            "validPixelFraction": float(valid.mean()), "sourceNodataPixels": int((~valid).sum()),
            "meshProjectedAreaM2": float(areas.sum()),
            "meshCenterRectangleFraction": float(areas.sum() / ((width-5)*(height-5))),
            "removedUnsupportedTriangles": int((~keep).sum()),
            "validityRepresentation": "Union of exported triangles is authoritative; crop rectangle alone is not a validity test.",
            "nodataPolicy": "Reject triangle if its source-pixel bounding box contains any missing value; conservative holes, never zero-fill.",
            "outerEdgePolicy": "Surface stops at outer pixel centers, 2.5 m inside raster crop edges. Half-pixel border is unsupported."},
        "generation": {"config": config, "algorithm": "Deterministic Delaunay adaptive residual refinement at source pixel centers; ridge-weighted error; protected site/ridge support samples",
            "refinementHistory": history, "vertices": len(vertices), "triangles": len(faces),
            "compression": "none", "exportAttributes": ["POSITION", "NORMAL"],
            "versions": {"python": platform.python_version(), "numpy": np.__version__,
                "rasterio": rasterio.__version__, "gdal": rasterio.__gdal_version__,
                "pyproj": pyproj.__version__, "proj": pyproj.proj_version_str, "scipy": scipy.__version__}},
        "controlPoints": controls,
        "limitations": ["Visualization asset, not a landing, power, radio-link or terrain-horizon certification.",
            "5 m sample spacing is not effective resolution; NASA reports extensive interpolation (~90%).",
            "No count/error layers used for this mesh; valid elevation does not mean direct LOLA observation.",
            "Planar map view omits lunar curvature; use body-fixed geometry for physical sight-line calculations.",
            "Manual coordinates must share the documented frame. No ME/PA or IAU_MOON conversion is supplied.",
            "Illustrative Blender light is not an ephemeris-derived Sun position."],
        "performance": {"coldLoadTargetSeconds": 2, "orbitTargetFps": 60, "orbitMinimumFps": 50,
            "status": "pending", "device": None, "browser": None, "network": None,
            "reason": "No mobile device/network performance test performed; asset size is not latency/FPS evidence."},
    }
    write_json(output / f'{config["id"]}.metadata.json', metadata)
    print(json.dumps({"vertices": len(vertices), "triangles": len(faces), "coverage": metadata["coverage"], "controls": controls}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--reference-window", type=Path)
    args = parser.parse_args()
    prepare(args.config, args.source, args.output, args.reference_window)
