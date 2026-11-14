"""Step 4: verify the exported GLB against the source GeoTIFF and write the
site metadata.

Reads the GLB with a minimal independent parser (no Blender), checks axes,
scale, vertex positions, triangulation and heights, and compares surface
heights at the configured check points with the source raster. Writes:

- ``<site>.verification.json``: every check and difference in meters.
- ``<site>.metadata.json``: source, frame, CRS, units, origin, axes,
  coverage, resolution/simplification and marker-placement transform.

Usage:
    python verify_and_write_metadata.py --prep nobile-rim-1/nobile-rim-1.prep.json \
        --grid nobile-rim-1/nobile-rim-1.grid.npz --glb nobile-rim-1/nobile-rim-1.glb \
        --raster /path/to/Site06_final_adj_5mpp_surf.tif \
        --reimport nobile-rim-1/nobile-rim-1.reimport.json \
        --build nobile-rim-1/nobile-rim-1.blender-build.json \
        --blend nobile-rim-1/nobile-rim-1.blend
"""

from __future__ import annotations

import argparse
import hashlib
import json
import struct
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

# pi-lens-ignore: reportMissingImports
import numpy as np

# pi-lens-ignore: reportMissingImports
import rasterio

from terrain_common import mesh_height, raster_bilinear

COMPONENT = {5121: np.uint8, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
WIDTH = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}


def read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"Cannot read {path}: {exc}") from exc


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_glb(path: Path):
    blob = path.read_bytes()
    magic, version, length = struct.unpack_from("<4sII", blob, 0)
    if magic != b"glTF" or version != 2 or length != len(blob):
        raise ValueError("Not a valid glTF 2.0 binary")
    offset, doc, binary = 12, None, None
    while offset < length:
        chunk_len, chunk_type = struct.unpack_from("<II", blob, offset)
        data = blob[offset + 8 : offset + 8 + chunk_len]
        if chunk_type == 0x4E4F534A:
            doc = json.loads(data.decode("utf-8"))
        elif chunk_type == 0x004E4942:
            binary = data
        offset += 8 + chunk_len
    if doc is None or binary is None:
        raise ValueError("GLB lacks a JSON or BIN chunk")

    def accessor(index):
        acc = doc["accessors"][index]
        view = doc["bufferViews"][acc["bufferView"]]
        dtype = np.dtype(COMPONENT[acc["componentType"]])
        width = WIDTH[acc["type"]]
        start = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
        stride = view.get("byteStride")
        if stride and stride != dtype.itemsize * width:
            raise ValueError("Interleaved buffers are not supported by this checker")
        arr = np.frombuffer(
            binary, dtype=dtype, count=acc["count"] * width, offset=start
        )
        return arr.reshape(acc["count"], width) if width > 1 else arr, acc

    return doc, accessor


def triangle_heights(pos_xyz, tris, qx, qy):
    """Exact barycentric height of the GLB surface at grid points (qx, qy).

    Works directly on GLB triangles: grid x = glTF x, grid y = -glTF z,
    height = glTF y. Brute force over all triangles per point.
    """
    gx = pos_xyz[:, 0].astype(np.float64)
    gy = -pos_xyz[:, 2].astype(np.float64)
    gh = pos_xyz[:, 1].astype(np.float64)
    a, b, c = tris[:, 0], tris[:, 1], tris[:, 2]
    out = []
    for x, y in zip(qx, qy, strict=True):
        x0, y0 = gx[a], gy[a]
        d1x, d1y = gx[b] - x0, gy[b] - y0
        d2x, d2y = gx[c] - x0, gy[c] - y0
        det = d1x * d2y - d2x * d1y
        px, py = x - x0, y - y0
        u = (px * d2y - d2x * py) / det
        v = (d1x * py - px * d1y) / det
        inside = (u >= -1e-9) & (v >= -1e-9) & (u + v <= 1 + 1e-9)
        hits = np.nonzero(inside)[0]
        if hits.size == 0:
            out.append({"triangleCount": 0, "heightLocalM": None})
            continue
        heights = (
            gh[a[hits]]
            + u[hits] * (gh[b[hits]] - gh[a[hits]])
            + v[hits] * (gh[c[hits]] - gh[a[hits]])
        )
        out.append(
            {
                "triangleCount": int(hits.size),
                "heightLocalM": float(heights[0]),
                "spreadAcrossHitTrianglesM": float(heights.max() - heights.min()),
            }
        )
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify GLB and write site metadata.")
    for name in ("prep", "grid", "glb", "raster", "reimport", "build", "blend"):
        parser.add_argument(f"--{name}", required=True, type=Path)
    parser.add_argument(
        "--reference-site-bilinear-m",
        type=float,
        default=5946.899465547405,
        help="Earlier repository bilinear value at the site (results.json bilinearM).",
    )
    args = parser.parse_args()

    prep = read_json(args.prep)
    reimport = read_json(args.reimport)
    build = read_json(args.build)
    cfg = prep["config"]
    site_id = cfg["siteId"]
    origin = prep["localOrigin"]
    ox, oy, oz = origin["projectedXM"], origin["projectedYM"], origin["elevationM"]
    grid = np.load(args.grid)

    with rasterio.open(args.raster) as ds:
        if sha256(args.raster) != prep["rasterInspection"]["sha256"]:
            raise SystemExit("Raster hash differs from the one used by prepare_grid.py")
        full = ds.read(1).astype(np.float64)
        transform = ds.transform

    doc, accessor = read_glb(args.glb)
    checks: list[dict[str, Any]] = []

    def check(name, ok, **details):
        checks.append({"check": name, "passed": bool(ok), **details})

    meshes = doc.get("meshes", [])
    nodes = doc.get("nodes", [])
    check(
        "glb-contains-only-terrain",
        len(meshes) == 1
        and len(nodes) == 1
        and not doc.get("cameras")
        and not doc.get("extensionsUsed"),
        nodes=[n.get("name") for n in nodes],
        meshes=len(meshes),
        cameras=len(doc.get("cameras", [])),
        extensionsUsed=doc.get("extensionsUsed", []),
    )
    node = nodes[0]
    check(
        "node-has-identity-transform",
        not any(k in node for k in ("translation", "rotation", "scale", "matrix")),
        nodeKeys=sorted(node),
    )
    prims = meshes[0]["primitives"]
    check("single-triangle-primitive", len(prims) == 1 and prims[0].get("mode", 4) == 4)
    prim = prims[0]
    pos, pos_acc = accessor(prim["attributes"]["POSITION"])
    idx, _ = accessor(prim["indices"])
    tris = idx.reshape(-1, 3).astype(np.int64)
    normals, _ = accessor(prim["attributes"]["NORMAL"])

    # Vertex positions versus the expected grid (x, h, -y).
    x_local = grid["x_local"]
    y_local = grid["y_local"]
    z_local = grid["z_local"].astype(np.float64)
    step = x_local[1] - x_local[0]
    col_f = (pos[:, 0] - x_local[0]) / step
    row_f = (y_local[0] - (-pos[:, 2].astype(np.float64))) / step
    col, row = np.rint(col_f).astype(int), np.rint(row_f).astype(int)
    xy_err = np.maximum(
        np.abs(pos[:, 0] - x_local[col]),
        np.abs(-pos[:, 2].astype(np.float64) - y_local[row]),
    )
    h_err_grid = np.abs(pos[:, 1].astype(np.float64) - z_local[row, col])
    cfg_win = prep["crop"]["sourceWindow"]
    sp = prep["grid"]["stepPixels"]
    src_rows = cfg_win["rowOff"] + row * sp
    src_cols = cfg_win["colOff"] + col * sp
    h_err_src = np.abs(pos[:, 1].astype(np.float64) + oz - full[src_rows, src_cols])
    unique_cells = len(set(zip(row.tolist(), col.tolist(), strict=True)))
    check(
        "vertices-on-source-pixel-centers",
        xy_err.max() < 1e-3 and unique_cells == len(pos),
        vertices=len(pos),
        uniqueGridCells=unique_cells,
        maxHorizontalErrorM=float(xy_err.max()),
    )
    check(
        "vertex-heights-equal-source-pixels",
        h_err_src.max() < 1e-3,
        maxAbsDiffVsGridM=float(h_err_grid.max()),
        maxAbsDiffVsSourcePixelM=float(h_err_src.max()),
        note="Differences are float32 storage of local heights only.",
    )

    # Triangulation: same triangles as the analysed mesh, all facing up.
    tri_rc = np.stack([row[tris], col[tris]], axis=-1)  # (n, 3, 2)
    keys = tri_rc[..., 0] * 100000 + tri_rc[..., 1]
    nr, nc = z_local.shape
    vid = np.arange(nr * nc).reshape(nr, nc)
    qv = grid["quad_valid"]
    qr, qc = np.nonzero(qv)
    exp = np.concatenate(
        [
            np.stack([vid[qr, qc], vid[qr + 1, qc], vid[qr + 1, qc + 1]], axis=1),
            np.stack([vid[qr, qc], vid[qr + 1, qc + 1], vid[qr, qc + 1]], axis=1),
        ]
    )
    exp_keys = (exp // nc) * 100000 + (exp % nc)
    got = np.sort(np.sort(keys, axis=1), axis=0)
    got_set = {tuple(t) for t in np.sort(keys, axis=1).tolist()}
    exp_set = {tuple(t) for t in np.sort(exp_keys, axis=1).tolist()}
    del got
    p0 = np.stack([pos[tris[:, 0], 0], -pos[tris[:, 0], 2]], axis=1).astype(np.float64)
    p1 = np.stack([pos[tris[:, 1], 0], -pos[tris[:, 1], 2]], axis=1).astype(np.float64)
    p2 = np.stack([pos[tris[:, 2], 0], -pos[tris[:, 2], 2]], axis=1).astype(np.float64)
    cross = (p1[:, 0] - p0[:, 0]) * (p2[:, 1] - p0[:, 1]) - (p2[:, 0] - p0[:, 0]) * (
        p1[:, 1] - p0[:, 1]
    )
    check(
        "triangulation-matches-analysed-mesh",
        got_set == exp_set,
        triangles=len(tris),
        expectedTriangles=len(exp),
    )
    check(
        "triangles-counter-clockwise-seen-from-up",
        bool(np.all(cross > 0)),
        clockwiseTriangles=int(np.sum(cross <= 0)),
        note="glTF front faces are CCW; +Y (up) is elevation.",
    )
    check(
        "normals-point-up",
        bool(np.all(normals[:, 1] > 0)),
        minNormalY=float(normals[:, 1].min()),
    )

    ext = prep["crop"]["meshVertexExtentLocalM"]
    bbox = {
        "gltfMin": pos_acc.get("min"),
        "gltfMax": pos_acc.get("max"),
    }
    check(
        "glb-bounds-match-crop-and-axes",
        np.allclose(
            [
                bbox["gltfMin"][0],
                bbox["gltfMax"][0],
                bbox["gltfMin"][2],
                bbox["gltfMax"][2],
            ],
            [ext["xMin"], ext["xMax"], -ext["yMax"], -ext["yMin"]],
            atol=1e-3,
        ),
        **bbox,
        expectedXRange=[ext["xMin"], ext["xMax"]],
        expectedZRange=[-ext["yMax"], -ext["yMin"]],
    )
    check(
        "blender-reimport-scale-orientation-position",
        reimport["matrixWorldIsIdentity"]
        and reimport["importedObjects"] == [f"Terrain_{site_id}"]
        and max(abs(v) for v in reimport["extentErrorM"].values()) < 1e-3
        and reimport["meanPolygonNormalZ"] > 0
        and reimport["triangles"] == len(tris),
        extentErrorM=reimport["extentErrorM"],
        bboxDimensionsM=reimport["bboxDimensionsM"],
        meanPolygonNormalZ=reimport["meanPolygonNormalZ"],
    )

    # Height comparisons at check points.
    vz_world = z_local + oz
    points_out = {}
    for pid, point in prep["points"].items():
        x, y = point["projectedXM"], point["projectedYM"]
        glb_h = triangle_heights(pos, tris, [x - ox], [y - oy])[0]
        analysed = float(mesh_height(x_local + ox, y_local + oy, vz_world, [x], [y])[0])
        source_bil = float(raster_bilinear(full, transform, [x], [y])[0])
        glb_abs = (
            glb_h["heightLocalM"] + oz if glb_h["heightLocalM"] is not None else None
        )
        reimp = reimport["rayCastProbes"][pid]
        points_out[pid] = {
            "latitudeDeg": point["latitudeDeg"],
            "longitudeEastDeg": point["longitudeEastDeg"],
            "projectedXM": x,
            "projectedYM": y,
            "gltfPositionAtSurfaceM": [x - ox, glb_abs - oz, -(y - oy)]
            if glb_abs
            else None,
            "sourceContainingCellM": point["containingCellElevationM"],
            "sourceBilinearM": source_bil,
            "glbSurfaceM": glb_abs,
            "glbMinusSourceBilinearM": glb_abs - source_bil if glb_abs else None,
            "glbMinusContainingCellM": glb_abs - point["containingCellElevationM"]
            if glb_abs
            else None,
            "analysedMeshMinusGlbM": analysed - glb_abs if glb_abs else None,
            "blenderReimportRayCastM": reimp["elevationM"],
            "blenderReimportMinusGlbM": reimp["elevationM"] - glb_abs
            if glb_abs and reimp["elevationM"] is not None
            else None,
            "glbTrianglesContainingPoint": glb_h["triangleCount"],
        }
    site = points_out["site"]
    check(
        "source-sampling-reproduces-repository-bilinear",
        abs(site["sourceBilinearM"] - args.reference_site_bilinear_m) < 1e-6,
        repositoryValueM=args.reference_site_bilinear_m,
        thisRunM=site["sourceBilinearM"],
        differenceM=site["sourceBilinearM"] - args.reference_site_bilinear_m,
    )
    check(
        "glb-surface-agrees-with-analysed-mesh",
        all(abs(p["analysedMeshMinusGlbM"]) < 1e-3 for p in points_out.values()),
        note="Confirms the whole-crop simplification statistics apply to the exported GLB.",
    )
    check(
        "blender-reimport-ray-casts-agree-with-glb",
        all(abs(p["blenderReimportMinusGlbM"]) < 0.01 for p in points_out.values()),
        differencesM={k: p["blenderReimportMinusGlbM"] for k, p in points_out.items()},
    )
    check(
        "check-points-are-on-the-mesh",
        all(p["glbTrianglesContainingPoint"] >= 1 for p in points_out.values()),
    )

    selected = next(
        a for a in prep["simplificationAnalysis"] if a.get("stepPixels") == sp
    )
    glb_bytes = args.glb.stat().st_size
    now = datetime.now(UTC).isoformat()
    verification = {
        "generatedUtc": now,
        "allPassed": all(c["passed"] for c in checks),
        "checks": checks,
        "pointComparisons": points_out,
        "siteDifferenceExplanation": (
            "The repository value and this run's source bilinear agree because both "
            "interpolate the four 5 m source pixel centers around the site. The GLB "
            "surface instead interpolates linearly inside one triangle whose vertices "
            f"are source pixel centers {selected['vertexSpacingM']:.0f} m apart, so it "
            "omits sub-25 m relief; the difference at each point is that simplification "
            "error, not a change of datum or position."
        ),
        "simplificationOverWholeCrop": selected,
        "simplificationCandidates": prep["simplificationAnalysis"],
        "ridgeSilhouette": {
            **prep["silhouetteSource"],
            "selectedMesh": selected["ridgeSilhouette"],
        },
        "blenderReimport": reimport,
    }
    out_dir = args.glb.parent
    (out_dir / f"{site_id}.verification.json").write_text(
        json.dumps(verification, indent=2, allow_nan=False) + "\n", encoding="utf-8"
    )

    inspection = prep["rasterInspection"]
    k = prep["localGeometry"]["polarStereographicScaleFactorAtSite"]
    metadata = {
        "schema": "clps-site-terrain/1",
        "generatedUtc": now,
        "siteId": site_id,
        "siteName": cfg["siteName"],
        "site": {
            "latitudeDeg": cfg["latitudeDeg"],
            "longitudeEastDeg": cfg["longitudeEastDeg"],
            "latitudeConvention": "planetocentric, negative south",
            "longitudeConvention": "positive east, (-180, 180]",
            "source": cfg["siteSource"],
        },
        "nature": (
            "Terrain visualization of LOLA-derived topography. Lighting in the .blend is "
            "illustrative. Not a guarantee of power, communications, visibility or landing "
            "suitability."
        ),
        "source": {
            **cfg["raster"],
            "file": inspection["file"],
            "sha256": inspection["sha256"],
            "bytes": inspection["bytes"],
            "retrievedUtc": "2026-11-14",
            "dimensions": [inspection["width"], inspection["height"]],
            "cellSizeM": inspection["cellSizeM"],
            "pixelRegistration": "Values at pixel centers (GMT pixel registration, AREA_OR_POINT=Area); centers at edge + 2.5 m",
            "dtype": inspection["dtype"],
            "nodata": inspection["nodata"],
            "missingSamplesInFile": inspection["missingSamplesInFile"],
            "geoTransformGdal": inspection["transformGdal"],
            "boundsM": inspection["boundsM"],
            "license": "NASA data; redistribution/publication review remains a project release gate.",
        },
        "crs": {
            "proj4": inspection["crsProj4"],
            "wkt": inspection["crsWkt"],
            "projection": "Polar stereographic, south pole origin (lat_0=-90), central meridian 0, scale 1 at the pole, false easting/northing 0",
            "sphereRadiusM": prep["sphereRadiusM"],
            "frame": cfg["raster"]["frame"],
            "frameCaveat": "MOON_ME (DE421) and MOON_PA differ by about 875 m on the surface; do not mix frames.",
        },
        "units": {
            "horizontal": "meter",
            "vertical": "meter",
            "verticalExaggeration": 1.0,
        },
        "verticalReference": "Height above the 1,737,400 m reference sphere (radius = height + 1,737,400 m); not a geoid.",
        "localOrigin": origin,
        "axes": {
            "blender": "Z-up, right-handed: X = projected X - origin X, Y = projected Y - origin Y, Z = height - origin height",
            "glb": "glTF Y-up, right-handed: x = projected X - origin X, y = height - origin height, z = -(projected Y - origin Y)",
            "gridNorthNote": "Projected +Y is grid north (toward 0° E away from the pole), not geographic north.",
            "geographicNorthGridBearingAtSiteDeg": prep["localGeometry"][
                "gridBearingOfGeographicNorthAtSiteDeg"
            ],
            "azimuthToGridBearing": "gridBearing = geographicAzimuth + longitudeEastDeg (local, clockwise from projected +Y); varies by about ±3° across the crop",
        },
        "markerPlacement": {
            "steps": [
                "rho = 2 * R * tan(pi/4 + latRad/2) with R = 1737400 (latRad negative)",
                "X = rho * sin(lonEastRad); Y = rho * cos(lonEastRad)",
                "glTF = [X - origin.projectedXM, h - origin.elevationM, -(Y - origin.projectedYM)]",
                "h: source raster height (bilinear) or the GLB surface height at (X, Y) plus a marker offset",
            ],
            "inverse": [
                "X = gltf.x + origin.projectedXM; Y = origin.projectedYM - gltf.z; h = gltf.y + origin.elevationM",
                "lonEast = atan2(X, Y); lat = -(pi/2 - 2 * atan(hypot(X, Y) / (2R)))",
            ],
            "points": {
                pid: {
                    "latitudeDeg": p["latitudeDeg"],
                    "longitudeEastDeg": p["longitudeEastDeg"],
                    "projectedXM": p["projectedXM"],
                    "projectedYM": p["projectedYM"],
                    "sourceBilinearElevationM": p["sourceBilinearElevationM"],
                    "gltfAtSourceElevationM": p["gltfLocalM"],
                    "blenderAtSourceElevationM": p["blenderLocalM"],
                }
                for pid, p in prep["points"].items()
            },
        },
        "coverage": {
            "meshExtentProjectedM": prep["crop"]["meshVertexExtentM"],
            "meshExtentLocalM": prep["crop"]["meshVertexExtentLocalM"],
            "sourceWindow": prep["crop"]["sourceWindow"],
            "sourceWindowEdgesProjectedM": prep["crop"]["sourcePixelEdgeBoundsM"],
            "cornersGeographic": prep["crop"]["cornersGeographic"],
            "geographicEnvelope": prep["crop"]["geographicEnvelope"],
            "insideTest": "A coordinate is covered when its projected X/Y lies inside meshExtentProjectedM (a square in projected meters, not a lat/lon box).",
            "missingSourcePixelsInWindow": prep["crop"]["missingSourcePixelsInWindow"],
            "validQuads": prep["crop"]["validQuads"],
            "totalQuads": prep["crop"]["totalQuads"],
            "gapPolicy": "A 25 m quad is omitted if any source pixel in its footprint is missing; none were missing in this crop.",
            "elevationRangeM": prep["crop"]["windowElevationRangeM"],
            "interpolationNote": "The provider fills pixels without LOLA returns by interpolation (about 90% of pixels in the studied polar 5 m grids per PGDA product 78). Valid elevation does not mean direct measurement.",
        },
        "mesh": {
            "sourceCellSizeM": inspection["cellSizeM"],
            "vertexSpacingM": prep["grid"]["vertexSpacingM"],
            "stepPixels": sp,
            "gridVertices": [prep["grid"]["rows"], prep["grid"]["cols"]],
            "vertexSampling": prep["grid"]["vertexSampling"],
            "triangulation": prep["grid"]["triangulation"],
            "simplificationErrorVsAllSourcePixelsM": selected[
                "elevationErrorVsSourcePixelsM"
            ],
            "ridgeSilhouetteChangeDeg": selected["ridgeSilhouette"],
            "geometryModel": (
                "2.5D height field on the projected plane: horizontal distances are grid "
                f"distances (true ground distance ≈ grid / {k:.6f} at the site); lunar "
                "curvature is not applied (sphere drop about "
                f"{prep['localGeometry']['sphereDropAtHalfSizeM']:.1f} m at 5 km)."
            ),
        },
        "glb": {
            "file": args.glb.name,
            "bytes": glb_bytes,
            "sha256": sha256(args.glb),
            "vertices": len(pos),
            "triangles": len(tris),
            "attributes": sorted(prim["attributes"]),
            "indexComponentType": doc["accessors"][prim["indices"]]["componentType"],
            "compression": "none",
            "generator": doc.get("asset", {}).get("generator"),
            "exportOptions": build["glbExport"]["options"],
            "nodeName": nodes[0].get("name"),
        },
        "blend": {
            "file": args.blend.name,
            "bytes": args.blend.stat().st_size,
            "blenderVersion": build["blenderVersion"],
            "objects": [
                "Terrain (exported)",
                "Marker_<site> and Marker_ridge-reference (empties at exact points; poles start 10 m above)",
                "Camera_overview",
                "Camera_ground_to_ridge (site, 2 m above the mesh, aimed at the ridge reference)",
                "Sun_illustrative_grazing and Fill_illustrative (illustrative lights)",
            ],
            "illustrativeSun": build["illustrativeSun"],
        },
        "verification": {
            "file": f"{site_id}.verification.json",
            "allPassed": verification["allPassed"],
            "pointDifferencesGlbMinusSourceBilinearM": {
                pid: p["glbMinusSourceBilinearM"] for pid, p in points_out.items()
            },
        },
        "reproduction": "See README.md in the site-terrain directory.",
    }
    (out_dir / f"{site_id}.metadata.json").write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False, allow_nan=False) + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps({"allPassed": verification["allPassed"], "checks": checks}, indent=1)
    )
    print(json.dumps(points_out, indent=1))
    print("glb bytes", glb_bytes, "triangles", len(tris))


if __name__ == "__main__":
    main()
