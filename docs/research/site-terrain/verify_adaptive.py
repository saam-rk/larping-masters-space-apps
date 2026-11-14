"""Independent GLB parsing, pixel-height and topology checks, and metadata.

Reuses Nobile Rim 1's binary parser, barycentric surface sampler and metadata
contract. Does not reuse regular-grid topology assumptions for adaptive meshes.
"""

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import rasterio

from terrain_common import raster_bilinear
from verify_and_write_metadata import read_glb, sha256, triangle_heights


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--directory", type=Path, required=True)
    p.add_argument("--raster", type=Path, required=True)
    a = p.parse_args()
    sid = a.directory.name
    stem = a.directory / sid

    def read(suffix):
        return json.loads(stem.with_suffix(suffix).read_text())

    prep, build, reimp = (
        read(".prep.json"),
        read(".blender-build.json"),
        read(".reimport.json"),
    )
    planned = np.load(stem.with_suffix(".adaptive.npz"))
    doc, accessor = read_glb(stem.with_suffix(".glb"))
    prim = doc["meshes"][0]["primitives"][0]
    pos, _ = accessor(prim["attributes"]["POSITION"])
    normals, _ = accessor(prim["attributes"]["NORMAL"])
    indices, index_acc = accessor(prim["indices"])
    tris = indices.reshape(-1, 3)
    origin = prep["localOrigin"]
    ox, oy, oz = origin["projectedXM"], origin["projectedYM"], origin["elevationM"]
    co = np.column_stack([pos[:, 0], -pos[:, 2], pos[:, 1]])
    checks = []

    def check(name, ok, **details):
        checks.append(dict(name=name, passed=bool(ok), **details))

    with rasterio.open(a.raster) as ds:
        full = ds.read(1).astype(float)
        transform = ds.transform
        rf = (oy + co[:, 1] - transform.f) / transform.e - 0.5
        cf = (ox + co[:, 0] - transform.c) / transform.a - 0.5
        rr, cc = np.rint(rf).astype(int), np.rint(cf).astype(int)
        source_z = full[rr, cc]
        check("source-sha256", sha256(a.raster) == prep["rasterInspection"]["sha256"])
        check(
            "vertices-at-source-pixel-centers",
            np.max(np.abs(rf - rr)) < 1e-6 and np.max(np.abs(cf - cc)) < 1e-6,
        )
        check(
            "numeric-source-heights",
            np.max(np.abs(co[:, 2] + oz - source_z)) < 0.001,
            maxAbsM=float(np.max(np.abs(co[:, 2] + oz - source_z))),
        )
    # Map exported ordering back to planned vertices before checking topology.
    mapping = {tuple(v): i for i, v in enumerate(planned["vertices"].tolist())}
    remap = np.array([mapping.get(tuple(v), -1) for v in co.tolist()])
    check(
        "vertex-coordinates-match-prepared-mesh",
        np.all(remap >= 0) and len(np.unique(remap)) == len(mapping),
    )
    actual = {tuple(sorted(t)) for t in remap[tris].tolist()}
    expected = {tuple(sorted(t)) for t in planned["triangles"].tolist()}
    check(
        "exported-topology-matches-error-analysis",
        actual == expected and len(tris) == len(expected),
    )
    v0, v1, v2 = co[tris[:, 0]], co[tris[:, 1]], co[tris[:, 2]]
    cross = (v1[:, 0] - v0[:, 0]) * (v2[:, 1] - v0[:, 1]) - (v1[:, 1] - v0[:, 1]) * (
        v2[:, 0] - v0[:, 0]
    )
    check("upward-winding-and-normals", np.all(cross > 0) and np.all(normals[:, 1] > 0))
    ext = prep["crop"]["meshVertexExtentLocalM"]
    expected_bounds = [ext["xMin"], ext["xMax"], ext["yMin"], ext["yMax"]]
    measured = [
        float(co[:, 0].min()),
        float(co[:, 0].max()),
        float(co[:, 1].min()),
        float(co[:, 1].max()),
    ]
    check(
        "scale-axes-and-extent",
        np.allclose(measured, expected_bounds, atol=0.001, rtol=0),
        projectedLocalBoundsM=measured,
    )
    area = float(cross.sum() / 2)
    expected_area = (ext["xMax"] - ext["xMin"]) * (ext["yMax"] - ext["yMin"])
    check(
        "full-valid-crop-area",
        abs(area - expected_area) < 1
        and prep["crop"]["missingSourcePixelsInWindow"] == 0,
        meshProjectedAreaM2=area,
    )
    check(
        "terrain-only",
        len(doc["nodes"]) == 1
        and len(doc["meshes"]) == 1
        and len(doc["meshes"][0]["primitives"]) == 1
        and not doc.get("cameras"),
    )
    check(
        "no-compression-required",
        not doc.get("extensionsRequired")
        and set(prim["attributes"]) == {"POSITION", "NORMAL"},
    )
    size = stem.with_suffix(".glb").stat().st_size
    check("file-budget", size <= 2097152, bytes=size, limitBytes=2097152)
    check(
        "geometry-budget",
        40000 <= len(pos) <= 60000 and 80000 <= len(tris) <= 120000,
        vertices=len(pos),
        triangles=len(tris),
    )
    check(
        "blender-reimport",
        reimp["matrixWorldIsIdentity"]
        and len(reimp["importedObjects"]) == 1
        and reimp["vertices"] == len(pos)
        and reimp["triangles"] == len(tris)
        and max(abs(v) for v in reimp["extentErrorM"].values()) < 0.001
        and reimp["meanPolygonNormalZ"] > 0,
    )
    comparisons = {}
    for pid, point in prep["points"].items():
        x, y = point["projectedXM"], point["projectedYM"]
        hit = triangle_heights(pos, tris, [x - ox], [y - oy])[0]
        if hit["heightLocalM"] is None:
            raise ValueError(f"Missing terrain at {pid}")
        glb = hit["heightLocalM"] + oz
        bil = float(raster_bilinear(full, transform, [x], [y])[0])
        comparisons[pid] = {
            "latitudeDeg": point["latitudeDeg"],
            "longitudeEastDeg": point["longitudeEastDeg"],
            "projectedXM": x,
            "projectedYM": y,
            "sourceContainingCellM": point["containingCellElevationM"],
            "sourceBilinearM": bil,
            "glbSurfaceM": glb,
            "glbMinusSourceBilinearM": glb - bil,
            "glbMinusContainingCellM": glb - point["containingCellElevationM"],
            "reimportMinusGlbM": reimp["rayCastProbes"][pid]["elevationM"] - glb,
            "gltfPositionAtSurfaceM": [x - ox, glb - oz, -(y - oy)],
        }
    check(
        "reference-pixel-reproduces-research",
        abs(comparisons["site"]["sourceContainingCellM"] - 1009.58) < 0.005,
        referenceM=1009.58,
    )
    check(
        "reimport-height-comparisons",
        all(abs(v["reimportMinusGlbM"]) < 0.01 for v in comparisons.values()),
    )
    rng = np.random.default_rng(20261114)
    qx = rng.uniform(ext["xMin"], ext["xMax"], 128)
    qy = rng.uniform(ext["yMin"], ext["yMax"], 128)
    hits = triangle_heights(pos, tris, qx, qy)
    check(
        "arbitrary-interior-coordinates",
        all(h["triangleCount"] > 0 for h in hits),
        samples=len(hits),
        seed=20261114,
    )
    edges = triangle_heights(
        pos,
        tris,
        [ext["xMin"], ext["xMax"], 0, ext["xMax"] + 1],
        [ext["yMin"], ext["yMax"], ext["yMin"], 0],
    )
    check(
        "boundary-and-outside-coordinates",
        all(h["triangleCount"] > 0 for h in edges[:3])
        and edges[3]["triangleCount"] == 0,
    )
    now = datetime.now(UTC).isoformat()
    report = {
        "generatedUtc": now,
        "allPassed": all(c["passed"] for c in checks),
        "checks": checks,
        "pointComparisons": comparisons,
        "simplification": prep["adaptive"],
        "blenderReimport": reimp,
        "methods": {
            "containingCell": "GeoTIFF cell containing projected coordinate, no interpolation",
            "sourceBilinear": "Four surrounding 5 m source pixel centers, bilinear weights",
            "glbSurface": "Barycentric interpolation of exported GLB triangle, parsed independently",
            "wholeCropError": "All source centers evaluated against planned adaptive triangle fans; exported coordinates and topology verified identical",
        },
        "mobilePerformance": {
            "status": "pending",
            "coldLoadTargetS": 2,
            "fpsTarget": 60,
            "fpsMinimum": 50,
            "reason": "No physical mobile device available; repository viewer has no terrain loader. No device, browser or network performance result claimed.",
        },
    }
    stem.with_suffix(".verification.json").write_text(
        json.dumps(report, indent=2, allow_nan=False) + "\n"
    )
    cfg, ins = prep["config"], prep["rasterInspection"]
    metadata = {
        "schema": "clps-site-terrain/1",
        "generatedUtc": now,
        "siteId": sid,
        "siteName": cfg["siteName"],
        "site": {
            "latitudeDeg": cfg["latitudeDeg"],
            "longitudeEastDeg": cfg["longitudeEastDeg"],
            "latitudeConvention": "planetocentric, negative south",
            "longitudeConvention": "positive east, (-180, 180]",
            "source": cfg["siteSource"],
        },
        "nature": "LOLA-derived terrain visualization; illustrative lighting. Not a guarantee of power, communications, visibility or landing suitability.",
        "source": {
            **cfg["raster"],
            **{
                k: ins[k]
                for k in (
                    "file",
                    "sha256",
                    "bytes",
                    "dtype",
                    "nodata",
                    "missingSamplesInFile",
                )
            },
            "cellSizeM": 5,
            "dimensions": [ins["width"], ins["height"]],
            "geoTransformGdal": ins["transformGdal"],
            "boundsM": ins["boundsM"],
            "pixelRegistration": "Pixel centers, AREA_OR_POINT=Area; centers 2.5 m from pixel edges",
        },
        "crs": {
            "proj4": ins["crsProj4"],
            "wkt": ins["crsWkt"],
            "sphereRadiusM": prep["sphereRadiusM"],
            "frame": cfg["raster"]["frame"],
            "projection": "South polar stereographic; lat_0=-90, lon_0=0, k=1, false offsets 0",
        },
        "units": {
            "horizontal": "meter",
            "vertical": "meter",
            "verticalExaggeration": 1.0,
        },
        "verticalReference": "Radial elevation above the 1737400 m reference sphere, not a geoid",
        "localOrigin": origin,
        "axes": {
            "blender": "[X-X0, Y-Y0, h-h0], Z-up right-handed",
            "glb": "[X-X0, h-h0, -(Y-Y0)], Y-up right-handed",
            "gridNorthNote": "Projected +Y is grid north, not geographic north",
            "geographicNorthGridBearingAtSiteDeg": prep["localGeometry"][
                "gridBearingOfGeographicNorthAtSiteDeg"
            ],
        },
        "markerPlacement": {
            "steps": [
                "Validate finite latitude/longitude in the MOON_ME/DE421 coordinate frame",
                "rho=2*1737400*tan(pi/4+latitudeRadians/2)",
                "X=rho*sin(longitudeEastRadians); Y=rho*cos(longitudeEastRadians)",
                "Require projected bounds containment, then ray cast downward onto terrain at glTF x=X-X0, z=-(Y-Y0)",
                "No triangle hit means no terrain: return null, never substitute zero",
                "Place marker at hit.y plus desired meter offset; radial elevation=hit.y+h0",
            ],
            "inverse": [
                "X=gltf.x+X0; Y=Y0-gltf.z; h=gltf.y+h0",
                "longitude=atan2(X,Y); latitude=2*atan(hypot(X,Y)/(2*1737400))-pi/2",
            ],
            "implementation": "../terrain-marker.mjs",
            "points": comparisons,
        },
        "coverage": {
            "meshExtentProjectedM": prep["crop"]["meshVertexExtentM"],
            "meshExtentLocalM": ext,
            "sourceWindow": prep["crop"]["sourceWindow"],
            "sourceWindowEdgesProjectedM": prep["crop"]["sourcePixelEdgeBoundsM"],
            "cornersGeographic": prep["crop"]["cornersGeographic"],
            "geographicEnvelope": prep["crop"]["geographicEnvelope"],
            "validFraction": 1.0,
            "missingSourcePixelsInWindow": 0,
            "projectedAreaM2": area,
            "insideTest": "Projected bounds plus actual triangle hit; latitude/longitude envelope alone is insufficient",
            "gapPolicy": prep["adaptive"]["noDataPolicy"],
            "elevationRangeM": prep["crop"]["windowElevationRangeM"],
        },
        "mesh": {
            **prep["adaptive"],
            "geometryModel": "2.5D height field on projected plane; no lunar curvature correction",
            "localGeometry": prep["localGeometry"],
            "vertexSampling": "Exact source pixel centers and heights, no synthetic detail",
        },
        "glb": {
            "file": stem.with_suffix(".glb").name,
            "bytes": size,
            "sha256": sha256(stem.with_suffix(".glb")),
            "vertices": len(pos),
            "triangles": len(tris),
            "attributes": sorted(prim["attributes"]),
            "indexComponentType": index_acc["componentType"],
            "compression": "none",
            "exportOptions": build["glbExport"]["options"],
        },
        "blend": {
            "file": stem.with_suffix(".blend").name,
            "bytes": stem.with_suffix(".blend").stat().st_size,
            "blenderVersion": build["blenderVersion"],
            "illustrativeSun": build["illustrativeSun"],
            "groundCameraHeightM": cfg["groundCamera"]["heightAboveSurfaceM"],
            "groundCameraTarget": cfg["groundCamera"]["lookAtPoint"],
        },
        "verification": {
            "file": stem.with_suffix(".verification.json").name,
            "allPassed": report["allPassed"],
        },
        "performance": report["mobilePerformance"],
        "reproduction": "See README.md in this directory",
        "limitations": [
            "5 m spacing is not effective resolution; provider elevations are extensively interpolated",
            "Point checks measure mesh approximation error, not absolute terrain accuracy",
            "Site coordinates are assumed compatible with MOON_ME/DE421; no frame conversion performed",
            "Projected distance differs from ground distance; map-plane model omits lunar curvature",
            "No new terrain-horizon or ephemeris integration; 10 km crop may omit distant obstacles",
        ],
    }
    stem.with_suffix(".metadata.json").write_text(
        json.dumps(metadata, indent=2, allow_nan=False) + "\n"
    )
    print(
        json.dumps(
            {
                "allPassed": report["allPassed"],
                "checks": checks,
                "pointComparisons": comparisons,
            },
            indent=2,
        )
    )
    if not report["allPassed"]:
        raise SystemExit("Verification failed")


if __name__ == "__main__":
    main()
