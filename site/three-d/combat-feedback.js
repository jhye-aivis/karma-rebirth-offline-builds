/* Wave23: authoritative source-only hit and damage feedback.
 * No event may spawn feedback without TDM.damage emitting a unique damage serial.
 * Motion-reduced mode suppresses shakes; all visuals are bounded and local/offline.
 */
(function(root){"use strict";
// A real 3D ray-to-head-sphere test, not 'headshot' based only on upper screen
// half or a lucky 2D box hit. Limbs remain classified body until bone-specific
// collider data exists.
function classifyHead(origin,impact,victim){
 if(!origin||!impact||!victim)return false;
 const ray=impact.map((v,i)=>v-origin[i]),length=Math.hypot(...ray);
 if(length<.01)return false;
 const dir=ray.map(v=>v/length),head=[victim.x,1.60,victim.z];
 const delta=head.map((v,i)=>v-origin[i]);
 const t=delta.reduce((s,v,i)=>s+v*dir[i],0);
 if(t<0||t>length+.55)return false;
 const miss=delta.map((v,i)=>v-t*dir[i]);
 return Math.hypot(...miss)<.235;
}
function create(host,opts={}){
 const disabled=!!opts.disabled;
 const layer=document.createElement("div");layer.id="w23-combat-feedback";
 layer.setAttribute("aria-hidden","true");
 layer.innerHTML='<span class="w23-hitmark" id="w23-hitmark">✕</span>'+
   '<span class="w23-direction" id="w23-damage-top"></span>'+
   '<span class="w23-direction" id="w23-damage-right"></span>'+
   '<span class="w23-direction" id="w23-damage-bottom"></span>'+
   '<span class="w23-direction" id="w23-damage-left"></span>'+
   '<span class="w23-wound" id="w23-wound"></span>';
 host.appendChild(layer);
 const hit=layer.querySelector("#w23-hitmark"),wound=layer.querySelector("#w23-wound");
 const directions=["top","right","bottom","left"].map(k=>layer.querySelector("#w23-damage-"+k));
 const stats={received:0,dealt:0,headshots:0,ignoredDuplicate:0,processed:0,playerHpLast:100,enabled:!disabled,lastPart:null,lastDirection:null};
 const viewport=host.querySelector("#viewport");
 const emitEvents=[];
 let lastSerial=0,hitLife=0,damageLife=0,shakeLife=0,lastDirection=-1;
 let motionReduced=false;
 function direction(player,attackerX,attackerZ){
  const bearing=Math.atan2(attackerX-player.x,-(attackerZ-player.z));
  const delta=Math.atan2(Math.sin(bearing-(player.yaw||0)),Math.cos(bearing-(player.yaw||0)));
  return Math.round(2*delta/Math.PI+4)%4;
 }
 function receive(event,player){
  if(!event||!Number.isFinite(event.id))return false;
  if(event.id<=lastSerial){stats.ignoredDuplicate++;return false;}
  lastSerial=event.id;stats.processed++;
  const attacking=event.attackerId==="player",victim=event.victimId==="player";
  if(attacking){
   stats.dealt++;hitLife=.22;stats.lastPart=event.part;
   if(event.part==="head"&&event.hasPrecisePart)stats.headshots++;
  }
  if(victim){
   stats.received++;stats.playerHpLast=event.remainingHp;damageLife=.35;
   lastDirection=direction(player,event.attackerX,event.attackerZ);
   stats.lastDirection=["front","right","back","left"][lastDirection];
   shakeLife=.08;
  }
  emitEvents.push({id:event.id,x:event.x,z:event.z,y:event.part==="head"?1.65:1.25,life:.3,part:event.part,material:event.material||"fabric",playerHit:attacking});
  while(emitEvents.length>12)emitEvents.shift();
  return true;
 }
 function step(dt){
  dt=Math.max(0,Math.min(.07,Number(dt)||0));
  hitLife=Math.max(0,hitLife-dt);
  damageLife=Math.max(0,damageLife-dt);
  shakeLife=Math.max(0,shakeLife-dt);
  for(let i=emitEvents.length-1;i>=0;i--){emitEvents[i].life-=dt;if(emitEvents[i].life<=0)emitEvents.splice(i,1);}
  if(disabled){layer.style.display="none";return;}
  hit.style.opacity=String(Math.min(1,hitLife*9));
  hit.classList.toggle("headshot",stats.lastPart==="head"&&hitLife>0);
  wound.style.opacity=String(Math.min(.22,damageLife*.45));
  directions.forEach((v,i)=>{v.style.opacity=i===lastDirection?String(Math.min(.9,damageLife*2.6)):"0";});
  host.classList.toggle("w23-shake",!motionReduced&&shakeLife>0);
  // Do not move the actual camera or change aim/hit-testing. DOM transform
  // is a bounded one-pixel cosmetic nudge of the canvas, never the 3D aim ray.
  layer.style.setProperty("--shake",!motionReduced&&shakeLife>0?"1":"0");
  if(viewport)viewport.style.transform=!motionReduced&&shakeLife>0?"translate3d(1px,-1px,0)":"";
 }
 return {receive,step,emitEvents,direction,setMotionReduced:v=>{motionReduced=!!v;},get stats(){return {...stats,motionReduced,activeContacts:emitEvents.length,hitMarkerVisible:hitLife>0,damageIndicatorVisible:damageLife>0}},get enabled(){return !disabled}};
}
root.KarmaCombatFeedback={create,classifyHead};
})(globalThis);
