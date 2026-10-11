/* Wave14: real CSS-camera-centre hit registration with geometry obstruction.
   Tracer starts at gun muzzle and converges to FIRST camera-visible object;
   objects are live per-frame 3D AABBs, moving actor positions not cached.
   Scope: hitscan non-explosive only; no projectile flight time. */
(function(root){"use strict";
 const AA=root.KarmaAimAudit;
 const vsub=(a,b)=>a.map((v,i)=>v-b[i]);
 const add=(a,b)=>a.map((v,i)=>v+b[i]);
 const mul=(a,t)=>a.map(v=>v*t);
 const unit=a=>mul(a,1/(Math.hypot(...a)||1));
 function rayBox(origin,dir,min,max,maxDistance=100){
  let lo=0,hi=maxDistance;
  for(let j=0;j<3;j++){
   if(Math.abs(dir[j])<1e-9){
    if(origin[j]<min[j]||origin[j]>max[j])return null;
    continue;
   }
   let a=(min[j]-origin[j])/dir[j],b=(max[j]-origin[j])/dir[j];
   if(a>b)[a,b]=[b,a];
   lo=Math.max(lo,a);hi=Math.min(hi,b);
   if(lo>hi)return null;
  }
  return lo<=maxDistance?{distance:lo,point:add(origin,mul(dir,lo))}:null;
 }
 function trace({map,camera,muzzle,actors,maxRange=45,actorWidth=.8,actorHeight=1.8}){
  const origin=[camera.eye.x,camera.eye.y,camera.eye.z],dir=unit(vsub([camera.target.x,camera.target.y,camera.target.z],origin));
  const end=add(origin,mul(dir,maxRange+Math.hypot(...vsub(origin,muzzle))));
  let best=null;
  for(const actor of actors){
   if(actor.alive===false||actor.hp<=0)continue;
   const w=actor.width||actorWidth,h=actor.height||actorHeight;
   const min=[actor.x-w/2,actor.baseY||0,actor.z-(actor.depth||w)/2];
   const max=[actor.x+w/2,(actor.baseY||0)+h,actor.z+(actor.depth||w)/2];
   const ray=rayBox(origin,dir,min,max,maxRange+8);
   if(ray&&(!best||ray.distance<best.distance))best={...ray,actor};
  }
  const cover=AA.firstSolidHit(map,origin,end);
  const coverDistance=cover?Math.hypot(...vsub(cover.position,origin)):Infinity;
  if(!best||coverDistance<best.distance-.0001)return {kind:cover?"cover":"miss",cameraPoint:cover?.position??end,
   cameraDistance:coverDistance,actor:null,screenError:0};
  const muzzleDistance=Math.hypot(...vsub(muzzle,best.point));
  const gunCover=AA.firstSolidHit(map,muzzle,best.point);
  return {kind:gunCover?"muzzle-blocked":"actor",actor:gunCover?null:best.actor,point:best.point,
    cameraPoint:best.point,gunCover:gunCover?.position??null,
    muzzleDistance, cameraDistance:best.distance,screenError:0};
 }
 function screenDeviation(worldPoint,camera,width,height,fov){
  const p=AA.project([camera.eye.x,camera.eye.y,camera.eye.z],
   [camera.target.x,camera.target.y,camera.target.z],
   worldPoint,width,height,fov);
  return p.errorPx;
 }
 root.KarmaAim14={rayBox,trace,screenDeviation};
})(globalThis);
