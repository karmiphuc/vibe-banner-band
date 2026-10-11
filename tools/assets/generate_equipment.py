"""Dimensioned equipment demonstration. Run through Blender; no external assets."""
import argparse
import bpy
import hashlib
import json
import math
import sys
from pathlib import Path
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
p = argparse.ArgumentParser()
p.add_argument('--output', default='build')
out = Path(p.parse_args(args).output).resolve()
out.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, metallic=0, roughness=.5):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    s = m.node_tree.nodes.get('Principled BSDF')
    s.inputs['Base Color'].default_value = (*color, 1)
    s.inputs['Metallic'].default_value = metallic
    s.inputs['Roughness'].default_value = roughness
    return m

steel = material('steel', (.36, .41, .46), .85, .28)
brass = material('aged_brass', (.47, .29, .09), .72, .38)
leather = material('leather', (.09, .035, .018), 0, .8)
wood = material('oak', (.24, .12, .045), 0, .8)
blue = material('heraldic_blue', (.025, .09, .24), 0, .65)
ivory = material('ivory_paint', (.8, .73, .55), 0, .7)

def mesh(name, vertices, faces, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj

def cube(name, loc, scale, mat, bevel=.005):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat)
    if bevel:
        b = o.modifiers.new('edge_bevel', 'BEVEL')
        b.width, b.segments = bevel, 2
    return o

def cylinder(name, loc, radius, depth, mat, axis='Z', vertices=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    o = bpy.context.object
    o.name = name
    if axis == 'Y': o.rotation_euler[0] = math.pi / 2
    o.data.materials.append(mat)
    return o

def socket(name, loc):
    o = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(o)
    o.location = loc
    o.empty_display_size = .04
    o['semantic_socket'] = True
    return o

# Sword points along +Z, grip at local origin. Faceted diamond cross section.
x = -.55
verts = []
for z, width, thickness in [(.14,.027,.005),(.25,.025,.005),(.84,.018,.003),(1.0,.001,.001)]:
    verts.extend([(x-width,0,z),(x,-thickness,z),(x+width,0,z),(x,thickness,z)])
faces = [(3,2,1,0)]
for ring in range(3):
    for j in range(4):
        a = ring*4+j
        b = ring*4+(j+1)%4
        faces.append((a,b,b+4,a+4))
faces.append((12,13,14,15))
mesh('sword_blade', verts, faces, steel)
cube('sword_crossguard', (x,0,.13), (.24,.025,.025), steel)
cylinder('sword_grip',(x,0,.035),.017,.16,leather)
for i in range(12):
    cylinder('grip_binding_%02d'%i,(x,0,-.039+i*.013),.018,.004,wood)
cylinder('sword_pommel',(x,0,-.065),.033,.032,brass,axis='Y')
socket('sword_grip_primary',(x,0,.03))
socket('sword_tip',(x,0,1.0))

# Shield front faces -Y. Planked body with contrasting face, metal rim and boss.
cx, cz, radius = .35, .51, .39
cylinder('shield_wood',(cx,0,cz),radius,.04,wood,axis='Y',vertices=64)
cylinder('shield_painted_face',(cx,-.023,cz),radius-.025,.009,blue,axis='Y',vertices=64)
cube('shield_heraldic_bar',(cx,-.032,cz),(.065,.009,.70),ivory,.002)
cube('shield_heraldic_cross',(cx,-.033,cz+.10),(.65,.009,.06),ivory,.002)
bpy.ops.mesh.primitive_torus_add(major_radius=radius-.012,minor_radius=.015,major_segments=64,minor_segments=8,location=(cx,-.023,cz),rotation=(math.pi/2,0,0))
bpy.context.object.name='shield_rim'
bpy.context.object.data.materials.append(steel)
boss_vertices=[(cx,-.079,cz)]
for ring in range(1,7):
    theta=ring*math.pi/12
    for j in range(24):
        phi=j*2*math.pi/24
        boss_vertices.append((cx+.085*math.sin(theta)*math.cos(phi),-.034-.045*math.cos(theta),cz+.085*math.sin(theta)*math.sin(phi)))
boss_faces=[]
for j in range(24):boss_faces.append((0,1+j,1+(j+1)%24))
for ring in range(5):
    for j in range(24):
        a=1+ring*24+j;b=1+ring*24+(j+1)%24
        boss_faces.extend([(a,a+24,b+24),(a,b+24,b)])
mesh('shield_boss',boss_vertices,boss_faces,steel)
for i in range(16):
    a=2*math.pi*i/16
    cylinder('shield_rivet_%02d'%i,(cx+.345*math.cos(a),-.033,cz+.345*math.sin(a)),.006,.01,brass,axis='Y',vertices=8)
for dx in [-.10,.10]:
    cube('shield_rear_strap',(cx+dx,.06,cz),(.035,.035,.22),leather)
socket('shield_grip',(cx,.08,cz))
socket('shield_front_normal',(cx,-.15,cz))

assets=list(bpy.context.scene.objects)
for obj in assets:
    if obj.type == 'MESH':
        triangulate = obj.modifiers.new('stable_triangulation', 'TRIANGULATE')
        triangulate.quad_method = 'FIXED'
        triangulate.ngon_method = 'CLIP'
deps=bpy.context.evaluated_depsgraph_get()
records=[]
for obj in sorted(assets,key=lambda o:o.name):
    record={'name':obj.name,'type':obj.type,'matrix':[round(v,7) for row in obj.matrix_world for v in row]}
    if obj.type=='MESH':
        evaluated=obj.evaluated_get(deps)
        m=evaluated.to_mesh()
        m.calc_loop_triangles()
        coords=[[round(v,7) for v in vertex.co] for vertex in m.vertices]
        tris=[list(t.vertices) for t in m.loop_triangles]
        assert all(math.isfinite(v) for row in coords for v in row)
        record.update(vertices=len(coords),triangles=len(tris),geometry_hash=hashlib.sha256(json.dumps([coords,tris],sort_keys=True).encode()).hexdigest())
        evaluated.to_mesh_clear()
    records.append(record)
manifest={'generator':'equipment-demo-v1','blender':bpy.app.version_string,'units':'meters','source_up_axis':'Z','export':'glTF Y-up','objects':records,'validation':'finite geometry and repeat-build manifest only; production rig, collision, engine and visual checks outstanding'}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2))
bpy.ops.object.select_all(action='DESELECT')
for o in assets:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out/'equipment.glb'),use_selection=True,export_format='GLB',export_apply=True)

# Fixed studio preview, excluded from exported asset.
floor=material('studio',(.12,.14,.17),0,.85)
cube('studio_floor',(0,0,-.12),(200,200,.02),floor,0)
world=bpy.context.scene.world
world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.2,.23,.28,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.5
for loc,power,size in [((-3,-4,5),650,4),((3,1,3),450,3)]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size
    o.rotation_euler=(Vector((0,0,.4))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(1.3,-3,1.5))
camera=bpy.context.object
camera.rotation_euler=(Vector((-.05,0,.45))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=1.9
scene=bpy.context.scene;scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=8;scene.cycles.use_denoising=False
scene.render.resolution_x=800;scene.render.resolution_y=600;scene.render.resolution_percentage=100
scene.render.filepath=str(out/'preview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'equipment.blend'))
bpy.ops.render.render(write_still=True)
