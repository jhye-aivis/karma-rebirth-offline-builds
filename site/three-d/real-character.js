/* Wave8 — actual third-party Quaternius CC0 glTF skinned humanoid.
 * Offline embedded GLB with 65 joints, weighted four-bone GPU skinning.
 * WWII equipment / team colors are newly-authored game embellishments.
 * No assumption that this superhero base is a period-accurate soldier.
 */
(function(root){"use strict";
const BYTES={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
const CTORS={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
const SIZES={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
const ualPack=root.KarmaUALPacked;
const ualBones=new Map((ualPack?.boneNames||[]).map((name,i)=>[name,i]));
const ualClips={};
if(ualPack){
 for(const [name,clip] of Object.entries(ualPack.clips)){
  const bytes=Uint8Array.from(atob(clip.data),c=>c.charCodeAt(0));
  ualClips[name]={...clip,quats:new Float32Array(bytes.buffer)};
 }
}
function nlerp(a,b,t){
 if(a.reduce((s,x,i)=>s+x*b[i],0)<0)b=b.map(v=>-v);
 const r=a.map((v,i)=>v*(1-t)+b[i]*t),n=Math.hypot(...r)||1;
 return r.map(v=>v/n);
}
function sampleUAL(name,clip,phase){
 const bone=ualBones.get(name);if(bone===undefined)return null;
 const motion=ualClips[clip];if(!motion)return null;
 const framePos=Math.min(motion.frames-1,Math.max(0,
  clip==="death"?phase*ualPack.fps:((phase%motion.duration+motion.duration)%motion.duration)*ualPack.fps));
 const a=Math.floor(framePos),b=Math.min(motion.frames-1,a+1),t=framePos-a,
   stride=ualPack.boneNames.length*4,offset=bone*4;
 return nlerp(Array.from(motion.quats.subarray(a*stride+offset,a*stride+offset+4)),
              Array.from(motion.quats.subarray(b*stride+offset,b*stride+offset+4)),t);
}
function fromEmbedded(external=null){
 const s=root.KarmaCharacterGLBBase64;if(!s&&!external)return null;
 let raw;
 if(external)raw=new Uint8Array(external);
 else {const decoded=atob(s);raw=new Uint8Array(decoded.length);for(let i=0;i<decoded.length;i++)raw[i]=decoded.charCodeAt(i);}
 const buf=raw.buffer,view=new DataView(buf),len=view.getUint32(12,true),json=JSON.parse(new TextDecoder().decode(raw.subarray(20,20+len)).trim());
 const binStart=20+len+8,bin=raw.subarray(binStart);
 if(json.asset?.version!=="2.0"||!json.skins?.length||json.skins[0].joints.length>80)throw Error("Unsupported authored glTF rig");
 function accessor(id){
  const a=json.accessors[id],v=json.bufferViews[a.bufferView],n=SIZES[a.type],bytes=BYTES[a.componentType],stride=v.byteStride||bytes*n;
  if(!n||!bytes||a.sparse)throw Error("Unsupported GLB accessor "+id);
  const dv=new DataView(bin.buffer,bin.byteOffset+v.byteOffset+(a.byteOffset||0),v.byteLength-(a.byteOffset||0));
  const out=new Float32Array(a.count*n);
  for(let row=0;row<a.count;row++)for(let j=0;j<n;j++){
   const off=row*stride+j*bytes;
   let val;
   if(a.componentType===5126)val=dv.getFloat32(off,true);
   else if(a.componentType===5125)val=dv.getUint32(off,true);
   else if(a.componentType===5123)val=dv.getUint16(off,true);
   else if(a.componentType===5121)val=dv.getUint8(off);
   else if(a.componentType===5122)val=dv.getInt16(off,true);
   else val=dv.getInt8(off);
   if(a.normalized&&a.componentType!==5126&&a.componentType!==5125)val/=a.componentType===5121?255:a.componentType===5123?65535:a.componentType===5120?127:32767;
   out[row*n+j]=val;
  }
  return out;
 }
 return {json,accessor,bin};
}
const I=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function matmul(a,b){const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
function qmul(a,b){return [a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];}
const qaxis=(axis,t)=>axis==="x"?[Math.sin(t/2),0,0,Math.cos(t/2)]:axis==="y"?[0,Math.sin(t/2),0,Math.cos(t/2)]:[0,0,Math.sin(t/2),Math.cos(t/2)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const norm3=v=>{const m=Math.hypot(...v)||1;return v.map(x=>x/m);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const qAround=(a,angle)=>[a[0]*Math.sin(angle/2),a[1]*Math.sin(angle/2),a[2]*Math.sin(angle/2),Math.cos(angle/2)];
function trs(t,q,s){
 const [x,y,z,w]=q,[sx,sy,sz]=s;
 return new Float32Array([(1-2*(y*y+z*z))*sx,2*(x*y+z*w)*sx,2*(x*z-y*w)*sx,0,
   2*(x*y-z*w)*sy,(1-2*(x*x+z*z))*sy,2*(y*z+x*w)*sy,0,
   2*(x*z+y*w)*sz,2*(y*z-x*w)*sz,(1-2*(x*x+y*y))*sz,0,
   t[0],t[1],t[2],1]);
}
function create(gl,options={}){
 const period=!!options.raw,doc=fromEmbedded(options.raw||null);if(!doc)return null;
 const {json,accessor,bin}=doc,skin=json.skins[0],joints=skin.joints;
 if(joints.length>65)throw Error("Wave17 artist rig exceeds 65 GPU matrix capacity");
 const inverses=accessor(skin.inverseBindMatrices);
 const parent=new Map();json.nodes.forEach((node,i)=>node.children?.forEach(ch=>parent.set(ch,i)));
 const nameToId=new Map(json.nodes.map((node,i)=>[node.name,i]));
 const retarget=period?root.KarmaPanzerUALBasis:null;
 if(period&&!retarget)throw Error("Wave17 requires verified Mixamo/UAL1 bind basis map");
 if(period)for(const [artist,ual] of Object.entries(retarget.aliases)){
  const found=nameToId.get(artist);if(found!==undefined)nameToId.set(ual,found);
 }
 const canonical=name=>period?(retarget.aliases[name]||name):name;
 const renderMesh=[];
 for(const mesh of json.meshes)for(const primitive of mesh.primitives){
   const a=primitive.attributes;
   if(a.POSITION===undefined||a.JOINTS_0===undefined)continue;
   const pos=accessor(a.POSITION),normal=accessor(a.NORMAL),joint=accessor(a.JOINTS_0),weight=accessor(a.WEIGHTS_0),idx=accessor(primitive.indices);
   const uv=a.TEXCOORD_0!==undefined?accessor(a.TEXCOORD_0):null;
   const stride=16,data=new Float32Array(pos.length/3*stride);
   for(let k=0;k<pos.length/3;k++){
     let off=k*stride;
     for(let v=0;v<3;v++)data[off+v]=pos[k*3+v];
     for(let v=0;v<3;v++)data[off+3+v]=normal[k*3+v];
     for(let v=0;v<4;v++){data[off+6+v]=joint[k*4+v];data[off+10+v]=weight[k*4+v];}
     data[off+14]=uv?uv[k*2]:0;data[off+15]=uv?uv[k*2+1]:0;
   }
   const gpu=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,gpu);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
   const ebo=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ebo);
   const max=Math.max(...idx),indices=max>65535?new Uint32Array(idx):new Uint16Array(idx);
   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
   renderMesh.push({gpu,ebo,count:idx.length,type:max>65535?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT,material:primitive.material??0});
 }
 const vs=`#version 300 es
 precision highp float;
 in vec3 aPosition;in vec3 aNormal;in vec4 aJoint;in vec4 aWeight;in vec2 aUV;
 uniform mat4 uBones[65];uniform mat4 uProjection;uniform mat4 uView;
  uniform vec3 uWorld;uniform vec2 uFacing;uniform float uModelScale;
 out vec3 vNormal;out vec3 vPosition;out vec3 vBody;out vec2 vUV;
 void main(){
  mat4 sk=uBones[int(aJoint.x)]*aWeight.x+uBones[int(aJoint.y)]*aWeight.y+uBones[int(aJoint.z)]*aWeight.z+uBones[int(aJoint.w)]*aWeight.w;
  vec4 p=sk*vec4(aPosition,1.);p.xyz*=uModelScale;
  vec3 n=normalize(mat3(sk)*aNormal);
  vec3 world=vec3(p.x*uFacing.x-p.z*uFacing.y,p.y,p.x*uFacing.y+p.z*uFacing.x)+uWorld;
  vNormal=normalize(vec3(n.x*uFacing.x-n.z*uFacing.y,n.y,n.x*uFacing.y+n.z*uFacing.x));
  vPosition=world;vBody=p.xyz;vUV=aUV;gl_Position=uProjection*uView*vec4(world,1.);
 }`;
 const fs=`#version 300 es
 precision highp float;
 in vec3 vNormal;in vec3 vPosition;in vec3 vBody;in vec2 vUV;
 uniform vec3 uTint;uniform vec3 uLight;
 uniform sampler2D uFabricAlbedo;uniform sampler2D uFabricNormal;uniform sampler2D uFabricORM;
 uniform float uFabricReady;uniform float uPhotoReady;
  uniform sampler2D uArtistAlbedo;uniform sampler2D uArtistNormal;uniform sampler2D uArtistMR;
  uniform float uArtistReady;
 out vec4 color;
 void main(){
  vec3 sampledNormal=texture(uFabricNormal,vUV*4.).rgb*2.-1.;
  vec3 n=normalize(vNormal+sampledNormal*.09*uFabricReady),l=normalize(vec3(.46,1.,.37));
  float lambert=max(dot(n,l),0.);
  vec3 viewDir=normalize(uLight-vPosition),h=normalize(l+viewDir);
  float spec=pow(max(dot(n,h),0.),22.)*.12;
  // Keep the jacket over the shoulders. Only face/neck and exposed hands
  // receive skin tones; Wave8 tinted the torso skin and looked shirtless.
  float skin=step(1.59,vBody.y)*(1.-step(.27,abs(vBody.x)));
  skin+=step(.53,abs(vBody.x))*step(.68,vBody.y)*(1.-step(1.41,vBody.y));
  skin=clamp(skin,0.,1.);
  float boot=1.-step(.23,vBody.y);
  float noise=fract(sin(dot(floor(vBody.xz*16.+vBody.y*vec2(7.,13.)),vec2(129.6,317.7)))*43758.5);
  vec3 fabricColor=texture(uFabricAlbedo,vUV*4.).rgb;
  vec3 cloth=mix(uTint*(.89+.17*noise),fabricColor,uFabricReady);
  // Real 2048px photographed ambientCG CC0 fabric, tinted per German/Soviet
  // period-inspired hue. Distinct from PBR scanned military uniform MESH.
  cloth=mix(cloth,fabricColor*uTint*1.95,uPhotoReady);
  vec3 epidermis=vec3(.62,.46,.33);
  vec3 albedo=mix(cloth,epidermis,skin);
  albedo=mix(albedo,vec3(.13,.14,.12),boot);
  // Source-authored high-resolution CC0 uniform/helmet/gear PBR, not procedural cloth.
  if(uArtistReady>.5){
   vec3 srcAlbedo=texture(uArtistAlbedo,vUV).rgb;
   vec3 srcN=texture(uArtistNormal,vUV).rgb*2.-1.;
   vec3 dp1=dFdx(vPosition),dp2=dFdy(vPosition);
   vec2 dt1=dFdx(vUV),dt2=dFdy(vUV);
   vec3 tangent=normalize(dp1*dt2.y-dp2*dt1.y);
   vec3 bitangent=normalize(-dp1*dt2.x+dp2*dt1.x);
   vec3 mapped=normalize(mat3(tangent,bitangent,normalize(vNormal))*srcN);
   float artistRough=clamp(texture(uArtistMR,vUV).g,.12,1.);
   float lit=max(dot(mapped,l),0.);
   color=vec4(pow(srcAlbedo*(.28+.72*lit)+vec3(.035)*(1.-artistRough),vec3(.88)),1.);
   return;
  }
  vec3 orm=texture(uFabricORM,vUV*4.).rgb;
  float rough=mix(.85,orm.g,uFabricReady);
  float metallic=mix(0.,orm.b,uFabricReady*(1.-uPhotoReady));
  float F0=mix(.04,.25,metallic);
  float NdotH=max(dot(n,h),0.),alpha=rough*rough;
  float D=alpha*alpha/(3.14159*pow(max(.001,NdotH*NdotH*(alpha*alpha-1.)+1.),2.));
  float F=F0+(1.-F0)*pow(1.-max(dot(h,viewDir),0.),5.);
  albedo=albedo*(.32+lambert*.75)+(F*D*.14)+spec*.2;
  color=vec4(pow(albedo,vec3(.86)),1.);
 }`;
 function shader(kind,s){const o=gl.createShader(kind);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw Error("CC0 rig shader "+gl.getShaderInfoLog(o));return o;}
 const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 const attrs={position:gl.getAttribLocation(program,"aPosition"),normal:gl.getAttribLocation(program,"aNormal"),joints:gl.getAttribLocation(program,"aJoint"),weights:gl.getAttribLocation(program,"aWeight"),uv:gl.getAttribLocation(program,"aUV")};
 const uni=Object.fromEntries(["uBones[0]","uProjection","uView","uWorld","uFacing","uModelScale","uTint","uLight","uFabricAlbedo","uFabricNormal","uFabricORM","uFabricReady","uPhotoReady","uArtistAlbedo","uArtistNormal","uArtistMR","uArtistReady"].map(n=>[n,gl.getUniformLocation(program,n)]));
 const fabric={german:null,soviet:null,normal:null,orm:null,ready:{}};
 const photo={albedo:null,normal:null,roughness:null,ready:{}};
 const artistTextureState=new Map();
 function artistTexture(index){
  if(index===undefined)return null;
  if(artistTextureState.has(index))return artistTextureState.get(index);
  const texInfo=json.textures?.[index],img=json.images?.[texInfo?.source];
  if(!img||img.bufferView===undefined) return null;
  const buf=json.bufferViews[img.bufferView],slice=bin.slice(buf.byteOffset||0,(buf.byteOffset||0)+buf.byteLength);
  const texture=gl.createTexture(),info={texture,ready:false};
  artistTextureState.set(index,info);
  gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([150,145,135,255]));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
  const uri=URL.createObjectURL(new Blob([slice],{type:img.mimeType||"image/png"})),picture=new Image();
  picture.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,picture);gl.generateMipmap(gl.TEXTURE_2D);info.ready=true;URL.revokeObjectURL(uri);};
  picture.onerror=()=>URL.revokeObjectURL(uri);picture.src=uri;return info;
 }
 const artistMaterials=period?(json.materials||[]).map(m=>({
  base:artistTexture(m.pbrMetallicRoughness?.baseColorTexture?.index),
  normal:artistTexture(m.normalTexture?.index),
  mr:artistTexture(m.pbrMetallicRoughness?.metallicRoughnessTexture?.index)
 })):[];
 function makeTexture(key,source=root.KarmaWW2PBR?.[key],status=fabric.ready){
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([160,165,148,255]));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
  const img=new Image();
  img.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.generateMipmap(gl.TEXTURE_2D);status[key]=true;};
  img.src=source||"";
  return texture;
 }
 for(const key of ["german","soviet","normal","orm"])fabric[key]=makeTexture(key);
 for(const key of ["albedo","normal","roughness"])photo[key]=makeTexture(key,root.KarmaWW2Photo?.[key],photo.ready);
 let leftIK=new Map(),lastIK={enabled:false,error:Infinity,iterations:0};
 function matrixAt(id,phase,clip,cache){
  if(cache.has(id))return cache.get(id);
  const node=json.nodes[id],name=canonical(node.name);
  let t=node.translation||[0,0,0],q=node.rotation||[0,0,0,1],s=node.scale||[1,1,1];
  const swing=Math.sin(phase*(clip==="run"?12:6));
  const walking=clip==="walk"||clip==="run",strength=clip==="run"?.7:.36;
  const left=name.endsWith("_l"),right=name.endsWith("_r"),upperArm=name.startsWith("upperarm_"),lowerArm=name.startsWith("lowerarm_");
  // Actual 2025-06 Quaternius UAL1 Standard sampled motion: transform each
  // source quaternion relative to its source rest pose, then apply the delta
  // in the Wave8 CC0 target skeleton's LOCAL joint basis.
  const activeClip=(clip==="idle"||walking)&&/upperarm|lowerarm|hand_|clavicle/.test(name)?"aim":clip;
  const relative=sampleUAL(name,activeClip,phase);
  if(relative){
   const basis=period?retarget.basis[name]:null;
   const localDelta=basis?qmul(qmul(basis,relative),[-basis[0],-basis[1],-basis[2],basis[3]]):relative;
   q=qmul(q,localDelta);
  }
  else{
  if(upperArm){
   // Bring the source T-pose down first and then rotate forward into a two-hand
   // shoulder-fired stance. One axis alone kept both hands at the character side.
   let down=left?-1.18:1.18,forward=-1.06;
   if(walking){down+=(left?1:-1)*swing*strength*.08;forward+=(left?1:-1)*swing*strength*.13;}
   if(clip==="shoot"){down=left?-1.47:1.47;forward=-1.64;}
   if(clip==="reload"){down=left?-1.43:1.25;forward=left?-1.91:-1.37;}
   if(clip==="crouch")forward=-.94;
   if(clip==="death"){down=left?-1.35:1.35;forward=.32;}
   q=qmul(q,qaxis("z",down));q=qmul(q,qaxis("x",forward));
  }else if(lowerArm){
   let bend=clip==="reload"&&left?-1.18:-.67;
   if(clip==="shoot")bend=-.38;
   if(clip==="death")bend=.15;
   q=qmul(q,qaxis("x",bend));
  }
  if(walking){
    if(name==="thigh_l"||name==="thigh_r")q=qmul(q,qaxis("x",(left?1:-1)*swing*strength));
    if(name==="calf_l"||name==="calf_r")q=qmul(q,qaxis("x",Math.max(0,(left?-1:1)*swing)*strength*.8));
  }else if(clip==="death"&&name==="pelvis")q=qmul(q,qaxis("x",.9));
  else if(clip==="crouch"&&(name==="thigh_l"||name==="thigh_r"))q=qmul(q,qaxis("x",.9));
  }
  if(name==="root"&&clip==="crouch")t=[t[0],t[1]-.37,t[2]];
  if(name==="root"&&clip==="death")t=[t[0],t[1]-.76,t[2]];
  // Actual skinned finger phalanges curled around trigger and supporting grip.
  // Source UAL pistol motion + additive digital flexion, not true finger IK.
  if(/^(index|middle|ring|pinky|thumb)_0[1-3]_[lr]$/.test(name)&&clip!=="death"){
    const curl=(clip==="shoot"?.37:clip==="reload"?.18:.26)*(name.startsWith("thumb")?.6:1);
    q=qmul(q,qaxis("x",(name.endsWith("_l")?-1:1)*curl));
  }
  if(leftIK.has(id))q=qmul(q,leftIK.get(id));
  const local=node.matrix?new Float32Array(node.matrix):trs(t,q,s),parentId=parent.get(id);
  const world=parentId!==undefined?matmul(matrixAt(parentId,phase,clip,cache),local):local;
  cache.set(id,world);return world;
 }
 const palettes=new Float32Array(65*16),modelScale=period?.02:1;
 function setLeftGrip({target,x,z,angle,phase,clip}){
  leftIK=new Map();
  if(!target||clip==="death"){lastIK={enabled:false,error:Infinity,iterations:0};return lastIK;}
  const co=-Math.cos(angle),si=-Math.sin(angle),dx=target[0]-x,dz=target[2]-z;
  const goal=[(co*dx+si*dz)/modelScale,target[1]/modelScale,(-si*dx+co*dz)/modelScale];
  const hand=nameToId.get("hand_l"),elbow=nameToId.get("lowerarm_l"),
    shoulder=nameToId.get("upperarm_l"),clavicle=nameToId.get("clavicle_l");
  if([hand,elbow,shoulder,clavicle].some(id=>id===undefined))return lastIK;
  const point=(id,cache)=>{const m=matrixAt(id,phase,clip,cache);return [m[12],m[13],m[14]];};
  const initial=Math.hypot(...sub(point(hand,new Map()),goal));
  const shoulderPos=point(shoulder,new Map());
  let error=Infinity,n=0;
  // CCD local quaternion IK: rotate forearm and upperarm to keep hand_l on
  // the real 3D weapon foregrip while preserving 52-bone UAL animation.
  for(;n<12;n++){
   for(const id of [elbow,shoulder,clavicle]){
    const cache=new Map(),pivot=point(id,cache),end=point(hand,cache),
     current=norm3(sub(end,pivot)),desired=norm3(sub(goal,pivot)),
     axisWorld=cross(current,desired),mag=Math.hypot(...axisWorld);
    if(mag<1e-7)continue;
    const theta=Math.min(.38,Math.atan2(mag,clamp(dot(current,desired),-1,1))*.76);
    const m=cache.get(id),axis=axisWorld.map(v=>v/mag);
    const localAxis=norm3([
      dot([m[0],m[1],m[2]],axis)/Math.hypot(m[0],m[1],m[2]),
      dot([m[4],m[5],m[6]],axis)/Math.hypot(m[4],m[5],m[6]),
      dot([m[8],m[9],m[10]],axis)/Math.hypot(m[8],m[9],m[10])
    ]);
    leftIK.set(id,qmul(leftIK.get(id)||[0,0,0,1],qAround(localAxis,theta)));
   }
   error=Math.hypot(...sub(point(hand,new Map()),goal));
   if(error<.02/modelScale)break;
  }
  lastIK={enabled:true,error:error*modelScale,initial:initial*modelScale,iterations:n+1,shoulderDistance:Math.hypot(...sub(goal,shoulderPos))*modelScale};
  return lastIK;
 }
 function pose(phase,clip){
  const cache=new Map();
  for(let j=0;j<joints.length;j++){
   const world=matrixAt(joints[j],phase,clip,cache);
   const inverse=inverses.subarray(j*16,(j+1)*16),current=matmul(world,inverse);
   palettes.set(current,j*16);
  }
  return palettes;
 }
 function jointPoint(name,phase,clip,x,z,angle){
  const id=nameToId.get(name);
  if(id===undefined)throw Error("Unknown CC0 joint: "+name);
  const m=matrixAt(id,phase,clip,new Map()),co=-Math.cos(angle),si=-Math.sin(angle);
  return [x+(m[12]*co-m[14]*si)*modelScale,m[13]*modelScale,z+(m[12]*si+m[14]*co)*modelScale];
 }
 function render({x,z,angle=0,phase=0,clip="idle",team="german",projection,view}){
  gl.useProgram(program);
  gl.uniformMatrix4fv(uni["uBones[0]"],false,pose(phase,clip));
  gl.uniformMatrix4fv(uni.uProjection,false,projection);
  gl.uniformMatrix4fv(uni.uView,false,view);
  gl.uniform3f(uni.uWorld,x,0,z);
  gl.uniform1f(uni.uModelScale,modelScale);
  // CC0 model faces +Z in its original GLB basis; the FPS world faces -Z at yaw=0.
  // Rotate by PI so 3P shows the soldier's back, and weapon/reticle align with yaw.
  gl.uniform2f(uni.uFacing,-Math.cos(angle),-Math.sin(angle));
  gl.uniform3f(uni.uTint,...(team==="german"?[.46,.52,.45]:[.55,.46,.37]));
  gl.uniform3f(uni.uLight,x+3,4,z+7);
  const photoReady=!!(photo.ready.albedo&&photo.ready.normal&&photo.ready.roughness);
  for(const [unit,original,photokey] of [[1,team==="german"?"german":"soviet","albedo"],[2,"normal","normal"],[3,"orm","roughness"]]){
   gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,photoReady?photo[photokey]:fabric[original]);
  }
  gl.uniform1i(uni.uFabricAlbedo,1);gl.uniform1i(uni.uFabricNormal,2);gl.uniform1i(uni.uFabricORM,3);
  gl.uniform1f(uni.uFabricReady,Number(photoReady||!!(fabric.ready[team]&&fabric.ready.normal&&fabric.ready.orm)));
  gl.uniform1f(uni.uPhotoReady,Number(photoReady));
  for(const m of renderMesh){
   const skin=artistMaterials[m.material];
   if(period&&skin){
    for(const [unit,info] of [[4,skin.base],[5,skin.normal],[6,skin.mr]]){
     gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,info?.texture||null);
    }
    gl.uniform1i(uni.uArtistAlbedo,4);gl.uniform1i(uni.uArtistNormal,5);gl.uniform1i(uni.uArtistMR,6);
    gl.uniform1f(uni.uArtistReady,Number(!!(skin.base?.ready&&skin.normal?.ready&&skin.mr?.ready)));
   }else gl.uniform1f(uni.uArtistReady,0);
   gl.bindBuffer(gl.ARRAY_BUFFER,m.gpu);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.ebo);
   for(const [loc,size,offset] of [[attrs.position,3,0],[attrs.normal,3,12],[attrs.joints,4,24],[attrs.weights,4,40],[attrs.uv,2,56]]){
    if(loc<0)continue;gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,64,offset);
   }
   gl.drawElements(gl.TRIANGLES,m.count,m.type,0);
  }
 }
 return {render,jointPoint,setLeftGrip,getIK:()=>lastIK,period,artistMaterialsReady:()=>artistMaterials.filter(m=>m.base?.ready&&m.normal?.ready&&m.mr?.ready).length,photoReady:()=>!!(photo.ready.albedo&&photo.ready.normal&&photo.ready.roughness),ualClips:Object.keys(ualClips),ualBones:ualBones.size,
   fabricReady:team=>!!(fabric.ready[team]&&fabric.ready.normal&&fabric.ready.orm),
   source:period?"Britdawgmasterfunk CC0 WW2 Panzergrenadier 64-joint Mixamo with UAL1 basis retarget":"Quaternius Universal Base Characters 65-bone + real UAL1 Standard CC0 animation retarget",joints:joints.length,meshCount:renderMesh.length,triangles:renderMesh.reduce((a,m)=>a+m.count/3,0)};
}
root.KarmaHighRig={create,loaded:!!root.KarmaCharacterGLBBase64};
})(globalThis);
