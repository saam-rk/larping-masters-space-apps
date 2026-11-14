"""Build adaptive terrain through the existing Nobile Rim 1 scene generator.

Run build(...) through Blender MCP. Uses the original material, units, axes,
markers, cameras, lighting and export settings. Creates an isolated scene,
preserves existing scenes/objects, and saves only the new scene in the artifact.
"""

import json
import sys
from pathlib import Path

import bpy
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import blender_build_scene as base


def adaptive_mesh(name, grid):
    co = grid["vertices"]
    tris = grid["triangles"]
    if not np.isfinite(co).all():
        raise ValueError("Invalid vertex")
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(co.tolist(), [], tris.tolist())
    mesh.update(calc_edges=True)
    if mesh.validate():
        raise ValueError("Mesh validation changed adaptive geometry")
    mesh.shade_smooth()
    return mesh, len(co), len(tris)


def build(prep_json, grid_npz, out_blend, out_glb):
    original = base._terrain_mesh
    original_clear = base._clear_file

    def create_scene():
        scene = bpy.data.scenes.new("Nobile_Rim_2_build")
        bpy.context.window.scene = scene

    base._terrain_mesh = adaptive_mesh
    base._clear_file = create_scene
    try:
        result = base.build(prep_json, grid_npz, out_blend, out_glb)
    finally:
        base._terrain_mesh = original
        base._clear_file = original_clear
    return finish(prep_json, out_blend, out_glb, result)


def finish(prep_json, out_blend, out_glb, result):
    # Anchor marker empties to the actual simplified surface, retaining source
    # elevation as a separate custom property inherited from the base builder.
    from mathutils import Vector

    terrain = bpy.data.objects[result["terrainObject"]]
    ray_top = max(v.co.z for v in terrain.data.vertices) + 10
    for obj in bpy.context.scene.objects:
        if obj.type == "EMPTY" and obj.name.startswith("Marker_"):
            hit, loc, *_ = terrain.ray_cast(
                Vector((obj.location.x, obj.location.y, ray_top)), Vector((0, 0, -1))
            )
            if not hit:
                raise ValueError("Marker outside valid surface")
            obj.location.z = loc.z
            obj["placementMethod"] = (
                "Ray cast onto simplified terrain; elevationM retains source bilinear elevation"
            )
    # Use a nearby ray origin for millimeter-level camera clearance.
    ground = next(
        o
        for o in bpy.context.scene.objects
        if o.type == "CAMERA" and o.name.startswith("Camera_ground_to_ridge")
    )
    hit, loc, *_ = terrain.ray_cast(
        Vector((ground.location.x, ground.location.y, ray_top)), Vector((0, 0, -1))
    )
    if not hit:
        raise ValueError("Ground camera outside terrain")
    cfg = json.loads(Path(prep_json).read_text())["config"]
    ground.location.z = loc.z + cfg["groundCamera"]["heightAboveSurfaceM"]
    overview = next(
        o
        for o in bpy.context.scene.objects
        if o.type == "CAMERA" and o.name.startswith("Camera_overview")
    )
    bpy.context.scene.camera = overview
    overview.data.lens = 22
    overview.location = Vector((6600, -12600, 10200))
    base._look_at(overview, Vector((0, 500, 0)))
    result["groundCameraLocation"] = list(ground.location)
    result["meshSurfaceAtSiteBlenderZ"] = loc.z
    result["overviewCameraLocation"] = list(overview.location)
    bpy.context.scene.render.resolution_x = 1200
    bpy.context.scene.render.resolution_y = 675
    bpy.context.scene.render.resolution_percentage = 100
    (Path(out_glb).parent / (cfg["siteId"] + ".blender-build.json")).write_text(
        json.dumps(result, indent=2) + "\n"
    )
    # Open the editable file in its overview camera, with useful clipping.
    for area in bpy.context.screen.areas if bpy.context.screen else []:
        if area.type == "VIEW_3D":
            area.spaces.active.region_3d.view_perspective = "CAMERA"
    bpy.data.libraries.write(str(Path(out_blend)), {bpy.context.scene}, fake_user=True)
    return result


if __name__ == "__main__":
    import argparse

    p = argparse.ArgumentParser()
    for key in ("prep", "grid", "out-blend", "out-glb"):
        p.add_argument("--" + key, required=True)
    args = p.parse_args(sys.argv[sys.argv.index("--") + 1 :])
    print(
        json.dumps(build(args.prep, args.grid, args.out_blend, args.out_glb), indent=2)
    )
