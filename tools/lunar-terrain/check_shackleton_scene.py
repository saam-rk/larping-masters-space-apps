"""Reopen/normalize the delivered Shackleton .blend in a fresh background process."""
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
parser.add_argument('--repo', type=Path, required=True)
parser.add_argument('--normalize', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
assert bpy.app.background, 'Never normalize the user live session'
scene = bpy.context.scene
assert len(bpy.data.scenes) == 1
assert scene['terrain_asset_id'] == 'shackleton-rim'
terrain = next(o for o in scene.objects if o.get('terrain_role') == 'surface')
parts = [o for o in scene.objects if o.type == 'MESH' and o != terrain]
assert len(parts) == 13
assert len(terrain.data.vertices) == 40500 and len(terrain.data.polygons) == 80571
assert scene.unit_settings.scale_length == 1
assert tuple(terrain.scale) == (1, 1, 1)
assert len([o for o in scene.objects if o.type == 'CAMERA']) == 4
assert scene.camera.name.startswith('Initial |')
assert any(o.type == 'EMPTY' and 'georeferenced surface marker' in o.name for o in scene.objects)
images = [n.image for n in terrain.data.materials[0].node_tree.nodes if n.type == 'TEX_IMAGE']
assert len(images) == 3 and all(im.packed_file for im in images)
points = [o.matrix_world @ v.co for o in parts for v in o.data.vertices]
height = max(p.z for p in points) - min(p.z for p in points)
assert abs(height - 1.7) < 0.001
frame_checks = []
for width, height_px in [(1280, 900), (390, 844)]:
    scene.render.resolution_x, scene.render.resolution_y = width, height_px
    projected = [world_to_camera_view(scene, scene.camera, p) for p in points]
    assert all(0 < p.x < 1 and 0 < p.y < 1 and p.z > 0 for p in projected)
    frame_checks.append({'resolution': [width, height_px], 'fullBodyVisible': True})
scene.render.resolution_x, scene.render.resolution_y = 1280, 900
camera = scene.camera
hit, point, _, _ = terrain.ray_cast(Vector((camera.location.x, camera.location.y, 100)), Vector((0, 0, -1)))
assert hit and abs(camera.location.z - point.z - 1.65) < 0.001
metadata_path = args.repo / 'public/terrain/shackleton-rim.metadata.json'
try:
    meta = json.loads(metadata_path.read_text())
except (OSError, ValueError) as exc:
    raise ValueError('Cannot read delivered metadata') from exc
if args.normalize:
    text = bpy.data.texts[scene['metadata_text']]
    text.clear()
    text.write(json.dumps(meta, indent=2))
    for o in scene.objects:
        o.select_set(False)
    terrain.select_set(True)
    bpy.context.view_layer.objects.active = terrain
    for area in bpy.context.screen.areas if bpy.context.screen else []:
        if area.type == 'VIEW_3D':
            area.spaces.active.clip_start = 0.05
            area.spaces.active.clip_end = 30000
            area.spaces.active.region_3d.view_perspective = 'CAMERA'
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath, compress=True)
    blend = Path(bpy.data.filepath)
    meta['artifacts']['blend'].update({'bytes': blend.stat().st_size,
        'sha256': hashlib.sha256(blend.read_bytes()).hexdigest(), 'normalizedStartupFile': True})
    metadata_path.write_text(json.dumps(meta, indent=2, allow_nan=False) + '\n')
report = {'status': 'passed', 'freshProcessReopen': True, 'blenderVersion': bpy.app.version_string,
          'sceneCount': 1, 'vertices': len(terrain.data.vertices), 'triangles': len(terrain.data.polygons),
          'astronautMeshParts': len(parts), 'astronautHeightM': height, 'packedTerrainImages': len(images),
          'cameraHeightAboveMeshM': camera.location.z - point.z, 'framing': frame_checks,
          'activeCamera': camera.name, 'blendSha256': hashlib.sha256(Path(bpy.data.filepath).read_bytes()).hexdigest()}
(args.repo / 'assets/terrain/shackleton-rim/scene-check.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
