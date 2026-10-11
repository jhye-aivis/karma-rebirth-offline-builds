(function(){
"use strict";
const S=globalThis.KarmaSim,A=globalThis.KarmaActors,V=globalThis.KarmaView;
const canvas=document.getElementById("scene"),overlay=document.getElementById("overlay"),btn=document.getElementById("start"),heading=document.getElementById("heading"),status=document.getElementById("status");
const keys=Object.create(null);
const s={p:{x:3.5,y:2.5,a:.1,hp:100},bots:[],weapon:0,mag:[32,5],reserve:[192,35],kills:0,time:240,muzzle:0,hit:0,hurt:0,bob:0,moving:0,reloading:0,fireCd:0,running:false,started:false,firing:false};
for(let i=0;i<6;i++)s.bots.push(A.makeBot(i));
let audio=null;
function tone(f,d=.08,vol=.04){try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.type="sawtooth";o.frequency.setValueAtTime(f,audio.currentTime);o.frequency.exponentialRampToValueAtTime(f*.45,audio.currentTime+d);g.gain.setValueAtTime(vol,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+d);}catch{}}
function reset(){s.p={x:3.5,y:2.5,a:.1,hp:100};s.weapon=0;s.mag=[32,5];s.reserve=[192,35];s.kills=0;s.time=240;s.muzzle=0;s.hurt=0;s.fireCd=0;s.reloading=0;s.hit=0;s.bots=Array.from({length:6},(_,i)=>A.makeBot(i));}
function resume(){if(!s.started){reset();s.started=true;}s.running=true;s.firing=false;overlay.classList.add("hidden");status.textContent="전투 진행 중";canvas.requestPointerLock?.().catch(()=>{});}
function pause(){if(!s.running)return;s.running=false;s.firing=false;overlay.classList.remove("hidden");heading.textContent="MISSION / PAUSED";btn.innerHTML="작전 복귀 <span>↗</span>";status.textContent="일시정지";if(document.pointerLockElement)document.exitPointerLock();}
function finish(won){s.running=false;s.started=false;s.firing=false;overlay.classList.remove("hidden");heading.textContent=won?"MISSION / COMPLETE":"MISSION / FAILED";btn.innerHTML="다시 시작 <span>↗</span>";status.textContent=won?"임무 성공":"임무 실패";if(document.pointerLockElement)document.exitPointerLock();}
function reload(){const w=S.WEAPONS[s.weapon];if(s.reloading>0||s.mag[s.weapon]===w.ammo||s.reserve[s.weapon]<=0)return;s.reloading=w.reload;tone(340,.13,.012);}
function fire(){
const w=S.WEAPONS[s.weapon];
if(s.fireCd>0||s.reloading>0||!s.running)return;
if(s.mag[s.weapon]===0){reload();return;}
s.fireCd=w.rate;s.mag[s.weapon]--;s.muzzle=.095;s.p.a+=Math.sin(Date.now()*.17)*.002;tone(s.weapon===0?125:90,.09,.055);
const victim=S.target(s.p,s.bots,s.p.a,w.range);
if(victim){victim.hp=Math.max(0,victim.hp-w.damage);s.hit=.16;tone(730,.035,.022);
if(victim.hp===0){victim.respawn=2.8;s.kills++;status.textContent="적 제압 "+s.kills+" / 12";tone(860,.14,.027);if(s.kills>=12)finish(true);}
}
}
btn.addEventListener("click",resume);
canvas.addEventListener("click",()=>{if(s.running&&document.pointerLockElement!==canvas)canvas.requestPointerLock?.().catch(()=>{});});
document.addEventListener("pointerlockchange",()=>{if(!document.pointerLockElement&&s.running)pause();});
document.addEventListener("mousemove",e=>{if(s.running&&document.pointerLockElement===canvas)s.p.a=S.wrap(s.p.a+e.movementX*.0026);});
document.addEventListener("mousedown",e=>{if(e.button===0&&s.running){s.firing=true;fire();}});
document.addEventListener("mouseup",()=>s.firing=false);
document.addEventListener("keydown",e=>{const k=e.key.toLowerCase();keys[k]=true;if([" ","arrowup","arrowdown","arrowleft","arrowright"].includes(k))e.preventDefault();if(e.repeat)return;
if(k==="r")reload();
if(k==="1"||k==="2"){s.weapon=Number(k)-1;s.reloading=0;}
if(k==="escape")pause();});
document.addEventListener("keyup",e=>{keys[e.key.toLowerCase()]=false;});
window.addEventListener("blur",()=>{if(s.running)pause();});
function step(dt){
s.muzzle=Math.max(0,s.muzzle-dt);s.hit=Math.max(0,s.hit-dt);s.hurt=Math.max(0,s.hurt-dt*1.6);s.fireCd=Math.max(0,s.fireCd-dt);
if(!s.running)return;
s.time-=dt;
if(s.time<=0){finish(true);return;}
const f=Number(!!(keys.w||keys.arrowup))-Number(!!(keys.s||keys.arrowdown));
const str=Number(!!(keys.d||keys.arrowright))-Number(!!(keys.a||keys.arrowleft));
const length=Math.hypot(f,str)||1,speed=(keys.shift?3.55:2.4)*dt/length;
const dx=(f*Math.cos(s.p.a)-str*Math.sin(s.p.a))*speed;
const dy=(f*Math.sin(s.p.a)+str*Math.cos(s.p.a))*speed;
S.move(s.p,dx,dy);s.moving=Math.hypot(f,str);if(s.moving)s.bob+=dt*(keys.shift?1.8:1);
if(s.reloading>0){s.reloading-=dt;if(s.reloading<=0){const i=s.weapon,w=S.WEAPONS[i],n=Math.min(w.ammo-s.mag[i],s.reserve[i]);s.mag[i]+=n;s.reserve[i]-=n;}}
if(s.firing)fire();
A.update(s,dt);
if(s.p.hp<=0)finish(false);
}
let last=performance.now();
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;step(dt);V.draw(s);requestAnimationFrame(frame);}
requestAnimationFrame(frame);
})();
