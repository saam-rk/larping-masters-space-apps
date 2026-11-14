"""Reimport actual GLBs into an isolated scene and render a review image."""

import hashlib
import json
import struct
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "assets/celestial-bodies"
OUTPUT = ROOT / "public/models/celestial"
scene = bpy.data.scenes.new("Celestial_Export_Review")
bpy.context.window.scene = scene
records = []
for index, name in enumerate(("sun", "earth", "moon")):
    path = OUTPUT / (name + ".glb")
    data = path.read_bytes()
    magic, version, size = struct.unpack_from("<4sII", data)
    assert magic == b"glTF" and version == 2 and size == len(data)
    assert size < 2 * 1024 * 1024
    json_size = struct.unpack_from("<I", data, 12)[0]
    gltf = json.loads(data[20:20 + json_size])
    assert len(gltf["meshes"]) == 1 and len(gltf["materials"]) == 1
    assert len(gltf["nodes"]) == 1 and len(gltf["scenes"]) == 1
    assert all("uri" not in item for item in gltf["images"] + gltf["buffers"])
    assert "animations" not in gltf and "cameras" not in gltf and "skins" not in gltf
    before = set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    imported = set(scene.objects) - before
    assert len(imported) == 1
    obj = imported.pop()
    assert obj.type == "MESH" and len(obj.data.materials) == 1
    obj.name = "Review_" + name.title()
    mesh = obj.data
    mesh.calc_loop_triangles()
    assert all(p.normal.dot(p.center) > 0 for p in mesh.polygons), "Inward-facing polygon"
    assert all(t.area > 1e-10 for t in mesh.loop_triangles), "Degenerate triangle"
    material = mesh.materials[0]
    textures = [n.image for n in material.node_tree.nodes if n.type == "TEX_IMAGE"]
    assert textures and all(image.size[0] > 0 and len(image.pixels) > 0 and image.has_data for image in textures)
    pbr = gltf["materials"][0]
    if name == "moon":
        assert "normalTexture" in pbr
    if name == "sun":
        assert "emissiveTexture" in pbr
    radii = [v.co.length for v in mesh.vertices]
    records.append({
        "file": path.name, "bytes": size, "sha256": hashlib.sha256(data).hexdigest(),
        "triangles": len(mesh.loop_triangles), "vertices": len(mesh.vertices),
        "meshes": 1, "materials": 1, "embeddedImages": len(gltf["images"]),
        "extensionsRequired": gltf.get("extensionsRequired", []),
        "radiusRange": [min(radii), max(radii)],
        "decodedTextureSizes": [list(image.size) for image in textures],
        "outwardFaces": True, "nondegenerateTriangles": True,
        "noExternalDependencies": True, "blenderReimportPassed": True,
    })
    obj.location = (0, (index - 1) * 2.8, 0)

world = bpy.data.worlds.new("Celestial_Review_World")
world.use_nodes = True
background = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
background.inputs["Color"].default_value = (0.012, 0.018, 0.03, 1)
background.inputs["Strength"].default_value = 0.25
scene.world = world
light_data = bpy.data.lights.new("Celestial_Review_Key", "AREA")
light_data.energy = 1800
light_data.shape = next(i.identifier for i in light_data.bl_rna.properties["shape"].enum_items if i.identifier == "DISK")
light_data.size = 5
light = bpy.data.objects.new("Celestial_Review_Key", light_data)
scene.collection.objects.link(light)
light.location = (5, -4, 6)
light.rotation_euler = (-light.location).to_track_quat("-Z", "Y").to_euler()
camera_data = bpy.data.cameras.new("Celestial_Review_Camera")
camera = bpy.data.objects.new("Celestial_Review_Camera", camera_data)
scene.collection.objects.link(camera)
camera.location = (12, 0, 2.7)
camera.rotation_euler = (Vector((0, 0, 0)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.type = next(i.identifier for i in camera_data.bl_rna.properties["type"].enum_items if i.identifier == "ORTHO")
camera_data.ortho_scale = 9
scene.camera = camera
scene.render.resolution_x = 1440
scene.render.resolution_y = 600
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = next(i.identifier for i in scene.render.image_settings.bl_rna.properties["file_format"].enum_items if i.identifier == "PNG")
scene.render.filepath = str(ASSETS / "preview.png")
bpy.ops.render.render(write_still=True)
report = {
    "blenderVersion": bpy.app.version_string, "allPassed": True, "assets": records,
    "preview": "preview.png", "previewOrderLeftToRight": ["Sun", "Earth", "Moon"],
    "limits": "Equal presentation sizes, not physical scale. Blender checks only; no browser/mobile FPS measurement.",
}
(ASSETS / "validation.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
