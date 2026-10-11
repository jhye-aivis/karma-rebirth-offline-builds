/* Authored low-poly 2-weight GPU-skinned character, actual WebGL2 vertex skinning.
 * Bind positions + two nearest joint ids and weights, shader morphs a continuous tube between joints.
 * Not a high-poly imported/texture-painted GLTF asset. No external resources.
 */
(function(root){"use strict";
const rig=root.KarmaRig,rest=rig.pose(0,0,{x:0,z:0},"german","idle");
const jointIndex=Object.fromEntries(rig.joints.map((name,i)=>[name,i]));
const palette={uniform:[.38,.44,.39],skin:[.69,.54,.42],helmet:[.24,.31,.28],boot:[.18,.20,.17]};
function getBody(){
 const vertices=[];
 function norm(a){const length=Math.hypot(...a)||1;return a.map(x=>x/length)}
 function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
 for(const bone of rest.connections){
  const from=rig.joints.find(name=>rest.nodes[name].world.join(",")===bone.from.join(","));
  const to=rig.joints.find(name=>rest.nodes[name].world.join(",")===bone.to.join(","));
  if(!from||!to)continue;
  const a=bone.from,b=bone.to,axis=norm(b.map((v,i)=>v-a[i]));
  const v=norm(cross(axis,Math.abs(axis[1])>.91?[0,0,1]:[0,1,0])),w=norm(cross(axis,v));
  const material=bone.material==="skin"?"skin":bone.material==="boot"?"boot":bone.material==="helmetAxis"||bone.material==="helmetUSSR"?"helmet":"uniform";
  const color=palette[material],b0=jointIndex[from],b1=jointIndex[to];
  function vert(t,angle){
   const normal=v.map((n,i)=>n*Math.cos(angle)+w[i]*Math.sin(angle));
   const pos=a.map((n,i)=>n+(b[i]-a[i])*t+normal[i]*bone.r);
   return [...pos,...color,...normal,b0,b1,t];
  }
  const segments=10;
  for(let section=0;section<2;section++){
   const t0=section/2,t1=(section+1)/2;
   for(let i=0;i<segments;i++){
    const p=i*Math.PI*2/segments,q=(i+1)*Math.PI*2/segments;
    vertices.push(...vert(t0,p),...vert(t0,q),...vert(t1,q),...vert(t0,p),...vert(t1,q),...vert(t1,p));
   }
  }
 }
 return new Float32Array(vertices);
}
const VERTEX_COUNT=getBody().length/12;
function create(gl){
 const VS=`#version 300 es
 precision highp float;
 in vec3 aPosition;
 in vec3 aColor;
 in vec3 aNormal;
 in vec2 aBones;
 in float aMix;
 uniform vec3 uShift[17];
 uniform vec2 uLocation;
 uniform vec2 uTurn;
 uniform vec3 uTint;
 uniform mat4 uProjection;
 uniform mat4 uView;
 uniform mat4 uLightViewProj;
 out vec3 vColor;
 out vec3 vNormal;
 out float vRange;
 out vec4 vLight;
 void main(){
  vec3 p=aPosition+mix(uShift[int(aBones.x)],uShift[int(aBones.y)],aMix);
  p=vec3(p.x*uTurn.x-p.z*uTurn.y+uLocation.x,p.y,p.x*uTurn.y+p.z*uTurn.x+uLocation.y);
  vec3 n=vec3(aNormal.x*uTurn.x-aNormal.z*uTurn.y,aNormal.y,aNormal.x*uTurn.y+aNormal.z*uTurn.x);
  vec4 c=uView*vec4(p,1.);
  gl_Position=uProjection*c;vRange=length(c.xyz);vColor=aColor*uTint;vNormal=n;vLight=uLightViewProj*vec4(p,1.);
 }`;
 const FS=`#version 300 es
 precision highp float;
 in vec3 vColor;in vec3 vNormal;in float vRange;in vec4 vLight;
 uniform sampler2D uShadow;
 uniform vec3 uFog;
 out vec4 frag;
 void main(){
  float light=max(dot(normalize(vNormal),normalize(vec3(.55,1.,.4))),0.);
  vec3 uv=vLight.xyz/max(.0001,vLight.w)*.5+.5;float shadow=0.;
  if(uv.x>0.&&uv.x<1.&&uv.y>0.&&uv.y<1.&&uv.z>0.&&uv.z<1.){
   float depth=texture(uShadow,uv.xy).r;shadow=uv.z-.005>depth?.65:0.;
  }
  vec3 albedo=vColor*(.4+(1.-shadow)*light*.8);
  frag=vec4(mix(albedo,uFog,clamp((vRange-18.)/70.,0.,.65)),1.);
 }`;
 const DVS=VS.replace("gl_Position=uProjection*c;","gl_Position=uLightViewProj*vec4(p,1.);");
 const DFS=`#version 300 es
 precision highp float;
 void main(){}`;
 function shader(kind,src){const s=gl.createShader(kind);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error("skin shader "+gl.getShaderInfoLog(s));return s;}
 function program(v,f){const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,v));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;}
 const main=program(VS,FS),depth=program(DVS,DFS);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,getBody(),gl.STATIC_DRAW);
 function uniform(p,name){return gl.getUniformLocation(p,name)}
 function render(bots,camera,lightVP,shadowTex,onlyDepth,viewer=null){
  if(!bots||bots.length===0)return;
  const p=onlyDepth?depth:main;
  gl.useProgram(p);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  const specs=[["aPosition",3,0],["aColor",3,12],["aNormal",3,24],["aBones",2,36],["aMix",1,44]];
  for(const [name,size,offset] of specs){
   const attr=gl.getAttribLocation(p,name);if(attr<0)continue;
   gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,size,gl.FLOAT,false,48,offset);
  }
  const uShift=uniform(p,"uShift[0]"),uLocation=uniform(p,"uLocation"),uTurn=uniform(p,"uTurn"),
   uTint=uniform(p,"uTint"),uProj=uniform(p,"uProjection"),uView=uniform(p,"uView"),uLight=uniform(p,"uLightViewProj"),uShadow=uniform(p,"uShadow"),uFog=uniform(p,"uFog");
  if(!onlyDepth&&camera){if(uProj)gl.uniformMatrix4fv(uProj,false,camera.projection);if(uView)gl.uniformMatrix4fv(uView,false,camera.view);}
  if(uLight)gl.uniformMatrix4fv(uLight,false,lightVP);
  if(!onlyDepth){
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,shadowTex);
   if(uShadow)gl.uniform1i(uShadow,0);
   if(uFog)gl.uniform3f(uFog,.49,.53,.47);
  }
  for(const b of bots){
   if(!b.alive&&b.respawn<=.2)continue;
   // Prevent first-person near-plane clipping into an allied soldier's body at spawn.
   if(!onlyDepth&&viewer&&Math.hypot(b.x-viewer.x,b.z-viewer.z)<2.9)continue;
   const state=b.alive?(b.reloading?"reload":b.shotTimer>0?"shoot":b.speed>3?"run":b.speed>.1?"walk":"idle"):"death";
   const animated=rig.pose(b.anim||0,0,{x:0,z:0},b.team,state);
   const shifts=[];
   for(const j of rig.joints){const anim=animated.nodes[j].local,base=rest.nodes[j].local;shifts.push(anim[0]-base[0],anim[1]-base[1],anim[2]-base[2]);}
   if(uShift)gl.uniform3fv(uShift,new Float32Array(shifts));
   if(uLocation)gl.uniform2f(uLocation,b.x,b.z);
   if(uTurn)gl.uniform2f(uTurn,Math.cos(b.angle||0),Math.sin(b.angle||0));
   if(uTint)gl.uniform3f(uTint,...(b.team==="german"?[1,1,1]:[1.2,.83,.72]));
   gl.drawArrays(gl.TRIANGLES,0,VERTEX_COUNT);
  }
 }
 return {render,vertexCount:VERTEX_COUNT,method:"two-joint GPU weighted vertex skinning, local translation offsets (without full bone rotation matrices)"};
}
root.KarmaSkinned={create,vertexCount:VERTEX_COUNT};
})(globalThis);
