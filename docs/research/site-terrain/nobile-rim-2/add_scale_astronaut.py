"""Add a simple 1.70 m astronaut scale reference to the Nobile Rim 2 scene.

Run inside Blender with the Nobile Rim 2 .blend open. The web GLB remains
terrain-only; this figure is an illustrative scale reference in the .blend.
"""

import bpy
from mathutils import Vector


COLLECTION_NAME = "Astronaut_scale_reference"
TERRAIN_NAME = "Terrain_nobile-rim-2"
SITE_MARKER_NAME = "Marker_nobile-rim-2"
HEIGHT_M = 1.70
OFFSET_FROM_SITE_M = (25.0, 0.0)


def material(name, color, metallic=0.0, roughness=0.75):
    existing = bpy.data.materials.get(name)
    mat = existing or bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = next(node for node in mat.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    mat.diffuse_color = (*color, 1.0)
    return mat


def put_in_collection(obj, collection, root, mat):
    for previous in list(obj.users_collection):
        previous.objects.unlink(obj)
    collection.objects.link(obj)
    obj.parent = root
    obj.data.materials.append(mat)
    return obj


def cube(name, position, dimensions, collection, root, mat):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = put_in_collection(bpy.context.object, collection, root, mat)
    obj.name = name
    obj.location = position
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj


def sphere(name, position, scale, collection, root, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=1)
    obj = put_in_collection(bpy.context.object, collection, root, mat)
    obj.name = name
    obj.location = position
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj


def limb(name, start, end, radius, collection, root, mat):
    direction = Vector(end) - Vector(start)
    midpoint = (Vector(start) + Vector(end)) / 2
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=radius, depth=direction.length)
    obj = put_in_collection(bpy.context.object, collection, root, mat)
    obj.name = name
    obj.location = midpoint
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    return obj


def build():
    terrain = bpy.data.objects.get(TERRAIN_NAME)
    site = bpy.data.objects.get(SITE_MARKER_NAME)
    if terrain is None or site is None or terrain.type != "MESH":
        raise RuntimeError("Open the editable Nobile Rim 2 terrain scene first")
    if len(bpy.data.scenes) != 1 or bpy.context.scene.name != "nobile-rim-2":
        raise RuntimeError("Open the isolated Nobile Rim 2 .blend before saving")
    if tuple(round(value, 6) for value in terrain.scale) != (1.0, 1.0, 1.0):
        raise RuntimeError("Terrain scale changed; placement needs review")

    x = site.location.x + OFFSET_FROM_SITE_M[0]
    y = site.location.y + OFFSET_FROM_SITE_M[1]
    hit, surface, _, _ = terrain.ray_cast(Vector((x, y, 2000)), Vector((0, 0, -1)))
    if not hit:
        raise RuntimeError("No terrain below the scale reference")

    old = bpy.data.collections.get(COLLECTION_NAME)
    if old:
        for obj in list(old.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(old)
    collection = bpy.data.collections.new(COLLECTION_NAME)
    bpy.context.scene.collection.children.link(collection)

    root = bpy.data.objects.new("Astronaut_1p70m", None)
    collection.objects.link(root)
    root.location = (x, y, surface.z)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 0.35
    root["reference_height_m"] = HEIGHT_M
    root["purpose"] = "Human scale reference; illustrative, not a site survey"
    root["terrain_surface_z_m"] = float(surface.z)
    root["site_offset_xy_m"] = list(OFFSET_FROM_SITE_M)

    suit = material("Astronaut_suit_off_white", (0.70, 0.73, 0.70))
    trim = material("Astronaut_trim_dark", (0.11, 0.14, 0.16))
    visor = material("Astronaut_visor_muted_gold", (0.28, 0.22, 0.12), metallic=0.25)
    pack = material("Astronaut_pack_grey", (0.34, 0.38, 0.37))

    # Local Z is measured from the soles. The helmet top is exactly 1.70 m.
    for side, sign in (("L", -1), ("R", 1)):
        limb(f"Astronaut_leg_{side}", (sign * 0.12, 0, 0.16),
             (sign * 0.12, 0, 0.88), 0.09, collection, root, suit)
        cube(f"Astronaut_boot_{side}", (sign * 0.12, -0.055, 0.08),
             (0.22, 0.34, 0.16), collection, root, trim)
        limb(f"Astronaut_arm_{side}", (sign * 0.27, 0, 1.34),
             (sign * 0.39, -0.01, 0.93), 0.085, collection, root, suit)
        sphere(f"Astronaut_glove_{side}", (sign * 0.39, -0.01, 0.92),
               (0.095, 0.09, 0.10), collection, root, trim)

    cube("Astronaut_torso", (0, 0, 1.135), (0.47, 0.30, 0.56), collection, root, suit)
    cube("Astronaut_backpack", (0, 0.235, 1.15), (0.36, 0.18, 0.43), collection, root, pack)
    limb("Astronaut_neck", (0, 0, 1.40), (0, 0, 1.52), 0.12, collection, root, trim)
    sphere("Astronaut_helmet", (0, 0, 1.515), (0.195, 0.195, 0.185), collection, root, suit)
    sphere("Astronaut_visor", (0, -0.169, 1.53), (0.15, 0.052, 0.105),
           collection, root, visor)

    bpy.context.view_layer.update()
    points = [obj.matrix_world @ Vector(corner) for obj in collection.objects
              if obj.type == "MESH" for corner in obj.bound_box]
    bottom = min(point.z for point in points)
    top = max(point.z for point in points)
    height = top - bottom
    if abs(height - HEIGHT_M) > 0.001 or abs(bottom - surface.z) > 0.001:
        raise RuntimeError(f"Astronaut bounds are incorrect: {bottom=}, {top=}, {height=}")

    bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
    print(f"Saved {bpy.data.filepath}")
    print(f"Astronaut position: ({x:.3f}, {y:.3f}, {surface.z:.3f}) m")
    print(f"Astronaut world height: {height:.3f} m; feet at terrain Z {bottom:.3f} m")
    print(f"Astronaut mesh parts: {sum(obj.type == 'MESH' for obj in collection.objects)}")


if __name__ == "__main__":
    build()
