"""Run in a fresh Blender process after opening the delivered .blend."""

import argparse
import hashlib
import json
import sys
from pathlib import Path

# pi-lens-ignore: reportMissingImports
import bpy

# pi-lens-ignore: reportMissingImports
from bpy_extras.object_utils import world_to_camera_view

# pi-lens-ignore: reportMissingImports
from mathutils import Vector

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--report', type=Path, required=True)
parser.add_argument('--metadata', type=Path, required=True)
parser.add_argument('--normalize', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
assert bpy.app.background, 'Run only in a disposable background Blender process'
scene = bpy.context.scene
# Restrict lookups to this scene; global datablock names can gain numeric suffixes.
terrains = [obj for obj in scene.objects if obj.type == 'MESH'
            and (obj.get('terrain_role') == 'surface' or obj.name.split('.')[0] == 'Terrain')]
assert len(terrains) == 1, 'Expected exactly one terrain surface in the active scene'
terrain = terrains[0]
collections = [child for child in scene.collection.children
               if child.get('terrain_role') == 'scale_reference'
               or child.name.split('.')[0] == 'Astronaut_scale_reference']
assert len(collections) <= 1, 'Ambiguous astronaut collections in the active scene'
collection = collections[0] if collections else None
astronaut_objects = set(collection.all_objects) if collection else set()
meshes = [obj for obj in scene.objects if obj.type == 'MESH' and obj not in astronaut_objects]
cameras = [obj for obj in scene.objects if obj.type == 'CAMERA']
markers = [obj for obj in scene.objects if obj.type == 'EMPTY' and obj not in astronaut_objects]
assert len(bpy.data.scenes) == 1
assert meshes == [terrain] and len(cameras) == 2 and len(markers) == 2
assert len(terrain.data.vertices) == 50000
assert len(terrain.data.polygons) == 99533
assert scene.unit_settings.scale_length == 1
assert tuple(terrain.scale) == (1, 1, 1)
assert scene.camera.name.startswith('Overview')
site = next(obj for obj in markers if 'surface marker' in obj.name)
ridge = next(obj for obj in markers if 'Ridge reference' in obj.name)
ground = next(obj for obj in cameras if obj.name.startswith('Ground'))
assert abs(ground.location.z - site.location.z - 2) < 1e-5
look = ground.rotation_euler.to_quaternion() @ Vector((0, 0, -1))
target = (ridge.location - ground.location).normalized()
assert look.dot(target) > 0.999999
assert any(obj.type == 'LIGHT' and 'NOT ephemeris' in obj.name for obj in scene.objects)
reference_report = None
if collection:
    root = next(obj for obj in astronaut_objects if obj.parent is None)
    parts = [obj for obj in astronaut_objects if obj.type == 'MESH']
    assert len(parts) == 13 and tuple(root.scale) == (1, 1, 1)
    points = [obj.matrix_world @ Vector(corner) for obj in parts for corner in obj.bound_box]
    height = max(p.z for p in points) - min(p.z for p in points)
    assert abs(height - 1.70) < 0.001
    frame = [world_to_camera_view(scene, ground, p) for p in points]
    assert all(0 < p.x < 1 and 0 < p.y < 1 and ground.data.clip_start < p.z < ground.data.clip_end for p in frame)
    sole_gaps = []
    for obj in parts:
        if 'boot_' not in obj.name:
            continue
        for vertex in obj.data.vertices:
            if vertex.co.z >= -0.079:
                continue
            foot = obj.matrix_world @ vertex.co
            hit, surface, _, _ = terrain.ray_cast(Vector((foot.x, foot.y, 2000)), Vector((0, 0, -1)))
            assert hit
            sole_gaps.append(foot.z - surface.z)
    assert len(sole_gaps) == 8 and min(sole_gaps) >= -0.001
    assert abs(min(sole_gaps)) < 0.001 and max(sole_gaps) < 0.20
    reference_report = {
        'heightM': height, 'meshParts': len(parts), 'scale': list(root.scale),
        'positionBlenderM': list(root.location), 'fullyInsideGroundCamera': True,
        'frameBoundsXY': [[min(p[i] for p in frame), max(p[i] for p in frame)] for i in (0, 1)],
        'soleCornerTerrainGapRangeM': [min(sole_gaps), max(sole_gaps)],
        'limits': 'Rigid flat soles on a sloped simplified triangle; no boot deformation',
    }
# A datablock-only library preserves the live user's scene but has no startup UI.
# Normalize in this disposable process, following the existing site-terrain workflow.
if args.normalize:
    for obj in scene.objects:
        obj.select_set(False)
    meshes[0].select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    for area in bpy.context.screen.areas if bpy.context.screen else []:
        if area.type == 'VIEW_3D':
            area.spaces.active.clip_start = 0.1
            area.spaces.active.clip_end = 100000
            area.spaces.active.region_3d.view_perspective = 'CAMERA'
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath, compress=True)
    try:
        metadata = json.loads(args.metadata.read_text(encoding='utf-8'))
    except (OSError, ValueError) as exc:
        raise ValueError('Cannot update normalized blend provenance') from exc
    blend = Path(bpy.data.filepath)
    metadata['artifacts']['blend'].update({'bytes': blend.stat().st_size,
        'sha256': hashlib.sha256(blend.read_bytes()).hexdigest(), 'normalizedStartupFile': True})
    args.metadata.write_text(json.dumps(metadata, indent=2, allow_nan=False) + '\n', encoding='utf-8')
report = {'status': 'passed', 'blenderVersion': bpy.app.version_string,
          'savedFileOpenedInFreshProcess': True, 'scenes': len(bpy.data.scenes),
          'objects': [{'name': obj.name, 'type': obj.type} for obj in scene.objects],
          'activeCamera': scene.camera.name, 'groundCameraAboveMarkerM': ground.location.z-site.location.z,
          'groundCameraRidgeDirectionDot': look.dot(target), 'scaleLengthM': scene.unit_settings.scale_length,
          'vertices': len(terrain.data.vertices), 'triangles': len(terrain.data.polygons),
          'scaleReference': reference_report}
args.report.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, indent=2))
