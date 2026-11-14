"""Run in Blender through MCP (or blender --background --python this_file).

Build isolated, unit-radius, textured GLBs without changing existing scenes.
Source downloads and attribution are documented in README.md.
"""

import hashlib
import json
import math
import struct
from pathlib import Path

import bpy
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "assets/celestial-bodies"
SOURCES = ASSETS / "sources"
OUTPUT = ROOT / "public/models/celestial"
GENERATED = ASSETS / "generated"
GENERATED.mkdir(exist_ok=True)
OUTPUT.mkdir(parents=True, exist_ok=True)


def enum_value(properties, property_name, identifier):
    """Check Blender's enum values before assigning an identifier."""
    prop = properties[property_name]
    values = [item.identifier for item in prop.enum_items]
    if values and identifier not in values:
        raise ValueError((property_name, identifier, values))
    return identifier


def load_image(path, non_color=False):
    image = bpy.data.images.load(str(path), check_existing=True)
    image.colorspace_settings.name = "Non-Color" if non_color else "sRGB"
    return image


def save_pixels(name, pixels, non_color=False):
    height, width = pixels.shape[:2]
    image = bpy.data.images.new(name, width=width, height=height, alpha=False)
    image.colorspace_settings.name = "Non-Color" if non_color else "sRGB"
    image.pixels.foreach_set(pixels.astype(np.float32).ravel())
    image.filepath_raw = str(GENERATED / (name + ".png"))
    image.file_format = enum_value(bpy.types.Image.bl_rna.properties, "file_format", "PNG")
    image.save()
    return image


dem_image = load_image(SOURCES / "ldem_4.tif", True)
width, height = dem_image.size
dem = np.array(dem_image.pixels[:], dtype=np.float32).reshape(height, width, 4)[:, :, 0]
assert dem.min() < -8 and dem.max() > 10, "Expected float32 elevation in km"

# Blender image rows run south to north. Differentiate height in physical km
# along east/north arcs of a 1737.4 km reference sphere; no artistic exaggeration.
latitude = -math.pi / 2 + (np.arange(height) + 0.5) * math.pi / height
east_spacing = 1737.4 * (2 * math.pi / width) * np.cos(latitude)[:, None]
north_spacing = 1737.4 * math.pi / height
east_slope = (np.roll(dem, -1, axis=1) - np.roll(dem, 1, axis=1)) / (2 * east_spacing)
north_slope = np.gradient(dem, axis=0) / north_spacing
normal = np.stack((-east_slope, -north_slope, np.ones_like(dem)), axis=-1)
normal /= np.linalg.norm(normal, axis=-1, keepdims=True)
# Longitude is undefined at the poles; smoothly flatten the last two rows.
normal[:2] = (0, 0, 1)
normal[-2:] = (0, 0, 1)
rgba = np.ones((height, width, 4), dtype=np.float32)
rgba[:, :, :3] = normal * 0.5 + 0.5
normal_image = save_pixels("moon-normal", rgba, True)


def sample_height(u, v):
    x = (u % 1) * width - 0.5
    y = min(max(v * height - 0.5, 0), height - 1)
    x0, y0 = math.floor(x), math.floor(y)
    tx, ty = x - x0, y - y0
    y1 = min(y0 + 1, height - 1)
    return float((1 - ty) * ((1 - tx) * dem[y0, x0 % width] + tx * dem[y0, (x0 + 1) % width])
                 + ty * ((1 - tx) * dem[y1, x0 % width] + tx * dem[y1, (x0 + 1) % width]))


def sphere(name, segments, rings, relief=False):
    """Explicit UVs: u=.5 at 0E; v=1 at north; Blender +X at 0E."""
    vertices, uv, faces = [], [], []
    for j in range(1, rings):
        v = j / rings
        lat = (v - 0.5) * math.pi
        for i in range(segments + 1):
            u = i / segments
            lon = (u - 0.5) * 2 * math.pi
            radius = 1 + sample_height(u, v) / 1737.4 if relief else 1
            vertices.append((radius * math.cos(lat) * math.cos(lon),
                             radius * math.cos(lat) * math.sin(lon), radius * math.sin(lat)))
            uv.append((u, v))
    for j in range(rings - 2):
        for i in range(segments):
            a = j * (segments + 1) + i
            faces.append((a, a + 1, a + segments + 2, a + segments + 1))
    for north in (False, True):
        v = 1 if north else 0
        radius = 1 + float(dem[-1 if north else 0].mean()) / 1737.4 if relief else 1
        for i in range(segments):
            pole = len(vertices)
            vertices.append((0, 0, radius if north else -radius))
            uv.append(((i + 0.5) / segments, v))
            a = (rings - 2) * (segments + 1) + i if north else i
            faces.append((a, a + 1, pole) if north else (a + 1, a, pole))
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    layer = mesh.uv_layers.new(name="UVMap")
    for loop in mesh.loops:
        layer.data[loop.index].uv = uv[loop.vertex_index]
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj["purpose"] = "Third-person visual asset; not a scientific terrain model"
    obj["referenceRadius"] = 1.0
    return obj


def material(name, color_image, normal_map=None, emissive=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    shader = next(n for n in nodes if n.type == "BSDF_PRINCIPLED")
    shader.inputs["Metallic"].default_value = 0
    shader.inputs["Roughness"].default_value = 1 if normal_map else 0.9
    shader.inputs["Specular IOR Level"].default_value = 0
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = color_image
    links.new(texture.outputs["Color"], shader.inputs["Base Color"])
    if normal_map:
        tex = nodes.new("ShaderNodeTexImage")
        tex.image = normal_map
        norm = nodes.new("ShaderNodeNormalMap")
        links.new(tex.outputs["Color"], norm.inputs["Color"])
        links.new(norm.outputs["Normal"], shader.inputs["Normal"])
    if emissive:
        links.new(texture.outputs["Color"], shader.inputs["Emission Color"])
        shader.inputs["Emission Strength"].default_value = 1
    return mat


# A seamless artistic solar texture sampled in 3D, not an observation.
w, h = 512, 256
u, v = np.meshgrid((np.arange(w) + 0.5) / w, (np.arange(h) + 0.5) / h)
lon, lat = (u - 0.5) * 2 * math.pi, (v - 0.5) * math.pi
x, y, z = np.cos(lat) * np.cos(lon), np.cos(lat) * np.sin(lon), np.sin(lat)
noise = np.zeros_like(x)
rng = np.random.default_rng(42)
for frequency, amplitude in [(12, .4), (30, .25), (65, .2), (110, .15)]:
    for _ in range(12):
        direction = rng.normal(size=3)
        phase = rng.uniform(0, 2 * math.pi)
        noise += amplitude * np.sin(frequency * (direction[0]*x + direction[1]*y + direction[2]*z) + phase)
noise = np.clip(noise * .18 + .5, 0, 1)
solar = np.ones((h, w, 4), dtype=np.float32)
solar[:, :, 0] = 1
solar[:, :, 1] = .4 + .25 * noise
solar[:, :, 2] = .06 + .1 * noise
sun_image = save_pixels("sun-color", solar)

previous_scene = bpy.context.window.scene
report = {"blenderVersion": bpy.app.version_string, "assets": [], "sourceSha256": {}}
for path in SOURCES.iterdir():
    if path.is_file():
        report["sourceSha256"][path.name] = hashlib.sha256(path.read_bytes()).hexdigest()

try:
    for name, segments, rings, image, norm, relief in [
        ("Sun", 48, 24, sun_image, None, False),
        ("Earth", 48, 24, load_image(SOURCES / "bluemarble-1024.png"), None, False),
        ("Moon", 128, 64, load_image(SOURCES / "lroc_color_2k.jpg"), normal_image, True),
    ]:
        scene = bpy.data.scenes.new("Celestial_" + name)
        bpy.context.window.scene = scene
        obj = sphere(name, segments, rings, relief)
        obj.data.materials.append(material(name + "Surface", image, norm, name == "Sun"))
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        path = OUTPUT / (name.lower() + ".glb")
        props = bpy.ops.export_scene.gltf.get_rna_type().properties
        # GLB's dynamic enum does not expose values through enum_items; Blender
        # validates this identifier itself when the operator runs.
        result = bpy.ops.export_scene.gltf(
            filepath=str(path), export_format=enum_value(props, "export_format", "GLB"),
            use_selection=True, use_active_scene=True, export_animations=False, export_cameras=False,
            export_lights=False, export_extras=True, export_tangents=True,
            export_image_format=enum_value(props, "export_image_format", "JPEG"),
            export_jpeg_quality=92, export_image_quality=92,
            export_yup=True,
        )
        assert "FINISHED" in result
        assert path.stat().st_size < 2 * 1024 * 1024, f"{path.name} exceeds 2 MiB"
        binary = path.read_bytes()
        json_size = struct.unpack_from("<I", binary, 12)[0]
        gltf = json.loads(binary[20:20 + json_size])
        assert len(gltf["meshes"]) == 1 and len(gltf["materials"]) == 1
        assert len(gltf["scenes"]) == 1 and len(gltf["nodes"]) == 1
        assert all("bufferView" in image for image in gltf["images"])
        obj.data.calc_loop_triangles()
        report["assets"].append({
            "file": str(path.relative_to(ROOT)).replace("\\", "/"),
            "bytes": path.stat().st_size, "triangles": len(obj.data.loop_triangles),
            "meshCount": 1, "materialCount": 1,
            "textureSizes": [list(image.size)] + ([list(norm.size)] if norm else []),
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        })
finally:
    bpy.context.window.scene = previous_scene

(ASSETS / "build-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
