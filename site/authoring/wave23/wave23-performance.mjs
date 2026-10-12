#!/usr/bin/env node
// Wave23 controlled A-F Chrome HEADLESS WebGL2 performance harness.
// Same camera/map/quality/scale/browser, same 6s post-load runtime windows.
// 'baseline' runs BEFORE code edits, 'after' runs AFTER. No GPU-timer claim.
import {spawn} from "node:child_process";
import {mkdir,writeFile,rm} from "node:fs/promises";
import {resolve} from "node:path";
const label=process.argv[2]||"baseline",port=9393,base="http://127.0.0.1:8833/three-d/index.html",sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
const profile=resolve(".wave23-perf-cdp-"+label);await mkdir(profile,{recursive:true});
const proc=spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
 ["--headless=new","--disable-extensions","--enable-webgl","--enable-unsafe-swiftshader","--use-angle=swiftshader","--remote-debugging-port="+port,"--user-data-dir="+profile,"--window-size=1100,710","about:blank"],{stdio:"ignore"});
let id=0,ws=null;
const tests=[
 {id:"A",count:1,shoot:false,feedback:false},
 {id:"B",count:4,shoot:false,feedback:false},
 {id:"C",count:8,shoot:false,feedback:false},
 {id:"D",count:8,shoot:true,feedback:false},
 {id:"E",count:8,shoot:true,feedback:true},
 {id:"F",count:8,shoot:true,feedback:true,optimized:true}
];
async function session(url){
 const r=await fetch("http://127.0.0.1:"+port+"/json/new?"+encodeURIComponent(url),{method:"PUT"});
 if(!r.ok)throw Error("CDP "+r.status);
 const target=await r.json(),socket=new WebSocket(target.webSocketDebuggerUrl);
 const jobs=new Map();await new Promise((ok,no)=>{socket.onopen=ok;socket.onerror=no});
 socket.onmessage=e=>{const q=JSON.parse(e.data);if(q.id&&jobs.has(q.id)){const [ok,no]=jobs.get(q.id);jobs.delete(q.id);q.error?no(Error(q.error.message)):ok(q.result)}};
 ws=socket;
 return {run(method,params={}){const call=++id,p=new Promise((ok,no)=>jobs.set(call,[ok,no]));socket.send(JSON.stringify({id:call,method,params}));return p;},close(){socket.close();ws=null}};
}
async function ev(p,code){const r=await p.run("Runtime.evaluate",{expression:code,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result?.value;}
const report={mode:label,date:new Date().toISOString(),renderer:"Mac Chrome ANGLE SwiftShader software WebGL2, not Windows GPU",scene:"Factory, third-person, fast, scale=.68, preview, warmup ~4sec each",tests:[]};
try{
 let ok=false;for(let j=0;j<70;j++){try{const r=await fetch("http://127.0.0.1:"+port+"/json");if(r.ok){ok=true;break}}catch{}await sleep(200);}
 if(!ok)throw Error("Chrome CDP startup");
 for(const t of tests){
  const url=base+"?preview=1&map=factory&team=german&camera=third&quality=fast&scale=.68&benchmark=1&npcShowcase=1&noFeedback="+(t.feedback?0:1)+(t.optimized?"&w23opt=1":"&w23opt=0");
  const p=await session("about:blank");
  await p.run("Runtime.enable");await p.run("Page.enable");
  // Inject ONLY a benchmark observer before the original TDM JS loads. The
  // engine's match variable is private inside an IIFE; this observes its
  // genuine KarmaTDM.create() result without changing game physics/AI.
  await p.run("Page.addScriptToEvaluateOnNewDocument",{source:`
   Object.defineProperty(globalThis,'KarmaTDM',{configurable:true,
    get(){return this.__originalKarmaTDM},
    set(v){this.__originalKarmaTDM=v;const old=v.create;
     v.create=function(...args){const m=old(...args);globalThis.__w23match=m;return m;};
    }});
  `});
  await p.run("Page.navigate",{url});await sleep(6500);
  for(let retry=0;retry<12;retry++){
   if(await ev(p,"!!globalThis.__w23match"))break;
   await sleep(1300);
  }
  console.log("Wave23 browser preflight",await ev(p,"JSON.stringify({ready:document.readyState,title:document.title,hasEngine:[...document.scripts].some(s=>s.src.includes('engine.js')),jsError:document.querySelector('#no-webgl')?.textContent,jsErrorVisible:document.querySelector('#no-webgl')?.hidden===false,matchType:typeof match,url:location.href})"));
  const setup=await ev(p,`(()=>{
   const match=globalThis.__w23match;
   if(!match)return {failure:"TDM factory create was not intercepted (check load and mode)"};
   match.status="running";match.targetScore=999;match.clock=1000;
   const original=match.bots.slice();
   match.bots=original.slice(0,${t.count});
   while(match.bots.length<${t.count}){
    const b=original[match.bots.length%original.length],n=match.bots.length;
    match.bots.push({...b,id:300+n,x:b.x+(n%2)*1.5,z:b.z+(n%3)*1.25,path:[],brain:"seek",hp:100,alive:true});
   }
   if(${!t.shoot})for(const b of match.bots){b.cooldown=10000;b.ammo=0;b.reloading=10000}
   if(${t.shoot})for(const b of match.bots){b.cooldown=0.02;b.ammo=32;}
   return {count:match.bots.length,mode:document.querySelector('#mode-picker')?.value,feedback:globalThis.KarmaWave23Feedback?.enabled};
  })()`);
  if(setup?.failure)throw Error(JSON.stringify(setup));
  // Sample RAF timings from performance.now() without DOM timer or driver FPS skew.
  await ev(p,`new Promise(resolve=>{
    const arr=[],started=performance.now();
    let last=started;
    function frame(now){
      arr.push(now-last);last=now;
      if(now-started<4600)requestAnimationFrame(frame);
      else{
        arr.shift();
        const clean=arr.filter(v=>v>0),sorted=[...clean].sort((a,b)=>a-b);
        const mean=clean.reduce((a,b)=>a+b,0)/clean.length;
        globalThis.__wave23Perf={frames:clean.length,meanFrameMs:mean,p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],fps:1000/mean,onePercentLowFPS:1000/(sorted[Math.floor(sorted.length*.99)]||mean)};
        resolve(true);
      }
    }
    requestAnimationFrame(frame);
  })`);
  const data=JSON.parse(await ev(p,`JSON.stringify({data:globalThis.__wave23Perf,engine:globalThis.KarmaWave18Perf,artist:globalThis.KarmaWave20NPC,draws:globalThis.KarmaWave23GpuMetrics||null,feedback:globalThis.KarmaWave23Feedback?.stats||null})`));
  report.tests.push({...t,setup,data});
  console.log("WAVE23 PERF",label,t.id,"fps",data.data?.fps?.toFixed(2),"P95",data.data?.p95?.toFixed(2),"1%low",data.data?.onePercentLowFPS?.toFixed(2),"actors",data.artist?.artistBots,"CPU scene",data.engine?.sceneMs);
  p.close();
 }
 await mkdir("docs/research/wave23",{recursive:true});
 await writeFile("docs/research/wave23/performance-"+label+".json",JSON.stringify(report,null,2));
}catch(e){console.error("WAVE23 PERF ERROR",e.stack);process.exitCode=1}
finally{ws?.close();proc.kill("SIGTERM");await sleep(250);try{await rm(profile,{recursive:true,force:true});}catch{}}
