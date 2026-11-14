"""Build Shackleton through Blender MCP or Blender CLI; preserve live scenes.

Only terrain is exported. The final editable scene and renders use the reimported
terrain GLB plus the existing, unmodified astronaut GLB. No shader-only tricks.
"""
import argparse
import hashlib
import json
import math
import shutil
import sys
from pathlib import Path

# pi-lens-ignore: reportMissingImports
import bpy

# pi-lens-ignore: reportMissingImports
import numpy as np

# pi-lens-ignore: reportMissingImports
from bpy_extras.object_utils import world_to_camera_view

# pi-lens-ignore: reportMissingImports
from mathutils import Matrix, Vector

# pi-lens-ignore: reportMissingImports
from mathutils.bvhtree import BVHTree

# pi-lens-ignore: reportMissingImports
from mathutils.kdtree import KDTree


def write_json(path, value):
    Path(path).write_text(json.dumps(value, indent=2, allow_nan=False) + '\n', encoding='utf-8')


def digest(path):
    path = Path(path)
    return {'filename': path.name, 'bytes': path.stat().st_size,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def camera(scene, name, location, target, vfov=48):
    data = bpy.data.cameras.new(name)
    data.sensor_fit = 'VERTICAL'
    data.sensor_height = 24
    data.lens = 12 / math.tan(math.radians(vfov) / 2)
    data.clip_start, data.clip_end = 0.05, 30000
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    return obj


def glb_vector(value):
    return [float(value[0]), float(value[2]), -float(value[1])]


def build(prepared, repo):
    prepared, repo = Path(prepared), Path(repo)
    web = repo / 'public/terrain'
    output = repo / 'assets/terrain/shackleton-rim'
    output.mkdir(parents=True, exist_ok=True)
    web.mkdir(parents=True, exist_ok=True)
    try:
        meta = json.loads((prepared / 'shackleton-rim.metadata.json').read_text())
    except (OSError, ValueError) as exc:
        raise ValueError('Cannot read prepared Shackleton metadata') from exc
    cfg = meta['generation']['config']['nearDetail']
    with np.load(prepared / 'mesh-input.npz') as data:
        vertices, faces = data['vertices'], data['faces']
    previous = bpy.context.window.scene
    scene = bpy.data.scenes.new('Shackleton Rim | camera-led LOLA terrain')
    bpy.context.window.scene = scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 1280, 900
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = 'AgX'
    scene.world = bpy.data.worlds.new('Shackleton | illustrative fill, not lunar sky')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.025, 0.025, 0.025, 1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.3
    mesh = bpy.data.meshes.new('Shackleton continuous adaptive 5 m sample mesh')
    mesh.from_pydata(vertices.tolist(), [], faces.tolist())
    mesh.update()
    assert not mesh.validate()
    terrain = bpy.data.objects.new('Shackleton terrain', mesh)
    scene.collection.objects.link(terrain)
    terrain['terrain_role'] = 'surface'
    for poly in mesh.polygons:
        poly.use_smooth = True
    origin = meta['origin']
    center = Vector((cfg['centerProjectedM'][0] - origin['projectedXM'],
                     cfg['centerProjectedM'][1] - origin['projectedYM'], 0))
    uv = mesh.uv_layers.new(name='Near-field atlas | meters / 50')
    for loop in mesh.loops:
        pos = mesh.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = ((pos.x - center.x) / 50 + 0.5, (pos.y - center.y) / 50 + 0.5)
    material = bpy.data.materials.new('Matte regolith | illustrative baked grain, no displacement')
    material.use_nodes = True
    material.use_backface_culling = True
    nodes, links = material.node_tree.nodes, material.node_tree.links
    shader = nodes.get('Principled BSDF')
    shader.inputs['Metallic'].default_value = 0
    for filename, kind in [('regolith-color.jpg', 'color'), ('regolith-normal.jpg', 'normal'),
                           ('regolith-orm.png', 'orm')]:
        image = bpy.data.images.load(str(prepared / filename), check_existing=False)
        if kind != 'color':
            image.colorspace_settings.name = 'Non-Color'
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = image
        tex.extension = 'EXTEND'
        tex.interpolation = 'Linear'
        if kind == 'color':
            links.new(tex.outputs['Color'], shader.inputs['Base Color'])
        elif kind == 'normal':
            normal = nodes.new('ShaderNodeNormalMap')
            normal.inputs['Strength'].default_value = 1
            links.new(tex.outputs['Color'], normal.inputs['Color'])
            links.new(normal.outputs['Normal'], shader.inputs['Normal'])
        else:
            separate = nodes.new('ShaderNodeSeparateColor')
            links.new(tex.outputs['Color'], separate.inputs['Color'])
            links.new(separate.outputs['Green'], shader.inputs['Roughness'])
            links.new(separate.outputs['Blue'], shader.inputs['Metallic'])
    mesh.materials.append(material)
    bpy.context.view_layer.objects.active = terrain
    terrain.select_set(True)
    glb = web / 'shackleton-rim.glb'
    bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', use_selection=True,
        use_active_scene=True, export_yup=True, export_normals=True, export_texcoords=True,
        export_tangents=False, export_vertex_color='NONE', export_attributes=False,
        export_animations=False, export_cameras=False, export_lights=False,
        export_extras=False, export_materials='EXPORT', export_image_format='AUTO',
        export_draco_mesh_compression_enable=False)
    assert glb.stat().st_size <= 2097152, f'Terrain budget exceeded: {glb.stat().st_size}'
    # Reimport actual exported terrain before placement, screenshots and .blend save.
    scene.collection.objects.unlink(terrain)
    before = set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(glb))
    imported = list(set(scene.objects) - before)
    assert len(imported) == 1 and imported[0].type == 'MESH'
    terrain = imported[0]
    terrain['terrain_role'] = 'surface'
    terrain.data.calc_loop_triangles()
    points = [terrain.matrix_world @ v.co for v in terrain.data.vertices]
    triangles = [tuple(t.vertices) for t in terrain.data.loop_triangles]
    assert len(points) == len(vertices) and len(triangles) == len(faces)
    tree = KDTree(len(vertices))
    for i, pos in enumerate(vertices):
        tree.insert(Vector(pos.tolist()), i)
    tree.balance()
    correspondence = [tree.find(p) for p in points]
    assert len({entry[1] for entry in correspondence}) == len(vertices)
    residual = max(entry[2] for entry in correspondence)
    assert residual < 0.002
    assert len(terrain.data.uv_layers) == 1
    imported_nodes = terrain.data.materials[0].node_tree.nodes
    assert any(node.type == 'NORMAL_MAP' for node in imported_nodes)
    assert sum(node.type == 'TEX_IMAGE' for node in imported_nodes) == 3
    bvh = BVHTree.FromPolygons(points, triangles, all_triangles=True)

    def surface(x, y):
        hit, normal, face, _ = bvh.ray_cast(Vector((x, y, 10000)), Vector((0, 0, -1)))
        if hit is None:
            raise ValueError('Missing terrain support')
        # BVH locates the triangle; evaluate its plane in double precision rather
        # than retaining cancellation from a 10 km float32 ray origin.
        a, b, c = [np.array(points[i], dtype=np.float64) for i in triangles[face]]
        plane = np.cross(b - a, c - a)
        z = a[2] - (plane[0] * (x - a[0]) + plane[1] * (y - a[1])) / plane[2]
        return Vector((x, y, float(z))), normal, face

    control_positions = {}
    for item in meta['controlPoints']:
        px, py = item['projectedM']
        hit, _, _ = surface(px - origin['projectedXM'], py - origin['projectedYM'])
        control_positions[item['name']] = hit
        item['meshHeightM'] = float(hit.z + origin['radialElevationM'])
        item['meshMinusBilinearM'] = item['meshHeightM'] - item['rasterBilinearM']
    marker = bpy.data.objects.new('shackleton-rim | georeferenced surface marker', None)
    scene.collection.objects.link(marker)
    marker.location = control_positions['site']
    marker.empty_display_type = 'SPHERE'
    marker.empty_display_size = 0.3
    marker.show_in_front = True
    marker['latitude_deg'] = -89.7668
    marker['longitude_east_deg'] = -171.87
    direction = Vector((*cfg['cameraHorizontalDirection'], 0))
    right = direction.cross(Vector((0, 0, 1)))
    _, _, face = surface(center.x, center.y)
    # A triangle centroid keeps both rigid soles away from a slope break, without
    # moving samples or flattening the surface (less than one 5 m source cell).
    a, b, c = (points[i] for i in triangles[face])
    centroid = (a + b + c) / 3
    support, normal, face = surface(centroid.x, centroid.y)
    camera_xy = support - direction * 5 - right * cfg['astronautSideOffsetM']
    camera_ground, _, _ = surface(camera_xy.x, camera_xy.y)
    initial_pos = camera_ground + Vector((0, 0, 1.65))
    astronaut_source = repo / 'docs/research/site-terrain/nobile-rim-2/astronaut.glb'
    astronaut_web = web / 'astronaut.glb'
    shutil.copyfile(astronaut_source, astronaut_web)
    before = set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(astronaut_web))
    astronaut_objects = list(set(scene.objects) - before)
    roots = [o for o in astronaut_objects if o.parent is None]
    assert len(roots) == 1
    root = roots[0]
    # Rigid rotation aligns both soles with the triangle, not a deformed terrain.
    local_y = (direction - normal * direction.dot(normal)).normalized()
    local_x = local_y.cross(normal).normalized()
    rotation = Matrix((local_x, local_y, normal)).transposed()
    root.rotation_mode = 'XYZ'
    root.rotation_euler = rotation.to_euler()
    root.location = support
    bpy.context.view_layer.update()

    def astronaut_vertices():
        return [o.matrix_world @ v.co for o in astronaut_objects if o.type == 'MESH' for v in o.data.vertices]

    p = astronaut_vertices()
    raw_height = max(v.z for v in p) - min(v.z for v in p)
    uniform_scale = 1.7 / raw_height
    root.scale = (uniform_scale,) * 3
    bpy.context.view_layer.update()
    boots = [o for o in astronaut_objects if o.type == 'MESH' and 'boot_' in o.name]
    assert len(boots) == 2
    contacts = []
    for boot in boots:
        low = min(v.co.z for v in boot.data.vertices)
        for vertex in boot.data.vertices:
            if abs(vertex.co.z - low) < 1e-5:
                pos = boot.matrix_world @ vertex.co
                ground, _, _ = surface(pos.x, pos.y)
                contacts.append({'boot': boot.name, 'blenderM': list(pos),
                                 'gapM': float(pos.z - ground.z)})
    assert max(abs(item['gapM']) for item in contacts) < 0.02, contacts
    p = astronaut_vertices()
    height = max(v.z for v in p) - min(v.z for v in p)
    assert abs(height - 1.7) < 0.001
    target = Vector(tuple((min(v[i] for v in p) + max(v[i] for v in p)) / 2 for i in range(3))) - right * 0.18
    initial = camera(scene, 'Initial | 1.65 m above final mesh', initial_pos, target)
    shifted_xy = camera_xy + right * 1.0 - direction * 0.5
    shifted_ground, _, _ = surface(shifted_xy.x, shifted_xy.y)
    shifted = camera(scene, 'Shifted | movement and transition check',
                     shifted_ground + Vector((0, 0, 1.65)), target)
    camera(scene, 'Overview | 10 km crop', (12500, -14000, 12000), (0, 0, -600), 48)
    camera(scene, 'Boot contact | side inspection', support + local_x * 2.4 + normal * 0.3,
                  support + normal * 0.12, 38)
    scene.camera = initial
    light_data = bpy.data.lights.new('Illustrative raking light | NOT ephemeris', 'SUN')
    light_data.energy = 3.0
    light_data.angle = math.radians(0.53)
    light = bpy.data.objects.new(light_data.name, light_data)
    scene.collection.objects.link(light)
    light.rotation_euler = Vector((-0.5, 0.6, -0.65)).to_track_quat('-Z', 'Y').to_euler()
    # Frame evidence for landscape and portrait; include all real mesh vertices.
    framing = []
    for cam in [initial, shifted]:
        for width, height_px in [(1280, 900), (390, 844)]:
            scene.render.resolution_x, scene.render.resolution_y = width, height_px
            bpy.context.view_layer.update()
            projected = [world_to_camera_view(scene, cam, v) for v in p]
            bounds = [[min(v[i] for v in projected), max(v[i] for v in projected)] for i in (0, 1)]
            visible = all(0 < v.x < 1 and 0 < v.y < 1 and v.z > cam.data.clip_start for v in projected)
            assert visible, (cam.name, width, height_px, bounds)
            framing.append({'camera': cam.name, 'resolution': [width, height_px],
                            'normalizedBoundsXY': bounds, 'fullBodyInsideFrame': visible})
    scene.render.resolution_x, scene.render.resolution_y = 1280, 900
    basis = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))
    root_glb = basis @ root.matrix_world @ basis.inverted()
    position, rotation_glb, scale = root_glb.decompose()
    meta['nearDetail'] = {**cfg, 'geometryFullDensityRadiusM': 35,
        'texture': {'type': 'Illustrative deterministic baked regolith; NOT geographic lunar imagery',
                    'seed': 2404, 'normalSize': [2048, 2048], 'colorSize': [512, 512],
                    'roughnessSize': [256, 256], 'normalTexelFootprintM': 50 / 2048,
                    'fade': 'Cubic smoothstep: full to 15 m radius, neutral at 24 m; clamp-to-edge',
                    'displacement': 'none', 'externalTextureBytes': 0,
                    'materialCount': 1, 'normalConvention': 'glTF tangent space +Y',
                    'uv': 'U=(localX-centerX)/50+0.5; V=(localProjectedY-centerY)/50+0.5'}}
    meta['astronaut'] = {'url': '/terrain/astronaut.glb', 'sourcePath': astronaut_source.relative_to(repo).as_posix(),
        **digest(astronaut_web), 'rootName': root.name, 'uniformScale': uniform_scale,
        'translationGlbM': list(position), 'quaternionGlbXYZW': [rotation_glb.x, rotation_glb.y, rotation_glb.z, rotation_glb.w],
        'matrixGlbColumnMajor': [root_glb[r][c] for c in range(4) for r in range(4)],
        'heightWorldVerticalM': height, 'heightAlongBodyAxisM': 1.7 * uniform_scale,
        'heightDefinition': 'Uniformly scaled AFTER rigid slope alignment: world vertical sole-to-helmet bounds = 1.70 m. Pose and materials unchanged.',
        'tiltDeg': math.degrees(normal.angle(Vector((0, 0, 1)))),
        'supportProjectedM': [support.x + origin['projectedXM'], support.y + origin['projectedYM'], support.z + origin['radialElevationM']],
        'supportGlbM': glb_vector(support), 'supportTriangle': face,
        'bootSoleCorners': contacts, 'maxAbsoluteSoleGapM': max(abs(item['gapM']) for item in contacts)}
    meta['initialCamera'] = {'positionGlbM': glb_vector(initial_pos), 'targetGlbM': glb_vector(target),
        'upGlb': [0, 1, 0], 'verticalFovDeg': 48, 'nearM': 0.05, 'farM': 30000,
        'heightAboveFinalMeshM': 1.65, 'movementRadiusM': 2,
        'portraitMovingMinimumFovDeg': 64,
        'movementRule': 'Translate within 2 m in projected XY; re-raycast final terrain and keep 1.65 m vertical clearance. Initial vertical FOV 48 degrees. At portrait aspect < 0.6 and displacement > 1 m, widen vertical FOV to at least 64 degrees to keep the full body framed.',
        'astronautHorizontalDistanceM': float((support - camera_ground).xy.length),
        'shiftedPositionGlbM': glb_vector(shifted.location), 'framingChecks': framing}
    meta['generation']['exportAttributes'] = ['POSITION', 'NORMAL', 'TEXCOORD_0']
    meta['generation']['versions']['blender'] = bpy.app.version_string
    meta['generation']['algorithm'] += '; camera-led full 5 m support and nested seed bands with Gaussian near-field residual priority'
    meta['blenderRoundTrip'] = {'status': 'passed', 'vertices': len(points), 'triangles': len(triangles),
        'bijectiveVertexMatch': True, 'maxNearestVertexResidualM': residual,
        'textureImages': 3, 'normalMapImported': True, 'uvLayers': 1,
        'note': 'Final scene uses reimported GLB, not the source mesh; screenshots therefore exercise exported materials.'}
    meta['artifacts'] = {'glb': digest(glb), 'astronaut': digest(astronaut_web)}
    meta['performance']['initialModelBytes'] = glb.stat().st_size + astronaut_web.stat().st_size
    meta['performance']['initialDownloadScope'] = 'Terrain with all embedded maps plus separate astronaut; metadata accounted separately, app JS/CSS excluded.'
    meta['limitations'] += ['Fine grain is illustrative normal/color detail, not LOLA spatial information.',
        'Rigid astronaut is aligned to a steep surface; no claim of walkability or safe footing.',
        'Saved point lies on sloping terrain near the rim; a 10 km crop does not include the complete 21 km crater.',
        'No live viewer integration or mobile FPS/network benchmark is included.']
    scene['terrain_asset_id'] = 'shackleton-rim'
    scene['metadata_path'] = '/terrain/shackleton-rim.metadata.json'
    scene['limitations'] = 'Illustrative materials/light; projected height field; no physical visibility or landing certification'
    text = bpy.data.texts.new('shackleton-rim.metadata.json')
    text.write(json.dumps(meta, indent=2))
    scene['metadata_text'] = text.name
    # Imported glTF images are packed; no external path is needed by the blend.
    for mat in terrain.data.materials:
        for node in mat.node_tree.nodes:
            if node.type == 'TEX_IMAGE' and node.image.packed_file is None:
                node.image.pack()
    blend = output / 'shackleton-rim.blend'
    bpy.data.libraries.write(str(blend), {scene, text}, fake_user=True, compress=True)
    meta['artifacts']['blend'] = digest(blend)
    write_json(web / 'shackleton-rim.metadata.json', meta)
    write_json(output / 'blender-roundtrip.json', meta['blenderRoundTrip'])
    print(json.dumps({'scene': scene.name, 'preservedScene': previous.name,
                      'artifacts': meta['artifacts'], 'camera': meta['initialCamera'],
                      'astronautHeightM': height, 'soleGapM': meta['astronaut']['maxAbsoluteSoleGapM']}, indent=2))
    return scene


def render_views(scene, output):
    output = Path(output)
    previous_camera = scene.camera
    for label, prefix, dimensions in [
        ('initial', 'Initial |', (1280, 900)), ('shifted', 'Shifted |', (1280, 900)),
        ('boots-side', 'Boot contact |', (1000, 700)), ('mobile', 'Initial |', (390, 844)),
        ('overview', 'Overview |', (1100, 900))]:
        scene.camera = next(o for o in scene.objects if o.type == 'CAMERA' and o.name.startswith(prefix))
        scene.render.resolution_x, scene.render.resolution_y = dimensions
        scene.render.filepath = str(output / f'shackleton-rim.{label}.png')
        scene.render.image_settings.file_format = 'PNG'
        bpy.ops.render.render(write_still=True)
    scene.camera = previous_camera
    scene.render.resolution_x, scene.render.resolution_y = 1280, 900


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prepared', required=True)
    parser.add_argument('--repo', required=True)
    parser.add_argument('--render', action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    scene = build(args.prepared, args.repo)
    if args.render:
        render_views(scene, Path(args.repo) / 'assets/terrain/shackleton-rim')
