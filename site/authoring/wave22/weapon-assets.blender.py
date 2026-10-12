"""Wave22 original Blender models inspired by the four GPT image reference sheets.
ACTUAL modeled 3D (.glb); no external copyrighted model, no Sketchfab.
Exports an additional .mesh Float32 interleaved P/N/color/rough/metal binary for
fast single GPU draw in the existing WebGL2 shooter.
Run: blender -b -P scripts/wave22-weapon-assets.py
"""
import bpy,math,struct,json
from pathlib import Path
from mathutils import Vector
ROOT=Path('three-d/assets/weapons'); ROOT.mkdir(parents=True,exist_ok=True)
AUDIT=Path('docs/research/wave22');AUDIT.mkdir(parents=True,exist_ok=True)
def cleanup():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for m in bpy.data.materials:bpy.data.materials.remove(m)
def material(name,rgba,metal=0.0,rough=.65):
 m=bpy.data.materials.new(name);m.diffuse_color=(*rgba,1)
 m.use_nodes=True;p=m.node_tree.nodes.get("Principled BSDF")
 p.inputs["Base Color"].default_value=(*rgba,1);p.inputs["Metallic"].default_value=metal;p.inputs["Roughness"].default_value=rough
 m['w22_color']=list(rgba);m['w22_metal']=metal;m['w22_rough']=rough
 return m
def assigned(o,mat,name):
 o.name=name;o.data.materials.append(mat)
 bpy.context.view_layer.objects.active=o
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 return o
def bevel(o,amount=.007,segments=2):
 if amount<=0:return o
 bpy.context.view_layer.objects.active=o
 mod=o.modifiers.new("Real modeled steel/wood bevels","BEVEL");mod.width=amount;mod.segments=segments
 bpy.ops.object.modifier_apply(modifier=mod.name)
 mod=o.modifiers.new("Chamfer weighted face normals","WEIGHTED_NORMAL")
 bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def cube(name,loc,size,mat,radius=.006):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
 o=bpy.context.object;o.dimensions=size
 bpy.context.view_layer.objects.active=o;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 bevel(o,radius);return assigned(o,mat,name)
def cylinder(name,loc,radius,depth,mat,axis='z',segments=16,tip=None):
 bpy.ops.mesh.primitive_cylinder_add(vertices=segments,radius=radius,depth=depth,location=loc)
 o=bpy.context.object
 if tip is not None:
  a=Vector(loc);b=Vector(tip);d=b-a;o.location=(a+b)*.5;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.scale.z=d.length/depth
 elif axis=='x':o.rotation_euler[1]=math.pi/2
 elif axis=='y':o.rotation_euler[0]=math.pi/2
 return assigned(o,mat,name)
def beam(name,a,b,r,mat,sides=10):
 return cylinder(name,a,r,1,mat,segments=sides,tip=b)
def torus(name,loc,major,minor,mat,axis='z'):
 bpy.ops.mesh.primitive_torus_add(major_segments=22,minor_segments=6,location=loc,major_radius=major,minor_radius=minor)
 o=bpy.context.object
 if axis=='x':o.rotation_euler[1]=math.pi/2
 if axis=='y':o.rotation_euler[0]=math.pi/2
 return assigned(o,mat,name)
def sphere(name,loc,scale,mat,seg=16):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=10,location=loc)
 o=bpy.context.object;o.scale=scale
 return assigned(o,mat,name)
def ppsh_stocks(wood,darkwood):
 # Soviet walnut rifle stock: contoured butt plus smooth taper and pistol web.
 cube("PPSh polished hardwood butt",(-.005,-.058,-.255),(.113,.152,.39),wood,.025)
 cube("PPSh curved walnut fore-end",(-.005,-.026,.152),(.085,.125,.48),wood,.024)
 cube("PPSh walnut semi-pistol tang",(0,-.105,.185),(.069,.145,.160),darkwood,.026)
 cube("PPSh steel buttplate",(0,-.055,-.454),(.125,.158,.020),black,.008)
 beam("PPSh sling-stud band",(-.039,-.037,-.323),(-.039,-.037,-.38),.007,steel)
def shared_parts(steel,dark,highlight,profile):
 # Common mechanically plausible receiver and safety/trigger elements
 cube(profile+" solid stamped upper receiver",(0,.032,.532),(.104,.102,.43),steel,.018)
 cube(profile+" bolt housing",(0,.092,.553),(.067,.026,.24),dark,.01)
 cube(profile+" machined ejection port",(.054,.044,.584),(.007,.038,.135),dark,.002)
 sphere(profile+" safety control",(.062,.009,.447),(.015,.014,.017),highlight)
 cube(profile+" trigger",(0,-.142,.324),(.011,.089,.013),dark,.003)
 beam(profile+" trigger-guard front",(-.046,-.152,.400),(-.046,-.164,.303),.006,steel)
 beam(profile+" trigger-guard rear",(.046,-.152,.400),(.046,-.164,.303),.006,steel)
 beam(profile+" trigger-guard arc",(-.046,-.164,.303),(.046,-.164,.303),.006,steel)
 cube(profile+" rear notch sight",(0,.142,.384),(.067,.034,.022),dark,.004)
def mp40(steel,dark,rubber,edge,black):
 shared_parts(steel,dark,edge,"MP40")
 # Correct folded-stock German stamping and stick magazine, PBR steel/bakelite.
 cube("MP40 receiver front band",(0,.02,.766),(.113,.133,.093),steel,.018)
 cylinder("MP40 machine barrel",(0,.027,1.027),.022,.51,black,segments=18)
 cylinder("MP40 barrel retaining cuff",(0,.025,.81),.041,.115,steel,segments=20)
 cylinder("MP40 muzzle brake", (0,.027,1.295),.030,.069,dark,segments=18)
 cylinder("MP40 front barrel lip",(0,.027,1.332),.036,.018,edge,segments=18)
 cube("MP40 original bakelite handguard",(0,-.014,.773),(.104,.073,.293),rubber,.021)
 for k in range(8):
  z=.667+k*.027
  beam("MP40 ribbed bakelite grip "+str(k),(-.054,-.006,z),(.054,-.006,z),.0048,dark)
 cube("MP40 grooved bakelite pistol grip",(0,-.195,.318),(.078,.185,.079),rubber,.018)
 for k in range(5):
  cube("MP40 pistol grip stripe "+str(k),(.040,-.265+k*.025,.317),(.004,.004,.068),dark,.001)
 cylinder("MP40 magazine neck",(0,-.112,.524),.034,.064,steel,axis="y")
 cube("MP40 straight 9mm stick magazine",(0,-.298,.530),(.057,.374,.082),dark,.012)
 cube("MP40 magazine steel follower",(0,-.491,.530),(.072,.019,.093),edge,.004)
 for k in range(4):
  cube("MP40 stick vertical flute "+str(k),(-.028+k*.019,-.290,.571),(.006,.329,.003),steel,.001)
 # Metal underfolding stock arms and loop end.
 for side in (-1,1):
  beam("MP40 rear folding stock arm "+str(side),(side*.045,-.015,.294),(side*.106,-.023,-.305),.010,edge,12)
  sphere("MP40 folding joint "+str(side),(side*.048,-.013,.290),(.024,.017,.024),steel)
 torus("MP40 oval steel folding butt-end",(0,-.012,-.335),.083,.012,edge,axis='z')
 # Front sight shroud, charging handle, screws, rear steel tube
 beam("MP40 front sight ears",(-.033,.025,1.295),(-.033,.100,1.298),.009,steel)
 beam("MP40 front sight ears R",(.033,.025,1.295),(.033,.100,1.298),.009,steel)
 beam("MP40 front sight blade",(0,.061,1.30),(0,.094,1.30),.006,black)
 cylinder("MP40 charging-handle retaining bolt",(.072,.040,.592),.013,.030,edge,axis="x")
 for z in (.396,.463,.631):
  sphere("MP40 rivet",(.057,.055,z),(.010,.010,.010),edge,12)
def ppsh(steel,dark,wood,highlight,black):
 shared_parts(steel,dark,highlight,"PPSh")
 cube("PPSh full walnut shoulder stock",(0,-.065,-.265),(.131,.155,.395),wood,.026)
 cube("PPSh rounded dark wood butt end",(0,-.073,-.463),(.141,.153,.025),dark,.012)
 cube("PPSh walnut forend taper",(0,-.015,.235),(.107,.116,.46),wood,.025)
 cube("PPSh carved semi pistol wood grip",(0,-.142,.247),(.092,.157,.143),wood,.025)
 # Hot rolled steel perforated 1941 shroud, long and unmistakable.
 cylinder("PPSh blackened ventilated barrel shroud",(0,.033,1.074),.050,.773,steel,segments=24)
 cylinder("PPSh inner bore",(0,.033,1.083),.024,.792,black,segments=20)
 cylinder("PPSh rear barrel collar",(0,.033,.705),.065,.083,dark,segments=24)
 cylinder("PPSh muzzle slant comp",(0,.033,1.483),.054,.075,dark,segments=20)
 torus("PPSh muzzle opening",(0,.034,1.525),.034,.008,black)
 for k in range(9):
  z=.789+k*.075
  for side in (-1,1):
   # Deep dark radial elongated slot recesses, not box-art painted line.
   cube("PPSh vent recessed aperture %d %d"%(k,side),(side*.049,.035,z),(.003,.028,.049),black,.006)
   cube("PPSh vent slit highlight %d %d"%(k,side),(side*.051,.035,z+.029),(.002,.003,.043),highlight,.001)
 cylinder("PPSh large 71-round drum",(0,-.213,.558),.166,.092,dark,axis="x",segments=32)
 for side in (-1,1):
  torus("PPSh drum ring side "+str(side),(side*.052,-.213,.558),.132,.009,steel,axis='x')
  sphere("PPSh drum center hub "+str(side),(side*.057,-.213,.558),(.012,.025,.025),highlight)
 cylinder("PPSh drum attachment",(0,-.095,.558),.049,.084,steel,axis="y",segments=18)
 for z in (.78,1.07,1.34):
  cylinder("PPSh riveted steel shroud collar "+str(z),(0,.032,z),.053,.019,highlight,segments=24)
 cube("PPSh high front sight ears",(0,.121,1.427),(.058,.065,.034),dark,.006)
 beam("PPSh slim raised sight",(0,.122,1.427),(0,.175,1.427),.008,steel)
 # period-style sling mounting near wood butt and front metal.
 torus("PPSh sling rear ring",(-.063,-.047,-.372),.026,.007,highlight,axis='x')
 torus("PPSh sling front ring",(-.062,-.043,.730),.023,.006,highlight,axis='x')
def combine_and_export(label):
 # Keep author mesh faces and per-material identity in a stable .mesh GPU buffer.
 path=ROOT/("wave22_"+label)
 objectstats=[o for o in bpy.data.objects if o.type=="MESH"]
 def bake():
  vertices=bytearray();triangles=0
  for o in objectstats:
   m=o.data;m.calc_loop_triangles()
   mw=o.matrix_world
   for poly in m.loop_triangles:
    mat=m.materials[m.polygons[poly.polygon_index].material_index]
    c=mat['w22_color'];rough=mat['w22_rough'];metal=mat['w22_metal']
    for li in poly.loops:
     loop=m.loops[li];v=m.vertices[loop.vertex_index]
     xyz=mw@v.co;nrm=(mw.to_3x3()@loop.normal).normalized()
     vertices.extend(struct.pack('<11f',*xyz,*c,*nrm,rough,metal))
     triangles+=1/3
  (path.with_suffix(".mesh")).write_bytes(vertices)
  return int(triangles),len(vertices)
 tris,bytes_=bake()
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.export_scene.gltf(filepath=str(path.with_suffix('.glb')),export_format="GLB",export_yup=True,export_animations=False,
  export_materials="EXPORT",export_normals=True,export_cameras=False,export_lights=False,export_image_format="AUTO")
 return {"file":str(path.with_suffix(".glb")),"gpuMesh":str(path.with_suffix(".mesh")),"triangles":tris,
  "meshes":len(objectstats),"glbBytes":path.with_suffix(".glb").stat().st_size,"gpuBytes":bytes_,
  "author":"ChatGPT-directed original modeled Blender geometry based on prior user-approved GPT PNG 2D visual designs",
  "originalConceptNot3D":True}
audit={}
for name in ["mp40","ppsh"]:
 cleanup()
 steel=material("W22 blued steel",(.15,.17,.17),.91,.41)
 dark=material("W22 receiver phosphate",(.085,.093,.091),.81,.52)
 rubber=material("W22 MP40 Bakelite black brown",(.20,.125,.093),.09,.68)
 edge=material("W22 worn rubbed steel edges",(.34,.34,.31),.76,.35)
 black=material("W22 deep vent black",(.024,.028,.030),.71,.64)
 wood=material("W22 Soviet walnut rifle stock",(.35,.17,.082),.05,.56)
 if name=="mp40":mp40(steel,dark,rubber,edge,black)
 else:ppsh(steel,dark,wood,edge,black)
 audit[name]=combine_and_export(name)
(AUDIT/"weapon-models.json").write_text(json.dumps(audit,indent=2))
print("WAVE22_WEAPONS",json.dumps(audit))
