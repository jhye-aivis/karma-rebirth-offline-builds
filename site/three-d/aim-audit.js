/* Wave13 physically-measured aiming QA and solid-cover physics, offline.
 * This module deals in ACTUAL CSS-pixel projection, eye/muzzle world rays,
 * axis-aligned block geometry. No false "zero pixels by construction" claim.
 * All coordinates are game meters, yaw/pitch in radians, FOV vertical in radians.
 */
(function(root){"use strict";
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const plus=(a,b)=>a.map((v,i)=>v+b[i]);
const scale=(a,t)=>a.map(v=>v*t);
const norm=a=>scale(a,1/(Math.hypot(...a)||1));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function playerAim(p,horizontalDistance){
 const yaw=p.yaw||0,pitch=p.pitch||0,r=horizontalDistance;
 return [p.x+Math.sin(yaw)*r,(p.eyeHeight||1.65)+Math.tan(pitch)*r,p.z-Math.cos(yaw)*r];
}
function project(eye,target,world,width,height,fov=1.25){
 const f=norm(sub(target,eye)),right=norm(cross(f,[0,1,0])),up=norm(cross(right,f));
 const v=sub(world,eye),depth=dot(v,f);
 if(depth<=.0001)return {visible:false,depth,pixelX:NaN,pixelY:NaN,errorPx:Infinity};
 const focal=height/(2*Math.tan(fov/2));
 const pixelX=width/2+focal*dot(v,right)/depth,pixelY=height/2-focal*dot(v,up)/depth;
 return {visible:true,depth,pixelX,pixelY,errorPx:Math.hypot(pixelX-width/2,pixelY-height/2)};
}
function firstSolidHit(map,origin,end,extra=.0){
 const ray=sub(end,origin);let best=null;
 for(const box of map.blocks||[]){
  if(!box.solid)continue;
  const lo=[box.x-box.w/2-extra,(box.y||0)-extra,box.z-box.d/2-extra];
  const hi=[box.x+box.w/2+extra,(box.y||0)+box.h+extra,box.z+box.d/2+extra];
  let tmin=0,tmax=1;
  for(let i=0;i<3;i++){
   if(Math.abs(ray[i])<1e-9){
    if(origin[i]<lo[i]||origin[i]>hi[i]){tmin=2;break;}
   }else{
    let ta=(lo[i]-origin[i])/ray[i],tb=(hi[i]-origin[i])/ray[i];
    if(ta>tb)[ta,tb]=[tb,ta];
    tmin=Math.max(tmin,ta);tmax=Math.min(tmax,tb);
    if(tmin>tmax)break;
   }
  }
  if(tmin>=0&&tmin<=1&&tmin<=tmax&&(!best||tmin<best.t)){
   best={t:tmin,material:box.material,position:plus(origin,scale(ray,tmin))};
  }
 }
 return best;
}
function report(map,player,camera,muzzle,width=1200,height=675,fov=1.25,distances=[3,5,15,30]){
 const eye=[camera.eye.x,camera.eye.y,camera.eye.z],target=[camera.target.x,camera.target.y,camera.target.z];
 const playerEye=[player.x,player.eyeHeight||1.65,player.z];
 return distances.map(d=>{
  const aim=playerAim(player,d),p=project(eye,target,aim,width,height,fov);
  return {distance:d,pixelError:p.errorPx,pixelX:p.pixelX,pixelY:p.pixelY,
    eyeCover:!!firstSolidHit(map,playerEye,aim),
    muzzleCover:!!firstSolidHit(map,muzzle,aim),
    cameraCover:!!firstSolidHit(map,eye,aim),
    cameraDepth:p.depth,
    physicalMuzzleOffset:Math.hypot(...sub(muzzle,playerEye))};
 });
}
root.KarmaAimAudit={playerAim,project,firstSolidHit,report};
})(globalThis);
