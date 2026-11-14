"""Step 3: re-import the exported GLB in a fresh Blender and record scale,
orientation and position checks.

Headless only (it starts from an empty factory scene)::

    blender --background --factory-startup --python blender_reimport_check.py -- \
        --prep nobile-rim-1/nobile-rim-1.prep.json \
        --glb nobile-rim-1/nobile-rim-1.glb \
        --out nobile-rim-1/nobile-rim-1.reimport.json

The glTF importer converts +Y-up back to Blender +Z-up, so the imported mesh
must land at X = projected X - origin X, Y = projected Y - origin Y,
Z = elevation - origin elevation.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# pi-lens-ignore: reportMissingImports
import bpy

# pi-lens-ignore: reportMissingImports
from mathutils import Vector


def main() -> None:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--prep", required=True)
    parser.add_argument("--glb", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args(argv)
    try:
        prep = json.loads(Path(args.prep).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"Cannot read prep JSON {args.prep}: {exc}") from exc

    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj)
    result = bpy.ops.import_scene.gltf(filepath=str(Path(args.glb).resolve()))
    if "FINISHED" not in result:
        raise SystemExit(f"glTF import failed: {result}")

    objects = list(bpy.data.objects)
    meshes = [o for o in objects if o.type == "MESH"]
    if len(meshes) != 1:
        raise SystemExit(
            f"Expected exactly one mesh, found {[o.name for o in objects]}"
        )
    terrain = meshes[0]
    mesh = terrain.data
    mesh.calc_loop_triangles()
    world_corners = [terrain.matrix_world @ Vector(c) for c in terrain.bound_box]
    mins = [min(c[i] for c in world_corners) for i in range(3)]
    maxs = [max(c[i] for c in world_corners) for i in range(3)]

    # Upward-facing triangles: positive mean Z normal means +Z is "up".
    normal_z = sum(p.normal.z for p in mesh.polygons) / max(len(mesh.polygons), 1)

    probes = {}
    inv = terrain.matrix_world.inverted()
    # Start rays just above the terrain: Blender ray casts are float32, so a
    # far origin (e.g. Z=1e5) would quantize the hit height to ~8 mm.
    ray_z = maxs[2] + 10.0
    for pid, point in prep["points"].items():
        x, y, z_expected = point["blenderLocalM"]
        origin = inv @ Vector((x, y, ray_z))
        direction = (inv.to_3x3() @ Vector((0, 0, -1))).normalized()
        hit, loc, *_ = terrain.ray_cast(origin, direction)
        world = terrain.matrix_world @ loc if hit else None
        probes[pid] = {
            "hit": bool(hit),
            "blenderXYZ": list(world) if world else None,
            "elevationM": (world.z + prep["localOrigin"]["elevationM"])
            if world
            else None,
            "sourceBilinearElevationM": point["sourceBilinearElevationM"],
            "differenceM": (world.z - z_expected) if world else None,
        }

    expected = prep["crop"]["meshVertexExtentLocalM"]
    report = {
        "blenderVersion": bpy.app.version_string,
        "importedObjects": [o.name for o in objects],
        "terrainObject": terrain.name,
        "matrixWorldIsIdentity": terrain.matrix_world
        == terrain.matrix_world.Identity(4),
        "vertices": len(mesh.vertices),
        "triangles": len(mesh.loop_triangles),
        "polygons": len(mesh.polygons),
        "bboxMinBlender": mins,
        "bboxMaxBlender": maxs,
        "bboxDimensionsM": [maxs[i] - mins[i] for i in range(3)],
        "expectedExtentLocalM": expected,
        "extentErrorM": {
            "xMin": mins[0] - expected["xMin"],
            "xMax": maxs[0] - expected["xMax"],
            "yMin": mins[1] - expected["yMin"],
            "yMax": maxs[1] - expected["yMax"],
        },
        "expectedElevationRangeLocalM": [
            v - prep["localOrigin"]["elevationM"]
            for v in prep["crop"]["windowElevationRangeM"]
        ],
        "meanPolygonNormalZ": normal_z,
        "materials": [m.name for m in mesh.materials if m],
        "extras": {k: terrain.get(k) for k in terrain.keys() if not k.startswith("_")},
        "rayCastProbes": probes,
    }
    Path(args.out).write_text(
        json.dumps(report, indent=2, default=str) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2, default=str))


if __name__ == "__main__":
    main()
