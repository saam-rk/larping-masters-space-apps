"""Convert the isolated scene library into a normal editable startup file.

Run only in a disposable background Blender opened on the generated .blend.
This does not touch the user's connected Blender or its pre-existing scenes.
"""

from pathlib import Path

import bpy

assert bpy.app.background, "Run in a separate background Blender"
scene = bpy.data.scenes["nobile-rim-2"]
assert len(bpy.data.scenes) == 1
bpy.context.window.scene = scene
scene.camera = scene.objects["Camera_overview"]
terrain = scene.objects["Terrain_nobile-rim-2"]
for obj in bpy.context.view_layer.objects:
    obj.select_set(False)
terrain.select_set(True)
bpy.context.view_layer.objects.active = terrain
for area in bpy.context.screen.areas if bpy.context.screen else []:
    if area.type == "VIEW_3D":
        area.spaces.active.clip_start = 1
        area.spaces.active.clip_end = 100000
        area.spaces.active.region_3d.view_perspective = "CAMERA"
bpy.context.preferences.filepaths.save_version = 0
path = Path(bpy.data.filepath)
bpy.ops.wm.save_as_mainfile(filepath=str(path))
print("Normalized editable file:", path)
