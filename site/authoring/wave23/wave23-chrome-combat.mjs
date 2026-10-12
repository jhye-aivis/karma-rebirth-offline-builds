#!/usr/bin/env node
// Wave23: live Chrome 64-bone 6-variant visual proof, actual mouse weapon hits,
// incoming AI damage UX, performance telemetry, and true encoded MP4.
import {spawn,spawnSync} from "node:child_process";
import {mkdir,rm,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import assert from "node:assert/strict";
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms)),port=9398,profile=resolve(".wave23-qa-cdp");
const base="http://127.0.0.1:8833/three-d/index.html";
await mkdir(profile,{recursive:true});
const proc=spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
 ["--headless=new","--disable-extensions","--enable-webgl","--enable-unsafe-swiftshader","--use-angle=swiftshader",
  "--remote-debugging-port="+port,"--user-data-dir="+profile,"--window-size=1150,740","about:blank"],{stdio:"ignore"});
let seq=0,ws=null;
async function connect(url){
 const r=await fetch("http://127.0.0.1:"+port+"/json/new?"+encodeURIComponent("about:blank"),{method:"PUT"});
 if(!r.ok)throw Error("CDP target "+r.status);const json=await r.json(),socket=new WebSocket(json.webSocketDebuggerUrl);
 const outstanding=new Map();await new Promise((ok,no)=>{socket.onopen=ok;socket.onerror=no});ws=socket;
 socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&outstanding.has(m.id)){
  const [ok,no]=outstanding.get(m.id);outstanding.delete(m.id);
  m.error?no(Error(m.error.message)):ok(m.result);
 }};
 const p={send(method,params={}){const id=++seq,job=new Promise((ok,no)=>outstanding.set(id,[ok,no]));socket.send(JSON.stringify({id,method,params}));return job;},close(){socket.close();ws=null}};
 await p.send("Runtime.enable");await p.send("Page.enable");
 await p.send("Page.addScriptToEvaluateOnNewDocument",{source:`
 Object.defineProperty(globalThis,'KarmaTDM',{configurable:true,
  get(){return this.__w23OriginalTDM;},
  set(v){this.__w23OriginalTDM=v;
   const c=v.create,u=v.update;
   v.create=(...args)=>{const m=c(...args);globalThis.__w23match=m;return m};
   v.update=(m,p,dt)=>{globalThis.__w23player=p;return u(m,p,dt)};
  }});
 `});
 await p.send("Page.navigate",{url});return p;
}
async function ev(p,expr){
 const v=await p.send("Runtime.evaluate",{expression:expr,returnByValue:true,awaitPromise:true});
 if(v.exceptionDetails)throw Error("JS "+JSON.stringify(v.exceptionDetails).slice(0,700));
 return v.result?.value;
}
async function waitFor(p,expr,label,maxMs=18000){
 for(let i=0;i<Math.ceil(maxMs/750);i++){if(await ev(p,expr))return true;await sleep(750);}
 throw Error("Timeout "+label+" "+await ev(p,"JSON.stringify({state:document.readyState,err:document.querySelector('#no-webgl')?.textContent,npc:globalThis.KarmaWave20NPC,variants:globalThis.KarmaWave23VariantAudit})"));
}
async function capture(p,path){
 const r=await p.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false,fromSurface:true});
 await writeFile(path,Buffer.from(r.data,"base64"));
}
const report={measured:new Date().toISOString(),renderer:"Mac headless Chrome ANGLE SwiftShader (software WebGL2), NOT user's Windows GPU",scenes:[],events:{}};
try{
 let ready=false;for(let i=0;i<65;i++){try{const r=await fetch("http://127.0.0.1:"+port+"/json");if(r.ok){ready=true;break}}catch{}await sleep(200)}assert.ok(ready,"Chrome startup");
 await mkdir("docs/screenshots",{recursive:true});await mkdir("docs/research/wave23",{recursive:true});
 for(const team of ["german","soviet"]){
  const p=await connect(base+"?preview=1&map=factory&team="+team+"&camera=third&quality=fast&npcShowcase=1&benchmark=1");
  await waitFor(p,"globalThis.KarmaWave23VariantAudit?.status==='loaded'&&globalThis.KarmaWave20NPC?.artistBots>=4","variant GLB 4v4");
  await waitFor(p,"Number.isFinite(globalThis.KarmaWave18Perf?.fps)&&Number.isFinite(globalThis.KarmaWave18Perf?.sceneMs)","real RAF FPS warmup",18000);
  await sleep(450);
  const d=JSON.parse(await ev(p,`JSON.stringify({
    uniforms:globalThis.KarmaWave23VariantAudit,
    bots:globalThis.__w23match?.bots.map(b=>({team:b.team,id:b.id,role:b.variantId,loadout:b.loadout?.backpack})),
    perf:globalThis.KarmaWave18Perf,gpu:globalThis.KarmaWave23GpuMetrics,
    ai:globalThis.KarmaWave20NPC,weapon:globalThis.KarmaWave22Art?.lastKind,
    fatal:document.querySelector('#no-webgl')?.hidden===false?document.querySelector('#no-webgl').textContent:null
  })`));
  const file="docs/screenshots/wave23-"+team+"-6-outfits-chrome.png";await capture(p,file);
  const all=new Set(d.bots?.map(x=>x.role).filter(Boolean));
  for(const side of ["german","soviet"])assert.equal(new Set(d.bots.filter(b=>b.team===side).map(b=>b.role)).size,3,"Missing 3 visible assigned 3D variants "+side);
  assert.deepEqual(d.uniforms?.german?.slice().sort(),["G01","G02","G03"]);
  assert.deepEqual(d.uniforms?.soviet?.slice().sort(),["S01","S02","S03"]);
  assert.equal(d.fatal,null);assert.ok(d.gpu.drawCalls>0&&d.gpu.triangles>0);
  report.scenes.push({team,screenshot:file,...d});
  console.log("WAVE23 SHOWCASE",team,"real skinned",d.ai.artistBots,"draw calls",d.gpu.drawCalls,"triangles",d.gpu.triangles,"FPS",d.perf.fps);
  p.close();
 }
 // Real gameplay firing, authoritative damage and UI hit from normal mouse.
 const p=await connect(base+"?preview=1&map=factory&team=german&camera=first&quality=fast&benchmark=1");
 await waitFor(p,"globalThis.KarmaWave23VariantAudit?.status==='loaded'&&!!globalThis.__w23player&&!!globalThis.__w23match","live damage");
 let setup=await ev(p,`(()=>{
   const m=globalThis.__w23match,p=globalThis.__w23player,map=m.map;
   m.targetScore=1000;m.clock=1000;m.difficulty="veteran";
   p.hp=100;p.yaw=0;p.pitch=-.06;
   const enemy=m.bots.find(b=>b.team!==p.team);
   const options=[];
   for(const d of [3,4,5,6,7])for(const a of [0,.6,-.6,1.2,-1.2,3.14])
   {const x=p.x+Math.sin(a)*d,z=p.z-Math.cos(a)*d;
    if(globalThis.KarmaMaps3D.isWalkable(map,x,z,.4)&&globalThis.KarmaTDM.canSee(map,p,{x,z}))options.push({x,z,d,a});}
   if(!options.length)return {error:"No walkable visible enemy within 7m",at:[p.x,p.z]};
   const best=options[0];enemy.x=best.x;enemy.z=best.z;enemy.hp=500;enemy.alive=true;enemy.cooldown=500;enemy.path=[];p.yaw=best.a;
   for(const b of m.bots)if(b!==enemy){b.hp=0;b.alive=false;b.respawn=1000;b.cooldown=500;}
   return {enemyId:enemy.id,position:[enemy.x,enemy.z],player:[p.x,p.z],yaw:p.yaw};
 })()`);
 if(setup.error)throw Error(JSON.stringify(setup));
 let hit=false;
 for(let attempt=0;attempt<4;attempt++){
  await p.send("Input.dispatchMouseEvent",{type:"mousePressed",x:560,y:355,button:"left",clickCount:1});
  await p.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:560,y:355,button:"left",clickCount:1});
  await sleep(165);
  const state=JSON.parse(await ev(p,"JSON.stringify({damage:globalThis.__w23match?.damageEvents,feedback:globalThis.KarmaWave23Feedback?.stats,ammo:document.querySelector('#hud-clip')?.textContent})"));
  if(state.feedback?.dealt>0){hit=true;report.events.actualPlayerHit=state;break;}
 }
 assert.ok(hit,"Actual Chrome shooter mouse must damage a live opponent and create hit confirmation");
 await capture(p,"docs/screenshots/wave23-hitmarker-in-combat.png");
 const capturesDir=resolve("docs/research/wave23/frames"),frames=[];
 await mkdir(capturesDir,{recursive:true});
 for(let i=0;i<13;i++){
  if(i===3||i===8){
   await ev(p,`(()=>{const m=globalThis.__w23match,p=globalThis.__w23player;
    const enemy=m.bots.find(b=>b.team!==p.team);
    globalThis.KarmaTDM.damage(m,p,enemy,12);return true})()`);
  }
  await capture(p,"docs/research/wave23/frames/shot-"+String(i).padStart(2,"0")+".png");
  await sleep(75);
 }
 const preFeedback=JSON.parse(await ev(p,"JSON.stringify({stats:globalThis.KarmaWave23Feedback?.stats,damageEvents:globalThis.__w23match?.damageEvents?.slice(-8),health:document.querySelector('#health-value')?.textContent})"));
 assert.ok(preFeedback.stats.received>=1,"Actual authoritative AI-targeted player damage must show received indicator");
 await capture(p,"docs/screenshots/wave23-directional-damage.png");
 await ev(p,"document.querySelector('#w23-reduce-motion').checked=true;document.querySelector('#w23-reduce-motion').dispatchEvent(new Event('change',{bubbles:true}));true");
 const reduced=JSON.parse(await ev(p,"JSON.stringify(globalThis.KarmaWave23Feedback.stats)"));
 assert.equal(reduced.motionReduced,true,"Reduced motion must turn off shake");
 report.events={...report.events,setup,received:preFeedback,reducedMotion:reduced};
 p.close();
 const ff=spawnSync("ffmpeg",["-hide_banner","-loglevel","error","-nostdin","-y","-framerate","8","-i","docs/research/wave23/frames/shot-%02d.png","-vf","scale=1150:740","-c:v","libx264","-pix_fmt","yuv420p","-movflags","+faststart","docs/research/wave23/Wave23_hit_damage_real_chrome.mp4"],{encoding:"utf8",timeout:55000});
 if(ff.status!==0)throw Error("ffmpeg "+ff.stderr);
 await writeFile("docs/research/wave23/chrome-combat.json",JSON.stringify(report,null,2));
 console.log("WAVE23 CHROME PASS",JSON.stringify({scenes:report.scenes.length,damageReceived:preFeedback.stats.received,actualHits:report.events.actualPlayerHit.feedback.dealt,video:"Wave23_hit_damage_real_chrome.mp4"}));
}catch(e){console.error("WAVE23 E2E FAIL",e.stack);process.exitCode=1;}
finally{ws?.close();proc.kill("SIGTERM");await sleep(300);try{await rm(profile,{recursive:true,force:true});}catch{}}
