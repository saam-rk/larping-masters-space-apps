"""Run in a separate background Blender, never the user's live session."""
from pathlib import Path
import json
import bpy

root=Path(__file__).resolve().parents[2]
scene=next(s for s in bpy.data.scenes if s.name.startswith('Apollo 11 | LROC'))
bpy.context.window.scene=scene
for other in list(bpy.data.scenes):
    if other!=scene: bpy.data.scenes.remove(other)
scene.camera=next(o for o in scene.objects if o.type=='CAMERA' and o.name.startswith('Terrain overview'))
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_perspective='CAMERA'
            area.spaces.active.shading.type='MATERIAL'
bpy.context.preferences.filepaths.save_version=0
output=root/'public/terrain/apollo-11.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(output),compress=True)
import shutil
shutil.copy2(output,root/'assets/terrain/apollo-11/apollo-11.blend')
report={'activeScene':scene.name,'camera':scene.camera.name,
    'meshes':sum(o.type=='MESH' for o in scene.objects),
    'packedImages':sum(bool(im.packed_file) for im in bpy.data.images)}
assert report['meshes']==1 and report['packedImages']>=3
(root/'assets/terrain/apollo-11/blend-check.json').write_text(json.dumps(report,indent=2)+'\n')
print(report)
