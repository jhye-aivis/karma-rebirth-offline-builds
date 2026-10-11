/* Wave7: self-authored over-the-shoulder camera.
 * 1P remains unchanged. Third-person camera is occlusion tested against authored solid blocks.
 * Camera does not change physical player position or hitscan origin.
 */
(function(root){"use strict";
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function hits(map,a,b){
 const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;
 const length=Math.hypot(dx,dy,dz),steps=Math.max(8,Math.ceil(length/.15));
 for(let i=1;i<=steps;i++){
  const t=i/steps,x=a.x+dx*t,y=a.y+dy*t,z=a.z+dz*t;
  for(const box of map.blocks){
   if(!box.solid)continue;
   const low=box.y||0;
   if(x>box.x-box.w/2-.17&&x<box.x+box.w/2+.17&&z>box.z-box.d/2-.17&&z<box.z+box.d/2+.17&&y>low-.12&&y<low+box.h+.12)
    return clamp((i-1)/steps-.025,0,1);
  }
 }
 return 1;
}
function compute(map,p,third=true,options={}){
 const yaw=p.yaw||0,pitch=clamp(p.pitch||0,-.75,.75),sy=Math.sin(yaw),cy=Math.cos(yaw);
 const center={x:p.x,y:p.eyeHeight||1.65,z:p.z};
 if(!third)return {eye:center,target:{x:p.x+sy*3,y:center.y+Math.tan(pitch)*3,z:p.z-cy*3},distance:0,occluded:false};
 const distance=clamp(options.distance||6.4,2.4,9.5);
 const desired={x:p.x-sy*distance+cy*.95,y:Math.max(1.65,2.25+pitch*1.1),z:p.z+cy*distance+sy*.95};
 const fraction=hits(map,center,desired),safe=clamp(fraction,0,1);
 const eye={x:center.x+(desired.x-center.x)*safe,y:center.y+(desired.y-center.y)*safe,z:center.z+(desired.z-center.z)*safe};
 // Lock shoulder-camera reticle to the player's *world-space forward ray*.
 // A near 2.4m target causes strong gun/crosshair parallax at medium distance.
 // Distant 45m convergence keeps screen-center close to actual fire yaw/pitch.
 const distanceAim=45;
 const target={x:p.x+sy*distanceAim,y:center.y+Math.tan(pitch)*distanceAim,z:p.z-cy*distanceAim};
 return {eye,target,distance:Math.hypot(eye.x-center.x,eye.y-center.y,eye.z-center.z),occluded:fraction<1};
}
function smooth(now,next,dt,reset=false,map=null,player=null){
 if(!now||reset)return next;
 const rate=next.occluded?35:12,t=clamp(1-Math.exp(-dt*rate),0,1);
 const blend=(a,b)=>a+(b-a)*t;
 const eye={x:blend(now.eye.x,next.eye.x),y:blend(now.eye.y,next.eye.y),z:blend(now.eye.z,next.eye.z)};
 // Smoothing a camera behind a new wall can interpolate *through* that wall.
 // Re-run obstruction testing from the current player center after interpolation.
 if(map&&player){
  const anchor={x:player.x,y:player.eyeHeight||1.65,z:player.z},safe=hits(map,anchor,eye);
  if(safe<1)for(const key of ["x","y","z"])eye[key]=anchor[key]+(eye[key]-anchor[key])*safe;
 }
 return {...next,eye,target:{x:blend(now.target.x,next.target.x),y:blend(now.target.y,next.target.y),z:blend(now.target.z,next.target.z)}};
}
root.KarmaCamera={hits,compute,smooth};
})(globalThis);
