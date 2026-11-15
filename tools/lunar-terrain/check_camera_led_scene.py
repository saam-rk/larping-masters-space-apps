"""Reopen/normalize a delivered camera-led .blend in a fresh background process.

Site-agnostic version of `check_shackleton_scene.py` plus the skyline check of
`check_shackleton_skyline.py`; expected counts and crop bounds come from the
delivered metadata. The skyline check is a rendering-artifact check, not a
physical lunar horizon or visibility calculation.
"""
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

SKYLINE_INSET_M = 100


def skyline(scene, terrain, bounds):
    """22-step binary ray search per sampled screen column of the saved views."""
    previous = (scene.render.resolution_x, scene.render.resolution_y)
    scene.render.resolution_x, scene.render.resolution_y = 1280, 900
    min_x, min_y, max_x, max_y = bounds
    rows = []
    for camera in [o for o in scene.objects if o.type == 'CAMERA' and
                   (o.name.startswith('Initial |') or o.name.startswith('Shifted |'))]:
        corners = camera.data.view_frame(scene=scene)
        for u in [0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95]:
            low, high, last = 0.0, 1.0, None
            for _ in range(22):
                v = (low + high) / 2
                x = min(p.x for p in corners) + (max(p.x for p in corners) - min(p.x for p in corners)) * u
                y = min(p.y for p in corners) + (max(p.y for p in corners) - min(p.y for p in corners)) * v
                direction = camera.matrix_world.to_quaternion() @ Vector((x, y, corners[0].z)).normalized()
                hit, point, _, _ = terrain.ray_cast(camera.location, direction, distance=30000)
                if hit:
                    low, last = v, point
                else:
                    high = v
            assert last is not None
            # Distinguish an actual distant ridge from the rectangular crop edge.
            near_boundary = (last.x < min_x + SKYLINE_INSET_M or last.x > max_x - SKYLINE_INSET_M
                             or last.y < min_y + SKYLINE_INSET_M or last.y > max_y - SKYLINE_INSET_M)
            rows.append({'camera': camera.name, 'screenU': u, 'skylineV': low,
                         'distanceM': (last - camera.location).length,
                         'hitBlenderM': list(last), 'within100MOfCropBoundary': near_boundary})
            assert not near_boundary, rows[-1]
    scene.render.resolution_x, scene.render.resolution_y = previous
    return {'status': 'passed', 'method': '22-step binary ray search per sampled screen column, actual reimported terrain',
            'limitations': '14 columns in two saved landscape cameras; not an exhaustive horizon calculation or unrestricted-camera guarantee',
            'samples': rows}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, required=True)
    parser.add_argument('--normalize', action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    assert bpy.app.background, 'Never normalize the user live session'
    scene = bpy.context.scene
    assert len(bpy.data.scenes) == 1
    site_id = scene['terrain_asset_id']
    output = args.repo / 'assets/terrain' / site_id
    metadata_path = args.repo / 'public/terrain' / f'{site_id}.metadata.json'
    try:
        meta = json.loads(metadata_path.read_text(encoding='utf-8'))
    except (OSError, ValueError) as exc:
        raise ValueError('Cannot read delivered metadata') from exc
    eye_m = meta['initialCamera']['heightAboveFinalMeshM']
    terrain = next(o for o in scene.objects if o.get('terrain_role') == 'surface')
    parts = [o for o in scene.objects if o.type == 'MESH' and o != terrain]
    assert len(parts) == 13
    assert len(terrain.data.vertices) == meta['blenderRoundTrip']['vertices']
    assert len(terrain.data.polygons) == meta['blenderRoundTrip']['triangles']
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
    hit, point, _, _ = terrain.ray_cast(Vector((camera.location.x, camera.location.y, 10000)), Vector((0, 0, -1)))
    assert hit and abs(camera.location.z - point.z - eye_m) < 0.001
    origin = meta['origin']
    min_x, min_y, max_x, max_y = meta['coverage']['meshPixelCenterBoundsM']
    bounds = [min_x - origin['projectedXM'], min_y - origin['projectedYM'],
              max_x - origin['projectedXM'], max_y - origin['projectedYM']]
    skyline_report = skyline(scene, terrain, bounds)
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
        metadata_path.write_text(json.dumps(meta, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    report = {'status': 'passed', 'freshProcessReopen': True, 'blenderVersion': bpy.app.version_string,
              'sceneCount': 1, 'vertices': len(terrain.data.vertices), 'triangles': len(terrain.data.polygons),
              'astronautMeshParts': len(parts), 'astronautHeightM': height, 'packedTerrainImages': len(images),
              'cameraHeightAboveMeshM': camera.location.z - point.z, 'framing': frame_checks,
              'activeCamera': camera.name, 'blendSha256': hashlib.sha256(Path(bpy.data.filepath).read_bytes()).hexdigest()}
    (output / 'scene-check.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    (output / 'skyline-check.json').write_text(json.dumps(skyline_report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({**report, 'skylineSamples': len(skyline_report['samples']),
                      'skylineDistancesM': [round(r['distanceM']) for r in skyline_report['samples']]}, indent=2))


main()
