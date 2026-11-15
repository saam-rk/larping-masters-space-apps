"""Execute through Blender MCP; create an isolated scene and verify GLB roundtrip."""
from pathlib import Path
import json
import hashlib
import bpy
import numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/terrain/apollo-11'
meta = json.loads((OUT / 'metadata.json').read_text())
data = np.load(OUT / 'mesh-input.npz')
vertices, faces = data['vertices'], data['faces']
scene = bpy.data.scenes.new('Apollo 11 | LROC 2 m terrain')
bpy.context.window.scene = scene
scene.unit_settings.scale_length = 1
mesh = bpy.data.meshes.new('Continuous LROC stereo surface')
mesh.from_pydata(vertices.tolist(), [], faces.tolist())
mesh.update()
assert not mesh.validate()
terrain = bpy.data.objects.new('Apollo 11 terrain', mesh)
scene.collection.objects.link(terrain)
for face in mesh.polygons:
    face.use_smooth = True
uv = mesh.uv_layers.new(name='50 m near-field atlas')
for loop in mesh.loops:
    p = mesh.vertices[loop.vertex_index].co
    uv.data[loop.index].uv = (p.x / 50 + .5, p.y / 50 + .5)
mat = bpy.data.materials.new('Matte lunar regolith | illustrative grain')
mat.use_nodes = True
nodes, links = mat.node_tree.nodes, mat.node_tree.links
shader = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
shader.inputs['Metallic'].default_value = 0
for filename, kind in [('regolith-color.jpg','color'),('regolith-normal.jpg','normal'),('regolith-orm.png','orm')]:
    image = bpy.data.images.load(str(OUT / filename), check_existing=False)
    if kind != 'color':
        image.colorspace_settings.name = 'Non-Color'
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = image
    tex.extension = 'EXTEND'
    if kind == 'color':
        links.new(tex.outputs['Color'], shader.inputs['Base Color'])
    elif kind == 'normal':
        normal = nodes.new('ShaderNodeNormalMap')
        normal.inputs['Strength'].default_value = 2.0
        links.new(tex.outputs['Color'], normal.inputs['Color'])
        links.new(normal.outputs['Normal'], shader.inputs['Normal'])
    else:
        separate = nodes.new('ShaderNodeSeparateColor')
        links.new(tex.outputs['Color'], separate.inputs['Color'])
        links.new(separate.outputs['Green'], shader.inputs['Roughness'])
        links.new(separate.outputs['Blue'], shader.inputs['Metallic'])
mesh.materials.append(mat)
terrain.select_set(True)
bpy.context.view_layer.objects.active = terrain
glb = ROOT / 'public/terrain/apollo-11.glb'
bpy.ops.export_scene.gltf(filepath=str(glb), use_selection=True, use_active_scene=True,
    export_animations=False, export_cameras=False, export_lights=False,
    export_tangents=False, export_draco_mesh_compression_enable=False)
assert glb.stat().st_size <= 2097152, glb.stat().st_size
scene.collection.objects.unlink(terrain)
bpy.ops.import_scene.gltf(filepath=str(glb))
terrain = next(o for o in scene.objects if o.type == 'MESH')
mesh = terrain.data
mesh.calc_loop_triangles()
assert len(mesh.vertices) == len(vertices)
assert len(mesh.loop_triangles) == len(faces)
tree = KDTree(len(vertices))
for i, p in enumerate(vertices): tree.insert(Vector(p), i)
tree.balance()
error = max(tree.find(terrain.matrix_world @ v.co)[2] for v in mesh.vertices)
assert error < .002
assert any(n.type == 'NORMAL_MAP' for n in mesh.materials[0].node_tree.nodes)
world = bpy.data.worlds.new('Illustrative lighting')
world.use_nodes = True
scene.world = world
bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
bg.inputs['Color'].default_value = (.035,.035,.035,1)
bg.inputs['Strength'].default_value = .3
sun_data = bpy.data.lights.new('Illustrative Sun, not historical ephemeris', 'SUN')
sun_data.energy = 3
sun = bpy.data.objects.new('Illustrative Sun', sun_data)
scene.collection.objects.link(sun)
sun.rotation_euler = (.3,-1.15,-.5)
def ground(x,y):
    hit, point, normal, index = terrain.ray_cast(Vector((x,y,10000)),Vector((0,0,-1)))
    assert hit
    return point.z
marker = bpy.data.objects.new('Apollo 11 LM geographic anchor', None)
scene.collection.objects.link(marker)
marker.location = (0,0,ground(0,0))
marker['latitude_deg'] = meta['latitudeDeg']
marker['longitude_east_deg'] = meta['longitudeEastDeg']
cam_data = bpy.data.cameras.new('Near-field review')
cam = bpy.data.objects.new('Near-field review',cam_data)
scene.collection.objects.link(cam)
cam.location = (0,-8,ground(0,-8)+1.7)
cam.rotation_euler = (Vector((60,0,ground(60,0)+2.0))-cam.location).to_track_quat('-Z','Y').to_euler()
cam_data.lens = 24
cam_data.clip_end = 10000
scene.camera = cam
scene.render.resolution_x, scene.render.resolution_y = 1200, 800
scene.render.resolution_percentage = 100
scene.render.filepath = str(OUT/'preview.png')
bpy.ops.render.render(write_still=True)
cam.name = 'Ground view toward Little West'
overview_data = bpy.data.cameras.new('Terrain overview')
overview = bpy.data.objects.new('Terrain overview', overview_data)
scene.collection.objects.link(overview)
overview.location = (300, -720, 550)
overview.rotation_euler = (Vector((200, 0, -5))-overview.location).to_track_quat('-Z','Y').to_euler()
overview_data.lens = 42
overview_data.clip_end = 10000
scene.camera = overview
scene.render.filepath = str(OUT/'overview.png')
bpy.ops.render.render(write_still=True)
meta['export'] = {'bytes':glb.stat().st_size,'sha256':hashlib.sha256(glb.read_bytes()).hexdigest(),
    'blenderVersion':bpy.app.version_string,'roundtripMaxPositionErrorM':error,
    'compression':None,'normalMapReimported':True}
(OUT/'metadata.json').write_text(json.dumps(meta,indent=2)+'\n')
(ROOT/'public/terrain/apollo-11.metadata.json').write_text(json.dumps(meta,indent=2)+'\n')
for image in bpy.data.images:
    if image.filepath and str(OUT) in bpy.path.abspath(image.filepath): image.pack()
bpy.data.libraries.write(str(OUT/'apollo-11.blend'),{scene}, fake_user=True, compress=True)
import shutil
shutil.copy2(OUT/'apollo-11.blend',ROOT/'public/terrain/apollo-11.blend')
print(json.dumps(meta['export']))
