"""Step 2: build the terrain scene in Blender and export the terrain-only GLB.

Runs inside Blender (bpy). Two ways to run it:

1. Through the Blender MCP / any live session::

       import runpy
       ns = runpy.run_path(r"<dir>/blender_build_scene.py", run_name="site_terrain")
       ns["build"](prep_json=..., grid_npz=..., out_blend=..., out_glb=...)

2. Headless::

       blender --background --factory-startup --python blender_build_scene.py -- \
           --prep nobile-rim-1/nobile-rim-1.prep.json \
           --grid nobile-rim-1/nobile-rim-1.grid.npz \
           --out-blend nobile-rim-1/nobile-rim-1.blend \
           --out-glb nobile-rim-1/nobile-rim-1.glb

WARNING: ``build`` deletes every object, mesh, material, camera, light and
world in the current file before building. Run it in an empty/new file.

Blender frame: X = projected X - origin X, Y = projected Y - origin Y,
Z = elevation - origin elevation (meters, 1:1). The glTF exporter with +Y up
writes (X, Z, -Y).
"""

from __future__ import annotations

import contextlib
import json
import math
import sys
from pathlib import Path
from typing import Any

# pi-lens-ignore: reportMissingImports
import bpy

# pi-lens-ignore: reportMissingImports
import numpy as np

# pi-lens-ignore: reportMissingImports
from mathutils import Vector

ILLUSTRATIVE_SUN = {
    # Illustrative grazing light only; not a computed solar position.
    "gridBearingDeg": 135.0,
    "elevationDeg": 5.0,
    "strength": 5.0,
}


def _clear_file() -> None:
    for collection in (
        bpy.data.objects,
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
        bpy.data.worlds,
    ):
        for block in list(collection):
            collection.remove(block)


def _terrain_mesh(name: str, grid) -> tuple[Any, int, int]:
    x = np.asarray(grid["x_local"], dtype=np.float64)
    y = np.asarray(grid["y_local"], dtype=np.float64)
    z = np.asarray(grid["z_local"], dtype=np.float64)
    quad_valid = np.asarray(grid["quad_valid"], dtype=bool)
    nr, nc = z.shape

    vid = np.arange(nr * nc).reshape(nr, nc)
    q_r, q_c = np.nonzero(quad_valid)
    v00 = vid[q_r, q_c]
    v01 = vid[q_r, q_c + 1]
    v10 = vid[q_r + 1, q_c]
    v11 = vid[q_r + 1, q_c + 1]
    # Counter-clockwise seen from +Z; diagonal north-west -> south-east.
    tris = np.concatenate(
        [np.stack([v00, v10, v11], axis=1), np.stack([v00, v11, v01], axis=1)]
    )
    # Interleave so both triangles of a quad are adjacent (stable ordering).
    tris = tris.reshape(2, -1, 3).transpose(1, 0, 2).reshape(-1, 3)

    used = np.zeros(nr * nc, dtype=bool)
    used[tris.ravel()] = True
    remap = np.full(nr * nc, -1, dtype=np.int64)
    remap[used] = np.arange(int(used.sum()))
    tris = remap[tris]

    xx, yy = np.meshgrid(x, y)
    co = np.stack([xx.ravel(), yy.ravel(), z.ravel()], axis=1)[used]
    if not np.all(np.isfinite(co)):
        raise ValueError("A used vertex has a missing elevation")

    mesh = bpy.data.meshes.new(name)
    mesh.vertices.add(len(co))
    mesh.vertices.foreach_set("co", co.astype(np.float32).ravel())
    mesh.loops.add(tris.size)
    mesh.loops.foreach_set("vertex_index", tris.astype(np.int32).ravel())
    mesh.polygons.add(len(tris))
    mesh.polygons.foreach_set("loop_start", (np.arange(len(tris)) * 3).astype(np.int32))
    mesh.update(calc_edges=True)
    if mesh.validate(verbose=False):
        raise RuntimeError("Mesh validation changed the generated geometry")
    mesh.shade_smooth()
    return mesh, len(co), len(tris)


def _material(name: str, rgb, roughness: float = 0.9):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    mat.diffuse_color = (*rgb, 1.0)
    return mat


def _marker(name: str, location, color, collection, height=300.0, radius=8.0, gap=10.0):
    """Empty at the exact point plus a visual pole starting ``gap`` meters above
    it, so a ground camera placed at the point is not enclosed by the pole."""
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = "SINGLE_ARROW"
    empty.empty_display_size = 40.0
    empty.location = location
    collection.objects.link(empty)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=12, radius=radius, depth=height, location=(0, 0, gap + height / 2)
    )
    pole = bpy.context.active_object
    pole.name = name + "_pole"
    for coll in list(pole.users_collection):
        coll.objects.unlink(pole)
    collection.objects.link(pole)
    pole.parent = empty
    pole.data.materials.append(_material(name + "_mat", color, 0.5))
    return empty


def _look_at(obj, target: Vector) -> None:
    direction = target - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def _set_engine(scene) -> str:
    items = [
        i.identifier
        for i in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items
    ]
    for candidate in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT", "CYCLES"):
        if candidate in items:
            try:
                scene.render.engine = candidate
                return candidate
            except TypeError:
                continue
    return scene.render.engine


def _export_glb(path: Path, terrain) -> dict:
    for obj in bpy.context.view_layer.objects:
        obj.select_set(False)
    terrain.select_set(True)
    bpy.context.view_layer.objects.active = terrain
    wanted = {
        "filepath": str(path),
        "export_format": "GLB",
        "use_selection": True,
        "use_active_scene": True,
        "export_yup": True,
        "export_apply": False,
        "export_texcoords": False,
        "export_normals": True,
        "export_tangents": False,
        "export_materials": "EXPORT",
        "export_cameras": False,
        "export_lights": False,
        "export_extras": True,
        "export_animations": False,
        "export_skins": False,
        "export_morph": False,
        "export_draco_mesh_compression_enable": False,
    }
    available = {
        p.identifier for p in bpy.ops.export_scene.gltf.get_rna_type().properties
    }
    used = {k: v for k, v in wanted.items() if k in available}
    missing = sorted(set(wanted) - set(used))
    result = bpy.ops.export_scene.gltf(**used)
    if "FINISHED" not in result:
        raise RuntimeError(f"glTF export failed: {result}")
    return {
        "options": {k: v for k, v in used.items() if k != "filepath"},
        "unsupportedOptionsSkipped": missing,
    }


def build(prep_json, grid_npz, out_blend, out_glb) -> dict:
    try:
        prep = json.loads(Path(prep_json).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Cannot read prep JSON {prep_json}: {exc}") from exc
    site_id = prep["config"]["siteId"]
    grid = np.load(grid_npz)
    out_blend, out_glb = Path(out_blend), Path(out_glb)
    out_blend.parent.mkdir(parents=True, exist_ok=True)

    _clear_file()
    scene = bpy.context.scene
    scene.name = site_id
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.unit_settings.length_unit = "METERS"

    root = scene.collection
    markers_coll = bpy.data.collections.new("Markers")
    if markers_coll.name not in root.children:
        root.children.link(markers_coll)

    mesh, n_verts, n_tris = _terrain_mesh(f"Terrain_{site_id}", grid)
    terrain = bpy.data.objects.new(f"Terrain_{site_id}", mesh)
    root.objects.link(terrain)
    mesh.materials.append(_material("Terrain_neutral_grey", (0.36, 0.36, 0.36), 0.95))
    origin = prep["localOrigin"]
    terrain["siteId"] = site_id
    terrain["crs"] = prep["rasterInspection"]["crsProj4"]
    terrain["frame"] = prep["config"]["raster"]["frame"]
    terrain["originProjectedXM"] = origin["projectedXM"]
    terrain["originProjectedYM"] = origin["projectedYM"]
    terrain["originElevationM"] = origin["elevationM"]
    terrain["gltfAxes"] = "x=projX-originX, y=elevation-originZ, z=-(projY-originY)"
    terrain["source"] = prep["config"]["raster"]["sourceUrl"]

    points = prep["points"]
    site_pt = Vector(points["site"]["blenderLocalM"])
    marker_colors = {"site": (1.0, 0.45, 0.05), "ridge-reference": (0.1, 0.55, 1.0)}
    markers = {}
    for pid, point in points.items():
        if pid not in marker_colors:
            continue
        name = "Marker_" + (site_id if pid == "site" else pid)
        markers[pid] = _marker(
            name, point["blenderLocalM"], marker_colors[pid], markers_coll
        )
        markers[pid]["latitudeDeg"] = point["latitudeDeg"]
        markers[pid]["longitudeEastDeg"] = point["longitudeEastDeg"]
        markers[pid]["elevationM"] = point["sourceBilinearElevationM"]

    # Surface height of the mesh at the site, for the ground camera. Ray cast
    # against the terrain object only (identity transform), not the markers.
    hit, loc, *_ = terrain.ray_cast(
        Vector((site_pt.x, site_pt.y, 1.0e5)), Vector((0, 0, -1))
    )
    if not hit:
        raise RuntimeError("Ray cast found no terrain at the site")
    cam_cfg = prep["config"]["groundCamera"]
    target_id = cam_cfg["lookAtPoint"]
    target = Vector(points[target_id]["blenderLocalM"])

    ground_cam = bpy.data.objects.new(
        "Camera_ground_to_ridge", bpy.data.cameras.new("Camera_ground_to_ridge")
    )
    ground_cam.data.lens = 35
    # 1 m near clip: 0.1 m with a 30 km far clip broke EEVEE depth (black render).
    ground_cam.data.clip_start = 1.0
    ground_cam.data.clip_end = 30000
    ground_cam.location = Vector(
        (site_pt.x, site_pt.y, loc.z + cam_cfg["heightAboveSurfaceM"])
    )
    root.objects.link(ground_cam)
    _look_at(ground_cam, target)

    ext = prep["crop"]["meshVertexExtentLocalM"]
    size = max(ext["xMax"] - ext["xMin"], ext["yMax"] - ext["yMin"])
    overview = bpy.data.objects.new(
        "Camera_overview", bpy.data.cameras.new("Camera_overview")
    )
    overview.data.lens = 35
    overview.data.clip_start = 10
    overview.data.clip_end = 100000
    overview.location = Vector((0.55 * size, -1.05 * size, 0.85 * size))
    root.objects.link(overview)
    _look_at(overview, Vector((0, 0.05 * size, 0)))
    scene.camera = overview

    sun_data = bpy.data.lights.new("Sun_illustrative_grazing", type="SUN")
    sun_data.energy = ILLUSTRATIVE_SUN["strength"]
    sun_data.angle = math.radians(0.53)
    sun = bpy.data.objects.new("Sun_illustrative_grazing", sun_data)
    bearing = math.radians(ILLUSTRATIVE_SUN["gridBearingDeg"])
    elev = math.radians(ILLUSTRATIVE_SUN["elevationDeg"])
    toward_sun = Vector(
        (
            math.sin(bearing) * math.cos(elev),
            math.cos(bearing) * math.cos(elev),
            math.sin(elev),
        )
    )
    sun.rotation_euler = (-toward_sun).to_track_quat("-Z", "Y").to_euler()
    sun["note"] = "Illustrative grazing light; not a computed solar position."
    root.objects.link(sun)

    world = bpy.data.worlds.new("Space_black")
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs["Color"].default_value = (0.0, 0.0, 0.0, 1.0)
    bg.inputs["Strength"].default_value = 1.0
    scene.world = world
    # Faint fill so shadowed slopes stay readable (illustrative).
    fill_data = bpy.data.lights.new("Fill_illustrative", type="SUN")
    fill_data.energy = 0.15
    fill = bpy.data.objects.new("Fill_illustrative", fill_data)
    fill.rotation_euler = (
        Vector((0.3, 0.2, 1.0)).normalized().to_track_quat("Z", "Y").to_euler()
    )
    fill_data.use_shadow = False
    root.objects.link(fill)

    engine = _set_engine(scene)
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    view_settings = scene.view_settings
    with contextlib.suppress(TypeError):
        view_settings.view_transform = "AgX"

    for area in getattr(bpy.context.screen, "areas", []) if bpy.context.screen else []:
        if area.type == "VIEW_3D":
            for space in area.spaces:
                if space.type == "VIEW_3D":
                    space.clip_start = 1.0
                    space.clip_end = 100000.0

    text = bpy.data.texts.get("terrain_prep.json") or bpy.data.texts.new(
        "terrain_prep.json"
    )
    text.clear()
    text.write(json.dumps(prep, indent=2))

    export_info = _export_glb(out_glb, terrain)
    bpy.ops.wm.save_as_mainfile(filepath=str(out_blend))

    summary = {
        "blenderVersion": bpy.app.version_string,
        "renderEngine": engine,
        "terrainObject": terrain.name,
        "vertices": n_verts,
        "triangles": n_tris,
        "meshSurfaceAtSiteBlenderZ": loc.z,
        "groundCameraLocation": list(ground_cam.location),
        "groundCameraTarget": target_id,
        "overviewCameraLocation": list(overview.location),
        "illustrativeSun": ILLUSTRATIVE_SUN,
        "glbExport": export_info,
        "blend": str(out_blend),
        "glb": str(out_glb),
    }
    (out_glb.parent / f"{site_id}.blender-build.json").write_text(
        json.dumps(summary, indent=2) + "\n", encoding="utf-8"
    )
    return summary


def _cli() -> None:
    import argparse

    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--prep", required=True)
    parser.add_argument("--grid", required=True)
    parser.add_argument("--out-blend", required=True)
    parser.add_argument("--out-glb", required=True)
    args = parser.parse_args(argv)
    print(
        json.dumps(build(args.prep, args.grid, args.out_blend, args.out_glb), indent=2)
    )


if __name__ == "__main__":
    _cli()
