/* KARMA Wave21 — weapon-class differentiated procedural muzzle/tracer/impact VFX.
 * Original authored effect geometry, no downloads, offline, deterministic caps.
 * Separate profile from damage/hitscan; effect positions never determine hits.
 */
(function(root){"use strict";
 const profiles=Object.freeze({
  smg:{flash:.22,sparks:2,dust:3,brass:1,tracer:.33,smoke:.16},
  rifle:{flash:.38,sparks:4,dust:4,brass:1,tracer:.66,smoke:.27},
  sniper:{flash:.50,sparks:5,dust:5,brass:1,tracer:.90,smoke:.33},
  lmg:{flash:.37,sparks:3,dust:3,brass:1,tracer:.58,smoke:.29},
  pistol:{flash:.18,sparks:2,dust:2,brass:1,tracer:.30,smoke:.10},
  launcher:{flash:.72,sparks:9,dust:9,brass:0,tracer:.55,smoke:.70},
  grenade:{flash:.56,sparks:8,dust:8,brass:0,tracer:.10,smoke:.60},
  melee:{flash:0,sparks:1,dust:1,brass:0,tracer:0,smoke:0}
 });
 const MAX_PARTICLES=72;
 // Wave24 visuals from original ChatGPT-created WWII VFX concept references.
 // Materials are derived from VERIFIED game ray hits, never from particle ray
 // guesses. These types only change cosmetics, not damage or collision.
 const impactKinds=Object.freeze({
  metal:{dust:"metalDust",sparks:1.0},
  concrete:{dust:"concreteDust",sparks:.08},
  brick:{dust:"brickDust",sparks:.04},
  wood:{dust:"woodChip",sparks:0},
  fabric:{dust:"fabricDust",sparks:0}
 });
 function impactType(token){
  const kind=String(token||"").toLowerCase();
  if(/container|metal|steel|rust|rail|pipe|tin|lintel|chimney/.test(kind))return "metal";
  if(/brick|factorywall|stone|sandstone|arch|ochre/.test(kind))return "brick";
  if(/wood|crate|plank/.test(kind))return "wood";
  if(/fabric|actor|soldier|body|flesh/.test(kind))return "fabric";
  return "concrete";
 }
 function create(gl=null){
  const particles=[],flashes=[],counters={shots:0,byKind:{},peakParticles:0,expired:0};
  // Camera-facing depth-tested soft particles avoid opaque Minecraft-like
  // smoke/dust cubes. One GPU point draw call regardless of weapon fire rate.
  let pointProgram=null,pointBuffer=null,pointPosition=-1,pointColor=-1,pointSize=-1,pointOpacity=-1,pointProj=null,pointView=null;
  if(gl){
   const vertex=`#version 300 es
precision highp float;
in vec3 aPosition;in vec3 aColor;in float aSize;in float aOpacity;
uniform mat4 uProjection;uniform mat4 uView;
out vec4 vColor;
void main(){
 vec4 eye=uView*vec4(aPosition,1.);
 gl_Position=uProjection*eye;
 gl_PointSize=clamp(aSize*710./max(.45,-eye.z),2.,62.);
 vColor=vec4(aColor,aOpacity);
}`;
   const fragment=`#version 300 es
precision highp float;
in vec4 vColor;out vec4 frag;
void main(){
 vec2 v=gl_PointCoord*2.-1.;
 float r=dot(v,v);
 if(r>=1.)discard;
 float falloff=pow(max(0.,1.-r),1.7);
 frag=vec4(vColor.rgb,vColor.a*falloff);
}`;
   function compile(type,code){const sh=gl.createShader(type);gl.shaderSource(sh,code);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error("VFX shader "+gl.getShaderInfoLog(sh));return sh;}
   pointProgram=gl.createProgram();gl.attachShader(pointProgram,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(pointProgram,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(pointProgram);
   if(!gl.getProgramParameter(pointProgram,gl.LINK_STATUS))throw Error("VFX link "+gl.getProgramInfoLog(pointProgram));
   pointBuffer=gl.createBuffer();
   pointPosition=gl.getAttribLocation(pointProgram,"aPosition");pointColor=gl.getAttribLocation(pointProgram,"aColor");
   pointSize=gl.getAttribLocation(pointProgram,"aSize");pointOpacity=gl.getAttribLocation(pointProgram,"aOpacity");
   pointProj=gl.getUniformLocation(pointProgram,"uProjection");pointView=gl.getUniformLocation(pointProgram,"uView");
  }
  const rand=(seed,k)=>{const x=Math.sin((seed+1)*47.932+k*79.21)*43758.5453;return x-Math.floor(x);};
  function push(p){
   if(particles.length>=MAX_PARTICLES){particles.shift();counters.expired++;}
   particles.push(p);
  }
  function particle(pos,kind,seed,index,life,size,velocity,color){
   push({x:pos[0],y:pos[1],z:pos[2],vx:velocity[0],vy:velocity[1],vz:velocity[2],ttl:life,life,kind,size,material:color,seed,index});
  }
  function fire({gun,muzzle,target,yaw=0,sequence=0,impactAllowed=true,impactMaterial="concrete"}){
   const kind=gun?.kind||"smg",pf=profiles[kind]||profiles.smg;
   const impactName=impactType(impactMaterial),contact=impactKinds[impactName];
   const a=Array.isArray(muzzle)?muzzle:[0,1.4,0],b=Array.isArray(target)?target:[a[0]+Math.sin(yaw)*12,a[1],a[2]-Math.cos(yaw)*12];
   counters.shots++;counters.byKind[kind]=(counters.byKind[kind]||0)+1;
   if(pf.flash>0){
    flashes.push({a:[...a],b:[...b],scale:pf.flash,ttl:.17,life:.17,kind});
    if(flashes.length>5)flashes.shift();
   }
   const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.max(.001,Math.hypot(dx,dy,dz));
   const direct=[dx/len,dy/len,dz/len];
   // Visual-only projectile streak, lasting no more than 0.13s.
   if(pf.tracer>0){
    const end=[a[0]+direct[0]*Math.min(len,Math.max(2,pf.tracer*11)),
      a[1]+direct[1]*Math.min(len,Math.max(2,pf.tracer*11)),
      a[2]+direct[2]*Math.min(len,Math.max(2,pf.tracer*11))];
    push({kind:"tracer",a:[...a],b:end,x:a[0],y:a[1],z:a[2],ttl:.13,life:.13,size:.013,material:"flashCore"});
   }
   const brassOrigin=[a[0]-direct[0]*.65+Math.cos(yaw)*.12,a[1]-.12,a[2]-direct[2]*.65+Math.sin(yaw)*.12];
   for(let i=0;i<pf.brass;i++)particle(brassOrigin,kind,sequence,i,.36,.035,
    [Math.cos(yaw)*1.2+.3,(1.7+rand(sequence,i)*.7),Math.sin(yaw)*1.2+.15],"brass");
   for(let i=0;i<(impactAllowed?Math.round(pf.sparks*contact.sparks):0);i++){
    const k=sequence*11+i,v=rand(k,2)*Math.PI*2,s=.4+rand(k,3)*3;
    particle(b,kind,k,i,.14+rand(k,4)*.24,.014+rand(k,5)*.018,
     [Math.cos(v)*s,Math.sin(v)*s*.3+.9,Math.sin(v)*s],"spark");
   }
   for(let i=0;i<(impactAllowed?Math.min(12,pf.dust+(impactName==="wood"?2:0)):0);i++){
    const k=sequence*19+i,v=rand(k,4)*Math.PI*2,s=.1+rand(k,6)*.55;
    particle(b,kind,k,i,.27+rand(k,7)*.35,.08+rand(k,8)*.05,
     [Math.cos(v)*s,rand(k,5)*.7,Math.sin(v)*s],contact.dust);
   }
   if(pf.smoke>0){
    particle(a,kind,sequence,0,.38+pf.smoke*.28,.10+pf.smoke*.17,
      [direct[0]*.24,.48,direct[2]*.24],"smoke");
   }
   counters.peakParticles=Math.max(counters.peakParticles,particles.length);
   return {kind,flash:pf.flash,count:particles.length,profile:pf,impactType:impactName};
  }
  function step(dt){
   dt=Math.max(0,Math.min(.07,dt));
   for(const p of particles){
    p.ttl-=dt;
    if(p.kind==="tracer")continue;
    p.vy-=(p.material==="brass"?12:p.material==="spark"?8:-.23)*dt;
    p.x+=p.vx*dt;p.y=Math.max(.025,p.y+p.vy*dt);p.z+=p.vz*dt;
    if(p.y<=.027&&p.material==="brass"){p.vx*=.72;p.vz*=.72;p.vy=Math.abs(p.vy)*.19;}
   }
   for(let i=particles.length-1;i>=0;i--)if(particles[i].ttl<=0){particles.splice(i,1);counters.expired++;}
   for(let i=flashes.length-1;i>=0;i--)if((flashes[i].ttl-=dt)<=0)flashes.splice(i,1);
  }
  function draw(out,{pushBox,pushJointLimb}){
   for(const f of flashes){
    const d=[f.b[0]-f.a[0],f.b[1]-f.a[1],f.b[2]-f.a[2]],m=Math.hypot(...d)||1;
    const alpha=f.ttl/f.life,len=f.scale*(.6+alpha*.7),tip=f.a.map((v,i)=>v+d[i]/m*len);
    pushJointLimb(out,f.a,tip,.027+f.scale*.13*alpha,"flashCore");
    const offsets=[[0,1,0],[1,0,0],[0,-1,0],[0,0,-1]];
    for(let i=0;i<offsets.length;i++){
     const o=offsets[i],tail=f.a.map((v,k)=>v+d[k]/m*(len*.72)+o[k]*f.scale*.23*alpha);
     pushJointLimb(out,f.a,tail,.011+f.scale*.023,"spark");
    }
   }
   for(const p of particles){
    if(p.kind==="tracer"){
     pushJointLimb(out,p.a,p.b,p.size*(p.ttl/p.life),"spark");continue;
    }
    if(gl&&p.material!=="brass")continue;
    const alpha=Math.max(.15,p.ttl/p.life),r=p.size*(p.material==="smoke"?(1.25+(1-alpha)*1.25):alpha);
    pushBox(out,{x:p.x,z:p.z,y:p.y-r/2,w:r,d:r,h:r,material:p.material,solid:false});
   }
  }
  function renderGPU(projection,view){
   if(!gl||!pointProgram||!(particles.length||flashes.length))return 0;
   const geometry=[];
    const colors={smoke:[.42,.45,.44],dust:[.61,.57,.51],
      concreteDust:[.73,.72,.68],brickDust:[.72,.35,.22],
      metalDust:[.48,.51,.53],woodChip:[.63,.41,.23],
      fabricDust:[.57,.53,.38],spark:[1.,.74,.29],brass:[.83,.65,.32]};
   function add(x,y,z,c,size,alpha){geometry.push(x,y,z,...c,size,alpha);}
   for(const p of particles){
    if(p.kind==="tracer"||p.material==="brass")continue;
    const f=Math.max(0,p.ttl/p.life);
    const col=colors[p.material]||colors.dust;
    add(p.x,p.y,p.z,col,p.size*(p.material==="smoke"?(3.-f):p.material==="spark"?2.1:2.5),
     (p.material==="spark"?.93:p.material==="smoke"?.43:.67)*f);
   }
   for(const f of flashes)add(f.a[0],f.a[1],f.a[2],[1.,.78,.37],f.scale*1.2,f.ttl/f.life*.76);
   if(!geometry.length)return 0;
   gl.useProgram(pointProgram);gl.bindBuffer(gl.ARRAY_BUFFER,pointBuffer);
   gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(geometry),gl.DYNAMIC_DRAW);
   for(const [loc,size,offset] of [[pointPosition,3,0],[pointColor,3,12],[pointSize,1,24],[pointOpacity,1,28]]){
    if(loc<0)continue;gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,32,offset);
   }
   gl.uniformMatrix4fv(pointProj,false,projection);gl.uniformMatrix4fv(pointView,false,view);
   gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
   gl.drawArrays(gl.POINTS,0,geometry.length/8);
   gl.depthMask(true);gl.disable(gl.BLEND);
   return geometry.length/8;
  }
  return {fire,step,draw,renderGPU,profiles,impactKinds,impactType,MAX_PARTICLES,get active(){return particles.length+flashes.length},get stats(){return {...counters,active:this.active}}};
 }
 root.KarmaWeaponVFX={create,profiles,MAX_PARTICLES};
})(globalThis);
