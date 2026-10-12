"""Wave22: Sculpt actual original geometry from GPT's WWII character concept sheets.
Source licensed artist 64-Mixamo-bone CC0 Panzergrenadier from W20 GLBs.
These historically-inspired German and Soviet outfit pieces are newly authored
geometry (not an image converted into a rig). Keep original skinning intact.
Blender headless: blender -b -t 4 -P scripts/wave22-soldier-outfits.py
"""
import bpy,json,math,sys
from pathlib import Path
from mathutils import Vector
root=Path("three-d/assets/characters");audit=Path("docs/research/wave22");audit.mkdir(parents=True,exist_ok=True)
def reset():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,c,metal=0,rough=.84):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF')
 p.inputs["Base Color"].default_value=(*c,1);p.inputs["Metallic"].default_value=metal;p.inputs["Roughness"].default_value=rough
 return m
def assign(ob,name,m,bone,arm,bevel=.0):
 ob.name="W22_"+name
 bpy.context.view_layer.objects.active=ob
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 if bevel>0:
  mod=ob.modifiers.new("Soft rolled sewn/metal edge","BEVEL");mod.width=bevel;mod.segments=2
  bpy.ops.object.modifier_apply(modifier=mod.name)
  norm=ob.modifiers.new("Weighted facets","WEIGHTED_NORMAL");bpy.ops.object.modifier_apply(modifier=norm.name)
 ob.data.materials.append(m);ob.parent=arm
 gp=ob.vertex_groups.new(name=bone);gp.add([v.index for v in ob.data.vertices],1,"REPLACE")
 mod=ob.modifiers.new("Original 64-joint Mixamo rig for art accessory","ARMATURE");mod.object=arm
 return ob
def box(name,pos,dimensions,m,bone,arm,bevel=.5):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos)
 o=bpy.context.object;o.dimensions=dimensions
 return assign(o,name,m,bone,arm,bevel)
def cyl(name,loc,radius,length,m,bone,arm,axis='z',sides=14):
 bpy.ops.mesh.primitive_cylinder_add(vertices=sides,radius=radius,depth=length,location=loc)
 o=bpy.context.object
 if axis=='x':o.rotation_euler[1]=math.pi/2
 elif axis=='y':o.rotation_euler[0]=math.pi/2
 return assign(o,name,m,bone,arm)
def sphere(name,pos,scale,m,bone,arm):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,location=pos)
 o=bpy.context.object;o.scale=scale
 return assign(o,name,m,bone,arm)
def beam(name,a,b,r,m,bone,arm):
 a,b=Vector(a),Vector(b);d=b-a
 bpy.ops.mesh.primitive_cylinder_add(vertices=9,radius=r,depth=d.length,location=(a+b)/2)
 o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
 return assign(o,name,m,bone,arm)
def torus(name,loc,r,tube,m,bone,arm,axis='z'):
 bpy.ops.mesh.primitive_torus_add(major_segments=20,minor_segments=5,location=loc,major_radius=r,minor_radius=tube)
 o=bpy.context.object
 if axis=='x':o.rotation_euler[1]=math.pi/2
 if axis=='y':o.rotation_euler[0]=math.pi/2
 return assign(o,name,m,bone,arm)
def hemishell(name,center,radius,height,m,bone,arm,segments=24,rings=7):
 points=[];faces=[]
 for ring in range(rings+1):
  theta=(ring/rings)*math.pi/2
  rad=max(.005,radius*math.sin(theta))
  zz=center[2]+height*math.cos(theta)
  for i in range(segments):
   a=i*2*math.pi/segments
   points.append((center[0]+math.cos(a)*rad,center[1]+math.sin(a)*rad*.94,zz))
 for ring in range(rings):
  for i in range(segments):
   j=ring*segments+i;k=ring*segments+(i+1)%segments
   faces.append((j,k,k+segments,j+segments))
 mesh=bpy.data.meshes.new(name+" mesh");mesh.from_pydata(points,[],faces);mesh.update()
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
 return assign(o,name,m,bone,arm)
def shaped_gymnastiorka(name,m,bone,arm,offset=0):
 # A sculpted, tapering 5-ring body silhouette (not primitive rectangular box).
 rings=[(53,12.8,9.1),(55,12.0,8.2),(64,11.4,8.1),(72,12.2,8.9),(76,9.9,7.5)]
 vert=[];face=[];segments=16
 for i,(z,rx,ry) in enumerate(rings):
  for k in range(segments):
   theta=2*math.pi*k/segments
   vert.append((math.cos(theta)*rx,math.sin(theta)*ry+offset,z))
 for i in range(len(rings)-1):
  for k in range(segments):
   a=i*segments+k;b=i*segments+(k+1)%segments
   face.append((a,b,b+segments,a+segments))
 mesh=bpy.data.meshes.new(name+" tailored uniform");mesh.from_pydata(vert,[],face);mesh.update()
 ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob)
 # Important: cover face has material AND armature vertex weights, no external texture.
 return assign(ob,name,m,bone,arm)
def combineAccessories():
 # Merge all self-authored per-material parts into few skinned primitives.
 # Blender merges groups by name, retaining head/torso/pelvis Mixamo skin links.
 items=[o for o in bpy.data.objects if o.type=="MESH" and o.name.startswith("W22_")]
 mats={}
 for o in items:mats.setdefault(o.data.materials[0].name,[]).append(o)
 for name,objects in mats.items():
  if len(objects)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0]
  bpy.ops.object.join()
  objects[0].name="W22_Rigged_"+name
def produce(team):
 reset()
 inputfile=root/("soviet_side_derived_cc0_interim.glb" if team=="soviet" else "panzergrenadier_cc0_npc_lod.glb")
 bpy.ops.import_scene.gltf(filepath=str(inputfile))
 arm=next(o for o in bpy.data.objects if o.type=="ARMATURE")
 assert len(arm.data.bones)==64
 body="mixamorig:Spine2" if arm.data.bones.get("mixamorig:Spine2") else "mixamorig:Spine1"
 hips="mixamorig:Hips";head="mixamorig:Head"
 assert all(arm.data.bones.get(b) for b in (body,hips,head))
 steel=mat("W22_period_steel_helmet_"+team,(.16,.20,.16) if team=="soviet" else (.17,.20,.20),.64,.52)
 canvas=mat("W22_period_canvas_"+team,(.41,.35,.21) if team=="soviet" else (.33,.35,.30),0,.91)
 cloth=mat("W22_wool_gymnastiorka_"+team,(.37,.32,.20) if team=="soviet" else (.32,.36,.34),0,.95)
 leather=mat("W22_leather_"+team,(.24,.13,.074) if team=="soviet" else (.13,.11,.085),.12,.8)
 metal=mat("W22_brushed_tin_"+team,(.37,.39,.33),.67,.57)
 trim=mat("W22_unit_collar_color_"+team,(.47,.19,.13) if team=="soviet" else (.30,.32,.29),.08,.82)
 if team=="soviet":
  for o in list(bpy.data.objects):
   if o.type=="MESH" and ("surrogate simple field cap" in o.name or "field cap cloth band" in o.name):
    bpy.data.objects.remove(o,do_unlink=True)
  # Distinct SSh-inspired Soviet steel helmet, wide flared brim + chinstrap.
  hemishell("SSh-40 pressed steel 12cm hemishell",(0,-.35,89.3),7.4,5.6,steel,head,arm)
  torus("SSh-40 round swept brim",(0,-.35,89.2),7.75,.55,steel,head,arm)
  for side in [-1,1]:
   sphere("SSh-40 helmet bolt "+str(side),(side*7.55,-.5,90.1),(.45,.42,.48),metal,head,arm)
   beam("SSh-40 chin strap", (side*5.8,-.7,89), (side*3.2,-5.3,80.0),.25,leather,head,arm)
  # Sculpted 5-ring Soviet canvas tunic covering original German field jacket;
  # red collar and distinctly large brown ammo webbing.
  shaped_gymnastiorka("Soviet model 1943 fitted field-tunic",cloth,body,arm,-.15)
  for side in [-1,1]:
   box("Soviet double-breasted chest pocket "+str(side),(side*5.3,-8.38,66.5),(8,2.4,6.1),cloth,body,arm,.65)
   box("Soviet red wool collar patch "+str(side),(side*5,-6.2,75.9),(6.1,1.2,2.1),trim,body,arm,.2)
   beam("Soviet cross canvas strap "+str(side),(side*9.2,-8.2,74),(-side*8.3,-8.9,54),.82,leather,body,arm)
  for x in [-8.2,0,8.2]:
   box("Soviet front leather 7.62 pouches "+str(x),(x,-10.0,56.3),(6.5,3.8,6.7),leather,hips,arm,.65)
   box("Soviet ammunition pouch closure "+str(x),(x,-12.12,59.7),(6.8,.7,1.6),canvas,hips,arm,.18)
  box("Soviet simple four-loop belt",(0,-8.8,54.0),(23,1.45,2.5),leather,hips,arm,.35)
  box("Soviet front metal belt buckle",(0,-10,54.3),(4,1.2,3.4),metal,hips,arm,.25)
  # Visual correction: the original cuboid haversack was literally a giant
  # rectangular prism and looked like a Minecraft backpack in gameplay.
  # A softly rounded cloth silhouette prevents a block protruding from the
  # back; straps/rolled bedding remain physically attached to the 64 joints.
  sphere("Soviet rounded canvas haversack",(0,11.7,63.4),(10.5,4.4,10.6),canvas,body,arm)
  sphere("Soviet gathered soft rucksack closure",(0,15.5,70.2),(10.7,2.4,3.1),cloth,body,arm)
  cyl("Soviet rolled groundsheet across shoulders",(0,12.7,77.7),3.7,24.0,cloth,body,arm,'x',20)
  for x in [-7.2,7.2]:
   torus("Soviet blanket leather strap "+str(x),(x,12.7,77.7),3.95,.38,leather,body,arm,'x')
  sphere("Soviet water flask canteen",(13.0,10.4,56.0),(3.3,3.5,5.4),leather,hips,arm)
  cyl("Soviet wood shovel handle",(-14.1,12.6,51.8),.83,23.0,canvas,hips,arm)
  box("Soviet shovel steel head",(-14.1,13.1,39.3),(6.1,1.4,9.5),metal,hips,arm,1.1)
  cyl("Soviet rolled medical pouch",(-12.9,-.8,52.8),2.8,6.6,canvas,hips,arm,'x')
 else:
  # Original CC0 German boots, uniform and helmet preserved; 3D webbing details
  # and equipment are based on generated German front/back orthographic artwork.
  for side in [-1,1]:
   beam("German full Y-shaped webbing "+str(side),(side*8.5,-7.6,74.6),(-side*7.2,-8.2,55.2),.66,leather,body,arm)
   box("German dark-leather triple MP40 pouch "+str(side),(side*8.8,-8.9,58.7),(7.6,3.5,11.2),leather,hips,arm,.65)
   for dz in [-2.8,0,2.8]:
    box("German stitched pouch flap "+str(side)+str(dz),(side*8.8+dz,-10.9,63.7),(2.3,.65,1.2),metal,hips,arm,.18)
   sphere("German helmet rivet / dome edge "+str(side),(side*5.5,-1.4,91.8),(.48,.48,.45),metal,head,arm)
  cyl("German cylindrical gas mask carrier",(15.5,10.2,60.0),3.3,15.1,steel,body,arm,'z',20)
  torus("German gas canister metal band",(15.5,10.2,65.9),3.55,.38,metal,body,arm)
  cyl("German wool blanket bedroll",(0,12.3,76.8),3.8,20.0,cloth,body,arm,'x',20)
  for x in [-6.5,6.5]:torus("German bedroll buckle strap "+str(x),(x,12.3,76.8),4,.37,leather,body,arm,'x')
  sphere("German canteen leather cover",(-14.2,9.9,55.6),(3.2,3.0,5.1),leather,hips,arm)
 combineAccessories()
 for o in bpy.context.selected_objects:o.select_set(False)
 for o in bpy.data.objects:
  if o.type in {"ARMATURE","MESH"} and (o.type=="ARMATURE" or len(o.vertex_groups)>0):o.select_set(True)
 bpy.context.view_layer.objects.active=arm
 path=root/("panzergrenadier_wave22_"+team+".glb")
 bpy.ops.export_scene.gltf(filepath=str(path),export_format="GLB",use_selection=True,
  export_yup=True,export_animations=False,export_materials="EXPORT",export_normals=True,export_image_format="AUTO")
 original=[o for o in bpy.data.objects if o.type=="MESH" and not o.name.startswith("W22_")]
 new=[o for o in bpy.data.objects if o.type=="MESH" and o.name.startswith("W22_")]
 return {"file":str(path),"bytes":path.stat().st_size,"skinnedJoints":len(arm.data.bones),
  "newAccessorMeshes":len(new),"newClothTriangles":sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in new),
  "totalTriangles":sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in new+original),
  "historicallyInspired":True,"exactPeriodCertified":False,
  "source":"Britdawgmasterfunk Panzergrenadier original CC0 64-bone artist with Wave22 newly modeled uniform and equipment",
  "reference":"Previous-turn ChatGPT generated German/Soviet 2D concept sheets; NOT imported photogrammetry or automatic 3D reconstruction"}
result={}
for team in ("german","soviet"):
 result[team]=produce(team)
 print("WAVE22_MODEL",team,json.dumps(result[team],ensure_ascii=False))
(audit/"character-models.json").write_text(json.dumps(result,indent=2,ensure_ascii=False))
