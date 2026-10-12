/* Wave22: ACTUAL 3D Blender-modeled MP40 / PPSh geometry.
 * We do NOT treat ChatGPT 2D concept image sheets as rigged 3D.
 * Raw .mesh is a static interleaved Float32 P(3) Albedo(3) N(3) R/M(2)
 * baked from real original Blender .glb objects. Uploaded once to GPU.
 * 1P perspective uses camera-basis matrix; 3P / NPCs use weapon-hand pose.
 */
(function(root){"use strict";
function create(gl){
 const vShader=`#version 300 es
precision highp float;
in vec3 aPosition;in vec3 aColor;in vec3 aNormal;in vec2 aSurface;
uniform mat4 uProjection;uniform mat4 uView;uniform mat4 uModel;
out vec3 vColor;out vec3 vNormal;out vec3 vWorld;out vec3 vLocal;out vec2 vSurface;out float vDistance;
void main(){
 vec4 world=uModel*vec4(aPosition,1.);
 vec4 camera=uView*world;
 gl_Position=uProjection*camera;
 vColor=aColor;vNormal=normalize(mat3(uModel)*aNormal);vWorld=world.xyz;vLocal=aPosition;vSurface=aSurface;vDistance=length(camera.xyz);
}`;
 const fShader=`#version 300 es
precision highp float;
in vec3 vColor;in vec3 vNormal;in vec3 vWorld;in vec3 vLocal;in vec2 vSurface;in float vDistance;
uniform vec3 uEye;uniform vec3 uFog;
uniform sampler2D uWeaponAtlas;uniform float uWeaponAtlasReady;
out vec4 pixel;
void main(){
 vec3 N=normalize(vNormal),L=normalize(vec3(.53,.9,.36)),V=normalize(uEye-vWorld);
 vec3 H=normalize(L+V);
 float nl=max(dot(N,L),0.),r=clamp(vSurface.x,.2,.95),metal=clamp(vSurface.y,0.,1.);
 float highlight=pow(max(dot(N,H),0.),mix(55.,9.,r));
 // Tone-map linear authored Blender colors to calibrated sRGB display;
 // prior W22 screenshot proved steel appeared as a near-solid black blob.
 float brushed=sin(vLocal.z*368.+sin(vLocal.x*94.)*1.3)*.045;
 float patina=fract(sin(dot(floor(vLocal*184.),vec3(73.2,171.8,53.1)))*4821.74);
 float woodgrain=sin(vLocal.z*167.+sin(vLocal.y*62.)*3.5)*.09;
 float textureDetail=mix(1.+woodgrain,1.+brushed+patina*.035,step(.5,metal));
 // Wave24 original material atlas sampled on REAL Blender weapon geometry:
 // 4 tiled swatches (blued steel, phosphate, Bakelite, Soviet walnut).
 // Does not turn the 2D concept sheet itself into a mesh.
 float band=metal>.45?(vColor.r>.25?0.:1.):(vColor.r>.26?3.:2.);
 vec2 uv=vec2((band+.035+.93*fract(vLocal.z*8.3+vLocal.x*.9))/4.,
               .035+.93*fract(vLocal.y*9.7+vLocal.x*3.2));
 vec3 modeledAlbedo=mix(vColor,
   texture(uWeaponAtlas,uv).rgb,.72*clamp(uWeaponAtlasReady,0.,1.));
 vec3 base=modeledAlbedo*textureDetail*(.43+.98*nl);
 vec3 spec=vec3(mix(.08,.67,metal)*highlight*(1.-r*.32));
 float grain=fract(sin(dot(floor(vWorld*154.),vec3(127.1,47.2,381.1)))*43758.54);
 vec3 color=base*(.95+grain*.08)+spec;
 float fog=clamp((vDistance-28.)/62.,0.,.72);
 color=pow(clamp(color,vec3(.003),vec3(1.)),vec3(.55));
 pixel=vec4(mix(color,uFog,fog),1.);
}`;
 const compile=(t,s)=>{const sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);
   if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error("W22 weapon shader: "+gl.getShaderInfoLog(sh));return sh;};
 const program=gl.createProgram();
 gl.attachShader(program,compile(gl.VERTEX_SHADER,vShader));
 gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fShader));
 gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error("W22 gun model shader link: "+gl.getProgramInfoLog(program));
 const attr=Object.fromEntries(["aPosition","aColor","aNormal","aSurface"].map(k=>[k,gl.getAttribLocation(program,k)]));
 const uni=Object.fromEntries(["uProjection","uView","uModel","uEye","uFog","uWeaponAtlas","uWeaponAtlasReady"].map(k=>[k,gl.getUniformLocation(program,k)]));
 const models={},sources={
  mp40:"wave22_mp40",ppsh:"wave22_ppsh",
  kar98:"wave24_kar98",mosin:"wave24_mosin",
  mg34:"wave24_mg34",dp28:"wave24_dp28"
 };
 const aliases={
  mp38:"mp40",mp40:"mp40",ppsh41:"ppsh",tommy:"ppsh",
  kar98:"kar98",kar98scope:"kar98",mosin:"mosin",mosinscope:"mosin",
  mg34:"mg34",dp28:"dp28"
 };
 const resolve=id=>aliases[id]||null;
 const modelsCount=Object.keys(sources).length;
 const report={status:"loading",source:"original Blender-modeled meshes from ChatGPT WWII reference concepts; 2D PNG references NOT 3D sources",format:"GLB + 11-float GPU mesh",models:{},draws:0,artistTriangles:0,loaded:0,required:modelsCount};
 root.KarmaWave22Art=report;
 // One shared compact 1024x256 GPU texture, not one texture per weapon/NPC.
 const atlasTexture=gl.createTexture();
 let atlasReady=false;
 report.wave24Material={status:"loading",source:"original procedural steel/phosphate/Bakelite/walnut texture atlas (not concept sheet pixels)",size:[1024,256]};
 const img=new Image();
 img.onload=()=>{
  gl.bindTexture(gl.TEXTURE_2D,atlasTexture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
  gl.generateMipmap(gl.TEXTURE_2D);
  atlasReady=true;report.wave24Material.status="loaded";
 };
 img.onerror=()=>{report.wave24Material.status="fallback";report.wave24Material.reason="PNG load failed; original vertex-color material used";};
 img.src="assets/weapons/wave24_material_atlas.png";
 function load(kind){
  return fetch("assets/weapons/"+sources[kind]+".mesh").then(r=>{
   if(!r.ok)throw Error("W22 "+kind+" mesh HTTP "+r.status);return r.arrayBuffer();
  }).then(data=>{
   if(data.byteLength%44)throw Error("W22 "+kind+" malformed Float32 11 attributes");
   const count=data.byteLength/44,buffer=gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
   models[kind]={buffer,count};
   report.models[kind]={vertices:count,triangles:count/3,bytes:data.byteLength};
   report.loaded=Object.keys(models).length;
   report.artistTriangles+=count/3;
   report.status=report.loaded===modelsCount?"loaded":"loading";
  });
 }
 Promise.all(Object.keys(sources).map(load)).catch(e=>{
  report.status="failed";report.error=String(e);console.error("W22 Blender gun asset failed, old geometry fallback",e);
 });
 const eyeMat=()=>new Float32Array(16);
 function transform({player,thirdPerson=true,shoulderR=.3,gunY=1.38,barrelBaseF=0,yaw=0,pitch=0,recoil=0,aiming=false,reload=0}){
  const c=Math.cos(yaw),s=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  const R=[c,0,s],F=[s*cp,sp,-c*cp],U=[-s*sp,cp,c*sp];
  // W22 authored dimensions used Blender reference-sheet units (~1.7m long).
  // The unscaled first-person model filled half of the frame with a massive
  // grey box. Fit it to ~MP40/PPSh physical size and offset it from the eye,
  // without changing ray-cast gameplay geometry or projectile damage.
  const modelScale=thirdPerson?.72:.57;
  let tx,ty,tz,xAxis=R,yAxis=U,zAxis=F;
  if(thirdPerson){
    tx=player.x+c*shoulderR+s*(barrelBaseF-recoil)*cp;
    ty=gunY+(barrelBaseF-.38)*sp;
    tz=player.z+s*shoulderR-c*(barrelBaseF-recoil)*cp;
    yAxis=[0,1,0];
  }else{
    const eye=[player.x,(player.eyeHeight||1.65)+(player.jumpY||0),player.z];
    const x=aiming?.09:.29,y=aiming?-.24:-.30,z=aiming?.26:.31;
    tx=eye[0]+R[0]*x+U[0]*y+F[0]*z;
    ty=eye[1]+R[1]*x+U[1]*y+F[1]*z;
    tz=eye[2]+R[2]*x+U[2]*y+F[2]*z;
  }
  const off=reload>0?Math.sin(reload*Math.PI)*-.18:0;
  ty+=off;
  return new Float32Array([
   ...xAxis.map(v=>v*modelScale),0,
   ...yAxis.map(v=>v*modelScale),0,
   ...zAxis.map(v=>v*modelScale),0,
   tx,ty,tz,1
  ]);
 }
 function draw(kind,{projection,view,player,thirdPerson,yaw,pitch=0,shoulderR,gunY,barrelBaseF,recoil=0,aiming=false,reload=0,fog=[.36,.4,.38]}){
  kind=resolve(kind);
  const m=kind&&models[kind];if(!m)return false;
  const model=transform({player,thirdPerson,shoulderR,gunY,barrelBaseF,yaw,pitch,recoil,aiming,reload});
  gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,m.buffer);
  for(const [id,n,offset] of [[attr.aPosition,3,0],[attr.aColor,3,12],[attr.aNormal,3,24],[attr.aSurface,2,36]]){
   if(id<0)continue;gl.enableVertexAttribArray(id);gl.vertexAttribPointer(id,n,gl.FLOAT,false,44,offset);
  }
  gl.uniformMatrix4fv(uni.uModel,false,model);
  gl.uniformMatrix4fv(uni.uProjection,false,projection);
  gl.uniformMatrix4fv(uni.uView,false,view);
  gl.uniform3f(uni.uEye,player.x,(player.eyeHeight||1.65)+(player.jumpY||0),player.z);
  gl.uniform3fv(uni.uFog,new Float32Array(fog));
  if(atlasReady){
   gl.activeTexture(gl.TEXTURE7);gl.bindTexture(gl.TEXTURE_2D,atlasTexture);
   gl.uniform1i(uni.uWeaponAtlas,7);
  }
  gl.uniform1f(uni.uWeaponAtlasReady,Number(atlasReady));
  gl.drawArrays(gl.TRIANGLES,0,m.count);
  report.draws++;
  report.lastKind=kind;
  report.lastTriangles=m.count/3;
  report.lastPerspective=thirdPerson?"3P":"1P";
  return true;
 }
 return {draw,has:id=>!!models[resolve(id)],report,transform};
}
root.KarmaWeaponArt={create};
})(globalThis);
