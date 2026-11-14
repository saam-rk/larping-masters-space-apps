"""Append the supplied 1.70 m astronaut beside Nobile Rim 1's ground camera.

Run in Blender with the terrain scene active. Does not modify terrain geometry,
source astronaut, existing cameras, other scenes or the terrain-only web GLB.
"""

import hashlib
import json
import math
from pathlib import Path
from typing import Any, cast

# pi-lens-ignore: reportMissingImports
import bpy

# pi-lens-ignore: reportMissingImports
from bpy_extras.object_utils import world_to_camera_view

# pi-lens-ignore: reportMissingImports
from mathutils import Matrix, Vector

COLLECTION = 'Astronaut_scale_reference'
HEIGHT_M = 1.70


def bounds_points(collection):
    return [obj.matrix_world @ Vector(corner) for obj in collection.all_objects
            if obj.type == 'MESH' for corner in obj.bound_box]


def add_astronaut(repository):
    repository = Path(repository)
    source = repository / 'docs/research/site-terrain/nobile-rim-2/astronaut.blend'
    editable = repository / 'assets/terrain/nobile-rim-1/nobile-rim-1.blend'
    web = repository / 'public/terrain/nobile-rim-1.astronaut.glb'
    metadata_path = repository / 'public/terrain/nobile-rim-1.metadata.json'
    try:
        metadata = json.loads(metadata_path.read_text(encoding='utf-8'))
    except (OSError, ValueError) as exc:
        raise ValueError('Cannot read terrain metadata') from exc
    scene = bpy.context.scene
    if not scene.name.startswith('nobile-rim-1 |'):
        raise ValueError('Activate the Nobile Rim 1 terrain scene first')
    # Legacy deliveries have no role tag; accept Blender's numeric name suffixes.
    terrains = [obj for obj in scene.objects if obj.type == 'MESH'
                and (obj.get('terrain_role') == 'surface' or obj.name.split('.')[0] == 'Terrain')]
    if len(terrains) != 1:
        raise ValueError('Expected exactly one terrain surface in the active scene')
    terrain = terrains[0]
    camera = next(obj for obj in scene.objects if obj.type == 'CAMERA' and obj.name.startswith('Ground'))
    if scene.unit_settings.scale_length != 1 or terrain.matrix_world != Matrix.Identity(4):
        raise ValueError('Expected untransformed terrain in meters')

    collections = [child for child in scene.collection.children
                   if child.get('terrain_role') == 'scale_reference' or child.name.split('.')[0] == COLLECTION]
    if len(collections) > 1:
        raise ValueError('Ambiguous astronaut collections in the active scene')
    collection = collections[0] if collections else None
    if collection is None:
        with bpy.data.libraries.load(str(source), link=False) as (src, dst):
            if COLLECTION not in src.collections:
                raise ValueError('Source astronaut collection not found')
            dst.collections = [COLLECTION]
        collection = cast(Any, dst.collections[0])
        scene.collection.children.link(collection)
    collection['terrain_role'] = 'scale_reference'
    roots = [obj for obj in collection.all_objects if obj.parent is None]
    meshes = [obj for obj in collection.all_objects if obj.type == 'MESH']
    if len(roots) != 1 or len(meshes) != 13 or roots[0].name.split('.')[0] != 'Astronaut_1p70m':
        raise ValueError('Unexpected astronaut hierarchy; refusing to edit it')
    root = roots[0]
    if tuple(root.scale) != (1, 1, 1):
        raise ValueError('Keep the supplied astronaut at its original scale')

    forward = camera.rotation_euler.to_quaternion() @ Vector((0, 0, -1))
    right = camera.rotation_euler.to_quaternion() @ Vector((1, 0, 0))
    forward.z = right.z = 0
    forward.normalize()
    right.normalize()
    # Left foreground, clear of the central ridge sightline. Camera is unchanged.
    position = camera.location + 9 * forward - 3 * right
    ray_top = max((terrain.matrix_world @ Vector(c)).z for c in terrain.bound_box) + 10

    def surface_height(x, y):
        hit, point, _, _ = terrain.ray_cast(Vector((x, y, ray_top)), Vector((0, 0, -1)))
        if not hit:
            raise ValueError('No terrain beneath astronaut footprint')
        return point.z

    position.z = surface_height(position.x, position.y)
    root.location = position
    toward_camera = camera.location - position
    root.rotation_euler = (0, 0, math.atan2(toward_camera.x, -toward_camera.y))
    bpy.context.view_layer.update()
    points = bounds_points(collection)
    height = max(p.z for p in points) - min(p.z for p in points)
    if abs(height - HEIGHT_M) > 0.001:
        raise ValueError(f'Supplied astronaut is not 1.70 m tall: {height}')
    # Rigid, flat boot soles cannot conform to a sloped triangle. Raise the whole
    # figure minimally until no sole corner penetrates it; never distort the mesh.
    soles = [obj.matrix_world @ vertex.co for obj in meshes if 'boot_' in obj.name
             for vertex in obj.data.vertices if vertex.co.z < -0.079]
    if len(soles) != 8:
        raise ValueError('Unexpected boot sole geometry')
    lift = max(surface_height(p.x, p.y) - p.z for p in soles)
    root.location.z += lift
    bpy.context.view_layer.update()
    points = bounds_points(collection)
    frame = [world_to_camera_view(scene, camera, p) for p in points]
    if not all(0 < p.x < 1 and 0 < p.y < 1 and camera.data.clip_start < p.z < camera.data.clip_end for p in frame):
        raise ValueError('Astronaut does not fit completely in the ground camera')
    root['reference_height_m'] = HEIGHT_M
    root['source_blend'] = source.relative_to(repository).as_posix()
    root['camera_forward_offset_m'] = 9.0
    root['camera_right_offset_m'] = -3.0
    root['sole_lift_above_center_surface_m'] = lift
    root['purpose'] = 'Illustrative human scale; not surveyed terrain or a visibility calculation'

    selected = list(bpy.context.selected_objects)
    active = bpy.context.view_layer.objects.active
    astronaut_objects = set(collection.all_objects)
    try:
        for obj in scene.objects:
            obj.select_set(obj in astronaut_objects)
        bpy.context.view_layer.objects.active = root
        bpy.ops.export_scene.gltf(
            filepath=str(web), export_format='GLB', use_selection=True, use_active_scene=True,
            export_yup=True, export_animations=False, export_cameras=False, export_lights=False,
            export_extras=False, export_texcoords=False, export_vertex_color='NONE',
            export_draco_mesh_compression_enable=False,
        )
    finally:
        for obj in scene.objects:
            obj.select_set(obj in selected)
        bpy.context.view_layer.objects.active = active

    text = bpy.data.texts.get(scene.get('metadata_text', ''))
    bpy.data.libraries.write(str(editable), {scene, text} if text else {scene}, fake_user=True, compress=True)
    metadata['artifacts']['blend'].update({
        'bytes': editable.stat().st_size,
        'sha256': hashlib.sha256(editable.read_bytes()).hexdigest(),
        'normalizedStartupFile': False,
    })
    metadata['scaleReference'] = {
        'source': source.relative_to(repository).as_posix(),
        'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'sourceLicense': 'Original team asset per integrator confirmation; no separate asset license selected',
        'sourceAuthorship': 'Integrator confirms creating the astronaut with AI assistance in another session (PR #13 follow-up)',
        'rootName': root.name,
        'heightM': HEIGHT_M, 'scale': list(root.scale),
        'blenderPositionM': list(root.location),
        'glbPositionM': [root.location.x, root.location.z, -root.location.y],
        'placement': '9 m forward and 3 m left of the ground camera, in projected XY',
        'soleLiftAboveCenterSurfaceM': lift,
        'groundCamera': {
            'name': camera.name,
            'blenderPositionM': list(camera.location),
            'blenderQuaternionWXYZ': list(camera.rotation_euler.to_quaternion()),
            'glbPositionM': [camera.location.x, camera.location.z, -camera.location.y],
            'glbLookDirection': list(camera.rotation_euler.to_quaternion() @ Vector((0, 0, -1))),
            'verticalFovDeg': math.degrees(2 * math.atan(abs(
                camera.data.view_frame(scene=scene)[0].y / camera.data.view_frame(scene=scene)[0].z))),
            'aspect': scene.render.resolution_x / scene.render.resolution_y,
        },
        'webAsset': {'filename': web.name, 'bytes': web.stat().st_size,
                     'sha256': hashlib.sha256(web.read_bytes()).hexdigest(),
                     'coordinates': 'Same origin and meters as terrain GLB; placement already baked into root transform'},
        'limits': 'Illustrative rigid boots on simplified sloped terrain; no terrain/astronaut rescaling. App integration pending.',
    }
    # Convert the direction from Blender Z-up to glTF Y-up, as for positions.
    direction = metadata['scaleReference']['groundCamera']['glbLookDirection']
    direction[:] = [direction[0], direction[2], -direction[1]]
    metadata_path.write_text(json.dumps(metadata, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    print(json.dumps(metadata['scaleReference'], indent=2))
    return root
