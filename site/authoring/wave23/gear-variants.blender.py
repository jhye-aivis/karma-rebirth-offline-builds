"""Wave23: Six truly different deterministic CC0-licensed WWII field-equipment 3D variants.
Exports ONE GLB PER FACTION, NOT SIX COPIES OF THE ENTIRE 64-bone source rig.
All G01/G02/G03 or S01/S02/S03 equipment is included as independently tagged
skinned mesh primitives in the same GLB; JS WebGL renderer filters by variantId.
Original copyrighted game meshes are never imported; base GLB is CC0 derivative.
Run blender -b -t 4 -P scripts/wave23-gear-variants.py
"""
import bpy,math,json
from mathutils import Vector
from pathlib import Path
root=Path("three-d/assets/characters");evidence=Path("docs/research/wave23");evidence.mkdir(parents=True,exist_ok=True)
def reset():
 bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
def mat(name,RGB,metal=0,rough=.85):
 m=bpy.data.materials.new(name);m.diffuse_color=(*RGB,1);m.use_nodes=True
 bs=m.node_tree.nodes.get("Principled BSDF");bs.inputs["Base Color"].default_value=(*RGB,1)
 bs.inputs["Metallic"].default_value=metal;bs.inputs["Roughness"].default_value=rough
 return m
def apply(ob,name,m,arm,bone,bevel=.0):
 ob.name="W23_"+name
 bpy.context.view_layer.objects.active=ob
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 if bevel:
  mod=ob.modifiers.new("Rounded period kit bevel","BEVEL");mod.width=bevel;mod.segments=2
  bpy.ops.object.modifier_apply(modifier=mod.name)
  mod=ob.modifiers.new("Soft equipment normals","WEIGHTED_NORMAL");bpy.ops.object.modifier_apply(modifier=mod.name)
 ob.data.materials.append(m);ob.parent=arm
 gp=ob.vertex_groups.new(name=bone);gp.add([v.index for v in ob.data.vertices],1,"REPLACE")
 mod=ob.modifiers.new("Original Mixamo skeleton skin","ARMATURE");mod.object=arm
 return ob
def box(name,p,shape,m,arm,bone,rounded=0.8):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.dimensions=shape
 return apply(o,name,m,arm,bone,rounded)
def cylinder(name,p,rad,length,m,arm,bone,axis="z",facets=16):
 bpy.ops.mesh.primitive_cylinder_add(vertices=facets,radius=rad,depth=length,location=p);o=bpy.context.object
 if axis=="x":o.rotation_euler[1]=math.pi/2
 if axis=="y":o.rotation_euler[0]=math.pi/2
 return apply(o,name,m,arm,bone)
def ball(name,p,shape,m,arm,bone):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=14,ring_count=8,location=p);o=bpy.context.object;o.scale=shape
 return apply(o,name,m,arm,bone)
def rod(name,a,b,r,m,arm,bone):
 a,b=Vector(a),Vector(b);length=(b-a).length
 bpy.ops.mesh.primitive_cylinder_add(vertices=10,radius=r,depth=length,location=(a+b)*.5)
 o=bpy.context.object;o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
 return apply(o,name,m,arm,bone)
def joinRoles():
 for role in ["G01","G02","G03","S01","S02","S03"]:
  parts=[o for o in bpy.data.objects if o.type=="MESH" and o.name.startswith("W23_"+role+"_")]
  if not parts:continue
  bymat={}
  for o in parts:bymat.setdefault(o.data.materials[0].name,[]).append(o)
  for name,meshes in bymat.items():
   if len(meshes)<2:continue
   bpy.ops.object.select_all(action="DESELECT")
   for o in meshes:o.select_set(True)
   bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join()
   meshes[0].name="W23_"+role+"_Rigged_"+name
def gearAtlasAndMerge(team):
 # Wave23 GPU bottleneck fix: previously every soldier paid one draw call
 # PER W22 accessory material + each W23 accessory material. Preserve the
 # colors in one self-authored PNG atlas and merge into exactly 1 mesh for old
 # generic gear and 1 mesh per W23 role. Shared across EVERY NPC instance.
 import random
 objects=[o for o in bpy.data.objects if o.type=="MESH" and (o.name.startswith("W22_") or o.name.startswith("W23_"))]
 mats={m.name:m for o in objects for m in o.data.materials}
 names=sorted(mats)
 assert len(names)<=48,(team,names)
 atlas=bpy.data.images.new("W23_unified_gear_atlas_"+team,width=256,height=256,alpha=True)
 pixels=[0.]*(256*256*4)
 for i,name in enumerate(names):
  m=mats[name];bs=m.node_tree.nodes.get("Principled BSDF") if m.use_nodes else None
  base=tuple(bs.inputs["Base Color"].default_value[:3]) if bs else tuple(m.diffuse_color[:3])
  col=i%8;row=i//8
  for y in range(row*32,(row+1)*32):
   for x in range(col*32,(col+1)*32):
    # Stable subtle procedural fabric / worn-steel micropatterns without CDN.
    fine=((x*23+y*7+i*19)%13-6)*.004
    v=(y*256+x)*4
    for c in range(3):pixels[v+c]=max(.015,min(1.,base[c]+fine))
    pixels[v+3]=1.
 atlas.pixels.foreach_set(pixels)
 atlas.filepath_raw=str(root/("wave23_gear_atlas_"+team+".png"));atlas.file_format="PNG";atlas.save()
 new=mat("W23_shared_role_gear_atlas_"+team,(1,1,1),.19,.82)
 bs=new.node_tree.nodes.get("Principled BSDF")
 tex=new.node_tree.nodes.new("ShaderNodeTexImage");tex.image=atlas
 tex.interpolation="Linear";new.node_tree.links.new(tex.outputs["Color"],bs.inputs["Base Color"])
 for ob in objects:
  src=ob.data.materials[0].name
  tile=names.index(src);u=((tile%8)+.5)/8;v=((tile//8)+.5)/8
  uv=ob.data.uv_layers.active or ob.data.uv_layers.new(name="W23AtlasUV")
  for loop in uv.data:loop.uv=(u,v)
  ob.data.materials.clear();ob.data.materials.append(new)
 groups={}
 for ob in objects:
  tag=ob.name.split("_")[1] if ob.name.startswith("W23_") else "BASE"
  groups.setdefault(tag,[]).append(ob)
 for tag,meshes in groups.items():
  if not meshes:continue
  bpy.ops.object.select_all(action="DESELECT")
  for ob in meshes:ob.select_set(True)
  bpy.context.view_layer.objects.active=meshes[0]
  if len(meshes)>1:bpy.ops.object.join()
  meshes[0].name="W23_"+tag+"_Rigged_Shared_Atlas" if tag!="BASE" else "W22_Base_Rigged_Shared_Atlas"
 return {"atlasMaterialsMerged":len(mats),"beforeMeshes":len(objects),"afterMeshes":len(groups),
         "atlasPNG":str(root/("wave23_gear_atlas_"+team+".png"))}
def create(faction):
 reset()
 src=root/("panzergrenadier_wave22_"+faction+".glb")
 bpy.ops.import_scene.gltf(filepath=str(src))
 arm=next(o for o in bpy.data.objects if o.type=="ARMATURE")
 assert len(arm.data.bones)==64
 spine="mixamorig:Spine2" if "mixamorig:Spine2" in arm.data.bones else "mixamorig:Spine1"
 hips="mixamorig:Hips";head="mixamorig:Head"
 assert all(b in arm.data.bones for b in [spine,hips,head])
 canvas=mat(f"W23_{faction}_faded_canvas",(.43,.40,.32) if faction=="german" else (.42,.35,.24))
 tan=mat(f"W23_{faction}_dull_wool",(.28,.33,.31) if faction=="german" else (.40,.35,.23))
 leather=mat(f"W23_{faction}_leather",(.19,.135,.09))
 steel=mat(f"W23_{faction}_painted_steel",(.22,.25,.22) if faction=="german" else (.27,.33,.25),.68,.56)
 mag=mat(f"W23_{faction}_blackened_mag",(.10,.105,.097),.65,.47)
 # Art role tags are retained as Blender glTF node/mesh names; the JS renderer
 # draws only the slot material meshes matching the actor's deterministic role.
 if faction=="german":
  # G01: assault, recognizably symmetrical MP40 stick magazines + canister
  for side in [-1,1]:
   for k in range(3):
    x=side*(8.0+k*1.65)
    box(f"G01_mp40_mag_steel_{side}_{k}",(x,-11.0,55.8),(2.6,3.1,13.6),mag,arm,hips,.40)
    box(f"G01_magazine_leather_flap_{side}_{k}",(x,-12.65,61.4),(2.8,.6,1.6),leather,arm,hips,.28)
   rod(f"G01_loadbearing_cross_strap_{side}",(side*9.5,-9.1,74),(-side*5.3,-10.0,55),.68,leather,arm,spine)
  cylinder("G01_steel_gasmask_canister",(16.4,12.1,60),3.8,16,steel,arm,spine,facets=24)
  # G02: rifleman, contrasting large rectangular field pack and heavy bedroll.
  box("G02_large_stiff_canvas_rucksack",(0,14.3,63.8),(23.5,9.2,22.6),canvas,arm,spine,2.1)
  cylinder("G02_rolltop_blanket",(0,16.6,78.8),4.35,26.5,tan,arm,spine,"x",22)
  for side in [-1,1]:
   for k in range(3):
    box(f"G02_rifle_cartridge_pouch_{side}_{k}",(side*(6.9+k*2),-11.5,58.1),(2.8,3.4,7.8),leather,arm,hips,.55)
   ball(f"G02_leather_canteen_{side}",(side*15,9.3,54.5),(3,3.4,5),leather,arm,hips)
  rod("G02_spare_cleaning_rod",(-15,15,52),(-15,15,76),.70,steel,arm,spine)
  # G03: scout, deliberately slim pack, patterned cover and crossed straps.
  box("G03_short_light_patrol_satchel",(0,10.3,59.2),(15.0,4.8,11.5),canvas,arm,spine,1.2)
  for side in [-1,1]:
   rod(f"G03_thin_cross_sling_{side}",(side*8,-7.5,73.2),(-side*4.8,-9.4,56),.43,leather,arm,spine)
  cylinder("G03_lone_steel_mess_tin",(15.1,7.2,56.3),2.8,5.2,steel,arm,hips,facets=20)
  ball("G03_scout_rolled_half_sheet",(-15.1,8.9,55.7),(2.9,3,5.8),tan,arm,hips)
 else:
  # S01: PPSh assault, large drum magazine pockets and a prominent bedroll
  for side in [-1,1]:
   cylinder(f"S01_ppsh_drum_mag_case_{side}",(side*11,-11.1,57.5),5.1,3.5,leather,arm,hips,"y",24)
   box(f"S01_drum_mag_case_flap_{side}",(side*11,-13.5,60),(9.3,.7,2.5),canvas,arm,hips,.5)
  box("S01_large_square_soviet_haversack",(0,16.8,65.1),(25,10,25),tan,arm,spine,2)
  cylinder("S01_large_crosswise_canvas_blanket",(0,18.3,80.1),4.1,26,canvas,arm,spine,"x",22)
  # S02: rifleman with long cartridge-pouch panel, steel field shovel, canteen.
  for side in [-1,1]:
   for k in range(4):
    box(f"S02_762_cartridge_pouch_{side}_{k}",(side*(5.5+k*1.7),-10.8,57.7),(2.4,2.5,9),leather,arm,hips,.35)
   rod(f"S02_canvas_backstrap_{side}",(side*9,-7.7,72),(-side*6,12,55),.58,canvas,arm,spine)
  rod("S02_entrenchment_shovel_handle",(-16,11,50),(-16,12.6,70),.83,tan,arm,spine)
  box("S02_entrenchment_steel_blade",(-16,11.6,42),(7.5,1.8,10.8),steel,arm,hips,1.2)
  ball("S02_oblong_canteen",(15.4,11.9,54.2),(3.1,3.2,5.5),leather,arm,hips)
  # S03: lightweight scout with no giant rucksack, small side pouch + sling.
  box("S03_minimal_small_satchel",(-9.8,10.9,57.3),(11.6,4.7,11.4),canvas,arm,hips,1.2)
  cylinder("S03_narrow_bedroll",(0,10.3,78),2.7,17,tan,arm,spine,"x",16)
  for side in [-1,1]:
   rod(f"S03_short_canvas_crossstrap_{side}",(side*8,-7.6,75),(-side*5,-8,54),.39,canvas,arm,spine)
  ball("S03_light_breadbag",(13,8.5,55),(4.2,3.5,5.1),canvas,arm,hips)
 joinRoles()
 merge=gearAtlasAndMerge(faction)
 bpy.ops.object.select_all(action="DESELECT")
 objects=[o for o in bpy.data.objects if o.type in ("MESH","ARMATURE")]
 for ob in objects:ob.select_set(True)
 bpy.context.view_layer.objects.active=arm
 path=root/("panzergrenadier_wave23_"+faction+".glb")
 bpy.ops.export_scene.gltf(filepath=str(path),export_format="GLB",use_selection=True,export_yup=True,
  export_animations=False,export_materials="EXPORT",export_normals=True,export_image_format="AUTO")
 byRole={}
 for role in (["G01","G02","G03"] if faction=="german" else ["S01","S02","S03"]):
  meshes=[o for o in objects if o.type=="MESH" and o.name.startswith("W23_"+role+"_")]
  byRole[role]={"meshes":len(meshes),"triangles":sum(sum(len(poly.vertices)-2 for poly in o.data.polygons) for o in meshes),
    "equipmentNames":[o.name for o in meshes],"skinned":all(any(m.type=="ARMATURE" and m.object==arm for m in o.modifiers) for o in meshes)}
 assert all(byRole[r]["triangles"]>150 for r in byRole),byRole
 return {"file":str(path),"bytes":path.stat().st_size,"sourceSkinJoints":len(arm.data.bones),"gearAtlas":merge,
         "base":"Licensed creator CC0 Panzergrenadier 64-bone Wave22 + original 3D role accessories",
         "roles":byRole,"gpuSharing":"one GLB and GPU buffers per faction, variant shader role-tag filtering"}
audit={f:create(f) for f in ["german","soviet"]}
(evidence/"variant-asset-audit.json").write_text(json.dumps(audit,indent=2,ensure_ascii=False))
for f in audit:print("WAVE23_VARIANTS",f,json.dumps(audit[f],ensure_ascii=False))
