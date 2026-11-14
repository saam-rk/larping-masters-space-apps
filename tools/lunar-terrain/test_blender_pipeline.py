"""Regression: build twice in one Blender session without touching repository assets.

Run with Blender --background --factory-startup --python-exit-code 1 --python
this_script -- --prepared DIR --output TEMP_DIR. Requires prepared mesh-input.npz.
"""

import argparse
import json
import runpy
import shutil
import subprocess
import sys
from pathlib import Path

# pi-lens-ignore: reportMissingImports
import bpy

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--prepared', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
assert bpy.app.background, 'Run only in a disposable background Blender process'
tools = Path(__file__).resolve().parent
repository = tools.parents[1]
output = args.output.resolve()
assert not output.is_relative_to(repository), 'Keep regression artifacts outside the repository'
output.mkdir(parents=True, exist_ok=False)
source_path = Path('docs/research/site-terrain/nobile-rim-2/astronaut.blend')
(output / source_path).parent.mkdir(parents=True)
shutil.copy2(repository / source_path, output / source_path)
web = output / 'public/terrain'
editable = output / 'assets/terrain/nobile-rim-1'
build = runpy.run_path(str(tools / 'build_blender.py'))['build']
add_astronaut = runpy.run_path(str(tools / 'add_astronaut.py'))['add_astronaut']

first = build(args.prepared, web, editable)
add_astronaut(output)
original_objects = set(first.objects)
original_transforms = {obj: obj.matrix_world.copy() for obj in original_objects}
original_collections = set(first.collection.children)
second = build(args.prepared, web, editable)
terrain = next(obj for obj in second.objects if obj.get('terrain_role') == 'surface')
assert terrain.name != 'Terrain', 'The regression must exercise a real name collision'
# Exercise legacy suffixed assets before exercising role-based custom names.
del terrain['terrain_role']
root = add_astronaut(output)
assert root.name != 'Astronaut_1p70m'
terrain['terrain_role'] = 'surface'
terrain.name = 'Renamed regression surface'
collection = next(child for child in second.collection.children
                  if child.get('terrain_role') == 'scale_reference')
collection.name = 'Renamed regression scale reference'
objects_before_repeat = set(second.objects)
assert add_astronaut(output) == root
assert set(second.objects) == objects_before_repeat, 'Repeated placement duplicated the astronaut'
assert set(first.objects) == original_objects
assert set(first.collection.children) == original_collections
assert all(obj.matrix_world == matrix for obj, matrix in original_transforms.items())
metadata = json.loads((web / 'nobile-rim-1.metadata.json').read_text(encoding='utf-8'))
assert metadata['scaleReference']['rootName'] == root.name

# Reopen only the generated scene in fresh processes, normalize, then reopen again.
for normalize in (True, False):
    command = [bpy.app.binary_path, '--background', str(editable / 'nobile-rim-1.blend'),
               '--python-exit-code', '1', '--python', str(tools / 'check_blend.py'), '--',
               '--report', str(output / ('normalized.json' if normalize else 'reopened.json')),
               '--metadata', str(web / 'nobile-rim-1.metadata.json')]
    if normalize:
        command.append('--normalize')
    subprocess.run(command, check=True)
print(json.dumps({'status': 'passed', 'checks': [
    'two generations with colliding terrain, astronaut collection and root names',
    'legacy suffixed terrain lookup and role-based custom terrain/collection names',
    'repeated astronaut placement is idempotent',
    'original scene objects, collections and transforms unchanged',
    'normalization and fresh reopening pass for the regenerated scene',
], 'output': str(output)}, indent=2))
