/* Wave12: pure 3D muzzle line-of-sight calibration + removable magazine timeline.
 * No projectile physics claimed: hit-scan remains camera origin and tracer
 * converges from the physical weapon muzzle to that camera crosshair point.
 * All distances in world meters, input yaw and pitch must match actual shot.
 */
(function(root){"use strict";
 const sub=(a,b)=>a.map((v,i)=>v-b[i]),add=(a,b)=>a.map((v,i)=>v+b[i]);
 const scale=(a,t)=>a.map(v=>v*t),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),length=a=>Math.hypot(...a);
 const unit=a=>scale(a,1/(length(a)||1));
 function aimDir(yaw,pitch){return unit([Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)]);}
 function solve(eye,muzzle,yaw,pitch,range=30){
  const d=aimDir(yaw,pitch),target=add(eye,scale(d,range)),muzzleDir=unit(sub(target,muzzle));
  const uncorrected=add(muzzle,scale(d,range)),uncorrectedError=length(sub(uncorrected,target));
  const t=dot(sub(target,muzzle),muzzleDir);
  const actual=add(muzzle,scale(muzzleDir,t));
  const convergenceError=length(sub(actual,target));
  const correctionDeg=Math.acos(Math.max(-1,Math.min(1,dot(muzzleDir,d))))*180/Math.PI;
  return {target,muzzleDir,uncorrectedError,convergenceError,correctionDeg,range};
 }
 function magazine(progress,isReloading){
  if(!isReloading)return {stage:"latched",attached:true,drop:0,side:0,reveal:0};
  const t=Math.max(0,Math.min(1,progress));
  if(t<.18)return {stage:"release",attached:true,drop:0,side:0,reveal:1};
  if(t<.38){const u=(t-.18)/.20;return {stage:"withdraw",attached:false,drop:.27*u,side:-.15*u,reveal:1};}
  if(t<.57){return {stage:"swap",attached:false,drop:.27,side:-.15,reveal:1};}
  if(t<.82){const u=(t-.57)/.25;return {stage:"insert",attached:false,drop:.27*(1-u),side:-.15*(1-u),reveal:1};}
  return {stage:"latch",attached:true,drop:0,side:0,reveal:1};
 }
 const DEFAULT_RECOIL={smg:.013,rifle:.021,sniper:.049,lmg:.027,pistol:.016,
  launcher:.068,grenade:.035,melee:0};
 const SPECIFIC_RECOIL={mp38:.012,mp40:.013,ppsh41:.021,pps43:.016,kar98:.048,
  kar98scope:.052,mosin:.046,mosinscope:.052,fg42:.026,stg44:.019,mg34:.031,
  dp28:.028,panzer:.07,bazooka:.064,riflegrenade:.043,luger:.021,tokarev:.020};
 function recoil(weapon,ads=false,sequence=0){
  const base=SPECIFIC_RECOIL[weapon.id]??DEFAULT_RECOIL[weapon.kind]??.015;
  const cadence=1+Math.min(.22,(sequence%7)*.035);
  return {pitch:base*(ads?.58:1)*cadence,
    yaw:base*.17*Math.sin((sequence+1)*2.39996)*(ads?.55:1),
    kickMeters:Math.min(.14,base*2.15)};
 }
 root.KarmaWeaponMotion={aimDir,solve,magazine,recoil};
})(globalThis);
