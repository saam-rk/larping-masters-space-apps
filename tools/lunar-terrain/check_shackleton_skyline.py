"""Check that sampled visible silhouettes are terrain, not the crop boundary.

Run in Blender with the final scene active. This is a rendering artifact check,
not a physical lunar horizon or visibility calculation.
"""
import argparse
import json
import sys
from pathlib import Path

# pi-lens-ignore: reportMissingImports
import bpy

# pi-lens-ignore: reportMissingImports
from mathutils import Vector


def check(output):
    scene = bpy.context.scene
    terrain = next(o for o in scene.objects if o.get('terrain_role') == 'surface')
    previous = (scene.render.resolution_x, scene.render.resolution_y)
    scene.render.resolution_x, scene.render.resolution_y = 1280, 900
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
            # 100 m inset is conservative: distinguish an actual distant ridge
            # from the rectangular source crop masquerading as a horizon.
            near_boundary = abs(last.x) > 4897.5 or abs(last.y) > 4897.5
            rows.append({'camera': camera.name, 'screenU': u, 'skylineV': low,
                         'distanceM': (last - camera.location).length,
                         'hitBlenderM': list(last), 'within100MOfCropBoundary': near_boundary})
            assert not near_boundary, rows[-1]
    scene.render.resolution_x, scene.render.resolution_y = previous
    report = {'status': 'passed', 'method': '22-step binary ray search per sampled screen column, actual reimported terrain',
              'limitations': '14 columns in two saved landscape cameras; not an exhaustive horizon calculation or unrestricted-camera guarantee',
              'samples': rows}
    Path(output).write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True)
    check(parser.parse_args(sys.argv[sys.argv.index('--') + 1:]).output)
