/* Wave18: local-only player diagnostics + opt-in GitHub feedback.
 * No analytics, tracking IDs, cookies, telemetry upload, or hidden submissions.
 */
(function(root){"use strict";
const app=document.querySelector("#application");if(!app)return;
const button=document.createElement("button");button.type="button";button.id="wave18-diagnostics-button";
button.textContent="성능 · FPS · 피드백";button.setAttribute("aria-expanded","false");
button.style.cssText="position:absolute;bottom:122px;right:20px;z-index:45;background:#173930;color:#e5fff1;border:1px solid #8cb7ac;border-radius:7px;padding:9px 12px;cursor:pointer;font:600 12px sans-serif";
app.appendChild(button);
const panel=document.createElement("aside");panel.id="wave18-diagnostics-panel";
panel.style.cssText="display:none;position:absolute;right:14px;bottom:163px;max-height:70vh;overflow:auto;width:min(340px,85vw);z-index:48;color:#e6ffeb;background:#0c1b18ee;border:1px solid #7c9a83;border-radius:12px;padding:14px;font:12px/1.45 sans-serif;box-shadow:0 6px 30px #0009";
panel.innerHTML=`<strong style="font-size:15px">실제 브라우저 성능 진단</strong>
<p style="opacity:.85;margin:5px 0 10px">측정 데이터는 이 브라우저에서만 처리합니다. 별도 서버로 자동 전송하지 않습니다.</p>
<div id="wave18-stat-values" style="white-space:pre-wrap;font:12px/1.7 monospace"></div>
<label for="wave18-quality">그래픽 품질</label>
<select id="wave18-quality" style="color:#122319;background:#eaffee;padding:5px;width:100%;margin:6px 0 10px">
<option value="balanced">균형: 가까운 실사 AI까지 표시</option>
<option value="fast">빠른 모드 (기본, 실사 플레이어 유지)</option>
<option value="original">최고 원본 품질 (무거움)</option>
<option value="legacy">기본 모델 (최저 부하)</option>
</select>
<label for="wave18-feedback">문제·의견 (선택)</label>
<textarea id="wave18-feedback" maxlength="1200" rows="3" placeholder="예: Castle에서 시점 전환 시 끊김" style="box-sizing:border-box;width:100%;padding:6px;background:#f1f6ed;color:#111;margin:6px 0"></textarea>
<button id="wave18-copy" type="button" style="padding:7px;background:#d5eadc;color:#101b15">진단 결과 복사</button>
<button id="wave18-report" type="button" style="padding:7px;background:#8ccfb6;color:#11231b">GitHub 의견 작성 ↗</button>
<small style="display:block;margin-top:8px;opacity:.8">GitHub 의견 작성은 외부 페이지를 열 뿐입니다. 로그인 및 공개 제출 여부는 사용자가 직접 결정합니다.</small>`;
app.appendChild(panel);
const $=id=>panel.querySelector("#"+id);
const params=new URLSearchParams(location.search);
function graphicsRenderer(){
 try{
  const gl=document.querySelector("#viewport")?.getContext("webgl2");
  if(!gl)return "WebGL2 unavailable";
  const ext=gl.getExtension("WEBGL_debug_renderer_info");
  return ext?String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)):String(gl.getParameter(gl.RENDERER))+" (masked)";
 }catch{return "GPU renderer not exposed by browser";}
}
const gpuDescription=graphicsRenderer();
$("wave18-quality").value=root.KarmaWave18Perf?.quality||params.get("quality")||"fast";
$("wave18-quality").addEventListener("change",event=>{
 const next=new URL(location.href);next.searchParams.set("quality",event.target.value);
 location.assign(next.toString());
});
button.addEventListener("click",()=>{
 const open=panel.style.display==="none";panel.style.display=open?"block":"none";
 button.setAttribute("aria-expanded",String(open));if(open)update();
});
const snapshot=()=>({
 version:"Wave20.2",map:params.get("map")||"factory",
 gpuRenderer:gpuDescription,
 devicePixelRatio:devicePixelRatio,
 quality:root.KarmaWave18Perf?.quality||"loading",
 graphicsScale:root.KarmaWave18Perf?.renderScale||null,
 autoLod:root.KarmaWave18Perf?.autoLod??null,
 fps:root.KarmaWave18Perf?.fps??null,
 frameP95Ms:root.KarmaWave18Perf?.frameP95Ms??null,
 cpuSceneMs:root.KarmaWave18Perf?.sceneMs??null,
 cpuAiMs:root.KarmaWave18Perf?.aiMs??null,
 modelBytes:root.KarmaWave18Perf?.downloadedBytes??null,
 modelState:root.KarmaWave17Model?.state,
 npcModels:root.KarmaWave20NPC?{
  state:root.KarmaWave20NPC.state,
  germanSkinned:root.KarmaWave20NPC.german,
  sovietDerivedSkinned:root.KarmaWave20NPC.soviet,
  fallback:root.KarmaWave20NPC.fallback,
  visible:root.KarmaWave20NPC.visible,
  germanGLB:root.KarmaWave20NPC.germanLOD?.triangles||null,
  sovietGLB:root.KarmaWave20NPC.sovietInterim?.triangles||null,
  sovietHistoricalAccuracy:"Temporary CC0 German-derived faction stand-in; not authentic Soviet soldier"
 }:null,
 live3dBots:root.KarmaWave18Perf?.realBots??0,
 shots:root.KarmaDiagnostics?.shots??0,
 hits:root.KarmaDiagnostics?.hits??0,
 accuracyPct:root.KarmaDiagnostics?.shots?+(100*root.KarmaDiagnostics.hits/root.KarmaDiagnostics.shots).toFixed(1):null,
 damage:root.KarmaDiagnostics?.damage??0,
 coverBlocked:root.KarmaDiagnostics?.blocked??0,
 aimKind:root.KarmaWave16Shot?.kind||null,
 impactXYZ:root.KarmaWave16Shot?.impact?.map(n=>+n.toFixed(2))||null
 ,footStabilization:root.KarmaWave19Pose?.foot||null,
  footLock:root.KarmaWave19Pose?.footLock||null,
  footAudit:root.KarmaWave20FootAudit?{
   samples:root.KarmaWave20FootAudit.samples,
   contacts:root.KarmaWave20FootAudit.contacts,
   preMeanMeters:root.KarmaWave20FootAudit.preMeanMeters,
   postMeanMeters:root.KarmaWave20FootAudit.postMeanMeters
  }:null,
 sourceRig:root.KarmaWave19Pose?.source||null
});
root.KarmaWave18UserDiagnostics={snapshot};
function update(){
 if(panel.style.display==="none")return;
 const s=snapshot(),fmt=v=>v==null?"아직 측정 없음":v;
 $("wave18-stat-values").textContent=
  "FPS "+fmt(s.fps)+" | P95 "+fmt(s.frameP95Ms)+" ms\n"+
  "GPU "+s.gpuRenderer+"\n"+
  "CPU draw "+fmt(s.cpuSceneMs)+" ms | AI "+fmt(s.cpuAiMs)+" ms\n"+
  "품질 "+s.quality+" · 렌더 배율 "+fmt(s.graphicsScale)+" · 자동 단계 "+fmt(s.autoLod)+"\n"+
  "실제 CC0 스킨 AI "+s.live3dBots+" · 모델 "+s.modelState+"\n"+
  "독일군 "+(s.npcModels?.germanSkinned??0)+" / 소련군측 임시 "+(s.npcModels?.sovietDerivedSkinned??0)+
   " / 기본 모델 "+(s.npcModels?.fallback??0)+"\n"+
  "사격 "+s.shots+"발 · 명중 "+s.hits+" · 명중률 "+fmt(s.accuracyPct)+"%\n"+
  "피해 "+s.damage+" · 엄폐 차단 "+s.coverBlocked+"\n"+
  "마지막 충돌 "+fmt(s.aimKind)+"\n"+
  "발 보정 "+(s.footStabilization?.liftMeters?.toFixed(3)??"--")+"m"+
  " | 접지 오차 "+(s.footLock?.meanSlipMeters!=null?(s.footLock.meanSlipMeters*100).toFixed(2)+"cm":"--");
}
setInterval(update,800);
if(params.get("diagnostics")==="1"){panel.style.display="block";button.setAttribute("aria-expanded","true");update();}
const payload=()=>JSON.stringify(snapshot(),null,2)+"\n\n사용자 의견: "+$("wave18-feedback").value.slice(0,1200);
$("wave18-copy").addEventListener("click",async()=>{
 try{await navigator.clipboard.writeText(payload());$("wave18-copy").textContent="복사 완료";}
 catch{$("wave18-feedback").value=payload();$("wave18-feedback").focus();$("wave18-feedback").select();}
});
$("wave18-report").addEventListener("click",()=>{
 const s=snapshot(),body="## 게임 환경 진단 (사용자 확인 후 직접 게시)\n\n```json\n"+
 JSON.stringify(s,null,2)+"\n```\n\n## 제보 내용\n\n"+$("wave18-feedback").value.slice(0,1200);
 root.open("https://github.com/jhye-aivis/karma-rebirth-offline-builds/issues/new?"+
  new URLSearchParams({title:"Wave18 FPS/게임 경험 제보",body}).toString(),"_blank","noopener,noreferrer");
});
})(globalThis);
