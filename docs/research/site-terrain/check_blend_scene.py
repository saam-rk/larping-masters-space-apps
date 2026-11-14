"""Read-only verification after reopening the delivered .blend, in background."""

import argparse
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector

p = argparse.ArgumentParser()
p.add_argument("--out", required=True, type=Path)
a = p.parse_args(sys.argv[sys.argv.index("--") + 1 :])
scene = bpy.data.scenes["nobile-rim-2"]
terrain = scene.objects["Terrain_nobile-rim-2"]
ground = scene.objects["Camera_ground_to_ridge"]
astronaut = scene.objects["Astronaut_1p70m"]
top = max(v.co.z for v in terrain.data.vertices) + 10
hit, loc, *_ = terrain.ray_cast(
    Vector((ground.location.x, ground.location.y, top)), Vector((0, 0, -1))
)
clearance = ground.location.z - loc.z
astronaut_parts = [child for child in astronaut.children if child.type == "MESH"]
astronaut_corners = [child.matrix_world @ Vector(corner)
                     for child in astronaut_parts for corner in child.bound_box]
astronaut_min_z = min(point.z for point in astronaut_corners)
astronaut_height = max(point.z for point in astronaut_corners) - astronaut_min_z
astronaut_hit, astronaut_ground, *_ = terrain.ray_cast(
    Vector((astronaut.location.x, astronaut.location.y, top)), Vector((0, 0, -1))
)
checks = {
    "deliveredSceneActive": bpy.context.scene == scene,
    "onlyDeliveredScene": len(bpy.data.scenes) == 1,
    "terrainGeometry": len(terrain.data.vertices) == 50000
    and len(terrain.data.polygons) == 99198,
    "meterUnits": scene.unit_settings.scale_length == 1
    and scene.unit_settings.system == "METRIC",
    "overviewActive": scene.camera.name == "Camera_overview",
    "bothCameras": len([o for o in scene.objects if o.type == "CAMERA"]) == 2,
    "twoMeterGroundCamera": hit and abs(clearance - 2) < 0.001,
    "siteAndCrestMarkers": "Marker_nobile-rim-2" in scene.objects
    and "Marker_ridge-reference" in scene.objects,
    "astronautHumanScale": len(astronaut_parts) == 13
    and abs(astronaut_height - 1.70) < 0.001,
    "astronautOnTerrain": astronaut_hit
    and abs(astronaut_min_z - astronaut_ground.z) < 0.001,
}
report = {
    "allPassed": all(checks.values()),
    "checks": checks,
    "groundCameraClearanceM": clearance,
    "astronautHeightM": astronaut_height,
    "astronautGroundClearanceM": astronaut_min_z - astronaut_ground.z,
    "sceneObjects": [o.name for o in scene.objects],
    "blenderVersion": bpy.app.version_string,
}
a.out.write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
assert report["allPassed"]
