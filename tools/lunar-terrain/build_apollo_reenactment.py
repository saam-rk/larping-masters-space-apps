"""Add the illustrative Apollo 11 surface scene to the open public Apollo 11 blend.

Run from Blender MCP: exec(compile(path.read_bytes(), str(path), 'exec'),
{'__file__': str(path), '__name__': '__main__'}). Pass save=False to build() for review.
The LROC surface mesh, texture, cameras and terrain-only GLB are preserved.
"""
import json
import math
import random
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Quaternion, Vector

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / 'public/terrain'
BLEND = PUBLIC / 'apollo-11.blend'
PROPS = PUBLIC / 'apollo-11.reenactment.glb'
SETUP = PUBLIC / 'apollo-11.reenactment.json'
COLLECTION = 'Apollo 11 | Surface reenactment'
ASTRONAUT = ROOT / 'docs/research/site-terrain/nobile-rim-2/astronaut.blend'
UTC = '1969-07-20T20:17:40Z'
GRAVITY = 1.62
FPS = 30
UP_SPEED = 1.14
SIDE_SPEED = 1.02
FLIGHT = 2 * UP_SPEED / GRAVITY
RANGE = SIDE_SPEED * FLIGHT
APEX = UP_SPEED**2 / (2 * GRAVITY)
SUN_AZ, SUN_EL = 88.805495, 10.703313
MIN_ASPECT = 1.52


def material(name, color, metallic=0, roughness=.8):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value = mat.diffuse_color
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness
    return mat


def build(*, save=True):
    scene = bpy.context.scene
    if not scene.name.startswith('Apollo 11 | LROC'):
        raise ValueError('Open the Apollo 11 LROC scene before running this script')
    terrain = next(o for o in scene.objects if o.type == 'MESH' and o.name.startswith('Apollo 11 terrain'))
    anchor = next(o for o in scene.objects if o.type == 'EMPTY' and 'geographic anchor' in o.name)
    anchor['landing_utc'] = UTC
    anchor['landing_time_source'] = 'https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo11info.html'
    anchor['coordinates_source'] = 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html'
    anchor['latitude_deg'] = .67416
    anchor['longitude_east_deg'] = 23.47314
    old = bpy.data.collections.get(COLLECTION)
    if old:
        for obj in list(old.all_objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(old)
    collection = bpy.data.collections.new(COLLECTION)
    scene.collection.children.link(collection)
    collection['historical_note'] = 'Illustrative post-landing tableau. Armstrong and Aldrin descended; Collins stayed in lunar orbit.'
    rng = random.Random(1969)

    def ground(x, y):
        hit, point, _, _ = terrain.ray_cast(Vector((x, y, 200)), Vector((0, 0, -1)))
        if not hit:
            raise ValueError(f'Outside the terrain: {(x, y)}')
        return point.z

    def link(obj, parent=None):
        for current in list(obj.users_collection):
            current.objects.unlink(obj)
        collection.objects.link(obj)
        obj.parent = parent
        return obj

    def empty(name, at):
        obj = link(bpy.data.objects.new(name, None))
        obj.location = at
        return obj

    def mesh(name, vertices, faces, mats, parent=None):
        data = bpy.data.meshes.new(name)
        data.from_pydata(vertices, [], faces)
        data.update()
        obj = link(bpy.data.objects.new(name, data), parent)
        for mat in mats:
            data.materials.append(mat)
        return obj

    def primitive(name, mat, parent):
        obj = link(bpy.context.object, parent)
        obj.name = name
        obj.data.materials.append(mat)
        return obj

    def box(name, at, size, mat, parent, bevel=.025):
        bpy.ops.mesh.primitive_cube_add(size=1)
        obj = primitive(name, mat, parent)
        obj.location = at
        for v in obj.data.vertices:
            for i, length in enumerate(size):
                v.co[i] *= length
        if bevel:
            mod = obj.modifiers.new('Rounded manufacturing edges', 'BEVEL')
            mod.width, mod.segments = bevel, 2
            obj.modifiers.new('Panel normals', 'WEIGHTED_NORMAL')
        return obj

    def cone(name, a, b, r1, r2, mat, parent, sides=16):
        a, b = Vector(a), Vector(b)
        delta = b - a
        bpy.ops.mesh.primitive_cone_add(vertices=sides, radius1=r1, radius2=r2, depth=delta.length)
        obj = primitive(name, mat, parent)
        obj.location = (a + b) / 2
        obj.rotation_euler = delta.to_track_quat('Z', 'Y').to_euler()
        for p in obj.data.polygons:
            p.use_smooth = len(p.vertices) == 4
        return obj

    def sphere(name, at, size, mat, parent):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2)
        obj = primitive(name, mat, parent)
        obj.location, obj.scale = at, size
        for p in obj.data.polygons:
            p.use_smooth = True
        return obj

    def printed(name, text, at, size, mat, parent):
        data = bpy.data.curves.new(name, 'FONT')
        data.body, data.size, data.align_x = text, size, 'CENTER'
        obj = link(bpy.data.objects.new(name, data), parent)
        obj.location = at
        obj.rotation_euler.x = math.pi / 2
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.convert(target='MESH')

    gold = [material(f'Thermal blanket | gold {i}', c, .27, .48) for i, c in enumerate([
        (.59, .31, .048), (.91, .59, .13), (.73, .44, .075), (.44, .21, .023), (.99, .72, .26)])]
    al = material('Brushed aluminum', (.46, .46, .43), .28, .61)
    pale = material('Light spacecraft cladding', (.64, .66, .61), .14, .62)
    dark = material('Black spacecraft cladding', (.027, .029, .027), .04, .86)
    rubber = material('Hatch recess', (.008, .011, .012), 0, .9)
    glass = material('Cabin windows', (.019, .037, .047), .32, .21)
    copper = material('Thruster insulation', (.35, .11, .043), .24, .61)
    white = material('Flag | white', (.92, .9, .84))
    red = material('Flag | Old Glory red', (.5, .018, .029))
    blue = material('Flag | Old Glory blue', (.024, .048, .19))

    # An original schematic Eagle: the LM sits at the catalogue anchor.
    lm = empty('Eagle | Lunar Module LM-5', (0, 0, ground(0, 0)))
    z0 = lm.location.z
    outline = [(-1.52,-1.95), (1.52,-1.95), (1.95,-1.52), (1.95,1.52),
               (1.52,1.95), (-1.52,1.95), (-1.95,1.52), (-1.95,-1.52)]
    mesh('Descent stage frame', [(x,y,z) for z in (.92,2.42) for x,y in outline],
         ((7,6,5,4,3,2,1,0), tuple(range(8,16)),
          *((i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8))), [dark], lm)
    for i, (a, b) in enumerate(zip(outline, outline[1:] + outline[:1])):
        a, b = Vector(a), Vector(b)
        normal = Vector((b.y-a.y, a.x-b.x)).normalized()
        columns, rows = max(3, round((b-a).length*5)), 8
        verts = []
        for row in range(rows+1):
            for col in range(columns+1):
                xy = a.lerp(b, col/columns) + normal*rng.uniform(.02,.083)
                verts.append((*xy, .91 + 1.51*row/rows + rng.uniform(-.035,.035)))
        faces = []
        for row in range(rows):
            for col in range(columns):
                j = row*(columns+1)+col
                k = j+columns+1
                faces.extend([(j,j+1,k), (j+1,k+1,k)])
        foil = mesh(f'Multilayer insulation panel {i+1}', verts, faces, gold, lm)
        for p in foil.data.polygons:
            p.material_index = rng.choices(range(5), weights=[5,2,5,1,2])[0]

    cone('Descent engine bell', (0,0,.47), (0,0,1.1), .48,.25, dark,lm,24)
    for i, angle in enumerate([0, math.pi/2, math.pi, 3*math.pi/2], 1):
        dx, dy = math.sin(angle), -math.cos(angle)
        px, py = 4.08*dx, 4.08*dy
        foot = ground(px, py)-z0
        cone(f'Footpad {i}', (px,py,foot-.015), (px,py,foot+.15), .48,.33,gold[2],lm,24)
        cone(f'Gear strut {i}', (px,py,foot+.14), (1.62*dx,1.62*dy,2.27), .09,.145,al,lm)
        cone(f'Gear insulation sleeve {i}', (px*.92,py*.92,foot+.4), (px*.65,py*.65,foot+1.19), .12,.12,gold[1],lm)
        for side in (-1,1):
            cone(f'Gear brace {i}/{side}', (px*.83,py*.83,foot+.47),
                 (1.63*dx + side*.94*dy,1.63*dy - side*.94*dx,1.05), .047,.057,al,lm)

    # Angular ascent cabin, front hatch, two trapezoid windows and reaction control clusters.
    box('Aft ascent machinery', (0,.66,3.5), (3.12,2.42,2.01), dark,lm,.24)
    octagon = [(-.77,-1.66),(.77,-1.66),(1.5,-1.12),(1.64,-.4),(1.19,.55),
               (-1.19,.55),(-1.64,-.4),(-1.5,-1.12)]
    levels = [(2.35,.81), (2.8,1), (4.41,1), (4.92,.62)]
    faces = [tuple(reversed(range(8))), tuple(range(24,32))]
    faces += [(j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i) for j in range(3) for i in range(8)]
    cabin = mesh('Faceted ascent cabin', [(x*s,y*s,z) for z,s in levels for x,y in octagon], faces, [pale,al,dark],lm)
    for poly in cabin.data.polygons:
        if poly.index in {2,5,7,10,17,18,22}:
            poly.material_index = 1
    box('Forward hatch surround', (0,-1.681,3.12), (1.2,.11,1.20), al,lm,.05)
    box('Open hatch', (0,-1.743,3.12), (1.01,.04,1.04), rubber,lm,.04)
    flap = box('Opened hatch door', (-.72,-1.98,3.10), (.67,.085,.99), pale,lm,.036)
    flap.rotation_euler.z = .94
    for side in (-1,1):
        patch = [(side*x,-1.695+max(0, x-.77)*.54/.73,z)
                 for x,z in ((.46,4.3),(1.40,4.16),(1.37,3.91),(.69,3.67))]
        if side > 0:
            patch.reverse()
        mesh(f'Angular cockpit window {side}', patch, [(0,1,2),(0,2,3)], [glass],lm)
        box(f'RCS cluster {side}', (side*1.74,-.12,3.63), (.46,.51,.48), al,lm,.07)
        for index, direction in enumerate([Vector((side,0,0)),Vector((0,-1,0)),Vector((0,0,1)),Vector((0,0,-1))]):
            base = Vector((side*1.77,-.14,3.63)) + direction*.21
            cone(f'RCS nozzle {side}/{index}', base, base+direction*.19,.083,.14,copper,lm)
            cone(f'RCS nozzle recess {side}/{index}', base+direction*.186, base+direction*.195,.105,.103,dark,lm)
    box('Forward porch', (0,-2.20,2.56), (1.54,1.12,.11),al,lm)
    for side in (-1,1):
        x = side*.29
        cone(f'Ladder rail {side}', (x,-4.01,.29), (x,-2.68,2.62), .038,.038,al,lm,10)
        cone(f'Porch handrail {side}', (side*.70,-2.61,2.58),(side*.70,-2.61,3.4),.036,.036,al,lm,10)
        cone(f'Porch guardrail {side}', (side*.70,-2.61,3.4),(side*.70,-1.78,3.4),.036,.036,al,lm,10)
    for i in range(10):
        t = (i+.33)/10
        y,z = -4.01+1.33*t,.29+2.33*t
        cone(f'Ladder rung {i+1}', (-.29,y,z),(.29,y,z),.026,.026,al,lm,10)
    box('Mission marking panel', (1.00,-2.042,1.73), (.8,.037,.37),dark,lm)
    printed('Mission marking', 'EAGLE', (1.0,-2.067,1.652), .19,white,lm)
    cone('S-band mast', (.65,.08,4.58), (1.13,.02,5.57),.061,.044,al,lm)
    dish = sphere('S-band dish', (1.13,-.095,5.57), (.49,.091,.49),pale,lm)
    dish.rotation_euler.x = -.25
    cone('Dish feed boom', (1.13,-.14,5.57), (1.13,-.57,5.69),.029,.025,al,lm)
    sphere('Dish receiver', (1.13,-.57,5.69), (.084,.075,.081),dark,lm)
    cone('Docking collar', (0,.26,4.74),(0,.26,5.05),.41,.36,al,lm)
    cone('VHF whip', (-.86,-.02,4.55),(-1.07,-.02,5.79),.027,.006,al,lm,10)

    # The 3-by-5-foot flag is held by a crossbar in vacuum. The folds are fixed.
    fx, fy = -3.35, -5.45
    flag = empty('US flag | Lunar Flag Assembly', (fx,fy,ground(fx,fy)))
    flag.rotation_euler.z = math.radians(-12)
    height, width, top = .9144, 1.524, 2.19
    cone('Flagstaff inserted into regolith', (0,0,-.13), (0,0,top+.04), .014,.014,gold[2],flag,12)
    cone('Telescoping crossbar', (0,0,top), (width,0,top), .012,.012,gold[2],flag,12)

    def fabric(u, v, face=0):
        return (u, .045*math.sin(14*u + 2*v)*(v/.92)**.62+face, top-v)

    def swatch(name, u0, u1, v0, v1, mat):
        n = max(3, round((u1-u0)*19))
        vertices = [fabric(u0+(u1-u0)*i/n, v) for v in (v0,v1) for i in range(n+1)]
        obj = mesh(name, vertices, [(i,i+1,i+n+2,i+n+1) for i in range(n)], [mat],flag)
        obj.modifiers.new('Cloth thickness', 'SOLIDIFY').thickness = .0018
        for poly in obj.data.polygons:
            poly.use_smooth = True

    canton = width*.4
    for stripe in range(13):
        swatch(f'Flag stripe {stripe+1}', canton if stripe < 7 else 0, width,
               height*stripe/13,height*(stripe+1)/13, red if stripe % 2 == 0 else white)
    swatch('Blue canton', 0,canton,0,height*7/13,blue)
    for front in (-1,1):
        stars, faces = [], []
        for row in range(9):
            for col in range(6 if row % 2 == 0 else 5):
                u = canton*(col+(.6 if row%2==0 else 1.1))/6.2
                v = height*(7/13)*(row+1)/10
                start = len(stars)
                for i in range(10):
                    ang = math.pi/2 + i*math.pi/5
                    radius = .017 if i%2==0 else .0068
                    stars.append(fabric(u+radius*math.cos(ang), v-radius*math.sin(ang), front*.002))
                face = tuple(range(start,start+10))
                faces.append(face if front<0 else tuple(reversed(face)))
        mesh(f'50 embroidered stars | {front}', stars, faces, [white], flag)

    def astronaut(name, at, yaw):
        with bpy.data.libraries.load(str(ASTRONAUT), link=False) as (_, dst):
            dst.collections = ['Astronaut_scale_reference']
        source = dst.collections[0]
        parts = {o.name.split('.')[0].removeprefix('Astronaut_'): o for o in source.objects}
        for obj in list(source.objects):
            link(obj, obj.parent)
            if obj.type != 'EMPTY':
                obj.name = name + ' | ' + obj.name.split('.')[0].removeprefix('Astronaut_')
        bpy.data.collections.remove(source)
        root = parts['1p70m']
        root.name, root.location, root.rotation_euler.z = name, at, yaw
        return root, parts

    def aim_part(part, hand, shoulder, target, arm_end, amount=.86):
        # Rotate the source rigid limb about its shoulder, then move its glove with it.
        center = Vector(shoulder)
        start, end = Vector(arm_end)-center, Vector(target)-center
        q = start.rotation_difference(end)
        displacement = end.normalized() * min(end.length, start.length/amount)
        part.location = center + q @ (part.location-center)
        part.rotation_euler = (q @ part.rotation_euler.to_quaternion()).to_euler()
        hand.location = center + displacement
        hand.rotation_euler = q.to_euler()

    planter, hands = astronaut('Astronaut | planting the flag', (fx-.52,fy+.105,ground(fx-.52,fy+.105)+.013),
                              math.radians(59))
    bpy.context.view_layer.update()
    inv = planter.matrix_world.inverted()
    glove_parts = []
    for side, s, z in [('L',-1,1.18),('R',1,1.39)]:
        arm, hand = hands['arm_'+side], hands['glove_'+side]
        aim_part(arm, hand, (s*.252,-.006,1.334), inv @ Vector((fx,fy,flag.location.z+z)),
                 hand.location.copy())
        glove_parts.append((arm, hand))

    jumper, jump_parts = astronaut('Astronaut | lunar hop', (0,0,0), math.radians(-27))
    neutral = {part: (part.location.copy(), part.rotation_euler.copy())
               for name,part in jump_parts.items() if name.startswith(('boot_', 'leg_', 'arm_', 'glove_'))}
    for side, s in [('L',-1),('R',1)]:
        arm, hand = jump_parts['arm_'+side], jump_parts['glove_'+side]
        aim_part(arm, hand, (s*.252,-.006,1.334), (s*.46,-.19,1.23+s*.12), hand.location.copy())
        leg, boot = jump_parts['leg_'+side], jump_parts['boot_'+side]
        pivot = Vector((s*.12,0,.86))
        q = Quaternion((1,-.39,0), .48*s)
        for obj in (leg,boot):
            obj.location = pivot + q @ (obj.location-pivot)
            obj.rotation_euler = (q @ obj.rotation_euler.to_quaternion()).to_euler()
    airborne = {part: (part.location.copy(), part.rotation_euler.copy()) for part in neutral}

    waiting, door_parts = astronaut('Astronaut | waiting at the hatch', (.32,-2.27,z0+2.615), math.radians(-13))
    arm, hand = door_parts['arm_R'], door_parts['glove_R']
    aim_part(arm, hand, (.252,-.006,1.334), (.43,-.12,.99), hand.location.copy())

    # Land on the DTM at both ends. Interpolate these measured floor offsets
    # while applying a ballistic arc above the line between them.
    takeoff = Vector((1.81,-5.10,0))
    landing = Vector((1.81+RANGE,-4.98,0))
    # Keep the horizontal range exactly equal to v_horizontal * t.
    landing = takeoff + (landing-takeoff).normalized()*RANGE
    for endpoint in (takeoff,landing):
        endpoint.z = ground(endpoint.x,endpoint.y)+.019
    turn = .69
    period = 2*(FLIGHT+turn)
    count = round(period*FPS)
    flag_z = flag.location.z
    hand_rest = [(part,part.location.copy()) for pair in glove_parts for part in pair]
    for index in range(count+1):
        frame = index+1
        t = (index/count*period + FLIGHT/2) % period
        returning = t >= FLIGHT+turn
        segment = t % (FLIGHT+turn)
        a,b = (landing,takeoff) if returning else (takeoff,landing)
        local = min(segment,FLIGHT)
        jumper.location = a.lerp(b,local/FLIGHT)
        jumper.location.z += UP_SPEED*local - .5*GRAVITY*local**2
        pose = min(1, local/.13, (FLIGHT-local)/.13)
        for part,(location,rotation) in neutral.items():
            fly_location, fly_rotation = airborne[part]
            part.location = location.lerp(fly_location,pose)
            part.rotation_euler = tuple(r+(f-r)*pose for r,f in zip(rotation,fly_rotation))
            part.keyframe_insert(data_path='location',frame=frame)
            part.keyframe_insert(data_path='rotation_euler',frame=frame)
        jumper.rotation_euler.z = (-.47 if not returning else .66)
        if segment > FLIGHT:
            ease = (1-math.cos(math.pi*(segment-FLIGHT)/turn))/2
            jumper.rotation_euler.z += (-1 if returning else 1)*1.13*ease
        jumper.keyframe_insert(data_path='location',frame=frame)
        jumper.keyframe_insert(data_path='rotation_euler',frame=frame)
        pulse = max(0, 1-abs(index/FPS-1.06)/.46)
        depth = .14*pulse*pulse*(3-2*pulse)
        flag.location.z = flag_z+depth
        flag.keyframe_insert(data_path='location',frame=frame)
        for part,rest in hand_rest:
            part.location = rest + Vector((0,0,depth*(.55 if 'arm_' in part.name else 1)))
            part.keyframe_insert(data_path='location',frame=frame)

    animated = [jumper,*neutral,flag,*(part for part,_ in hand_rest)]
    for obj in animated:
        data = obj.animation_data
        action = data.action
        slot = data.action_slot
        data.action = None
        track = data.nla_tracks.new()
        track.name = 'Surface activity'
        strip = track.strips.new('Surface activity',1,action)
        strip.action_slot = slot

    # Camera and lighting in the same local metre frame as the terrain export.
    eye_x, eye_y = -.52, -12.60
    eye = Vector((eye_x,eye_y,ground(eye_x,eye_y)+1.60))
    heading, pitch = 358.5, 6.4
    h,p = map(math.radians,(heading,pitch))
    direction = Vector((math.sin(h)*math.cos(p), math.cos(h)*math.cos(p), math.sin(p)))
    camera = link(bpy.data.objects.new('First person | Tranquility Base', bpy.data.cameras.new('Apollo 11 eye level')))
    camera.location = eye
    camera.rotation_euler = direction.to_track_quat('-Z','Y').to_euler()
    camera.data.sensor_fit = 'VERTICAL'
    camera.data.clip_start, camera.data.clip_end = .05, 2800
    fov = 48
    camera.data.lens = camera.data.sensor_height / (2*math.tan(math.radians(fov)/2))
    scene.camera = camera
    scene.render.resolution_x, scene.render.resolution_y = 1440, 900
    scene.render.resolution_percentage = 100
    scene.render.fps, scene.frame_start, scene.frame_end = FPS, 1, count+1
    scene.frame_set(1)
    # Reuse the original terrain key light with the validated Horizons direction.
    light = next(o for o in scene.objects if o.type == 'LIGHT' and o.name.startswith('Illustrative Sun'))
    az,el = map(math.radians,(SUN_AZ,SUN_EL))
    light.rotation_euler = Vector((-math.sin(az)*math.cos(el),-math.cos(az)*math.cos(el),-math.sin(el))).to_track_quat('-Z','Y').to_euler()
    light.data.energy = 3.15
    fill_data = bpy.data.lights.new('Illustrative reflected fill','SUN')
    fill_data.energy = .50
    fill_data.use_shadow = False
    fill = link(bpy.data.objects.new(fill_data.name,fill_data))
    fill.rotation_euler = Vector((.32,.84,-.46)).to_track_quat('-Z','Y').to_euler()
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                view = area.spaces.active
                view.region_3d.view_perspective = 'CAMERA'
                view.region_3d.view_camera_zoom = 5
                view.shading.type = 'MATERIAL'
                view.shading.use_scene_lights = True
                view.shading.use_scene_world = True
                view.overlay.show_overlays = False

    props = [o for o in collection.objects if o.type not in ('CAMERA','LIGHT')]
    bpy.context.view_layer.update()
    meshes = [o for root in (lm,planter,flag,jumper,waiting)
              for o in root.children_recursive if o.type == 'MESH']
    width = scene.render.resolution_x
    try:
        scene.render.resolution_x = round(scene.render.resolution_y * MIN_ASPECT)
        xmin, xmax, ymin, ymax = 1, 0, 1, 0
        for frame in range(scene.frame_start, scene.frame_end+1):
            scene.frame_set(frame)
            for obj in meshes:
                for corner in obj.bound_box:
                    p = world_to_camera_view(scene,camera,obj.matrix_world @ Vector(corner))
                    xmin,xmax = min(xmin,p.x),max(xmax,p.x)
                    ymin,ymax = min(ymin,p.y),max(ymax,p.y)
        assert 0 < xmin < xmax < 1 and 0 < ymin < ymax < 1, 'Action falls outside the initial view'
        print('Complete scene animation remains in frame:', (xmin,xmax,ymin,ymax))
    finally:
        scene.render.resolution_x = width
        scene.frame_set(1)
    print('Hop:',round(RANGE,3),'m horizontal;',round(APEX,3),'m apex;',round(FLIGHT,3),'s airborne')

    if save:
        for obj in scene.objects:
            obj.select_set(obj in props)
        bpy.context.view_layer.objects.active = lm
        bpy.ops.export_scene.gltf(filepath=str(PROPS), export_format='GLB', use_selection=True,
                                  export_apply=True, export_animations=True, export_animation_mode='NLA_TRACKS',
                                  export_force_sampling=True, export_yup=True)
        bpy.ops.object.select_all(action='DESELECT')
        bpy.context.view_layer.objects.active = None
        previous = bpy.context.preferences.filepaths.save_version
        try:
            bpy.context.preferences.filepaths.save_version = 0
            bpy.ops.wm.save_as_mainfile(filepath=str(BLEND),compress=True)
        finally:
            bpy.context.preferences.filepaths.save_version = previous
        SETUP.write_text(json.dumps({
            'eyeGlbM': [eye.x,eye.z,-eye.y],
            'headingDeg': heading, 'pitchDeg': pitch, 'verticalFovDeg': fov, 'minimumFramingAspect': MIN_ASPECT,
            'landingUtc': UTC,
            'hop': {'gravityMPerS2': GRAVITY, 'horizontalSpeedMPerS': SIDE_SPEED,
                    'verticalSpeedMPerS': UP_SPEED, 'distanceM': RANGE, 'apexM': APEX, 'flightS': FLIGHT},
        }, indent=2)+'\n', encoding='utf-8')


if __name__ == '__main__':
    build()
