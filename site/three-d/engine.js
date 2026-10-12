/* Dependency-free WebGL2: genuine 3D MVP, not historical geometry from original Karma. */
(function(root){
"use strict";
const canvas=document.querySelector("#viewport"),S=root.KarmaMaps3D;
const WM=root.KarmaWeaponMotion,AA=root.KarmaAimAudit,A14=root.KarmaAim14;
const gl=canvas.getContext("webgl2",{antialias:true,alpha:false,depth:true,powerPreference:"high-performance"});
if(!gl){document.querySelector("#no-webgl").hidden=false;document.querySelector("#menu").hidden=true;return;}
// Wave23 truthful draw submission counters: wraps actual GL calls, not a
// speculative triangle estimate. CPU submit != GPU execution time.
const gpuMeter=root.KarmaWave23GpuMetrics={
 drawCalls:0,triangles:0,shadowDrawCalls:0,shadowTriangles:0,
 actorDrawCalls:0,actorTriangles:0,frames:0,
 gpuTimerSupported:!!gl.getExtension("EXT_disjoint_timer_query_webgl2"),
 gpuMs:null,gpuMemoryBytes:null,gpuMemorySource:"WebGL does not report GPU memory use"};
let drawPhase="world";
for(const [name,triangleFn] of [
 ["drawArrays",count=>count/3],["drawElements",count=>count/3]]){
 const orig=gl[name].bind(gl);
 gl[name]=function(mode,countOrFirst,nOrType,...args){
  const count=name==="drawArrays"?nOrType:countOrFirst;
  gpuMeter.drawCalls++;
  if(mode===gl.TRIANGLES)gpuMeter.triangles+=Math.floor(triangleFn(count));
  if(drawPhase==="shadow"){gpuMeter.shadowDrawCalls++;if(mode===gl.TRIANGLES)gpuMeter.shadowTriangles+=Math.floor(triangleFn(count));}
  if(drawPhase==="actor"){gpuMeter.actorDrawCalls++;if(mode===gl.TRIANGLES)gpuMeter.actorTriangles+=Math.floor(triangleFn(count));}
  return orig(mode,countOrFirst,nOrType,...args);
 };
}
const VS=`#version 300 es
precision highp float;
in vec3 aPosition;
in vec3 aColor;
in vec3 aNormal;
in vec2 aSurface;
uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uLightViewProj;
out vec3 vColor;
out float vDistance;
out vec3 vWorld;
out vec3 vNormal;
out vec2 vSurface;
out vec4 vLightPos;
void main(){
 vec4 viewPoint=uView*vec4(aPosition,1.);
 gl_Position=uProjection*viewPoint;
 vDistance=length(viewPoint.xyz);
 vColor=aColor;
 vWorld=aPosition;
 vNormal=aNormal;
 vSurface=aSurface;
 vLightPos=uLightViewProj*vec4(aPosition,1.);
}`;
const FS=`#version 300 es
precision highp float;
in vec3 vColor;
in float vDistance;
in vec3 vWorld;
in vec3 vNormal;
in vec2 vSurface;
in vec4 vLightPos;
uniform vec3 uFogColor;
uniform float uTime;
uniform vec3 uEye;
uniform sampler2D uShadowMap;
uniform sampler2D uEnvironmentAlbedo;
uniform float uEnvironmentReady;
out vec4 pixel;
float grain(vec3 p){return fract(sin(dot(floor(p*4.),vec3(127.1,311.7,74.7)))*43758.5453);}
void main(){
 float f=clamp((vDistance-14.)/65.,0.,.76);
 // Material ID is packed into the SECOND surface channel by pushBox, leaving
 // the base metalness intact. No extra vertex attribute/stride or CPU uploads.
 float materialId=floor(vSurface.y*.5+.001);
 float masonry=1.;
 if(materialId==1. && uEnvironmentReady<.5 && vWorld.y>.25 && abs(vWorld.y)<18.){
   float mortarX=step(.065,fract(vWorld.x*1.55+floor(vWorld.y*1.65)*.5));
   float mortarZ=step(.065,fract(vWorld.z*1.55+floor(vWorld.y*1.65)*.5));
   float mortarY=step(.10,fract(vWorld.y*1.65));
   masonry=mix(.75,1.,mortarY*max(mortarX,mortarZ));
 }
 float noise=grain(vWorld)*.065;
 vec3 N=normalize(vNormal),L=normalize(vec3(.55,1.,.40));
 vec3 V=normalize(uEye-vWorld),H=normalize(L+V);
 float NdotL=max(dot(N,L),0.);
 float roughness=clamp(vSurface.x+noise*.14,.08,.99);
 float metalness=clamp(vSurface.y-materialId*2.,0.,1.);
 float a=roughness*roughness;
 float NdotH=max(dot(N,H),0.);
 float D=a*a/(3.14159*pow(NdotH*NdotH*(a*a-1.)+1.,2.));
 float NdotV=max(dot(N,V),.001);
 float k=pow(roughness+1.,2.)/8.;
 float G=(NdotL/(NdotL*(1.-k)+k))*(NdotV/(NdotV*(1.-k)+k));
 float VH=max(dot(V,H),0.);
 vec3 albedo=vColor*(masonry*(.96+noise));
 if(uEnvironmentReady>.5 && materialId>.5){
   vec3 normalAbs=abs(N);
   vec2 uvWorld=normalAbs.y>.72?vWorld.xz:normalAbs.x>.72?vWorld.zy:vWorld.xy;
   // Each 512px tile represents roughly 3.4 meters in world space; atlas
   // has 3 columns x 2 rows, with edge inset to prevent neighboring bleed.
   vec2 uvLocal=fract(uvWorld*.294);
   float tile=materialId-1.;
   // HTMLImage pixels are uploaded with UNPACK_FLIP_Y_WEBGL: atlas row zero
   // (top in PNG) therefore lives at texture-space row one.
   vec2 tilePos=vec2(mod(tile,3.),1.-floor(tile/3.));
   vec2 uv=(tilePos+mix(vec2(.003),vec2(.997),uvLocal))/vec2(3.,2.);
   vec3 scanned=texture(uEnvironmentAlbedo,uv).rgb;
   albedo*=mix(vec3(1.),scanned*1.47,.78);
 }
 vec3 F0=mix(vec3(.04),albedo,metalness);
 vec3 F=F0+(vec3(1.)-F0)*pow(1.-VH,5.);
 vec3 spec=(D*G*F)/max(4.*NdotL*NdotV,.04);
 vec3 lightPos=vLightPos.xyz/max(.001,vLightPos.w)*.5+.5;
 float shadow=0.;
 if(lightPos.x>0. && lightPos.x<1. && lightPos.y>0. && lightPos.y<1. && lightPos.z>0. && lightPos.z<1.){
   float bias=max(.0015,.008*(1.-NdotL));
   for(int iy=-1;iy<=1;iy++)for(int ix=-1;ix<=1;ix++){
     float depth=texture(uShadowMap,lightPos.xy+vec2(float(ix),float(iy))/1024.).r;
     shadow+=(lightPos.z-bias>depth)?1.:0.;
   }
   shadow/=9.;
 }
 float direct=(1.-shadow)*NdotL;
 vec3 diffuse=(vec3(1.)-F)*(1.-metalness)*albedo/3.14159;
 vec3 lit=albedo*.31 + (diffuse*2.6+spec*.75)*direct;
 lit+=albedo*.025*sin(uTime*.07);
 vec3 base=mix(lit,uFogColor,f);
 pixel=vec4(pow(clamp(base,0.,1.),vec3(.93)),1.);
}`;
function shader(type,source){const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh));return sh;}
const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,VS));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,FS));gl.linkProgram(program);
if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
const positionLoc=gl.getAttribLocation(program,"aPosition"),colorLoc=gl.getAttribLocation(program,"aColor"),normalLoc=gl.getAttribLocation(program,"aNormal"),surfaceLoc=gl.getAttribLocation(program,"aSurface");
const uProj=gl.getUniformLocation(program,"uProjection"),uView=gl.getUniformLocation(program,"uView"),uFog=gl.getUniformLocation(program,"uFogColor"),uTime=gl.getUniformLocation(program,"uTime"),uEye=gl.getUniformLocation(program,"uEye"),uLightVP=gl.getUniformLocation(program,"uLightViewProj"),uShadowMap=gl.getUniformLocation(program,"uShadowMap");
const uEnvAtlas=gl.getUniformLocation(program,"uEnvironmentAlbedo"),uEnvReady=gl.getUniformLocation(program,"uEnvironmentReady");
const environmentAtlas=gl.createTexture();
gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,environmentAtlas);
gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,1,1,0,gl.RGB,gl.UNSIGNED_BYTE,new Uint8Array([150,145,135]));
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
gl.activeTexture(gl.TEXTURE0);
root.KarmaWave21Environment={status:"loading",source:"self-authored procedural tile atlas",materials:6};
const environmentImage=new Image();
environmentImage.onload=()=>{
 gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,environmentAtlas);
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,environmentImage);
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.activeTexture(gl.TEXTURE0);
 root.KarmaWave21Environment.status="loaded";
 root.KarmaWave21Environment.width=environmentImage.width;
 root.KarmaWave21Environment.height=environmentImage.height;
};
environmentImage.onerror=()=>{root.KarmaWave21Environment.status="failed";};
environmentImage.src="assets/environment/wave21_surface_atlas.png";
const SHADOW_SIZE=1024;
const shadowVS=`#version 300 es
precision highp float;
in vec3 aPosition;
uniform mat4 uLightViewProj;
void main(){gl_Position=uLightViewProj*vec4(aPosition,1.);}`;
const shadowFS=`#version 300 es
precision highp float;
void main(){}`;
const shadowProgram=gl.createProgram();
gl.attachShader(shadowProgram,shader(gl.VERTEX_SHADER,shadowVS));
gl.attachShader(shadowProgram,shader(gl.FRAGMENT_SHADER,shadowFS));
gl.linkProgram(shadowProgram);
if(!gl.getProgramParameter(shadowProgram,gl.LINK_STATUS))throw Error("shadow shader: "+gl.getProgramInfoLog(shadowProgram));
const shadowPosition=gl.getAttribLocation(shadowProgram,"aPosition"),shadowLightVP=gl.getUniformLocation(shadowProgram,"uLightViewProj");
const shadowTex=gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D,shadowTex);
gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,SHADOW_SIZE,SHADOW_SIZE,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
const shadowFramebuffer=gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFramebuffer);
gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,shadowTex,0);
gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);
if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error("shadow depth framebuffer unavailable");
gl.bindFramebuffer(gl.FRAMEBUFFER,null);
function multiplyMat4(a,b){
 const out=new Float32Array(16);
 for(let col=0;col<4;col++)for(let row=0;row<4;row++){
  for(let k=0;k<4;k++)out[col*4+row]+=a[k*4+row]*b[col*4+k];
 }
 return out;
}
function lookAt(eye,target){
 const normalize=v=>{const d=Math.hypot(...v)||1;return v.map(n=>n/d);};
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const z=normalize(eye.map((n,i)=>n-target[i])),x=normalize(cross([0,1,0],z)),y=cross(z,x);
 const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
 return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
}
const nearShadow=.1,farShadow=140,spreadShadow=49;
const shadowOrtho=new Float32Array([1/spreadShadow,0,0,0,0,1/spreadShadow,0,0,0,0,-2/(farShadow-nearShadow),0,0,0,-(farShadow+nearShadow)/(farShadow-nearShadow),1]);
const lightVP=multiplyMat4(shadowOrtho,lookAt([42,58,36],[0,0,0]));
const skinned=root.KarmaSkinned.create(gl);
let highRig=null,legacyRig=null,germanRig=null,npcGermanRig=null,npcSovietRig=null;
const qualityChoice=new URLSearchParams(location.search).get("quality");
const wave18Quality=["original","balanced","fast","legacy"].includes(qualityChoice)?qualityChoice:"fast";
const wave20NPCChoice=new URLSearchParams(location.search).get("npc")==="legacy"?"legacy":"artist";
let wave18AutoLod=0;
let wave20DynamicScale=.68;
root.KarmaWave18Perf={quality:wave18Quality,autoLod:0,fullBytes:43578032,lodBytes:11607272,source:"author's licensed CC0 Panzergrenadier",frames:0,actorRenderMs:0,realBots:0};
try{highRig=root.KarmaHighRig?.create(gl)||null;}catch(error){console.warn("CC0 glTF renderer not available; retain CPU-rig fallback",error);}
legacyRig=highRig;
// Official creator CC0 64-joint Panzergrenadier, loaded from a real GLB when
// served over localhost/Pages. Legacy Quaternius is retained as 100% offline fallback.
root.KarmaWave17Model={state:"loading",author:"Britdawgmasterfunk",source:"https://blendswap.com/blend/31342",replaced:false};
// All visible combatants now receive *genuine licensed skinned artist geometry*.
// Soviet-side outfit is explicitly a recolored/restyled stand-in derived from
// the German CC0 source, NOT an original period-correct Soviet soldier.
root.KarmaWave20NPC={state:"loading",germanSource:"Britdawgmasterfunk CC0 original + ChatGPT-authored 3D field kit",sovietSource:"Original Soviet-style modeled SSh helmet / canvas haversack / bedroll / pouches over authorized CC0 artist rig (not independent scanned Soviet soldier)",artistBots:0,german:0,soviet:0,fallback:0};
async function loadWave20NPC(path,key){
 const response=await fetch("assets/characters/"+path);
 if(!response.ok)throw Error(path+" HTTP "+response.status);
 const buffer=await response.arrayBuffer();
 const rig=root.KarmaHighRig.create(gl,{raw:buffer});
 if(!rig.period||rig.joints!==64||rig.ualBones!==52)throw Error(path+" actual skinned Mixamo joint validation failed");
 root.KarmaWave20NPC[key]={triangles:rig.triangles,bytes:buffer.byteLength,source:rig.source};
 return rig;
}
if(location.protocol!=="file:"&&wave18Quality!=="legacy"&&wave20NPCChoice!=="legacy"){
 Promise.all([
  loadWave20NPC("panzergrenadier_wave23_german.glb","germanLOD"),
  loadWave20NPC("panzergrenadier_wave23_soviet.glb","sovietInterim")
 ]).then(([german,soviet])=>{
   npcGermanRig=german;npcSovietRig=soviet;
   root.KarmaWave23VariantAudit={status:"loaded",german:german.variantTags,soviet:soviet.variantTags,
    resourceSharing:"one GLB + one GPU buffer for each gear mesh per faction, reused across all bots"};
   root.KarmaWave20NPCAxes={idle:german.handWeaponAxes(0,"idle"),walk:german.handWeaponAxes(1.2,"walk"),shoot:german.handWeaponAxes(.2,"shoot")};
   if((player.team||teamPicker.value)==="soviet")highRig=soviet;
   root.KarmaWave20NPC.state="loaded";
 }).catch(error=>{root.KarmaWave20NPC.state="failed";root.KarmaWave20NPC.error=String(error);console.warn("Artist NPC rig fallback",error);});
}
if(location.protocol!=="file:"&&wave18Quality!=="legacy"){
 const isFull=wave18Quality==="original";
 const loadStart=performance.now();
 fetch("assets/characters/"+(isFull?"panzergrenadier_cc0.glb":"panzergrenadier_cc0_optimized.glb")).then(res=>{
  if(!res.ok)throw Error("GLB HTTP "+res.status);
  return res.arrayBuffer();
 }).then(raw=>{
  const decodeStart=performance.now();
  const result=root.KarmaHighRig.create(gl,{raw});
  if(!result.period||result.joints!==64||result.ualBones!==52)throw Error("Artist GLB rig validation failed");
  germanRig=result;
  if((player.team||teamPicker.value)==="german")highRig=result;
  root.KarmaWave18Perf.loadMs=performance.now()-loadStart;
  root.KarmaWave18Perf.decodeMs=performance.now()-decodeStart;
  root.KarmaWave18Perf.downloadedBytes=raw.byteLength;
  root.KarmaWave17Model={state:"loaded",replaced:true,source:result.source,joints:result.joints,
   mappedUAL:result.ualBones,triangles:result.triangles,materials:5,
   get loadedTextures(){return result.artistMaterialsReady();}};
 }).catch(error=>{root.KarmaWave17Model={state:"failed",replaced:false,error:String(error)};console.warn("Author GLB upgrade unavailable",error);});
}
const gpu=gl.createBuffer(),staticGpu=gl.createBuffer();
let staticVertexCount=0;
gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,gpu);gl.enableVertexAttribArray(positionLoc);gl.enableVertexAttribArray(colorLoc);gl.enableVertexAttribArray(normalLoc);gl.enableVertexAttribArray(surfaceLoc);
gl.vertexAttribPointer(positionLoc,3,gl.FLOAT,false,44,0);gl.vertexAttribPointer(colorLoc,3,gl.FLOAT,false,44,12);gl.vertexAttribPointer(normalLoc,3,gl.FLOAT,false,44,24);gl.vertexAttribPointer(surfaceLoc,2,gl.FLOAT,false,44,36);
function bindStaticAttributes(){
 gl.bindBuffer(gl.ARRAY_BUFFER,gpu);
 for(const [loc,size,offset] of [[positionLoc,3,0],[colorLoc,3,12],[normalLoc,3,24],[surfaceLoc,2,36]]){
  gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,44,offset);
 }
}
const palette={brick:[.56,.37,.27],stone:[.58,.62,.58],wood:[.46,.33,.23],concrete:[.4,.46,.43],crate:[.55,.42,.27],chimney:[.3,.29,.27],wall:[.45,.47,.39],roof:[.25,.3,.27],ground:[.31,.37,.28],soldier:[.27,.38,.25],target:[.7,.27,.18],german:[.38,.44,.4],soviet:[.45,.33,.26],skin:[.71,.56,.43],helmetAxis:[.24,.29,.27],helmetUSSR:[.3,.32,.26],rifle:[.23,.24,.22],boot:[.18,.19,.17],cloth:[.55,.5,.37],window:[.21,.29,.3],muzzle:[1,.75,.21],shadow:[.09,.11,.08],archRed:[.63,.17,.11],ochre:[.53,.54,.2]};
Object.assign(palette,{factorywall:[.54,.35,.28],containerRust:[.42,.20,.16],containerBlue:[.32,.39,.39],laneMark:[.87,.81,.54],chimneyStripe:[.9,.86,.78],containerRib:[.32,.35,.33]});
Object.assign(palette,{drainPipe:[.20,.23,.22],steelLintel:[.35,.36,.34],concreteChip:[.63,.55,.41],roofRust:[.38,.24,.19],rubbleBright:[.54,.50,.41],rubbleDark:[.35,.34,.31],sandstone:[.61,.55,.42],castleShadow:[.22,.22,.19],railSteel:[.33,.34,.32]});
Object.assign(palette,{flashCore:[1,.96,.64],spark:[1,.72,.24],brass:[.78,.56,.24],dust:[.49,.47,.4],smoke:[.34,.35,.34]});
const surfaces={brick:[.94,.0],stone:[.96,.0],wood:[.87,.0],concrete:[.92,.0],crate:[.84,.0],chimney:[.67,.12],wall:[.91,.0],roof:[.88,.0],ground:[.99,.0],german:[.85,.0],soviet:[.85,.0],skin:[.76,.0],helmetAxis:[.53,.55],helmetUSSR:[.53,.55],rifle:[.33,.85],boot:[.8,.0],cloth:[.88,.0],window:[.22,.62],muzzle:[.2,.6],shadow:[.99,.0],archRed:[.76,.03],ochre:[.99,.0]};
Object.assign(surfaces,{factorywall:[.82,.0],containerRust:[.75,.36],containerBlue:[.65,.55],laneMark:[.9,.0],chimneyStripe:[.85,.03],containerRib:[.69,.5]});
Object.assign(surfaces,{drainPipe:[.57,.63],steelLintel:[.63,.61],concreteChip:[.97,.0],roofRust:[.75,.38],rubbleBright:[.98,.0],rubbleDark:[.95,.0],sandstone:[.93,.0],castleShadow:[.99,.0],railSteel:[.46,.72]});
const environmentMaterials={brick:1,factorywall:1,concrete:2,wall:2,chimney:2,containerRust:3,containerBlue:3,containerRib:3,roofRust:3,wood:4,crate:4,ground:5,stone:6,sandstone:6};
Object.assign(surfaces,{flashCore:[.13,.2],spark:[.28,.25],brass:[.32,.74],dust:[.95,0],smoke:[.98,0]});
function pushBox(out,box){
 const {x,z,w,d,h,material}=box;const y=box.y||0;
 const l=x-w/2,r=x+w/2,near=z-d/2,far=z+d/2,bottom=y,top=y+h;
 const faces=[
 // outward-facing triangles vertex orders for solid visible faces
 [[l,bottom,far],[r,bottom,far],[r,top,far],[l,top,far],.70],
 [[r,bottom,near],[l,bottom,near],[l,top,near],[r,top,near],.87],
 [[l,bottom,near],[l,bottom,far],[l,top,far],[l,top,near],.64],
 [[r,bottom,far],[r,bottom,near],[r,top,near],[r,top,far],.77],
 [[l,top,far],[r,top,far],[r,top,near],[l,top,near],1.11],
 [[l,bottom,near],[r,bottom,near],[r,bottom,far],[l,bottom,far],.48]
 ];
 const c=palette[material]||palette.stone;
 const normals=[[0,0,1],[0,0,-1],[-1,0,0],[1,0,0],[0,1,0],[0,-1,0]];
 for(const [index,face] of faces.entries()){
  const points=face.slice(0,4),shade=face[4],order=[0,1,2,0,2,3],normal=normals[index];
  for(let i of order){const p=points[i],surface=surfaces[material]||[.8,0];out.push(p[0],p[1],p[2],Math.min(c[0]*shade,1),Math.min(c[1]*shade,1),Math.min(c[2]*shade,1),...normal,surface[0],surface[1]+2*(environmentMaterials[material]||0));}
 }
}
function pushCylinder(out,{x,z,radius,height,y,material,segments=10}){
 const color=palette[material]||palette.stone;
 function emit(p,n){
  const surface=surfaces[material]||[.8,0];
  out.push(p[0],p[1],p[2],color[0],color[1],color[2],n[0],n[1],n[2],surface[0],surface[1]+2*(environmentMaterials[material]||0));
 }
 for(let k=0;k<segments;k++){
   const a=k*Math.PI*2/segments,b=(k+1)*Math.PI*2/segments;
   const c1=Math.cos(a),s1=Math.sin(a),c2=Math.cos(b),s2=Math.sin(b);
   const p0=[x+c1*radius,y,z+s1*radius],p1=[x+c2*radius,y,z+s2*radius];
   const p2=[x+c2*radius,y+height,z+s2*radius],p3=[x+c1*radius,y+height,z+s1*radius];
   const n1=[c1,0,s1],n2=[c2,0,s2];
   for(const [p,n] of [[p0,n1],[p2,n2],[p1,n2],[p0,n1],[p3,n1],[p2,n2]])emit(p,n);
   const up=[0,1,0];
   for(const p of [[x,y+height,z],p2,p3])emit(p,up);
   const down=[0,-1,0];
   for(const p of [[x,y,z],p0,p1])emit(p,down);
 }
}
function pushEnvironmentGeometry(out,item){
 if(item.shape!=="drum"){pushBox(out,item);return;}
 // A three-ring industrial steel barrel. Real curved triangles, distinct
 // damaged paint vs rolled steel rim, not a six-sided colored wall block.
 pushCylinder(out,{x:item.x,z:item.z,y:item.y||0,radius:item.w*.48,height:item.h,material:"containerRust",segments:18});
 for(const y of [.11,.78,.96]){
  pushCylinder(out,{x:item.x,z:item.z,y:(item.y||0)+y,radius:item.w*.51,height:.047,material:"steelLintel",segments:18});
 }
}
function pushWarHelmet(out,{x,z,y,team,segments=24}){
 // Authored curved steel dome and swept lip, not original game's geometry.
 const material=team==="german"?"helmetAxis":"helmetUSSR",color=palette[material],surface=surfaces[material];
 const emit=(p,n)=>out.push(...p,...color,...n,...surface);
 for(let ring=0;ring<9;ring++){
  const theta0=ring*Math.PI/18,theta1=(ring+1)*Math.PI/18;
  for(let i=0;i<segments;i++){
   const a=i*2*Math.PI/segments,b=(i+1)*2*Math.PI/segments;
   function v(theta,angle){
    const r=.26*Math.sin(theta),h=.22*Math.cos(theta);
    const sn=Math.sin(theta),cn=Math.cos(theta),co=Math.cos(angle),si=Math.sin(angle);
    return {p:[x+co*r,y+h,z+si*r],n:[co*sn,cn,si*sn]};
   }
   const p0=v(theta0,a),p1=v(theta0,b),p2=v(theta1,b),p3=v(theta1,a);
   for(const vtx of [p0,p1,p2,p0,p2,p3])emit(vtx.p,vtx.n);
  }
 }
 // Flattened front lip of the Stahlhelm / SSh silhouette, tapered in the rear.
 const ly=y+.004;
 for(let i=0;i<segments;i++){
  const a=i*2*Math.PI/segments,b=(i+1)*2*Math.PI/segments;
  const radial=(t,r)=>[x+r*Math.cos(t),ly-(r-.26)*.25,z+r*Math.sin(t)];
  const q0=radial(a,.255),q1=radial(b,.255),q2=radial(b,team==="german"?.34:.29),q3=radial(a,team==="german"?.34:.29);
  for(const vtx of [q0,q1,q2,q0,q2,q3])emit(vtx,[0,1,0]);
 }
}
function projection(aspect,fov=1.25,near=.12,far=155){
 const f=1/Math.tan(fov/2),nf=1/(near-far);
 return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);
}
function view(p){
 const cy=Math.cos(p.yaw),sy=Math.sin(p.yaw),cp=Math.cos(p.pitch),sp=Math.sin(p.pitch);
 const R=[cy,0,sy],F=[sy*cp,sp,-cy*cp],U=[-sy*sp,cp,cy*sp],eye=[p.x,(p.eyeHeight||1.65)+(p.jumpY||0),p.z];
 function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
 return new Float32Array([R[0],U[0],-F[0],0,R[1],U[1],-F[1],0,R[2],U[2],-F[2],0,-dot(R,eye),-dot(U,eye),dot(F,eye),1]);
}
let map=S.MAPS.factory,player={x:0,z:0,yaw:0,pitch:0,hp:100,team:"german",id:"player"},target=[],match=null,keys=Object.create(null),started=false,active=false;
const PROTOTYPE_WEAPONS={
 german:{name:"MP 40",mag:32,damage:39,range:35,rate:.135,reload:1.85,reserve:160},
 soviet:{name:"PPSh-41",mag:71,damage:29,range:29,rate:.09,reload:2.4,reserve:213}
};
let gun=PROTOTYPE_WEAPONS.german,ammo=32,spare=160,reload=0,reloadTotal=0,fireCooldown=0,firing=false,aiming=false,kills=0,time=180,flash=0,shotPoseTimer=0,last=performance.now(),worldBuffer=0,sceneVertices=0,shotSequence=0;
let lastKillEvent=null,impactFX=[],shotMarkers=[];
const diagnostics=root.KarmaDiagnostics={shots:0,hits:0,blocked:0,damage:0,mode:"client-local-only"};
const audio=root.KarmaAudio;let sensitivity=2.4,walkCadence=0,previousPlayerHP=100;
const Jump=root.KarmaJump,weaponFX=root.KarmaWeaponVFX.create(gl);
const weaponArt=root.KarmaWeaponArt?.create(gl)||null;
const combatFeedback=root.KarmaCombatFeedback?.create(document.querySelector("#application"),{
 disabled:new URLSearchParams(location.search).get("noFeedback")==="1"})||null;
root.KarmaWave23Feedback=combatFeedback;
const motionCheckbox=document.querySelector("#w23-reduce-motion");
if(motionCheckbox&&combatFeedback){
 const prefersReduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches||false;
 motionCheckbox.checked=prefersReduced;
 combatFeedback.setMotionReduced(prefersReduced);
 motionCheckbox.addEventListener("change",()=>combatFeedback.setMotionReduced(motionCheckbox.checked));
}
let lastCombatEventId=0;
function consumeCombatDamage(){
 if(!match||!combatFeedback||!match.damageEvents)return;
 for(const event of match.damageEvents){
  if(event.id<=lastCombatEventId)continue;
  lastCombatEventId=event.id;
  // Display enemy hits and self damage only. Enemy-vs-enemy damage remains
  // authoritative gameplay state but cannot impersonate a player hit marker.
  if(event.attackerId==="player"||event.victimId==="player")combatFeedback.receive(event,player);
 }
}
root.KarmaWave21VFX=weaponFX;
root.KarmaWave21Jump={grounded:true,height:0,velocity:0,jumps:0,landings:0};
const Camera=root.KarmaCamera,cameraButton=document.querySelector("#camera-mode");
const mouseLockStatus=document.querySelector("#mouse-lock-status");
const previewMode=new URLSearchParams(window.location.search).get("preview")==="1";
const wave8Pose=new URLSearchParams(window.location.search).get("pose");
let pointerLocked=false,lockPending=false,ignoreNextMouse=true;
function updateMouseLock(){
 pointerLocked=document.pointerLockElement===canvas;
 mouseLockStatus.hidden=!active||pointerLocked||previewMode;
 mouseLockStatus.textContent=lockPending?"마우스 고정 요청 중…":"마우스가 풀렸습니다. 화면을 클릭하여 다시 고정하세요.";
 canvas.style.cursor=pointerLocked?"none":"crosshair";
 document.querySelector("#application").dataset.mouseLock=pointerLocked?"locked":"unlocked";
}
function requestMouseLock(){
 if(!active||pointerLocked||lockPending||previewMode)return;
 canvas.focus();lockPending=true;updateMouseLock();
 try{
  const promise=canvas.requestPointerLock?.();
  if(promise&&typeof promise.catch==="function")promise.catch(()=>{lockPending=false;updateMouseLock();});
  else if(!promise){lockPending=false;updateMouseLock();}
 }catch(e){lockPending=false;updateMouseLock();}
}
let thirdPerson=false,cameraState=null,cameraDistance=6.4,playerWalkPhase=0,playerMoveSpeed=0;
function togglePerspective(force){
 thirdPerson=typeof force==="boolean"?force:!thirdPerson;
 cameraState=null;
 cameraButton.textContent=thirdPerson?"3P · Q 시점 전환":"1P · Q 시점 전환";
 cameraButton.setAttribute("aria-label","Q 시점 전환: "+(thirdPerson?"3인칭":"1인칭"));
 cameraButton.title=thirdPerson?"마우스 휠로 카메라 거리 조절":"Q키로 3인칭 캐릭터 확인";
 document.querySelector("#application").dataset.camera=thirdPerson?"third":"first";
 return thirdPerson;
}
const T=root.KarmaTDM,menu=document.querySelector("#menu"),menuTitle=document.querySelector("#menu-title"),startButton=document.querySelector("#start"),mapPicker=document.querySelector("#map-picker");
const modePicker=document.querySelector("#mode-picker"),teamPicker=document.querySelector("#team-picker"),difficultyPicker=document.querySelector("#difficulty-picker");
const ARM=root.KarmaArsenal,weaponPicker=document.querySelector("#weapon-picker");
function loadoutForTeam(team){
 const previous=weaponPicker.value;
 weaponPicker.replaceChildren();
 for(const w of ARM.list(team)){
  const option=document.createElement("option");option.value=w.id;option.textContent=w.name+" / "+w.kind+" · "+(w.confidence.startsWith("later")?"추가 업데이트":"원작 등장 근거");
  weaponPicker.appendChild(option);
 }
 weaponPicker.value=ARM.weapons[previous]?.team===team?previous:team==="german"?"mp40":"ppsh41";
}
function equipWeapon(id){
 gun=ARM.selected(teamPicker.value,id);
 weaponPicker.value=gun.id;
 ammo=gun.mag;spare=gun.reserve;reload=0;reloadTotal=0;fireCooldown=0;firing=false;flash=0;
 gunName.textContent=gun.name;hudClip.textContent=String(ammo);hudReserve.textContent=String(spare);
}
function cycleWeapon(step){
 const items=ARM.list(teamPicker.value),i=items.findIndex(w=>w.id===gun.id);
 equipWeapon(items[(i+step+items.length)%items.length].id);
}
const stats=document.querySelector("#stats"),top=document.querySelector("#mission"),mini=document.querySelector("#mini");
const miniCtx=mini.getContext("2d");
const scoreGerman=document.querySelector("#score-german"),scoreSoviet=document.querySelector("#score-soviet"),clock=document.querySelector("#match-clock");
const healthFill=document.querySelector("#health-fill"),healthValue=document.querySelector("#health-value"),gunName=document.querySelector("#gun-name"),hudClip=document.querySelector("#hud-clip"),hudReserve=document.querySelector("#hud-reserve");
const benchRequested=new URLSearchParams(window.location.search).get("benchmark")==="1";
const benchEnabled=true; // Collect lightweight frame diagnostics even when HUD is closed.
const skinCheck=new URLSearchParams(window.location.search).get("skinCheck")==="1";
// Wave7: Chrome confirmed GPU skin buffer corruption fixed by binding static world VBO
// before uploading geometry. GPU-driven low-poly NPCs are now the default; choose
// ?gpuSkin=0 for conservative CPU FK fallback. Neither is a high-resolution GLTF asset.
const skinDisabled=new URLSearchParams(window.location.search).get("gpuSkin")==="0";
const runBrowserSelftest=new URLSearchParams(window.location.search).get("selftest")==="1";
const bench=document.querySelector("#benchmark"),benchFps=document.querySelector("#bench-fps"),benchFrame=document.querySelector("#bench-frame"),benchRender=document.querySelector("#bench-render"),benchAI=document.querySelector("#bench-ai");
bench.hidden=!benchRequested;
const sampleFrames=[],sampleScene=[],sampleAI=[];
let sceneStart=0,aiLastMs=0,lastBenchmarkUpdate=0;
function updateBenchmark(frameMs,renderMs,aiMs,now){
 if(!benchEnabled||!Number.isFinite(frameMs)||frameMs<=0)return;
 for(const [list,v] of [[sampleFrames,frameMs],[sampleScene,renderMs],[sampleAI,aiMs]]){list.push(v);if(list.length>240)list.shift();}
 if(sampleFrames.length<25||now-lastBenchmarkUpdate<900)return;
 lastBenchmarkUpdate=now;
 const sorted=[...sampleFrames].sort((a,b)=>a-b),pct=p=>sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*p))],avg=a=>a.reduce((s,v)=>s+v,0)/a.length;
 const fps=1000/avg(sampleFrames);
 root.KarmaWave18Perf.fps=Number(fps.toFixed(2));
 root.KarmaWave18Perf.frameP95Ms=Number(pct(.95).toFixed(2));
 root.KarmaWave18Perf.sceneMs=Number(avg(sampleScene).toFixed(2));
 root.KarmaWave18Perf.aiMs=Number(avg(sampleAI).toFixed(2));
 benchFps.textContent="FPS avg "+fps.toFixed(1)+" | 1% low ~"+(1000/pct(.99)).toFixed(1);
 benchFrame.textContent="Frame P50 "+pct(.5).toFixed(1)+"ms | P95 "+pct(.95).toFixed(1)+"ms";
 benchRender.textContent="CPU scene/render "+avg(sampleScene).toFixed(2)+"ms";
 benchAI.textContent="AI logic "+avg(sampleAI).toFixed(2)+"ms";
}
function rebuild(){
 const v=[];pushBox(v,{x:0,z:0,w:180,d:180,h:.2,y:-.24,material:"ground"});
 for(const box of map.blocks)pushEnvironmentGeometry(v,box);
 worldBuffer=v.length/11;
 gl.bindBuffer(gl.ARRAY_BUFFER,gpu);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.DYNAMIC_DRAW);
}
function pushJointLimb(out,a,b,radius,material){
 const axis=b.map((v,i)=>v-a[i]),len=Math.hypot(...axis)||.001;
 const d=axis.map(v=>v/len),helper=Math.abs(d[1])>.95?[0,0,1]:[0,1,0];
 const cross=(v,w)=>[v[1]*w[2]-v[2]*w[1],v[2]*w[0]-v[0]*w[2],v[0]*w[1]-v[1]*w[0]];
 const normalize=v=>{const l=Math.hypot(...v)||1;return v.map(n=>n/l)};
 const u=normalize(cross(d,helper)),w=normalize(cross(d,u));
 const color=palette[material]||palette.soldier,surface=surfaces[material]||[.8,0],steps=9;
 function point(v,angle){const c=Math.cos(angle),s=Math.sin(angle);return v.map((val,i)=>val+radius*(u[i]*c+w[i]*s))}
 function norm(angle){const c=Math.cos(angle),s=Math.sin(angle);return u.map((val,i)=>val*c+w[i]*s)}
 function emit(v,n){out.push(...v,...color,...n,...surface)}
 for(let i=0;i<steps;i++){
  const a0=i*Math.PI*2/steps,a1=(i+1)*Math.PI*2/steps;
  const p0=point(a,a0),p1=point(a,a1),p2=point(b,a1),p3=point(b,a0),n0=norm(a0),n1=norm(a1);
  for(const [p,n] of [[p0,n0],[p1,n1],[p2,n1],[p0,n0],[p2,n1],[p3,n0]])emit(p,n);
 }
}
function pushSoldier(world,b){
 const clip=!b.alive?"death":b.shotTimer>0?"shoot":b.reloading?"reload":b.crouching?"crouch":b.speed>3?"run":b.speed>.1?"walk":"idle";
 const skeleton=root.KarmaRig.pose(b.anim||0,b.angle||0,{x:b.x,z:b.z},b.team,clip);
 for(const limb of skeleton.connections)pushJointLimb(world,limb.from,limb.to,limb.r,limb.material);
 const head=skeleton.nodes.head.world,helmet=skeleton.nodes.helmet.world;
 pushJointLimb(world,[head[0],head[1]-.04,head[2]],[helmet[0],helmet[1]+.08,helmet[2]],.21,b.team==="german"?"helmetAxis":"helmetUSSR");
 const chest=skeleton.nodes.chest.world;
 pushBox(world,{x:chest[0],z:chest[2]-.18,w:.38,d:.19,h:.34,y:chest[1]-.18,material:"cloth"});
 const cy=Math.cos(b.angle||0),sy=Math.sin(b.angle||0);
 // Original-authored WW2 silhouette components: tunic straps, pack, belt and forward rifle.
 const pack={x:chest[0]-sy*.27,z:chest[2]+cy*.27};
 pushBox(world,{x:pack.x,z:pack.z,w:.29,d:.24,h:.42,y:chest[1]-.28,material:"wood"});
 pushBox(world,{x:chest[0],z:chest[2],w:.48,d:.37,h:.13,y:chest[1]-.34,material:"rifle"});
 const wrist=skeleton.nodes.wristR.world;
 const barrel=[wrist[0]+sy*.08,wrist[1]+.09,wrist[2]-cy*.92];
 pushJointLimb(world,wrist,barrel,.067,"rifle");
 pushJointLimb(world,[barrel[0],barrel[1],barrel[2]],[barrel[0]+sy*.22,barrel[1],barrel[2]-cy*.22],.032,"rifle");
 const left=skeleton.nodes.wristL.world;
 pushJointLimb(world,left,[wrist[0]+sy*.14,wrist[1]+.07,wrist[2]-cy*.32],.078,b.team==="german"?"german":"soviet");
}
function pushHighRigEquipment(world){
 // Independent historically-inspired equipment, no reused commercial game
 // meshes: visible shoulder-fired MP40/PPSh instead of the old hovering cube.
 if(player.hp<=0||wave8Pose==="death")return; // avoid floating helmet/gear over a fallen body
 const yaw=player.yaw,c=Math.cos(yaw),s=Math.sin(yaw),body=player.team||teamPicker.value;
 const isPPSh=gun.id==="ppsh41"||gun.id==="tommy",isLauncher=gun.kind==="launcher",
   isLong=gun.kind==="rifle"||gun.kind==="sniper"||gun.kind==="lmg",
   isSidearm=gun.kind==="pistol"||gun.kind==="melee"||gun.kind==="grenade",
   reloadProgress=reload>0&&reloadTotal>0?1-reload/reloadTotal:0;
 const down=(keys.control||keys.c||wave8Pose==="crouch")?.35:0;
 const x=player.x,z=player.z;
 const at=(right,up,front)=>[x+c*right+s*front,up-down+(player.jumpY||0),z+s*right-c*front];
 const limb=(a,b,r,material)=>pushJointLimb(world,at(...a),at(...b),r,material);
 // Real 64-bone artist CC0 soldier meshes contain jacket, pouches and helmets.
 // Avoid duplicating them with the old large procedural Minecraft-like boxes,
 // but keep the gun/foregrip IK below so shoot + reload still work.
 if(!highRig?.period){
 // Rounded crown and lip, chin strap and cloth collar.
 pushWarHelmet(world,{x,z,y:1.73-down,team:body});
 limb([-.13,1.74,0],[-.13,1.43,.09],.025,"wood");
 limb([.13,1.74,0],[.13,1.43,.09],.025,"wood");
 // Backpack, tunic seams, belt, diagonal canvas straps and ammunition pouches.
 pushBox(world,{x:x-s*.27,z:z+c*.27,w:.38,d:.19,h:.45,y:.93-down,material:isPPSh?"cloth":"wood"});
 pushBox(world,{x,z,w:.51,d:.36,h:.105,y:.97-down,material:"boot"});
 limb([-.24,1.39,.04],[.15,.99,.17],.026,"cloth");
 limb([.23,1.38,.03],[-.14,1.01,.17],.025,"cloth");
 for(const offset of [-.19,0,.19])pushBox(world,{x:x+c*offset+s*.2,z:z+s*offset-c*.2,w:.115,d:.14,h:.19,y:.97-down,material:"wood"});
 }
 // Mode-dependent long-gun pivot, recoil and magazine animation.
 const firingPose=(shotPoseTimer>0||wave8Pose==="shoot");
 const recoil=firingPose?(wave8Pose==="shoot"?.09:(WM.recoil(gun,aiming,Math.max(0,shotSequence-1)).kickMeters*Math.min(1,flash/.11))):0;
 const magazineSource=WM.magazine(reloadProgress,reload>0||wave8Pose==="reload");
 // Wave20 actual Chrome reload found 17.6cm left-hand error while the
 // detached magazine traveled 27cm down/15cm out, past the skinned arm's reach.
 // Keep the real release/swap/insert timing but use a compact reachable path
 // for the authentic German rig until a licensed animated MP40 replaces this
 // provisional primitive magazine. The visible magazine and IK goal share it.
 const magMotion=highRig?.period&&gun.id==="mp40"&&reload>0?
  {...magazineSource,drop:magazineSource.drop*(.08/.27),side:magazineSource.side*(.045/.15)}:
  magazineSource;
 const magazineDrop=magMotion.drop;
 const clip=player.hp<=0?"death":reload>0?"reload":shotPoseTimer>0?"shoot":keys.control||keys.c?"crouch":playerMoveSpeed>3?"run":playerMoveSpeed>.12?"walk":"idle";
 const selectedClip=["idle","walk","run","shoot","reload","crouch","death"].includes(wave8Pose)?wave8Pose:clip;
 const posePhase=selectedClip==="shoot"&&!wave8Pose?Math.max(0,.25-shotPoseTimer)*2.5:
   selectedClip==="reload"&&!wave8Pose?Math.max(0,reloadTotal-reload)*.75:playerWalkPhase;
 const wrist=highRig?.jointPoint("hand_r",posePhase,selectedClip,x,z,yaw,player.jumpY||0);
 // The weapon's trigger receiver is anchored at the REAL glTF hand_r world
 // joint transform, not guessed from the generic player's torso/shoulder.
 const shoulderR=wrist?((wrist[0]-x)*c+(wrist[2]-z)*s):.35;
 const gunY=(wrist?wrist[1]+.035:1.38+(player.jumpY||0))-(reload>0?Math.sin(reloadProgress*Math.PI)*.10:0);
 const barrelBaseF=wrist?((wrist[0]-x)*s-(wrist[2]-z)*c)-.38:0;
 const weaponAt=(right,up,front)=>{
  const along=front+barrelBaseF;
  return [x+c*right+s*along*Math.cos(player.pitch),
   up-down+(along-.38)*Math.sin(player.pitch),
   z+s*right-c*along*Math.cos(player.pitch)];
 };
 const weaponLimb=(a,b,r,material)=>pushJointLimb(world,weaponAt(...a),weaponAt(...b),r,material);
 const shoulder=[shoulderR,gunY-.06,.10],receiver=[shoulderR,gunY,.38-recoil];
 const handguard=[shoulderR,gunY+.013,(isSidearm?.51:.78)-recoil],
   muzzle=[shoulderR,gunY+.01,(isSidearm?.83:isLong?1.72:isLauncher?1.56:isPPSh?1.46:1.32)-recoil];
 const muzzleWorld=weaponAt(...muzzle);
 const eye=[player.x,(player.eyeHeight||1.65)+(player.jumpY||0),player.z];
 const shotSolution=WM.solve(eye,muzzleWorld,player.yaw,player.pitch,Math.min(gun.range,30));
 // Camera-targeted visual alignment: remove the old fixed 30m barrel tracer
 // convergence during third-person play. A ray from the ACTUAL rendered
 // camera centre picks the first wall or currently positioned practice/bot
 // collider; the rendered muzzle line then points at that same 3D location.
 const actorsNow=match?match.bots.filter(b=>b.alive&&b.team!==player.team):
  target.filter(t=>t.hp>0).map(t=>({...t,width:.8,depth:.7,height:1.75}));
 const centerTrace=thirdPerson&&cameraState?
  A14.trace({map,camera:cameraState,muzzle:muzzleWorld,actors:actorsNow,maxRange:gun.range}):null;
 const focusPoint=centerTrace?.gunCover||centerTrace?.cameraPoint||shotSolution.target;
 const delta=focusPoint.map((v,i)=>v-muzzleWorld[i]),len=Math.hypot(...delta)||1;
 const visualMuzzleDirection=delta.map(v=>v/len);
 root.KarmaWave14Aim=centerTrace?{
  kind:centerTrace.kind,
  reticlePx:A14.screenDeviation(centerTrace.cameraPoint,cameraState,canvas.clientWidth,canvas.clientHeight,aiming?.72:1.25),
  visualMuzzleDirection,focusPoint,muzzle:muzzleWorld,
  priorPlayerAimPx:AA.project([cameraState.eye.x,cameraState.eye.y,cameraState.eye.z],
   [cameraState.target.x,cameraState.target.y,cameraState.target.z],
   AA.playerAim(player,3),canvas.clientWidth,canvas.clientHeight,aiming?.72:1.25).errorPx,
  distance:centerTrace.cameraDistance,actorId:centerTrace.actor?.id??null
 }:null;
 root.KarmaWave12Aim={...shotSolution,photoReady:highRig?.photoReady?.()||false,muzzle:muzzleWorld,eye,magazine:magMotion,clip:selectedClip};
 root.KarmaWave22GunPose={kind:gun.id,player:{x,z,eyeHeight:player.eyeHeight,jumpY:player.jumpY},
   yaw,pitch:player.pitch,shoulderR,gunY,barrelBaseF,recoil,aiming,
   reload:reload>0?Math.sin(reloadProgress*Math.PI):0};
 // Old blocky weapon shafts are REPLACED by GPU-rendered authored Blender
 // MP40/PPSh meshes; keep old shapes only until loading finishes or on error.
 const realWeaponLoaded=!!weaponArt?.has(gun.id);
 if(!realWeaponLoaded){
 if(isLauncher){
  weaponLimb(shoulder,muzzle,.13,"rifle");
  weaponLimb([shoulderR,gunY,.84],[shoulderR,gunY+.015,1.18],.18,"rifle");
  weaponLimb([shoulderR,gunY-.14,.56],[shoulderR,gunY-.38,.52],.041,"wood");
 }else if(gun.kind==="grenade"||gun.kind==="melee"){
  weaponLimb(shoulder,muzzle,gun.kind==="melee"?.025:.10,gun.kind==="melee"?"rifle":"wood");
 }else{
 weaponLimb(shoulder,receiver,isPPSh?.086:.075,isPPSh?"wood":"rifle");
 weaponLimb(receiver,handguard,isPPSh?.088:.081,isPPSh?"wood":"rifle");
 weaponLimb(handguard,muzzle,isPPSh?.038:.03,"rifle");
 weaponLimb([shoulderR,gunY+.095,.42-recoil],[shoulderR,gunY+.095,1.16-recoil],.017,"rifle");
 }
 // Folding MP40 stock vs PPSh solid wood stock/round drum.
 if(isLauncher||gun.kind==="grenade"||gun.kind==="melee"){
   // Launcher, stick grenade and knife use authored silhouettes above.
 }else if(gun.id==="crossbow"){
   weaponLimb([shoulderR-.43,gunY+.05,1.19],[shoulderR+.43,gunY+.05,1.19],.033,"wood");
   weaponLimb([shoulderR-.43,gunY+.05,1.19],[shoulderR,gunY+.05,.89],.012,"rifle");
   weaponLimb([shoulderR+.43,gunY+.05,1.19],[shoulderR,gunY+.05,.89],.012,"rifle");
 }else if(isPPSh){
  weaponLimb([shoulderR,gunY-.075,.20],[shoulderR,gunY-.11,-.22],.12,"wood");
  const center=weaponAt(shoulderR+magMotion.side,gunY-.26-magMotion.drop,.52);
  pushCylinder(world,{x:center[0],z:center[2],radius:.15,height:.095,y:center[1],material:"rifle",segments:20});
 }else if(isLong){
  weaponLimb([shoulderR,gunY-.06,.24],[shoulderR,gunY-.12,-.28],.113,"wood");
  if(gun.kind==="sniper")weaponLimb([shoulderR,gunY+.12,.59],[shoulderR,gunY+.12,1.09],.055,"rifle");
  if(gun.kind==="lmg"){
   weaponLimb([shoulderR,gunY-.1,.96],[shoulderR-.22,gunY-.57,1.23],.028,"rifle");
   weaponLimb([shoulderR,gunY-.1,.96],[shoulderR+.22,gunY-.57,1.23],.028,"rifle");
   pushCylinder(world,{x:weaponAt(shoulderR,gunY,.43)[0],z:weaponAt(shoulderR,gunY,.43)[2],y:gunY+.11-down,radius:.20,height:.085,material:"rifle",segments:16});
  }
  if(magMotion.attached)weaponLimb([shoulderR,gunY-.10,.47],[shoulderR,gunY-.27,.45],.057,"rifle");
  else weaponLimb([shoulderR+magMotion.side,gunY-.10-magMotion.drop,.47],[shoulderR+magMotion.side,gunY-.27-magMotion.drop,.45],.057,"rifle");
 }else{
  weaponLimb([shoulderR,gunY-.075,.22],[shoulderR,gunY-.22,-.26],.018,"rifle");
  weaponLimb([shoulderR,gunY-.22,-.26],[shoulderR,gunY-.35,-.30],.025,"rifle");
  if(magMotion.attached)weaponLimb([shoulderR,gunY-.09,.43],[shoulderR,gunY-.42,.41],.056,"rifle");
  else weaponLimb([shoulderR+magMotion.side,gunY-.09-magMotion.drop,.43],[shoulderR+magMotion.side,gunY-.42-magMotion.drop,.41],.056,"rifle");
 }
 if(!isLauncher)weaponLimb([shoulderR,gunY-.04,.33],[shoulderR,gunY-.24,.24],.045,"rifle");
 }
 // Wave11: solve actual left forearm/upper-arm skinning quaternions to put the
 // model's REAL left hand on the foregrip. During reload it moves to magazine.
 const foregrip=weaponAt(shoulderR-.32,gunY+.08,.42);
 // Live magazine-swap phase originally put the left-hand target nearly 0.5m
 // from the shoulder (outside natural forearm reach), causing a 13.3mm spike
 // even with 16 CCD iterations. Guide the hand to the reachable magazine neck;
 // the mag mesh can continue to drop independently during swap.
 const magazine=weaponAt(shoulderR-.265+magMotion.side*.6,
   gunY-.10-magMotion.drop*.45,.34);
 const mix=reload>0?Math.sin(Math.PI*Math.min(1,reloadProgress*1.25)):0;
 const grip=foregrip.map((value,i)=>value*(1-mix)+magazine[i]*mix);
 const ik=highRig?.setLeftGrip({target:grip,x,z,y:player.jumpY||0,angle:yaw,phase:posePhase,clip:selectedClip});
 const solvedHand=highRig?.jointPoint("hand_l",posePhase,selectedClip,x,z,yaw,player.jumpY||0);
 if(solvedHand&&Math.hypot(...solvedHand.map((v,i)=>v-grip[i]))<.13){
  pushJointLimb(world,solvedHand,[grip[0],grip[1]+.06,grip[2]],.065,"skin");
 }
 window.KarmaWave11IK={error:ik?.error,initial:ik?.initial,shoulderDistance:ik?.shoulderDistance,iterations:ik?.iterations,active:!!ik?.enabled,
  rightHand:wrist,leftHand:solvedHand,grip,phase:posePhase,clip:selectedClip};
 if(firingPose){
  const a=muzzleWorld,f=visualMuzzleDirection;
  pushJointLimb(world,a,[a[0]+f[0]*.32,a[1]+f[1]*.32,a[2]+f[2]*.32],.04,"muzzle");
  for(let i=0;i<6;i++){
   const theta=i*Math.PI/3,side=Math.cos(theta)*.16,up=Math.sin(theta)*.13;
   pushJointLimb(world,a,[a[0]+f[0]*.24+c*side,a[1]+f[1]*.24+up,a[2]+f[2]*.24+s*side],.017,"muzzle");
  }
 }
}
function weaponInCamera(world){
 const local=[],wave=Math.sin(performance.now()*.008)*(active?.008:0);
 const reloadProgress=reload>0&&reloadTotal>0?1-reload/reloadTotal:0;
 const reloadDrop=reload>0?Math.sin(reloadProgress*Math.PI)*.53:0;
 const recoil=flash>0?Math.min(.16,flash*.85):0;
 const parts=[
  {x:.64,z:-.75,w:.18,d:.66,h:.19,y:1.02,material:"wood"},
  {x:.66,z:-1.08,w:.25,d:.58,h:.18,y:1.09,material:"rifle"},
  {x:.66,z:-1.49,w:.09,d:.68,h:.08,y:1.14,material:"rifle"},
  {x:.66,z:-.94,w:.12,d:.16,h:.31,y:.84,material:"rifle"},
  {x:.57,z:-.66,w:.25,d:.24,h:.26,y:.88,material:"skin"},
  {x:.38,z:-.44,w:.25,d:.7,h:.23,y:.72,material:player.team==="german"?"german":"soviet"},
  {x:.74,z:-1.25,w:.11,d:.21,h:.07,y:1.17,material:"boot"}
 ];
 if(flash>0)parts.push({x:.66,z:-1.92,w:.25+flash*.5,d:.2+flash*.8,h:.2+flash*.4,y:1.12,material:"muzzle"});
 for(const part of parts)pushBox(local,part);
 const c=Math.cos(player.yaw),s=Math.sin(player.yaw);
 for(let i=0;i<local.length;i+=11){
  const x=local[i]-(aiming?.35:0),z=local[i+2]+recoil,nx=local[i+6],nz=local[i+8];world.push(player.x+x*c-z*s,local[i+1]+wave-reloadDrop+(player.eyeHeight||1.65)-1.65+(player.jumpY||0),player.z+x*s+z*c,local[i+3],local[i+4],local[i+5],nx*c-nz*s,local[i+7],nx*s+nz*c);
  world.push(local[i+9],local[i+10]);
 }
}
let staticSceneMap=null,staticSceneVertices=[];
function redraw(){
 // Factory/Castle architecture does not move. Wave17 rebuilt hundreds of
 // textured static wall boxes on EVERY RAF frame, before every VBO upload.
 // Cache CPU triangles per map and copy only their numeric values on redraw.
 if(staticSceneMap!==map){
  staticSceneMap=map;staticSceneVertices=[];
  pushBox(staticSceneVertices,{x:0,z:0,w:180,d:180,h:.2,y:-.24,material:"ground"});
  for(const box of map.blocks)pushEnvironmentGeometry(staticSceneVertices,box);
  staticVertexCount=staticSceneVertices.length/11;
  gl.bindBuffer(gl.ARRAY_BUFFER,staticGpu);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(staticSceneVertices),gl.STATIC_DRAW);
  // Static environment GL vertices remain on the GPU; never recopy/upload
  // thousands of world triangles per requestAnimationFrame.
  staticSceneVertices=[];
 }
 const world=[];
 worldBuffer=staticVertexCount;
 if(thirdPerson){
  pushBox(world,{x:player.x,z:player.z,w:.65,d:.6,h:.02,y:-.028,material:"shadow"});
  if(!highRig)pushSoldier(world,{x:player.x,z:player.z,angle:player.yaw,anim:playerWalkPhase,team:player.team||teamPicker.value,
   hp:player.hp,alive:player.hp>0,speed:playerMoveSpeed,shotTimer:flash,reloading:reload>0?reload:0,crouching:!!(keys.control||keys.c)});
  else pushHighRigEquipment(world);
 }
 if(match){for(const b of match.bots){
  if(!b.alive&&b.respawn<.35)continue;
  if(b.alive)pushBox(world,{x:b.x,z:b.z,w:.75,d:.6,h:.02,y:-.028,material:"shadow",solid:false});
  if(skinDisabled)pushSoldier(world,b);
 }}
 else for(const e of target)if(e.hp>0){pushBox(world,{x:e.x,z:e.z,w:.8,d:.7,y:0,h:1.35,material:"soldier"});pushBox(world,{x:e.x,z:e.z,w:.45,d:.45,y:1.32,h:.43,material:"target"});}
 for(const blast of impactFX){
   const d=Math.max(.05,.6-blast.ttl),radius=d*2.7;
   pushBox(world,{x:blast.x,z:blast.z,w:radius,d:.13,h:.12,y:.65,material:"muzzle",solid:false});
   pushBox(world,{x:blast.x,z:blast.z,w:.13,d:radius,h:.12,y:.65,material:"muzzle",solid:false});
   pushBox(world,{x:blast.x,z:blast.z,w:.18,d:.18,h:radius,y:.5,material:"muzzle",solid:false});
 }
 // Wave16: actual hitscan world-space point (not an invented ground-level kill FX).
 // A small three-axis marker persists briefly for Chrome 1P/3P visual inspection.
 for(const spot of shotMarkers){
  for(const axis of [0,1,2]){
   const dims=[.08,.08,.08];dims[axis]=.24;
   pushBox(world,{x:spot.x,z:spot.z,y:spot.y-dims[1]/2,
    w:dims[0],d:dims[2],h:dims[1],material:"muzzle",solid:false});
  }
 }
 // These contact puffs are spawned only from TDM.damage receipts or actual
 // training-target HP reduction. No speculative impact on a missed shot.
 if(combatFeedback?.enabled)for(const hit of combatFeedback.emitEvents){
  if(!hit.playerHit)continue;
  const t=Math.max(.1,hit.life/.3),r=.11+.13*(1-t);
  pushBox(world,{x:hit.x,z:hit.z,y:hit.y-r*.5,w:r,d:r,h:r,
   material:hit.material==="metal"?"spark":"dust",solid:false});
 }
 weaponFX.draw(world,{pushBox,pushJointLimb});
 // First-person hides the character body, but MUST still submit a modeled
 // weapon transform; the 3P hand-bone equipment helper runs only in 3P.
 if(!thirdPerson&&weaponArt?.has(gun.id)){
  root.KarmaWave22GunPose={kind:gun.id,player:{x:player.x,z:player.z,
    eyeHeight:player.eyeHeight,jumpY:player.jumpY},yaw:player.yaw,pitch:player.pitch,
    aiming,reload:reload>0&&reloadTotal>0?1-reload/reloadTotal:0,
    recoil:flash>0?Math.min(.09,flash*.65):0};
 }
 if(!thirdPerson && !weaponArt?.has(gun.id))weaponInCamera(world);
 sceneVertices=world.length/11;
 // CRITICAL: GPU-skinned pass binds a distinct vertex buffer. The next CPU scene upload
 // must rebind the static world buffer; otherwise it overwrites the skin vertex data
 // and the skin shader draws giant corrupt triangles from the wrong vertex stride.
 gl.bindBuffer(gl.ARRAY_BUFFER,gpu);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(world),gl.DYNAMIC_DRAW);
}
function pick(name){
 map=S.MAPS[name]||S.MAPS.factory;
 mapPicker.value=map.id;const p=map.spawn;player={x:p[0],z:p[2],yaw:map.facing,pitch:0,hp:100,eyeHeight:1.65};
 Jump.reset(player);
 target=map.targets.map(([x,z])=>({x,z,hp:100}));
 if(map.id==="training")modePicker.value="practice";
 match=modePicker.value==="tdm"?T.create(map,teamPicker.value,3,difficultyPicker.value):null;
 if(match){player={...player,x:match.playerSpawn.x,z:match.playerSpawn.z,team:match.playerTeam,id:"player",kills:0,deaths:0};
  player.variantId=root.KarmaWave23Variants?.cycle(player.team,3)?.id||null;}
 else player.variantId=root.KarmaWave23Variants?.cycle(teamPicker.value,0)?.id||null;
 highRig=player.team==="german"?(germanRig||npcGermanRig||legacyRig):(npcSovietRig||legacyRig);
 if(!weaponPicker.options.length||ARM.weapons[weaponPicker.value]?.team!==teamPicker.value)loadoutForTeam(teamPicker.value);
 equipWeapon(weaponPicker.value);
 aiming=false;kills=0;time=180;lastKillEvent=null;impactFX=[];shotMarkers=[];previousPlayerHP=100;
 lastCombatEventId=0;
 playerWalkPhase=0;playerMoveSpeed=0;cameraState=null;
 document.querySelector("#application").classList.toggle("tdm",!!match);
 rebuild();redraw();top.textContent=map.title+(match?" — TEAM DEATHMATCH":" — GEOMETRY STUDY");stats.textContent="3D MAP BLOCKOUT · LAYOUT NOT VERIFIED";
}
function start(){
 if(!started){pick(mapPicker.value);started=true;}
 audio.unlock();
 active=true;menu.hidden=true;
 requestMouseLock();
}
function pause(){
 if(!active)return;firing=false;aiming=false;
 active=false;menu.hidden=false;menuTitle.textContent="OPERATION / PAUSED";startButton.textContent="작전 복귀 ↗";
 for(const key of Object.keys(keys))keys[key]=false;
 lockPending=false;updateMouseLock();
 menu.scrollTop=0;
 if(document.pointerLockElement===canvas)document.exitPointerLock();
}
function victory(){
 started=false;active=false;menu.hidden=false;
 menu.scrollTop=0;
 if(match&&match.score[match.playerTeam]>match.score[match.playerTeam==="german"?"soviet":"german"])audio.play("victory");
 menuTitle.textContent=match?"MATCH COMPLETE / "+(match.score[match.playerTeam]>match.score[T.opposite?T.opposite(match.playerTeam):match.playerTeam==="german"?"soviet":"german"]?"VICTORY":"FINAL SCORE"):"PRACTICE / COMPLETE";
 startButton.textContent="다시 시작 ↗";if(document.pointerLockElement===canvas)document.exitPointerLock();
}
function sightHitsTarget(e){
 if(thirdPerson&&cameraState&&A14&&root.KarmaWave12Aim?.muzzle){
  const selected=A14.trace({
   map,camera:cameraState,muzzle:root.KarmaWave12Aim.muzzle,
   actors:target.filter(t=>t.hp>0).map(t=>({...t,width:.8,depth:.7,height:1.75})),
   maxRange:gun.range
  });
  return selected.kind==="actor"&&selected.actor?.x===e.x&&selected.actor?.z===e.z;
 }
 const dx=e.x-player.x,dz=e.z-player.z,dist=Math.hypot(dx,dz);
 const aim=Math.atan2(dx,-dz);
 let diff=Math.atan2(Math.sin(aim-player.yaw),Math.cos(aim-player.yaw));
 if(dist>gun.range)return false;
 const hitY=(player.eyeHeight||1.65)+(player.jumpY||0)+Math.tan(player.pitch)*dist;
 if(thirdPerson&&cameraState){
  const visible=AA.project([cameraState.eye.x,cameraState.eye.y,cameraState.eye.z],
   [cameraState.target.x,cameraState.target.y,cameraState.target.z],
   [e.x,1.05,e.z],canvas.clientWidth,canvas.clientHeight,aiming?.72:1.25);
  const focal=canvas.clientHeight/(2*Math.tan((aiming?.72:1.25)/2));
  if(!visible.visible||visible.errorPx>Math.max(3,focal*.65/visible.depth))return false;
 }else if(Math.abs(diff)>Math.atan2(.6,dist)||Math.abs(hitY-1.05)>.82)return false;
 const eye=[player.x,(player.eyeHeight||1.65)+(player.jumpY||0),player.z],impact=[e.x,1.1,e.z];
 if(AA.firstSolidHit(map,eye,impact))return false;
 if(thirdPerson&&root.KarmaWave12Aim?.muzzle&&AA.firstSolidHit(map,root.KarmaWave12Aim.muzzle,impact))return false;
 return true;
}
function shoot(){
 if(!active||reload>0||fireCooldown>0)return;
 if(match&&player.hp<=0)return;
 if(ammo===0){audio.play("dry");doReload();return;}
 ammo--;flash=.12;shotPoseTimer=gun.kind==="sniper"?.36:.25;fireCooldown=gun.rate;
 diagnostics.shots++;
 audio.play("fire",gun);
 const recoilImpulse=WM.recoil(gun,aiming,shotSequence++);
 root.KarmaWave13Recoil={id:gun.id,shot:shotSequence,...recoilImpulse};
 // Apply recoil only AFTER hit testing, not before, or center reticle lies.
 const actualPitch=player.pitch;
 const explosive=gun.kind==="launcher"||gun.kind==="grenade",isMelee=gun.kind==="melee";
 // A non-explosive 3P shot samples live collision bodies ONCE at trigger time.
 // Damage and the visible impact point use this same trace, never stale bot coords.
 const liveActors=match?match.bots.filter(b=>b.alive):target.filter(t=>t.hp>0)
  .map(t=>({...t,width:.8,depth:.7,height:1.75}));
 const trace16=thirdPerson&&cameraState&&!explosive&&!isMelee?
  A14.trace({map,camera:cameraState,muzzle:root.KarmaWave12Aim?.muzzle||
   [player.x,(player.eyeHeight||1.65)+(player.jumpY||0),player.z],actors:liveActors,maxRange:gun.range}):null;
 // Rendered weapon FX uses a real gameplay shot; these particles NEVER
 // determine collision, victim, damage or result of the hitscan.
 const fxOrigin=root.KarmaWave12Aim?.muzzle||
  [player.x+Math.cos(player.yaw)*.38,(player.eyeHeight||1.65)+(player.jumpY||0)-.16,player.z-Math.cos(player.yaw)*.42];
 const fxDistance=Math.min(gun.range,24);
 const fxTrace=trace16||A14.trace({map,camera:Camera.compute(map,player,false),muzzle:fxOrigin,actors:liveActors,maxRange:gun.range});
 const fxImpact=explosive?
  [player.x+Math.sin(player.yaw)*fxDistance,.4,player.z-Math.cos(player.yaw)*fxDistance]:
  fxTrace?.gunCover||fxTrace?.cameraPoint||
  [fxOrigin[0]+Math.sin(player.yaw)*fxDistance,
   fxOrigin[1]+Math.tan(player.pitch)*fxDistance,
   fxOrigin[2]-Math.cos(player.yaw)*fxDistance];
 const hasSurface=explosive||["cover","muzzle-blocked","actor"].includes(fxTrace?.kind);
 // Source surface material is the actual 3D collision AABB selected by the
 // SAME ray used for shooting. FX never invents a hit on a missed round.
 const fxMaterial=fxTrace?.kind==="actor"?"fabric":
  (hasSurface?AA.firstSolidHit(map,
    [player.x,(player.eyeHeight||1.65)+(player.jumpY||0),player.z],
    fxImpact)?.material:null)||"concrete";
 root.KarmaWave24LastImpact={kind:fxTrace?.kind||"miss",
   material:hasSurface?weaponFX.impactType(fxMaterial):"none",sourceMaterial:fxMaterial,shot:shotSequence};
 weaponFX.fire({gun,muzzle:fxOrigin,target:fxImpact,yaw:player.yaw,
   sequence:shotSequence,impactAllowed:hasSurface,impactMaterial:fxMaterial});
 let traceDamaged=false,headHit=false;
 if(trace16){
  const impact=trace16.gunCover||trace16.cameraPoint;
  const candidate=trace16.actor;
  const rangeOK=!!candidate&&Math.hypot(candidate.x-player.x,candidate.z-player.z)<=gun.range;
  const legalActor=trace16.kind==="actor"&&rangeOK&&(!match||candidate.team!==player.team);
  const projectedError=impact&&trace16.kind==="actor"?
   A14.screenDeviation(impact,cameraState,canvas.clientWidth,canvas.clientHeight,aiming?.72:1.25):null;
  root.KarmaWave16Shot={kind:trace16.kind,actorId:candidate?.id??null,
   impact:impact?[...impact]:null,projectedErrorPx:projectedError,
   muzzleBlocked:trace16.kind==="muzzle-blocked",actorEligible:legalActor,
   shot:shotSequence,hit:false,mode:"instant-3d-hitscan"};
  if(impact&&["actor","cover","muzzle-blocked"].includes(trace16.kind)){
   shotMarkers.push({x:impact[0],y:impact[1],z:impact[2],ttl:.65});
   shotMarkers=shotMarkers.slice(-12);
  }
 }
 if(match){
  const clearLine=b=>{
   const eye=[player.x,player.eyeHeight||1.65,player.z],impact=[b.x,1.2,b.z];
   if(AA.firstSolidHit(map,eye,impact))return false;
   return !thirdPerson||!root.KarmaWave12Aim?.muzzle||!AA.firstSolidHit(map,root.KarmaWave12Aim.muzzle,impact);
  };
  const screenAim=b=>{
   if(!cameraState)return false;
   const selected=A14.trace({
    map,camera:cameraState,
    muzzle:root.KarmaWave12Aim?.muzzle||[player.x,1.3,player.z],
    actors:match.bots.filter(other=>other.alive&&other.team!==player.team),
    maxRange:gun.range
   });
   return selected.kind==="actor"&&selected.actor===b;
  };
  let victim;
  if(trace16){
   if(root.KarmaWave16Shot.actorEligible){
    victim=trace16.actor;
    const hpBefore=victim.hp;
    const verifiedHead=root.KarmaCombatFeedback?.classifyHead(
      [cameraState.eye.x,cameraState.eye.y,cameraState.eye.z],
      trace16.cameraPoint,victim)===true;
    headHit=verifiedHead;
    traceDamaged=T.damage(match,victim,player,gun.damage,{
     part:verifiedHead?"head":"body",material:"fabric",
     headSphereTest:verifiedHead});
    if(traceDamaged){diagnostics.hits++;diagnostics.damage+=Math.max(0,hpBefore-victim.hp);}
   }
   if(trace16.kind==="muzzle-blocked"||trace16.kind==="cover")diagnostics.blocked++;
   root.KarmaWave16Shot.hit=traceDamaged;
  }else{
   victim=T.playerShoot(match,player,player.yaw,gun.damage,gun.range,actualPitch,clearLine,thirdPerson?screenAim:null);
   if(victim){diagnostics.hits++;diagnostics.damage+=gun.damage;}
  }
  if(victim)audio.play(traceDamaged&&headHit?"headshot":"hit");
  if(explosive){
   const d=victim?Math.hypot(victim.x-player.x,victim.z-player.z):Math.min(gun.range,gun.kind==="grenade"?13:20);
   const center={x:victim?.x??(player.x+Math.sin(player.yaw)*d),z:victim?.z??(player.z-Math.cos(player.yaw)*d)};
   for(const bot of match.bots){
    if(bot===victim||!bot.alive||bot.team===player.team)continue;
    const range=Math.hypot(bot.x-center.x,bot.z-center.z);
    if(range<3.2)T.damage(match,bot,player,gun.damage*(1-range/4));
   }
   impactFX.push({...center,ttl:.7});
  }
  consumeCombatDamage();
  player.pitch=Math.min(.9,player.pitch+recoilImpulse.pitch);player.yaw+=recoilImpulse.yaw;
  syncKillImpact();redraw();if(match.status==="finished")victory();return;
 }
 const e=target.filter(t=>t.hp>0&&sightHitsTarget(t)).sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z))[0];
 if(trace16)root.KarmaWave16Shot.hit=!!e&&trace16.kind==="actor";
 if(explosive&&!e){
  // Training explosion preview from the firing ray even on a missed direct
  // target. This is a prototype instantaneous detonation, not a rocket sim.
  const d=Math.min(gun.range,gun.kind==="grenade"?13:20);
  const center={x:player.x+Math.sin(player.yaw)*d,z:player.z-Math.cos(player.yaw)*d};
  impactFX.push({...center,ttl:.7});
  for(const t of target){
   if(t.hp<=0)continue;
   const r=Math.hypot(t.x-center.x,t.z-center.z);
   if(r>=3.2)continue;
   t.hp-=gun.damage*(1-r/4);
   if(t.hp<=0)kills++;
  }
 }
 if(e){
  for(const t of target){
   if(t.hp<=0||(!explosive&&t!==e)||explosive&&Math.hypot(t.x-e.x,t.z-e.z)>3.2)continue;
   t.hp-=explosive?gun.damage*.7:gun.damage;
   if(t.hp<=0)kills++;
  }
  if(explosive)impactFX.push({x:e.x,z:e.z,ttl:.7});
  if(kills===target.length){victory();}
  if(combatFeedback&&!match)combatFeedback.receive({
   id:++shotSequence,attackerId:"player",victimId:"training-"+target.indexOf(e),
   x:e.x,z:e.z,amount:gun.damage,remainingHp:Math.max(0,e.hp),
   part:"body",hasPrecisePart:false,material:"fabric"},player);
 }
 player.pitch=Math.min(.9,player.pitch+recoilImpulse.pitch);player.yaw+=recoilImpulse.yaw;redraw();
}
function doReload(){if(reload>0||ammo===gun.mag||spare<1)return;reload=gun.reload;reloadTotal=reload;audio.play("reload");}
function syncKillImpact(){
 if(!match||!match.events.length||match.events[0]===lastKillEvent)return;
 lastKillEvent=match.events[0];
 const victim=match.bots.find(b=>b.id===lastKillEvent.target);
 const p=victim||player;
 impactFX.push({x:p.x,z:p.z,ttl:.55});
 impactFX=impactFX.slice(-8);
}
function controls(){
 canvas.tabIndex=0;
 document.addEventListener("keydown",ev=>{const k=ev.key.toLowerCase();keys[k]=true;if([" ","arrowup","arrowdown","arrowleft","arrowright"].includes(k))ev.preventDefault();if((k===" "||ev.code==="Space")&&active&&!ev.repeat)Jump.jump(player);if(k==="q"&&active&&!ev.repeat){ev.preventDefault();togglePerspective();}if(active&&!ev.repeat&&(k==="["||k==="]"))cycleWeapon(k==="]"?1:-1);if(k==="escape")pause();if(k==="r")doReload();});
 document.addEventListener("keyup",ev=>keys[ev.key.toLowerCase()]=false);
 document.addEventListener("mousemove",ev=>{
  if(!active||document.pointerLockElement!==canvas)return;
  if(ignoreNextMouse){ignoreNextMouse=false;return;}
  // Pointer Lock movement is relative to the captured canvas: viewport
  // screenX/clientX cannot be allowed to rotate aim after browser focus changes.
  const mx=Math.max(-95,Math.min(95,ev.movementX)),my=Math.max(-95,Math.min(95,ev.movementY));
  const factor=sensitivity*.001*(aiming?.55:1);
  player.yaw+=mx*factor;player.pitch=Math.max(-.9,Math.min(.9,player.pitch-my*factor));
 });
 document.addEventListener("wheel",ev=>{if(active&&thirdPerson){ev.preventDefault();cameraDistance=Math.max(2.4,Math.min(9.5,cameraDistance+Math.sign(ev.deltaY)*.55));cameraState=null;}},{passive:false});
 document.addEventListener("pointerlockchange",()=>{
  const wasLocked=pointerLocked;lockPending=false;updateMouseLock();
  if(pointerLocked){ignoreNextMouse=true;return;}
  firing=false;aiming=false;for(const k of Object.keys(keys))keys[k]=false;
  if(wasLocked&&active&&!previewMode)pause();
 });
 document.addEventListener("pointerlockerror",()=>{lockPending=false;updateMouseLock();});
 document.addEventListener("mousedown",ev=>{
  if(!active)return;
  if(document.pointerLockElement!==canvas&&!previewMode){if(ev.target===canvas)requestMouseLock();return;}
  if(ev.button===0){firing=true;shoot();}if(ev.button===2)aiming=true;
 });
 document.addEventListener("mouseup",ev=>{if(ev.button===0)firing=false;if(ev.button===2)aiming=false;});
 document.addEventListener("contextmenu",ev=>{if(ev.target===canvas||pointerLocked)ev.preventDefault();});
 window.addEventListener("blur",()=>{firing=false;aiming=false;for(const k of Object.keys(keys))keys[k]=false;if(active&&!previewMode)pause();});
 window.addEventListener("focus",()=>{ignoreNextMouse=true;updateMouseLock();});
 startButton.addEventListener("click",start);
 cameraButton.addEventListener("click",()=>togglePerspective());
 document.querySelector("#enable-audio").addEventListener("change",ev=>audio.setEnabled(ev.target.checked));
 document.querySelector("#sensitivity").addEventListener("input",ev=>{sensitivity=Number(ev.target.value);document.querySelector("#sensitivity-value").textContent=sensitivity.toFixed(1);});
 mapPicker.addEventListener("change",()=>{started=false;pick(mapPicker.value);});
 modePicker.addEventListener("change",()=>{started=false;pick(mapPicker.value);});
 teamPicker.addEventListener("change",()=>{started=false;loadoutForTeam(teamPicker.value);pick(mapPicker.value);});
 weaponPicker.addEventListener("change",()=>{equipWeapon(weaponPicker.value);});
 difficultyPicker.addEventListener("change",()=>{started=false;pick(mapPicker.value);});
 document.querySelector("#pause").addEventListener("click",pause);
}
function step(dt){
 flash=Math.max(0,flash-dt);
 shotPoseTimer=Math.max(0,shotPoseTimer-dt);
 fireCooldown=Math.max(0,fireCooldown-dt);
 impactFX=impactFX.filter(e=>{e.ttl-=dt;return e.ttl>0;});
 shotMarkers=shotMarkers.filter(e=>{e.ttl-=dt;return e.ttl>0;});
 weaponFX.step(dt);
 combatFeedback?.step(dt);
 if(!active)return;
 Jump.step(player,dt);
 root.KarmaWave21Jump={grounded:player.grounded,height:player.jumpY,velocity:player.jumpVY,jumps:player.jumpCount||0,landings:player.landings||0};
 if(firing)shoot();
 if(match){
  const tAI=performance.now();
  T.update(match,player,dt);
  consumeCombatDamage();
  player.hitReactionTimer=Math.max(0,(player.hitReactionTimer||0)-dt);
  if(player.hp<previousPlayerHP)audio.play(player.hp<=0?"death":"hurt");
  previousPlayerHP=player.hp;
  aiLastMs=performance.now()-tAI;
  syncKillImpact();
  if(match.status==="finished"){victory();return;}
 }else{time=Math.max(0,time-dt);if(!time){victory();return;}}
 const forward=Number(!!(keys.w||keys.arrowup))-Number(!!(keys.s||keys.arrowdown));
 const side=Number(!!(keys.d||keys.arrowright))-Number(!!(keys.a||keys.arrowleft));
 const isCrouching=!!(keys.control||keys.c),isSprinting=!!keys.shift&&!aiming&&!isCrouching;
 const targetEye=isCrouching?1.03:1.65;
 player.eyeHeight+=(targetEye-player.eyeHeight)*Math.min(1,dt*12);
 const speed=dt*(isCrouching?2.1:isSprinting?6.8:aiming?2.8:4.3)*
   (gun.kind==="lmg"?.75:gun.kind==="launcher"?.84:gun.kind==="melee"?1.18:gun.kind==="sniper"?.9:1)/Math.max(1,Math.hypot(forward,side));
 const dx=(forward*Math.sin(player.yaw)+side*Math.cos(player.yaw))*speed;
 const dz=(-forward*Math.cos(player.yaw)+side*Math.sin(player.yaw))*speed;
 if(player.hp>0){
  const priorX=player.x,priorZ=player.z;S.walk(map,player,dx,dz);
  const moved=Math.hypot(player.x-priorX,player.z-priorZ);
  playerMoveSpeed=moved/Math.max(dt,.001);
  playerWalkPhase+=dt*(isSprinting?1.7:isCrouching?.65:1);
   if(moved>.002&&player.grounded){walkCadence+=moved;if(walkCadence>(isSprinting?1.7:1.15)){audio.play("step");walkCadence=0;}}
 }else playerMoveSpeed=0;
 if(reload>0){reload-=dt;if(reload<=0){const n=Math.min(gun.mag-ammo,spare);ammo+=n;spare-=n;}}
 if(match){
  const secs=Math.ceil(match.clock),mm=String(Math.floor(secs/60)).padStart(2,"0"),ss=String(secs%60).padStart(2,"0");
  scoreGerman.textContent=String(match.score.german).padStart(2,"0");scoreSoviet.textContent=String(match.score.soviet).padStart(2,"0");clock.textContent=mm+":"+ss;
  stats.textContent=(player.team==="german"?"GERMAN":"SOVIET")+" · HP "+player.hp+" · "+gun.name+" "+ammo+"/"+spare+" · K/D "+player.kills+"/"+player.deaths+(player.hp<=0?" · RESPAWNING":"")+(reload>0?" · RELOADING":"");
 }else{stats.textContent="HEALTH "+player.hp+" · "+gun.name+" "+ammo+" / "+spare+" · TARGETS "+kills+" / "+target.length+(reload>0?" · RELOADING":"");}
 healthFill.style.width=Math.max(0,player.hp)+"%";healthValue.textContent=player.hp+" HP";
 gunName.textContent=gun.name+(reload>0?" · RELOADING":"");
 hudClip.textContent=String(ammo).padStart(2,"0");hudReserve.textContent=String(spare);
}
function mapDraw(){
 miniCtx.clearRect(0,0,156,156);miniCtx.fillStyle="#101813d9";miniCtx.fillRect(0,0,156,156);
 const scale=2.4,ox=78,oy=78;
 for(const b of map.blocks){miniCtx.fillStyle=b.material==="brick"?"#a37858":"#9c9987";miniCtx.fillRect(ox+(b.x-b.w/2)*scale,oy+(b.z-b.d/2)*scale,b.w*scale,b.d*scale);}
 if(match){for(const b of match.bots)if(b.alive){miniCtx.fillStyle=b.team==="german"?"#e0d9c0":"#d6735a";miniCtx.fillRect(ox+b.x*scale-2,oy+b.z*scale-2,4,4);}}
 else for(const t of target)if(t.hp>0){miniCtx.fillStyle="#e38c62";miniCtx.fillRect(ox+t.x*scale-2,oy+t.z*scale-2,4,4);}
 miniCtx.fillStyle="#f4dc9a";miniCtx.beginPath();miniCtx.arc(ox+player.x*scale,oy+player.z*scale,3.5,0,Math.PI*2);miniCtx.fill();
}
function frame(now){
 const tStart=performance.now();
 gpuMeter.drawCalls=0;gpuMeter.triangles=0;gpuMeter.shadowDrawCalls=0;
 gpuMeter.shadowTriangles=0;gpuMeter.actorDrawCalls=0;gpuMeter.actorTriangles=0;gpuMeter.frames++;
 const dt=Math.min(.07,(now-last)/1000);last=now;step(dt);
 const nextCamera=thirdPerson?Camera.compute(map,player,true,{distance:cameraDistance}):null;
 cameraState=thirdPerson?Camera.smooth(cameraState,nextCamera,dt,!active,map,player):null;
 const sceneView=thirdPerson?lookAt([cameraState.eye.x,cameraState.eye.y,cameraState.eye.z],[cameraState.target.x,cameraState.target.y,cameraState.target.z]):view(player);
 const sceneProjection=projection(Math.max(1,canvas.clientWidth)/Math.max(1,canvas.clientHeight),aiming?.72:1.25);
 if(active)redraw();
 if(new URLSearchParams(location.search).get("wave13Selftest")==="1"){
  const cam=thirdPerson?cameraState:Camera.compute(map,player,false);
  if(cam){
   const muzzle=thirdPerson&&root.KarmaWave12Aim?.muzzle?root.KarmaWave12Aim.muzzle:
    [player.x+.4*Math.cos(player.yaw),player.eyeHeight-.18,player.z-.65*Math.cos(player.yaw)];
   root.KarmaWave13Audit={mode:thirdPerson?"3P":"1P",dimensions:[canvas.clientWidth,canvas.clientHeight],
    targets:AA.report(map,player,cam,muzzle,canvas.clientWidth,canvas.clientHeight,aiming?.72:1.25,[3,5,15,30])};
  }
 }
 // Automatic anti-pixelation: keep light rendering on CPU/weak GPUs, improve
 // resolution on real GPUs that sustain a 60fps budget for several seconds.
 if(wave18Quality==="fast"&&sampleFrames.length>=90&&root.KarmaWave18Perf.frames%160===0){
  const recent=sampleFrames.slice(-90),mean=recent.reduce((sum,v)=>sum+v,0)/recent.length,fps=1000/mean;
  if(fps>=58.2)wave20DynamicScale=Math.min(.93,+(wave20DynamicScale+.085).toFixed(3));
  else if(fps<46)wave20DynamicScale=Math.max(.68,+(wave20DynamicScale-.12).toFixed(3));
 }
 const renderScale=new URLSearchParams(location.search).has("scale")?
  Math.max(.5,Math.min(1,Number(new URLSearchParams(location.search).get("scale"))||.8)):
  wave18Quality==="original"?1:wave18Quality==="fast"?wave20DynamicScale:wave18AutoLod>=1?.68:.8;
 root.KarmaWave18Perf.renderScale=renderScale;
 const w=Math.max(1,Math.floor(canvas.clientWidth*Math.min(2,devicePixelRatio||1)*renderScale)),h=Math.max(1,Math.floor(canvas.clientHeight*Math.min(2,devicePixelRatio||1)*renderScale));
 if(w!==canvas.width||h!==canvas.height){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
 // Real shadow-map pass: render world geometry into a depth texture from directional sunlight.
 // On slow systems update the 1024px sun-shadow map at 20Hz instead of 60Hz.
 // Main scene/actual shot & AI logic stay full-frame; old shadowTex is re-used.
 const shadowEvery=wave18Quality==="fast"||wave18AutoLod>=1?3:1;
 const shadowStart=performance.now();drawPhase="shadow";
 if(root.KarmaWave18Perf.frames%shadowEvery===0){
  gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFramebuffer);
  gl.viewport(0,0,SHADOW_SIZE,SHADOW_SIZE);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.useProgram(shadowProgram);
  gl.bindBuffer(gl.ARRAY_BUFFER,gpu);gl.enableVertexAttribArray(shadowPosition);
  gl.vertexAttribPointer(shadowPosition,3,gl.FLOAT,false,44,0);
  gl.uniformMatrix4fv(shadowLightVP,false,lightVP);
  gl.bindBuffer(gl.ARRAY_BUFFER,staticGpu);
  gl.vertexAttribPointer(shadowPosition,3,gl.FLOAT,false,44,0);
  gl.drawArrays(gl.TRIANGLES,0,staticVertexCount);
  gl.bindBuffer(gl.ARRAY_BUFFER,gpu);
  gl.vertexAttribPointer(shadowPosition,3,gl.FLOAT,false,44,0);
  gl.drawArrays(gl.TRIANGLES,0,sceneVertices);
  if(match&&!skinDisabled)skinned.render(skinCheck?[{id:99,team:"german",x:player.x,z:player.z-12,angle:0,anim:1.3,alive:true,speed:1}]:match.bots,null,lightVP,shadowTex,true);
 }
 root.KarmaWave18Perf.shadowCpuMs=+(performance.now()-shadowStart).toFixed(3);
 drawPhase="world";
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h);
 gl.clearColor(...map.sky,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 gl.useProgram(program);bindStaticAttributes();gl.uniformMatrix4fv(uProj,false,sceneProjection);gl.uniformMatrix4fv(uView,false,sceneView);gl.uniform3fv(uFog,map.fog);gl.uniform1f(uTime,now/1000);gl.uniform3f(uEye,thirdPerson?cameraState.eye.x:player.x,thirdPerson?cameraState.eye.y:(player.eyeHeight||1.65)+(player.jumpY||0),thirdPerson?cameraState.eye.z:player.z);
 gl.uniformMatrix4fv(uLightVP,false,lightVP);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,shadowTex);gl.uniform1i(uShadowMap,0);
 gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,environmentAtlas);gl.uniform1i(uEnvAtlas,1);
 gl.uniform1f(uEnvReady,Number(root.KarmaWave21Environment.status==="loaded"));
 gl.bindBuffer(gl.ARRAY_BUFFER,staticGpu);
 for(const [loc,size,offset] of [[positionLoc,3,0],[colorLoc,3,12],[normalLoc,3,24],[surfaceLoc,2,36]]){
  gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,44,offset);
 }
 gl.drawArrays(gl.TRIANGLES,0,staticVertexCount);
 bindStaticAttributes();
 gl.drawArrays(gl.TRIANGLES,0,sceneVertices);
 // Wave20: no more blocky visible bots. Every in-range German/Soviet NPC draws
 // an actual 64-joint creator-derived mesh, with 7k/5k triangle NPC LODs.
 // In fast mode only up to one nearest visible German NPC uses the 16k hero mesh.
 const actorStart=performance.now(),artistBots=[],fallbackBots=[],ranked=[];
 drawPhase="actor";
 const heroMax=wave18Quality==="original"?7:wave18Quality==="balanced"?2:wave18Quality==="fast"?1:0;
 if(match&&!skinCheck&&wave20NPCChoice!=="legacy"){
  for(const bot of match.bots){
   if(!bot.alive)continue;
   const dx=bot.x-player.x,dz=bot.z-player.z,dist=Math.hypot(dx,dz);
   const forward=dx*Math.sin(player.yaw)-dz*Math.cos(player.yaw);
   const lateral=Math.abs(dx*Math.cos(player.yaw)+dz*Math.sin(player.yaw));
   const aspect=Math.max(.8,canvas.clientWidth/Math.max(1,canvas.clientHeight));
   const halfHorizontalTan=Math.tan((aiming?.72:1.25)/2)*aspect;
   const cameraForward=forward+(thirdPerson?cameraDistance:0);
   // Use the actual perspective cone + generous body margin rather than
   // submitting unseen PBR skinned soldiers far outside either screen edge.
   if(dist>52||forward < -6||lateral>Math.max(3.5,cameraForward*halfHorizontalTan+2.5))continue;
   // Solid-world occlusion: hidden opponents still receive REAL AI logic but
   // cost no fragment shading behind a wall (close 11m actors not culled).
   if(dist>11&&!T.canSee(map,player,bot))continue;
   ranked.push({bot,dist});
  }
 }
 ranked.sort((a,b)=>a.dist-b.dist);
 let nearGerman=0;
 for(const {bot,dist} of ranked){
  let rig=null,level="fallback";
  if(bot.team==="soviet"&&npcSovietRig){rig=npcSovietRig;level="interim-soviet-derived";}
  else if(bot.team==="german"&&npcGermanRig){
   const hero=!!germanRig&&nearGerman<heroMax&&dist<(wave18Quality==="original"?50:wave18Quality==="balanced"?18:12)&&wave18AutoLod<2;
   rig=hero?germanRig:npcGermanRig;level=hero?"german-hero":"german-npc-lod";
   if(hero)nearGerman++;
  }
  if(rig)artistBots.push({bot,rig,dist,level});
  else fallbackBots.push(bot);
 }
 // All in-range artist bots are excluded from the generic Quaternius pass.
 // If original binary loading fails, gameplay remains usable in legacy mode.
 const highBotIds=new Set(artistBots.map(item=>item.bot.id));
 if(match&&!skinDisabled)skinned.render(skinCheck?[{id:99,team:"german",x:player.x,z:player.z-12,angle:0,anim:1.3,alive:true,speed:1}]:
   fallbackBots,{projection:sceneProjection,view:sceneView},lightVP,shadowTex,false,thirdPerson?null:player);
 for(const {bot,rig} of artistBots){
  const clip=bot.shotTimer>0?"shoot":bot.reloading?"reload":bot.speed>3?"run":bot.speed>.1?"walk":"idle";
  rig.render({x:bot.x,z:bot.z,angle:bot.angle||0,phase:bot.anim||0,clip,
   team:bot.team,projection:sceneProjection,view:sceneView,useIK:false,
   hitReaction:bot.alive?(bot.hitReactionTimer||0)/.22:0,hitSide:bot.hitReactionSide||1,
   variantId:bot.variantId});
 }
 root.KarmaWave20NPC.artistBots=artistBots.length;
 root.KarmaWave20NPC.german=artistBots.filter(b=>b.bot.team==="german").length;
 root.KarmaWave20NPC.soviet=artistBots.filter(b=>b.bot.team==="soviet").length;
 root.KarmaWave20NPC.fallback=fallbackBots.length;
 root.KarmaWave20NPC.visible=ranked.length;
 // Match faction is authoritative after the start menu / async GLB load.
 if(player.team==="soviet"&&npcSovietRig)highRig=npcSovietRig;
 else if(player.team==="german"&&germanRig)highRig=germanRig;
 else if(player.team==="german"&&npcGermanRig)highRig=npcGermanRig;
 if(thirdPerson&&(wave18AutoLod<2?highRig:legacyRig)){
  const drivenClip=player.hp<=0?"death":reload>0?"reload":shotPoseTimer>0?"shoot":keys.control||keys.c?"crouch":playerMoveSpeed>3?"run":playerMoveSpeed>.12?"walk":"idle";
  const clip=["idle","walk","run","shoot","reload","crouch","death"].includes(wave8Pose)?wave8Pose:drivenClip;
  const phase=clip==="shoot"&&!wave8Pose?Math.max(0,.25-shotPoseTimer)*2.5:
   clip==="reload"&&!wave8Pose?Math.max(0,reloadTotal-reload)*.75:playerWalkPhase;
  const activeRig=wave18AutoLod<2?highRig:legacyRig;
  const footLock=activeRig.setFootLocks?.({x:player.x,z:player.z,angle:player.yaw,phase,clip,
   enabled:player.grounded&&new URLSearchParams(location.search).get("footlock")!=="0"});
  if(footLock?.contacts){
   const tally=root.KarmaWave20FootAudit||(root.KarmaWave20FootAudit={samples:0,contacts:0,preSlipSum:0,postSlipSum:0,maxPreSlip:0,maxPostSlip:0});
   tally.samples++;tally.contacts+=footLock.contacts;
   tally.preSlipSum+=footLock.meanPreSlipMeters*footLock.contacts;
   tally.postSlipSum+=footLock.meanSlipMeters*footLock.contacts;
   tally.maxPreSlip=Math.max(tally.maxPreSlip,footLock.maxPreSlipMeters);
   tally.maxPostSlip=Math.max(tally.maxPostSlip,footLock.maxSlipMeters);
   tally.preMeanMeters=tally.preSlipSum/tally.contacts;
   tally.postMeanMeters=tally.postSlipSum/tally.contacts;
  }
  activeRig.render({x:player.x,z:player.z,y:player.jumpY||0,angle:player.yaw,phase,clip,team:player.team||teamPicker.value,projection:sceneProjection,view:sceneView,
   hitReaction:player.hp>0?(player.hitReactionTimer||0)/.22:0,hitSide:player.hitReactionSide||1,
   variantId:player.variantId});
  root.KarmaWave19Pose={clip,foot:activeRig.getFootContact?.()||null,
    ik:activeRig.getIK?.()||null,feet:activeRig.footPoints?.(phase,clip,player.x,player.z,player.yaw)||null,
    footLock:footLock||null,player:{x:player.x,z:player.z,yaw:player.yaw,moveSpeed:playerMoveSpeed},source:activeRig.source};
  root.KarmaWave20NPC.playerSource=activeRig.source;
 }
 // One independent static GPU buffer per genuinely modeled Blender 3D weapon.
 // This draws only the currently selected weapon; other guns keep existing
 // gameplay meshes. 1P uses camera basis and 3P attaches to real skinned hand.
 if(weaponArt?.has(gun.id)&&root.KarmaWave22GunPose&&player.hp>0){
  const p=root.KarmaWave22GunPose;
  weaponArt.draw(gun.id,{...p,projection:sceneProjection,view:sceneView,
   thirdPerson, fog:map.fog});
 }
 root.KarmaWave18Perf.actorRenderMs=performance.now()-actorStart;
 drawPhase="vfx";
 const vfxStarted=performance.now();
 root.KarmaWave21VFXPoints=weaponFX.renderGPU(sceneProjection,sceneView);
 root.KarmaWave18Perf.vfxCpuMs=+(performance.now()-vfxStarted).toFixed(3);
 drawPhase="world";
 root.KarmaWave21VFXPeakPoints=Math.max(root.KarmaWave21VFXPeakPoints||0,root.KarmaWave21VFXPoints);
 root.KarmaWave18Perf.realBots=artistBots.length;
 root.KarmaWave18Perf.frames++;
 // Sustained >25ms/frame auto-degrades bot draw quality; >34ms also reduces
 // player visual complexity. Keep published telemetry explicit and overrideable.
 if(wave18Quality==="balanced"&&sampleFrames.length>=100&&root.KarmaWave18Perf.frames%90===0){
  const avg=sampleFrames.reduce((a,b)=>a+b,0)/sampleFrames.length;
  if(avg>34)wave18AutoLod=2;else if(avg>25)wave18AutoLod=Math.max(wave18AutoLod,1);
  root.KarmaWave18Perf.autoLod=wave18AutoLod;
 }
 mapDraw();
 const glow=document.querySelector("#glow");glow.style.opacity=String(Math.min(.9,flash*5));
 updateBenchmark(dt*1000,performance.now()-tStart,aiLastMs,now);
 requestAnimationFrame(frame);
}
const requestedTeam=new URLSearchParams(window.location.search).get("team");
if(["german","soviet"].includes(requestedTeam))teamPicker.value=requestedTeam;
pick(new URLSearchParams(window.location.search).get("map")||"factory");
togglePerspective(new URLSearchParams(window.location.search).get("camera")==="third");
// Explicit screenshot/asset QA staging ONLY. Regular 4v4 games never move bots
// to showcase positions; this preview illustrates geometry close enough to
// inspect the licensed materials and distinctive not-historic Soviet cap.
if(new URLSearchParams(location.search).get("npcShowcase")==="1"&&
   new URLSearchParams(location.search).get("preview")==="1"&&match){
 const offsets=[[-1.9,4.5],[1.9,4.5],[-3.3,8],[3.3,8],[-1.5,13],[1.5,13],[0,18]];
 let n=0;
 for(const bot of match.bots){
  for(let k=n;k<offsets.length;k++){
   const [side,front]=offsets[k],x=player.x+side*Math.cos(player.yaw)+front*Math.sin(player.yaw),
     z=player.z+side*Math.sin(player.yaw)-front*Math.cos(player.yaw);
   if(!S.isWalkable(map,x,z)||!T.canSee(map,player,{x,z}))continue;
   bot.x=x;bot.z=z;bot.cooldown=999;bot.reloading=0;bot.path=[];
   n=k+1;break;
  }
 }
 const stamp=document.querySelector(".survey-stamp");
 if(stamp)stamp.textContent+=" · STAGED AI VISUAL QA ONLY";
 root.KarmaWave20NPC.showcase=true;
}
updateMouseLock();
menu.scrollTop=0;
controls();
if(new URLSearchParams(window.location.search).get("preview")==="1"){
  started=true;active=true;menu.hidden=true;
}
if(runBrowserSelftest){
 // Isolated automated *real browser* gameplay smoke; no effect in ordinary sessions.
 const results=[],snapshot={x:player.x,z:player.z,ammo};
 const report=document.createElement("pre");
 report.id="input-selftest";report.style.cssText="position:absolute;z-index:8;top:270px;right:10px;background:#09140af0;color:#e7f3dd;padding:14px;font:12px monospace;min-width:255px";
 document.querySelector("#application").appendChild(report);
 report.textContent="AUTOMATED BROWSER INPUT TEST / RUNNING";
 if(!active){started=true;active=true;menu.hidden=true;}
 keys.w=true;
 setTimeout(()=>{keys.w=false;results.push({test:"W moves player",passed:Math.hypot(player.x-snapshot.x,player.z-snapshot.z)>.3});firing=true;},1300);
 setTimeout(()=>{firing=false;results.push({test:"held primary fire consumes ammo",passed:ammo<snapshot.ammo});doReload();},2100);
 setTimeout(()=>{
  results.push({test:"R reload recovers magazine",passed:ammo===gun.mag&&spare<gun.reserve});
  results.push({test:"player remains navigable",passed:S.isWalkable(map,player.x,player.z)});
  results.push({test:"4v4 match remains live",passed:!!match&&match.bots.length===7&&match.clock<300});
  report.textContent="CHROME 3D INPUT SMOKE\n"+results.map(x=>(x.passed?"PASS ":"FAIL ")+x.test).join("\n")+"\n"+results.filter(x=>x.passed).length+"/"+results.length+" PASS";
 },4800);
}
if(new URLSearchParams(window.location.search).get("cameraSelftest")==="1"){
 // Real Chrome handler E2E; synthetic keyboard events exercise the same Q listener as physical keys.
 const report=document.createElement("pre");
 report.id="camera-selftest";report.style.cssText="position:absolute;z-index:8;right:10px;top:260px;background:#08170af0;color:#e8f2dc;padding:12px;font:12px monospace";
 document.querySelector("#application").appendChild(report);
 if(!active){started=true;active=true;menu.hidden=true;}
 togglePerspective(false);
 let passed=0;const checks=[];
 function hit(expected,label){
  document.dispatchEvent(new KeyboardEvent("keydown",{key:"q",bubbles:true}));
  document.dispatchEvent(new KeyboardEvent("keyup",{key:"q",bubbles:true}));
  const ok=thirdPerson===expected&&cameraButton.textContent.startsWith(expected?"3P":"1P");
  passed+=Number(ok);checks.push((ok?"PASS ":"FAIL ")+label);
  report.textContent="Q CAMERA REAL CHROME INPUT\n"+checks.join("\n")+"\n"+passed+"/"+checks.length+" PASS";
 }
 setTimeout(()=>hit(true,"Q switches 1P to 3P"),500);
 setTimeout(()=>hit(false,"Q restores 1P"),1200);
 setTimeout(()=>hit(true,"Q returns to 3P"),1800);
}
if(new URLSearchParams(window.location.search).get("wave8Selftest")==="1"){
 // Development-only real Chrome game-loop scenario: not a physical user mouse test.
 if(!active){started=true;active=true;menu.hidden=true;}
 togglePerspective(true);
 const report=document.createElement("pre");
 report.id="wave8-test";report.style.cssText="position:absolute;z-index:9;right:8px;top:300px;background:#101c17ed;color:#ebf9df;padding:10px;font:11px/1.5 monospace;min-width:235px;pointer-events:none";
 document.querySelector("#application").appendChild(report);
 const results=[],mark=(name,ok)=>{results.push({name,ok});report.textContent="WAVE 8 / 3P LIVE INPUT E2E\n"+results.map(r=>(r.ok?"PASS ":"FAIL ")+r.name).join("\n")+"\n"+results.filter(r=>r.ok).length+"/"+results.length+" PASS";};
 mark("licensed 65-joint glTF loaded",!!highRig&&highRig.joints===65);
 const yawBefore=player.yaw;
 document.dispatchEvent(new MouseEvent("mousemove",{clientX:-1000,clientY:-1000,movementX:950,movementY:700}));
 mark("unlocked off-canvas aim ignored",player.yaw===yawBefore);
 mark("screen reticle centered",Math.abs(document.querySelector(".crosshair").getBoundingClientRect().left+19-canvas.clientWidth/2)<2);
 const startX=player.x,startZ=player.z,startingAmmo=ammo;
 keys.w=true;
 setTimeout(()=>{keys.w=false;mark("walk changes world position",Math.hypot(player.x-startX,player.z-startZ)>.15);keys.shift=true;keys.w=true;},950);
 setTimeout(()=>{keys.w=false;keys.shift=false;mark("run clip/position advanced",playerMoveSpeed>3||playerWalkPhase>.2);firing=true;},1700);
 setTimeout(()=>{firing=false;mark("fire consumes ammo",ammo<startingAmmo);doReload();},2400);
 setTimeout(()=>{mark("reload anim / ammo replenished",ammo===gun.mag&&spare<gun.reserve);keys.control=true;},5100);
 setTimeout(()=>{mark("crouch reduces camera height",player.eyeHeight<1.25);keys.control=false;},5700);
 setTimeout(()=>{
  if(match){const attacker=match.bots.find(b=>b.team!==player.team&&b.alive);if(attacker){T.damage(match,player,attacker,150);match.playerDeadTimer=3.5;}}
  mark("death drives player HP to zero",player.hp===0);
 },6200);
 setTimeout(()=>{mark("death character pose state active",player.hp===0&&thirdPerson&&!!highRig);},6850);
}
if(new URLSearchParams(window.location.search).get("wave9Selftest")==="1"){
 // Real Chrome game loop tests; no OS input privileges or fake pointer lock.
 if(!active){started=true;active=true;menu.hidden=true;}
 togglePerspective(true);
 const report=document.createElement("pre");
 report.id="wave9-test";report.style.cssText="position:absolute;z-index:9;right:7px;top:300px;background:#07190eea;color:#d9fbdb;padding:10px;font:11px/1.45 monospace;min-width:260px;pointer-events:none";
 document.querySelector("#application").appendChild(report);
 const checks=[];
 function mark(name,ok){checks.push({name,ok});report.textContent="WAVE 09 / CHROME GAMEPLAY E2E\n"+checks.map(c=>(c.ok?"PASS ":"FAIL ")+c.name).join("\n")+"\n"+checks.filter(c=>c.ok).length+"/"+checks.length+" PASS";}
 mark("real CC0 65-bone player GLB",highRig?.joints===65);
 const yaw=player.yaw;document.dispatchEvent(new MouseEvent("mousemove",{movementX:950,clientX:-999}));
 mark("unlocked mouse does not aim",player.yaw===yaw);
 document.dispatchEvent(new KeyboardEvent("keydown",{key:"q",bubbles:true}));
 document.dispatchEvent(new KeyboardEvent("keyup",{key:"q",bubbles:true}));
 const first=!thirdPerson;
 document.dispatchEvent(new KeyboardEvent("keydown",{key:"q",bubbles:true}));
 document.dispatchEvent(new KeyboardEvent("keyup",{key:"q",bubbles:true}));
 mark("Q toggles 1P and back 3P",first&&thirdPerson);
 mark("reticle at canvas center",Math.abs(document.querySelector(".crosshair").getBoundingClientRect().left+19-canvas.clientWidth/2)<2);
 setTimeout(()=>mark("German 2K PBR maps loaded",!!highRig?.fabricReady("german")),450);
 let walkSpeed=0;const px=player.x,pz=player.z,oldAmmo=ammo;
 keys.w=true;
 setTimeout(()=>{walkSpeed=playerMoveSpeed;mark("walk position changes",Math.hypot(player.x-px,player.z-pz)>.3);keys.shift=true;},1150);
 setTimeout(()=>{mark("Shift sprint faster than walk",playerMoveSpeed>walkSpeed*1.2&&playerMoveSpeed>5.5);keys.w=false;keys.shift=false;firing=true;},1950);
 setTimeout(()=>{
  mark("held firing reduces bullets",ammo<oldAmmo);
  mark("fire pose+recoil active",shotPoseTimer>0&&flash>0);
  firing=false;doReload();
 },2510);
 setTimeout(()=>{mark("reload refills magazine",ammo===gun.mag&&spare<gun.reserve);keys.control=true;keys.w=true;},5000);
 setTimeout(()=>{mark("Ctrl crouch lowers real camera",player.eyeHeight<1.3);mark("crouch speed distinct",playerMoveSpeed<2.5);keys.w=false;keys.control=false;},5700);
 setTimeout(()=>{
  const idle=highRig?.jointPoint("hand_r",.5,"idle",0,0,0),shoot=highRig?.jointPoint("hand_r",.5,"shoot",0,0,0);
  mark("65-joint shooting moves weapon hand",!!idle&&!!shoot&&Math.hypot(idle[0]-shoot[0],idle[1]-shoot[1],idle[2]-shoot[2])>.05);
  mark("player still in playable map",S.isWalkable(map,player.x,player.z));
 },5850);
}
if(new URLSearchParams(window.location.search).get("wave10Selftest")==="1"){
 if(!active){started=true;active=true;menu.hidden=true;}
 togglePerspective(true);
 const report=document.createElement("pre");
 report.style.cssText="position:absolute;right:6px;top:305px;z-index:11;background:#08170eea;color:#ebf4e2;font:11px/1.4 monospace;padding:10px;pointer-events:none";
 document.querySelector("#application").appendChild(report);
 const results=[],mark=(name,pass)=>{
  results.push({name,pass});report.textContent="WAVE 10 REAL GLTF E2E\n"+results.map(v=>(v.pass?"PASS ":"FAIL ")+v.name).join("\n")+"\n"+results.filter(v=>v.pass).length+"/"+results.length+" PASS";
 };
 mark("UAL 10 real CC0 animation clips",highRig?.ualClips?.length===10);
 mark("UAL 52 mapped skeletal bones",highRig?.ualBones>=48);
 mark("23 faction-graded candidate weapons",Object.keys(ARM.weapons).length===23);
 mark("Original-named Training practice map",map.id==="training"&&match===null&&target.length>=6);
 const y=player.yaw;document.dispatchEvent(new MouseEvent("mousemove",{movementX:500,clientX:-1000}));
 mark("off-canvas cursor cannot rotate",player.yaw===y);
 document.dispatchEvent(new KeyboardEvent("keydown",{key:"q",bubbles:true}));
 document.dispatchEvent(new KeyboardEvent("keyup",{key:"q",bubbles:true}));
 const first=!thirdPerson;
 document.dispatchEvent(new KeyboardEvent("keydown",{key:"q",bubbles:true}));
 document.dispatchEvent(new KeyboardEvent("keyup",{key:"q",bubbles:true}));
 mark("Q 1P -> 3P without aim drift",first&&thirdPerson&&player.yaw===y);
 document.dispatchEvent(new KeyboardEvent("keydown",{key:"]",bubbles:true}));
 document.dispatchEvent(new KeyboardEvent("keyup",{key:"]",bubbles:true}));
 mark("] switches weapon MP40 to Kar98k",gun.id==="kar98"&&gun.mag===5);
 const firstTarget=target.find(t=>t.x===-5&&t.z===-12),hp=firstTarget?.hp;
 if(firstTarget){player.yaw=Math.atan2(firstTarget.x-player.x,-(firstTarget.z-player.z));player.pitch=0;shoot();}
 mark("Kar98k aligns reticle and target",firstTarget?.hp<hp&&ammo===4);
 doReload();
 setTimeout(()=>{
  mark("R reload 5-round magazine",ammo===5);
  equipWeapon("panzer");mark("Panzerfaust 1-shot loadout",gun.kind==="launcher"&&ammo===1);
  shoot();mark("launcher explosion effect",ammo===0&&impactFX.length>0);
  mark("target lane still navigable",S.isWalkable(map,player.x,player.z));
 },3200);
}
if(new URLSearchParams(window.location.search).get("wave11Selftest")==="1"){
 if(!active){started=true;active=true;menu.hidden=true;}
 togglePerspective(true);
 const panel=document.createElement("pre");panel.id="wave11-ik-e2e";
 panel.style.cssText="position:absolute;top:310px;right:8px;z-index:14;background:#0b1710ef;color:#dbf4d7;padding:12px;font:11px/1.45 monospace;min-width:270px;pointer-events:none";
 document.querySelector("#application").appendChild(panel);
 const checks=[],show=(name,value,ok)=>{
  checks.push({name,value,ok});
  panel.textContent="WAVE11 / REAL GPU LEFT ARM CCD IK\n"+
   checks.map(c=>(c.ok?"PASS ":"FAIL ")+c.name+" : "+c.value).join("\n")+
   "\n"+checks.filter(c=>c.ok).length+"/"+checks.length+" PASS";
 };
 setTimeout(()=>{
  const info=window.KarmaWave11IK||{},dist=Math.hypot(...(info.leftHand||[0,0,0]).map((v,i)=>v-(info.grip||[0,0,0])[i]));
  show("CCD before->after",Number(info.initial||0).toFixed(3)+"->"+Number(info.error||0).toFixed(3),Number(info.error)<Number(info.initial));
  show("shoulder-to-grip range",Number(info.shoulderDistance||0).toFixed(3)+"m",Number(info.shoulderDistance)<.62);
  show("retarget 52 UAL joints",highRig?.ualBones,highRig?.ualBones===52);
  show("active CCD IK",(info.iterations||0)+" iterations",info.active===true);
  show("real left wrist -> foregrip",dist.toFixed(3)+"m",dist<.13);
  show("2K country texture ready",String(highRig?.fabricReady("german")),!!highRig?.fabricReady("german"));
  show("full 3P camera",String(thirdPerson),thirdPerson);
  shotPoseTimer=.23;flash=.11;
 },660);
 setTimeout(()=>{const info=window.KarmaWave11IK||{};
  const dist=Math.hypot(...(info.leftHand||[0,0,0]).map((v,i)=>v-(info.grip||[0,0,0])[i]));
  show("UAL pistol-shoot hand/grip",dist.toFixed(3)+"m",dist<.13);
  ammo=Math.max(0,ammo-1);doReload();
 },1230);
 setTimeout(()=>{const info=window.KarmaWave11IK||{},
  dist=Math.hypot(...(info.leftHand||[0,0,0]).map((v,i)=>v-(info.grip||[0,0,0])[i]));
  show("UAL reload hand -> mag",dist.toFixed(3)+"m",dist<.19);
  show("reload magazine animated",String(reload>0),reload>0);
 },2100);
 setTimeout(()=>{const before=player.yaw;
  document.dispatchEvent(new MouseEvent("mousemove",{movementX:800,clientX:-2000}));
  show("pointer unlocked no yaw drift",String(before===player.yaw),before===player.yaw);
 },2450);
}
if(new URLSearchParams(window.location.search).get("wave12Selftest")==="1"){
 if(!active){started=true;active=true;menu.hidden=true;}
 togglePerspective(true);
 const report=document.createElement("pre");report.id="wave12-e2e";
 report.style.cssText="position:absolute;top:315px;right:5px;z-index:19;background:#0a1511eb;color:#ecffdf;padding:10px;font:11px/1.35 monospace;min-width:272px;pointer-events:none";
 document.querySelector("#application").appendChild(report);
 const results=[],mark=(name,ok,value)=>{
  results.push({name,ok,value:String(value??"")});
  report.textContent="WAVE 12 / PHOTO+MUZZLE+MAG\n"+results.map(r=>(r.ok?"PASS ":"FAIL ")+r.name+" "+r.value).join("\n")+
   "\n"+results.filter(r=>r.ok).length+"/"+results.length+" PASS";
 };
 mark("actual UAL clips",highRig?.ualClips?.length===10,highRig?.ualClips?.length);
 mark("52 actual retarget bones",highRig?.ualBones>=52,highRig?.ualBones);
 mark("23 selectable historic candidates",Object.keys(ARM.weapons).length===23,Object.keys(ARM.weapons).length);
 setTimeout(()=>{
  const aim=root.KarmaWave12Aim||{};
  mark("ambientCG PHOTO maps GPU",highRig?.photoReady?.()===true,highRig?.photoReady?.());
  mark("physical muzzle calculation",Number(aim.uncorrectedError)>.18,Number(aim.uncorrectedError||0).toFixed(3)+"m");
  for(const range of [5,15,30]){
   const s=WM.solve(aim.eye||[0,1.65,0],aim.muzzle||[.4,1.2,-1],player.yaw,player.pitch,range);
   mark("muzzle corrected at "+range+"m",s.convergenceError<1e-6,s.convergenceError.toFixed(6)+"m");
  }
  mark("3P original CCD hand IK",root.KarmaWave11IK?.error<.09,Number(root.KarmaWave11IK?.error||0).toFixed(3)+"m");
  const before=player.yaw;
  document.dispatchEvent(new MouseEvent("mousemove",{movementX:740,clientX:-999}));
  mark("unlocked outside mouse ignored",player.yaw===before,player.yaw===before);
  ammo=Math.max(0,gun.mag-2);doReload();
 },750);
 setTimeout(()=>{const m=root.KarmaWave12Aim?.magazine;mark("magazine truly detached",m&&!m.attached,m?.stage);},1300);
 setTimeout(()=>{const m=root.KarmaWave12Aim?.magazine;mark("magazine held while swap",m?.stage==="swap",m?.stage);},1710);
 setTimeout(()=>{const m=root.KarmaWave12Aim?.magazine;mark("magazine reinsert underway",m?.stage==="insert",m?.stage);},2170);
 setTimeout(()=>{const m=root.KarmaWave12Aim?.magazine;mark("magazine latched again",!!m?.attached,m?.stage);},2540);
}
if(new URLSearchParams(window.location.search).get("wave13Selftest")==="1"){
 if(!active){started=true;active=true;menu.hidden=true;}
 togglePerspective(true);
 const panel=document.createElement("pre");
 panel.style.cssText="position:absolute;right:5px;top:312px;z-index:21;background:#101914ed;color:#e8ffe6;padding:12px;font:11px/1.4 monospace;min-width:305px;pointer-events:none";
 document.querySelector("#application").appendChild(panel);
 const checks=[],mark=(name,ok,value)=>{
  checks.push({name,ok,value:String(value??"")});
  panel.textContent="WAVE 13 / ACTUAL SCREEN PIXELS & COVER\n"+
   checks.map(c=>(c.ok?"PASS ":"FAIL ")+c.name+" "+c.value).join("\n")+
   "\n"+checks.filter(c=>c.ok).length+"/"+checks.length+" PASS";
 };
 const fixture={blocks:[{x:0,z:-5,w:3,d:1,h:2,y:0,solid:true}]};
 mark("3D cover block at eye height",!!AA.firstSolidHit(fixture,[0,1.6,0],[0,1.6,-10]),"blocked");
 mark("bullets ABOVE low wall pass",!AA.firstSolidHit(fixture,[0,3.2,0],[0,3.2,-10]),"clear");
 mark("bullets BEHIND offset wall pass",!AA.firstSolidHit(fixture,[5,1.5,0],[5,1.5,-10]),"clear");
 setTimeout(()=>{
  mark("real photo fabric 2K uploaded",!!highRig?.photoReady?.(),highRig?.photoReady?.());
  const a=root.KarmaWave13Audit?.targets||[];
  mark("actual 3P camera measured",root.KarmaWave13Audit?.mode==="3P",root.KarmaWave13Audit?.mode);
  mark("3P close-range error quantified",a[0]?.pixelError>0,Number(a[0]?.pixelError||0).toFixed(2)+"px @3m");
  mark("3P far-range error quantified",Number.isFinite(a[3]?.pixelError),Number(a[3]?.pixelError||0).toFixed(2)+"px @30m");
  mark("near-target parallax larger",a[0]?.pixelError>a[3]?.pixelError,
   Number(a[0]?.pixelError||0).toFixed(1)+">"+Number(a[3]?.pixelError||0).toFixed(1)+"px");
  const err=AA.project([cameraState.eye.x,cameraState.eye.y,cameraState.eye.z],
   [cameraState.target.x,cameraState.target.y,cameraState.target.z],
   [cameraState.target.x,cameraState.target.y,cameraState.target.z],
   canvas.clientWidth,canvas.clientHeight,1.25).errorPx;
  mark("real 3P reticle center",err<.001,err.toFixed(5)+"px");
  document.dispatchEvent(new KeyboardEvent("keydown",{key:"q",bubbles:true}));
  document.dispatchEvent(new KeyboardEvent("keyup",{key:"q",bubbles:true}));
 },720);
 setTimeout(()=>{
  const a=root.KarmaWave13Audit?.targets||[];
  mark("actual Q -> first person",!thirdPerson,root.KarmaWave13Audit?.mode);
  mark("1P 3m shot center",a[0]?.pixelError<.1,Number(a[0]?.pixelError||0).toFixed(3)+"px");
  mark("1P 30m shot center",a[3]?.pixelError<.1,Number(a[3]?.pixelError||0).toFixed(3)+"px");
  const mp=WM.recoil(ARM.weapons.mp40,false,0),sn=WM.recoil(ARM.weapons.kar98,false,0),ads=WM.recoil(ARM.weapons.kar98,true,0);
  mark("Kar98 bolt recoil > MP40",sn.pitch>mp.pitch,mp.pitch.toFixed(3)+" vs "+sn.pitch.toFixed(3));
  mark("ADS reduces same-gun recoil",ads.pitch<sn.pitch,ads.pitch.toFixed(3)+" vs "+sn.pitch.toFixed(3));
  const yaw=player.yaw;document.dispatchEvent(new MouseEvent("mousemove",{movementX:999,clientX:-999}));
  mark("unlocked mouse cannot drift",player.yaw===yaw,String(player.yaw===yaw));
 },1450);
}
if(new URLSearchParams(window.location.search).get("wave14Selftest")==="1"){
 if(!active){started=true;active=true;menu.hidden=true;}
 togglePerspective(true);
 const panel=document.createElement("pre");panel.id="wave14-e2e";
 panel.style.cssText="position:absolute;top:315px;right:5px;z-index:21;background:#101914ef;color:#e8ffe6;padding:11px;font:11px/1.42 monospace;min-width:280px;pointer-events:none";
 document.querySelector("#application").appendChild(panel);
 const checks=[],mark=(label,ok,value)=>{
  checks.push({label,ok,value:String(value??"")});
  panel.textContent="WAVE14 / CAMERA RAY / MOVING ACTOR\n"+
   checks.map(c=>(c.ok?"PASS ":"FAIL ")+c.label+" : "+c.value).join("\n")+
   "\n"+checks.filter(c=>c.ok).length+"/"+checks.length+" PASS";
 };
 const p={x:0,z:0,yaw:0,pitch:-.08,eyeHeight:1.65},
   emptyMap={blocks:[]},cam=Camera.compute(emptyMap,p,true,{distance:6.4}),
   camEye=[cam.eye.x,cam.eye.y,cam.eye.z],camTarget=[cam.target.x,cam.target.y,cam.target.z],
   diff=camTarget.map((v,i)=>v-camEye[i]),fraction=(-3-camEye[2])/diff[2],
   center=camEye.map((v,i)=>v+diff[i]*fraction),
   actor={x:center[0],z:center[2],hp:100,alive:true,id:"runner"},
   muzzle=[.32,1.35,-.65];
 const oldPx=AA.project(camEye,camTarget,AA.playerAim(p,3),1200,650,1.25).errorPx;
 const hit=A14.trace({map:emptyMap,camera:cam,muzzle,actors:[actor]});
 const newPx=A14.screenDeviation(hit.point||camTarget,cam,1200,650,1.25);
 mark("3m old parallax measured",oldPx>20,oldPx.toFixed(1)+"px");
 mark("3m reticle collider ray aligned",hit.kind==="actor"&&newPx<.01,newPx.toFixed(3)+"px");
 actor.x+=4;const left=A14.trace({map:emptyMap,camera:cam,muzzle,actors:[actor]});
 mark("moving target leaves sight",left.kind==="miss",left.kind);
 actor.x-=4;const returned=A14.trace({map:emptyMap,camera:cam,muzzle,actors:[actor]});
 mark("moving target crosses sight",returned.kind==="actor",returned.kind);
 const coverMap={blocks:[{x:0,z:-2,w:3,d:.4,h:2.5,y:0,solid:true,material:"wall"}]};
 const covered=A14.trace({map:coverMap,camera:cam,muzzle,actors:[actor]});
 mark("near cover stops center ray",covered.kind==="cover",covered.kind);
 const firstBots=match?match.bots.map(b=>[b.x,b.z]):null;
 setTimeout(()=>{
  const audit=root.KarmaWave14Aim;
  mark("3P live aim object exists",!!audit, audit?.kind??"none");
  mark("actual 3m prior body ray deviates",Number(audit?.priorPlayerAimPx)>20,Number(audit?.priorPlayerAimPx||0).toFixed(2)+"px");
  mark("live camera projection under 1px",Number(audit?.reticlePx)<1,Number(audit?.reticlePx||0).toFixed(5)+"px");
  mark("photo texture uploaded",!!highRig?.photoReady?.(),String(highRig?.photoReady?.()));
  mark("UAL source bones",highRig?.ualBones===52,highRig?.ualBones);
 },850);
 setTimeout(()=>{
  if(firstBots){
   const moved=match.bots.some((b,i)=>Math.hypot(b.x-firstBots[i][0],b.z-firstBots[i][1])>.04);
   mark("real 4v4 NPC positions update",moved,String(moved));
  }
  const before=player.yaw;document.dispatchEvent(new MouseEvent("mousemove",{movementX:800,clientX:-3000}));
  mark("unlocked cursor no aim drift",before===player.yaw,String(before===player.yaw));
 },1980);
}
if(new URLSearchParams(window.location.search).get("wave15Selftest")==="1"){
 if(!active){started=true;active=true;menu.hidden=true;}
 togglePerspective(true);
 const panel=document.createElement("pre");panel.id="wave15-e2e";
 panel.style.cssText="position:absolute;top:314px;right:5px;z-index:25;background:#0b1913f1;color:#e8ffe6;padding:11px;font:11px/1.36 monospace;min-width:290px;pointer-events:none";
 document.querySelector("#application").appendChild(panel);
 const checks=[],report=(name,ok,value)=>{
  checks.push({name,ok,value:String(value??"")});
  panel.textContent="WAVE15 / REAL 3P PLAY & FPS\n"+
   checks.map(c=>(c.ok?"PASS ":"FAIL ")+c.name+" : "+c.value).join("\n")+
   "\n"+checks.filter(c=>c.ok).length+"/"+checks.length+" PASS";
  root.KarmaWave15Telemetry={checks,pass:checks.filter(c=>c.ok).length,total:checks.length,scene:map.id};
 };
 const perf={frames:0,start:performance.now(),done:false};
 const countFrames=()=>{if(perf.done)return;perf.frames++;requestAnimationFrame(countFrames);};
 requestAnimationFrame(countFrames);
 const bots0=match?.bots?.map(b=>({id:b.id,x:b.x,z:b.z}))||[];
 report("actual 4v4 bot count",bots0.length===7,bots0.length+" bot +1 player");
 report("existing 3P camera activated",thirdPerson,String(thirdPerson));
 report("original UAL 52 bone clips",highRig?.ualBones===52,highRig?.ualBones);
 report("Factory/Castle authored 3D trim",map.blocks.length>(map.id==="factory"?200:110),map.blocks.length+" world objects");
 const fixture={blocks:[{x:0,z:-5,w:3,d:1,h:2,y:0,solid:true}]};
 report("solid cover blocks eye-to-target",!!AA.firstSolidHit(fixture,[0,1.6,0],[0,1.6,-10]),"blocked");
 report("high shots clear 2m low wall",!AA.firstSolidHit(fixture,[0,3.2,0],[0,3.2,-10]),"clear");
 const origin={x:0,z:0,yaw:0,pitch:-.08,eyeHeight:1.65};
 const view=Camera.compute({blocks:[]},origin,true,{distance:6.4});
 const d=[view.target.x-view.eye.x,view.target.y-view.eye.y,view.target.z-view.eye.z];
 const t=(-3-view.eye.z)/d[2],hitPoint=[view.eye.x+d[0]*t,view.eye.y+d[1]*t,view.eye.z+d[2]*t];
 const actor={x:hitPoint[0],z:hitPoint[2],hp:100,alive:true,id:"running_target"};
 const muzzle=[.32,1.35,-.65];
 const shot=A14.trace({map:{blocks:[]},camera:view,muzzle,actors:[actor]});
 report("3m moving target camera hit",shot.kind==="actor",shot.kind);
 actor.x+=3;
 report("moving target exits crosshair",A14.trace({map:{blocks:[]},camera:view,muzzle,actors:[actor]}).kind==="miss","miss");
 actor.x-=3;
 report("moving target reenters sight",A14.trace({map:{blocks:[]},camera:view,muzzle,actors:[actor]}).kind==="actor","hit");
 const ammo0=ammo,sequence0=shotSequence;
 setTimeout(()=>{
  report("photo PBR uploaded to GPU",!!highRig?.photoReady?.(),String(highRig?.photoReady?.()));
  report("3P live camera focus visible",!!root.KarmaWave14Aim,root.KarmaWave14Aim?.kind);
  fireCooldown=0;shoot();
  report("actual game shoot fired",shotSequence===sequence0+1&&ammo===ammo0-1,ammo0+"->"+ammo);
  report("recoil applied to real FPS view",!!root.KarmaWave13Recoil&&root.KarmaWave13Recoil.pitch>0,root.KarmaWave13Recoil?.pitch);
  keys.w=true;
 },680);
 const startX=player.x,startZ=player.z;
 setTimeout(()=>{
  keys.w=false;
  report("player WASD movement collision",Math.hypot(player.x-startX,player.z-startZ)>.15,Math.hypot(player.x-startX,player.z-startZ).toFixed(2)+"m");
  report("CPU bots moved in real game",match?.bots?.some((b,i)=>Math.hypot(b.x-bots0[i].x,b.z-bots0[i].z)>.09),String(match?.bots?.some((b,i)=>Math.hypot(b.x-bots0[i].x,b.z-bots0[i].z)>.09)));
  doReload();
 },1730);
 setTimeout(()=>{
  report("actual magazine reload active",reload>0,String(reload>0));
  report("skinned foregrip IK goal",root.KarmaWave11IK?.active,Number(root.KarmaWave11IK?.error||0).toFixed(3)+"m");
 },2200);
 setTimeout(()=>{
  perf.done=true;const elapsed=(performance.now()-perf.start)/1000,avg=perf.frames/elapsed;
  report("actual Chrome sustained frames",avg>25,avg.toFixed(1)+"fps over "+elapsed.toFixed(1)+"s");
  report("AI 4v4 no invalid score",match?.score.german>=0&&match?.score.soviet>=0,JSON.stringify(match?.score));
  report("player remains within map",S.isWalkable(map,player.x,player.z),player.x.toFixed(2)+","+player.z.toFixed(2));
 },5500);
}
if(new URLSearchParams(window.location.search).get("wave16Selftest")==="1"){
 if(!active){started=true;active=true;menu.hidden=true;}
 togglePerspective(true);
 const panel=document.createElement("pre");panel.id="wave16-e2e";
 panel.style.cssText="position:absolute;top:225px;right:8px;z-index:26;background:#101a18f2;color:#e7ffe5;padding:11px;font:11px/1.37 monospace;max-width:355px;pointer-events:none";
 document.querySelector("#application").appendChild(panel);
 const checks=[],report=(name,ok,value)=>{
  checks.push({name,ok,value:String(value??"")});
  root.KarmaWave16Telemetry={checks,pass:checks.filter(c=>c.ok).length,
   total:checks.length,scene:map.id,kind:"real Chrome runtime + labelled synthetic shot fixtures"};
  panel.textContent="WAVE16 / WORLD-SPACE 3P IMPACT QA\n"+
   checks.map(c=>(c.ok?"PASS ":"FAIL ")+c.name+" : "+c.value).join("\n")+
   "\n"+checks.filter(c=>c.ok).length+"/"+checks.length+" PASS";
 };
 const empty={blocks:[]},p={x:0,z:0,yaw:0,pitch:0,eyeHeight:1.65};
 const view=Camera.compute(empty,p,true,{distance:6.4}),muzzle=[.32,1.35,-.65];
 const coords=d=>{
  const eye=[view.eye.x,view.eye.y,view.eye.z],to=[view.target.x,view.target.y,view.target.z];
  const t=(-d-eye[2])/(to[2]-eye[2]);
  return eye.map((x,i)=>x+(to[i]-x)*t);
 };
 for(const distance of [3,5,15,30]){
  const world=coords(distance),runner={x:world[0],z:world[2],hp:100,alive:true,id:"qa-"+distance,height:2.5};
  const hit=A14.trace({map:empty,camera:view,muzzle,actors:[runner],maxRange:40});
  const deviation=hit.kind==="actor"?A14.screenDeviation(hit.point,view,canvas.clientWidth,canvas.clientHeight,1.25):Infinity;
  report(distance+"m centre ray intersects 3D collider",hit.kind==="actor",hit.kind);
  report(distance+"m projected collider entry",deviation<.5,Number(deviation).toFixed(3)+"px (ray geometry)");
  runner.x+=4;
  report(distance+"m moving actor leaves crosshair",A14.trace({map:empty,camera:view,muzzle,actors:[runner],maxRange:40}).kind==="miss","outside");
 }
 const testPos=coords(5),runner={x:testPos[0],z:testPos[2],hp:100,alive:true,id:"cover-test",height:2.5};
 const block={x:testPos[0],z:-2,w:2,d:.35,h:3,y:0,solid:true};
 report("camera solid cover blocks shot",A14.trace({map:{blocks:[block]},camera:view,muzzle,actors:[runner]}).kind==="cover","world AABB");
 const bots0=match?.bots.map(b=>[b.x,b.z])||[];
 const startAmmo=ammo,startShots=shotSequence,start=performance.now();let frames=0,done=false;
 const count=()=>{if(done)return;frames++;requestAnimationFrame(count);};requestAnimationFrame(count);
 setTimeout(()=>{
  fireCooldown=0;shoot();
  report("real weapon shot sequence",shotSequence===startShots+1&&ammo===startAmmo-1,startAmmo+"->"+ammo);
  report("actual trigger sampled 3D shot",!!root.KarmaWave16Shot,root.KarmaWave16Shot?.kind);
  report("actual impact has world XYZ",root.KarmaWave16Shot?.impact?.length===3,String(root.KarmaWave16Shot?.impact?.length||0));
 },900);
 setTimeout(()=>{
  report("real 4v4 moving AI",match?.bots.some((b,i)=>Math.hypot(b.x-bots0[i][0],b.z-bots0[i][1])>.05),match?.bots.length+" AI slots");
  report("current game is third-person",thirdPerson,String(thirdPerson));
  report("existing UAL source clip joints",highRig?.ualBones===52,highRig?.ualBones);
 },2450);
 setTimeout(()=>{
  done=true;const elapsed=(performance.now()-start)/1000;
  report("real Chrome RAF >25 fps",frames/elapsed>25,(frames/elapsed).toFixed(1)+"fps / "+elapsed.toFixed(1)+"s");
 },5500);
}
// Wave17: real running game's moving 4v4 bot, not a disconnected damage mock.
// Activate only via the explicit QA query flag; never modify ordinary matches.
if(new URLSearchParams(location.search).get("wave17Selftest")==="1"){
 if(!active){started=true;active=true;menu.hidden=true;}
 togglePerspective(true);
 const panel=document.createElement("pre");panel.id="wave17-e2e";
 panel.style.cssText="position:absolute;top:315px;right:8px;z-index:31;background:#051810ed;color:#d2fbd8;padding:10px;font:11px/1.34 monospace;min-width:330px;pointer-events:none";
 document.querySelector("#application").appendChild(panel);
 const checks=[],mark=(name,ok,detail)=>{
  checks.push({name,ok,detail:String(detail??"")});
  root.KarmaWave17QA={scene:map.id,checks,pass:checks.filter(x=>x.ok).length,total:checks.length,
    liveShot:root.KarmaWave16Shot||null,model:root.KarmaWave17Model};
  panel.textContent="WAVE17 / AUTHENTIC CC0 RIG + LIVE 4V4 DAMAGE\n"+
   checks.map(c=>(c.ok?"PASS ":"FAIL ")+c.name+" : "+c.detail).join("\n")+
   "\n"+checks.filter(c=>c.ok).length+"/"+checks.length+" PASS";
 };
 setTimeout(()=>{
  const enemy=match?.bots.find(b=>b.team!==player.team&&b.alive);
  if(!enemy){mark("actual opponent exists",false,"none");return;}
  const old={...player};let candidate=null;
  for(const pitch of [-.12,-.08,-.04])for(let x=-19;x<=19&&!candidate;x+=4)
  for(let z=-18;z<=18&&!candidate;z+=4){
   const p={...player,x,z,yaw:0,pitch,eyeHeight:1.65};
   if(!S.isWalkable(map,x,z))continue;
   const camera=Camera.compute(map,p,true,{distance:6.4});
   if(camera.distance<4.5)continue;
   const a=[camera.eye.x,camera.eye.y,camera.eye.z],b=[camera.target.x,camera.target.y,camera.target.z];
   const t=(z-8-a[2])/(b[2]-a[2]);
   if(t<=0)continue;
   const spot=a.map((v,i)=>v+t*(b[i]-v));
   if(!S.isWalkable(map,spot[0],spot[2])||spot[1]<.45||spot[1]>1.75)continue;
   const testBot={...enemy,x:spot[0],z:spot[2],hp:100,alive:true};
   const probe=A14.trace({map,camera,muzzle:[x+.32,1.35,z-.65],actors:[testBot],maxRange:gun.range});
   if(probe.kind==="actor")candidate={p,camera,spot};
  }
  mark("open real map 8m moving-shot lane",!!candidate,candidate?JSON.stringify(candidate.p.x)+","+candidate.p.z:"unavailable");
  if(!candidate)return;
  Object.assign(player,candidate.p);
  enemy.x=candidate.spot[0];enemy.z=candidate.spot[2];enemy.hp=100;enemy.alive=true;enemy.cooldown=4;
  cameraState=candidate.camera;redraw();
  const beforeMovement=[enemy.x,enemy.z];
  T.update(match,player,.06);
  const moved=Math.hypot(enemy.x-beforeMovement[0],enemy.z-beforeMovement[1]);
  cameraState=candidate.camera;redraw();
  const ray=A14.trace({map,camera:cameraState,muzzle:root.KarmaWave12Aim?.muzzle||[player.x+.32,1.35,player.z-.65],actors:match.bots.filter(b=>b.alive),maxRange:gun.range});
  mark("actual CPU bot moved during simulation",moved>.0001,moved.toFixed(4)+"m");
  mark("real camera ray picks live enemy",ray.kind==="actor"&&ray.actor===enemy,ray.kind+" id="+ray.actor?.id);
  const hp0=enemy.hp,ammo0=ammo,shot0=shotSequence;
  fireCooldown=0;reload=0;shoot();
  const hit=root.KarmaWave16Shot;
  mark("actual trigger ammo & shot",ammo===ammo0-1&&shotSequence===shot0+1,ammo0+"->"+ammo);
  mark("actual enemy HP reduced",enemy.hp<hp0,hp0+"->"+enemy.hp);
  mark("actual hit tracks correct live bot",hit?.hit&&hit?.actorId===enemy.id,String(hit?.actorId));
  mark("real-world impact XYZ",hit?.impact?.length===3,hit?.impact?.map(v=>v.toFixed(3)).join(","));
  mark("reticle projected ray point <1px",hit?.kind==="actor"&&hit.projectedErrorPx<1,hit?.projectedErrorPx);
  // Loading/deserializing 11MB GLB + 5 texture sets may continue past the first
  // 2-second gameplay shot on software WebGL. Inspect loading separately AFTER
  // asynchronous images and GPU uploads settle; never mark transient 0 as final.
  const covered=A14.trace({map:{blocks:[{x:0,z:-2,w:4,d:.3,h:3,y:0,solid:true}]},camera:Camera.compute({blocks:[]},{x:0,z:0,yaw:0,pitch:-.08,eyeHeight:1.65},true),muzzle:[.32,1.35,-.65],actors:[{x:0,z:-5,hp:100,height:2}]});
  mark("3D hard cover blocks projected shot",covered.kind==="cover",covered.kind);
  root.KarmaWave17QA={...root.KarmaWave17QA,liveShot:hit,movingBotId:enemy.id,hpBefore:hp0,hpAfter:enemy.hp,movedMeters:moved,
    model:root.KarmaWave17Model,positionBefore:old};
 },2000);
 setTimeout(()=>{
  mark("authentic CC0 64-bone model loaded",root.KarmaWave17Model?.state==="loaded"&&root.KarmaWave17Model?.joints===64,root.KarmaWave17Model?.state);
  mark("author PBR 5 material sets",root.KarmaWave17Model?.loadedTextures===5,root.KarmaWave17Model?.loadedTextures);
 },6500);
}
requestAnimationFrame(frame);
})(globalThis);
