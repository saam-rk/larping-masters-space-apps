"""Build and inspect terrain in Blender. Requires Blender's bundled numpy only.

MCP: exec(compile(Path(script).read_text(), script, 'exec'), {'__name__': 'terrain_builder'})
Then call build(prepared_directory, web_output_directory, editable_output_directory).
CLI: blender --background --python build_blender.py -- --prepared DIR --web-output DIR --editable-output DIR
"""

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

# These modules are supplied by Blender, not the app's Python interpreter.
# pi-lens-ignore: reportMissingImports
import bpy

# pi-lens-ignore: reportMissingImports
import numpy as np

# pi-lens-ignore: reportMissingImports
from mathutils import Vector

# pi-lens-ignore: reportMissingImports
from mathutils.bvhtree import BVHTree

# pi-lens-ignore: reportMissingImports
from mathutils.kdtree import KDTree


def write_json(path, value):
    Path(path).write_text(json.dumps(value, indent=2, allow_nan=False) + "\n", encoding="utf-8")


def camera(scene, name, location, target, lens):
    data = bpy.data.cameras.new(name)
    data.lens = lens
    data.clip_start = 0.1
    data.clip_end = 100000
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    return obj


def build(prepared, web_output, editable_output):
    prepared, web_output, editable_output = Path(prepared), Path(web_output), Path(editable_output)
    web_output.mkdir(parents=True, exist_ok=True)
    editable_output.mkdir(parents=True, exist_ok=True)
    files = list(prepared.glob("*.metadata.json"))
    assert len(files) == 1, "Use one prepared directory per terrain asset"
    try:
        metadata = json.loads(files[0].read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise ValueError("Invalid prepared terrain metadata") from exc
    asset_id = metadata["id"]
    with np.load(prepared / "mesh-input.npz") as payload:
        vertices, faces = payload["vertices"], payload["faces"]
    assert np.isfinite(vertices).all()
    # Build in a new scene. Existing scenes/objects are neither deleted nor edited.
    previous_scene = bpy.context.window.scene
    scene = bpy.data.scenes.new(f"{asset_id} | LOLA projected terrain")
    bpy.context.window.scene = scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0
    scene.unit_settings.length_unit = 'METERS'
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 32
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 1000
    scene.render.resolution_percentage = 100
    scene.world = bpy.data.worlds.new(f"{asset_id} illustrative world")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.09, 0.09, 0.09, 1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.35
    mesh = bpy.data.meshes.new(f"{asset_id} pixel-center adaptive mesh")
    mesh.from_pydata(vertices.tolist(), [], faces.tolist())
    mesh.update()
    assert not mesh.validate(), "Blender repaired mesh unexpectedly"
    terrain = bpy.data.objects.new("Terrain", mesh)
    terrain["terrain_role"] = "surface"
    scene.collection.objects.link(terrain)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    material = bpy.data.materials.new("Neutral lunar terrain | illustrative")
    material.use_nodes = True
    material.use_backface_culling = True
    shader = material.node_tree.nodes['Principled BSDF']
    shader.inputs['Base Color'].default_value = (0.36, 0.36, 0.36, 1)
    shader.inputs['Roughness'].default_value = 0.95
    shader.inputs['Metallic'].default_value = 0
    mesh.materials.append(material)
    terrain["frame"] = metadata["frame"]["name"]
    terrain["vertical_scale"] = 1.0
    terrain["coordinate_model"] = "Projected height field, not true ENU; see metadata"
    terrain["source_sha256"] = metadata["source"]["sha256"]
    origin = metadata["origin"]
    ox, oy = origin["projectedXM"], origin["projectedYM"]
    bvh = BVHTree.FromPolygons([Vector(v) for v in vertices.tolist()], faces.tolist(), all_triangles=True)
    control_positions = {}
    for control in metadata["controlPoints"]:
        x, y = control["projectedM"]
        ray_top = float(vertices[:, 2].max()) + 1
        hit, _, _, _ = bvh.ray_cast(Vector((x - ox, y - oy, ray_top)), Vector((0, 0, -1)))
        assert hit is not None, f"Missing control: {control['name']}"
        control_positions[control["name"]] = hit
    site, ridge = control_positions["site"], control_positions["ridge"]
    # Marker is an editable empty: its origin lies exactly on the mesh, not on a proxy plane.
    marker = bpy.data.objects.new(f"{asset_id} | surface marker", None)
    scene.collection.objects.link(marker)
    marker.empty_display_type = 'SPHERE'
    marker.empty_display_size = 65
    marker.show_in_front = True
    marker.location = site
    marker["latitude_deg"] = metadata["controlPoints"][0]["latitudeDeg"]
    marker["longitude_east_deg"] = metadata["controlPoints"][0]["longitudeEastDeg"]
    marker["illustrative_marker_size_m"] = 65
    ridge_marker = bpy.data.objects.new("Ridge reference", None)
    scene.collection.objects.link(ridge_marker)
    ridge_marker.empty_display_type = 'PLAIN_AXES'
    ridge_marker.empty_display_size = 80
    ridge_marker.location = ridge
    center = (vertices.min(axis=0) + vertices.max(axis=0)) / 2
    overview = camera(scene, "Overview", (11000, -12500, 11500), center.tolist(), 42)
    ground = camera(scene, "Ground | 2 m above mesh toward ridge", site + Vector((0, 0, 2)), ridge, 32)
    ground["height_above_mesh_m"] = 2.0
    ground["note"] = "Illustrative projected terrain; not a physical horizon calculation"
    scene.camera = overview
    light_data = bpy.data.lights.new("Raking light | NOT ephemeris Sun", 'SUN')
    light_data.energy = 2.5
    light_data.angle = math.radians(0.53)
    light = bpy.data.objects.new(light_data.name, light_data)
    scene.collection.objects.link(light)
    light.rotation_euler = Vector((-0.8, 0.5, -0.18)).to_track_quat('-Z', 'Y').to_euler()
    text = bpy.data.texts.new(f"{asset_id}.metadata.json")
    text.write(json.dumps(metadata, indent=2, allow_nan=False))
    scene["metadata_text"] = text.name
    scene["limitations"] = "Illustrative light; no curvature, visibility, landing, energy or communications certification"
    for obj in scene.objects:
        obj.select_set(False)
    terrain.select_set(True)
    bpy.context.view_layer.objects.active = terrain
    glb_path = web_output / f"{asset_id}.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(glb_path), export_format='GLB', use_selection=True, use_active_scene=True,
        export_yup=True, export_normals=True, export_tangents=False,
        export_texcoords=False, export_vertex_color='NONE', export_attributes=False,
        export_animations=False, export_cameras=False, export_lights=False,
        export_extras=False, export_materials='EXPORT',
        export_draco_mesh_compression_enable=False,
    )
    size = glb_path.stat().st_size
    assert size <= metadata["generation"]["config"]["maxGlbBytes"], f"GLB exceeds budget: {size}"
    # Reimport actual bytes, in a separate temporary scene, and inspect world geometry.
    check_scene = bpy.data.scenes.new(f"{asset_id} round-trip check")
    bpy.context.window.scene = check_scene
    bpy.ops.import_scene.gltf(filepath=str(glb_path))
    imported = list(check_scene.objects)
    assert len(imported) == 1 and imported[0].type == 'MESH', "GLB must contain terrain only"
    imported_obj = imported[0]
    imported_mesh = imported_obj.data
    imported_mesh.calc_loop_triangles()
    world_vertices = np.array([tuple(imported_obj.matrix_world @ v.co) for v in imported_mesh.vertices])
    assert len(world_vertices) == len(vertices)
    assert len(imported_mesh.loop_triangles) == len(faces)
    tree = KDTree(len(vertices))
    for index, vertex in enumerate(vertices):
        tree.insert(Vector(vertex.tolist()), index)
    tree.balance()
    nearest = [tree.find(Vector(v.tolist())) for v in world_vertices]
    max_residual = max(float(item[2]) for item in nearest)
    assert len({item[1] for item in nearest}) == len(vertices), "Round-trip vertex correspondence is not bijective"
    assert max_residual < 0.002, "Round-trip axis, scale or placement mismatch"
    roundtrip = {
        "blenderVersion": bpy.app.version_string, "importedObjects": len(imported),
        "vertices": len(world_vertices), "triangles": len(imported_mesh.loop_triangles),
        "blenderWorldBoundsM": [world_vertices.min(axis=0).tolist(), world_vertices.max(axis=0).tolist()],
        "maxNearestVertexResidualM": max_residual, "bijectiveVertexMatch": True,
        "scale": list(imported_obj.scale), "status": "passed",
        "method": "Blender glTF reimport; world-space bijective nearest-vertex comparison with prepared Blender coordinates",
    }
    bpy.context.window.scene = scene
    for obj in imported:
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.scenes.remove(check_scene)
    metadata["generation"]["versions"]["blender"] = bpy.app.version_string
    metadata["artifacts"] = {"glb": {"filename": glb_path.name, "bytes": size,
                                      "sha256": hashlib.sha256(glb_path.read_bytes()).hexdigest()},
                             "blend": {"filename": f"{asset_id}.blend"}}
    metadata["blenderRoundTrip"] = roundtrip
    text.clear()
    text.write(json.dumps(metadata, indent=2, allow_nan=False))
    # Write only this new scene and its dependencies, not unrelated user scenes.
    blend_path = editable_output / f"{asset_id}.blend"
    bpy.data.libraries.write(str(blend_path), {scene, text}, fake_user=True, compress=True)
    metadata["artifacts"]["blend"].update({"bytes": blend_path.stat().st_size,
        "sha256": hashlib.sha256(blend_path.read_bytes()).hexdigest()})
    write_json(web_output / f"{asset_id}.metadata.json", metadata)
    write_json(editable_output / "blender-roundtrip.json", roundtrip)
    print(json.dumps({"glb": str(glb_path), "blend": str(blend_path), "bytes": size,
                      "roundTrip": roundtrip, "preservedPreviousScene": previous_scene.name}, indent=2))
    return scene


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prepared", required=True)
    parser.add_argument("--web-output", required=True)
    parser.add_argument("--editable-output", required=True)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    build(args.prepared, args.web_output, args.editable_output)
