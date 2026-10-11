/* Self-authored procedural WWII FPS effects; offline Web Audio, no media/CDN/audio samples. */
(function(root){"use strict";
function create(){
 let ctx=null,master=null,enabled=true;
 function ensure(){
  if(!enabled)return null;
  if(!ctx){const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return null;
   ctx=new Context();master=ctx.createGain();master.gain.value=.31;
   const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-15;limiter.ratio.value=10;
   master.connect(limiter);limiter.connect(ctx.destination);}
  if(ctx.state==="suspended")ctx.resume().catch(()=>{});
  return ctx;
 }
 function tone(frequency,length=.1,wave="triangle",vol=.16,change=1){
  const c=ensure();if(!c)return;
  const now=c.currentTime,osc=c.createOscillator(),gain=c.createGain();
  osc.type=wave;osc.frequency.setValueAtTime(Math.max(35,frequency),now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(25,frequency*change),now+length);
  gain.gain.setValueAtTime(Math.max(.0001,vol),now);
  gain.gain.exponentialRampToValueAtTime(.0001,now+length);
  osc.connect(gain);gain.connect(master);osc.start(now);osc.stop(now+length+.004);
 }
 function noise(length=.12,volume=.12,cutoff=850){
  const c=ensure();if(!c)return;
  const now=c.currentTime,count=Math.floor(c.sampleRate*length),buf=c.createBuffer(1,count,c.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<count;i++)d[i]=(Math.random()*2-1)*(1-i/count);
  const src=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();
  src.buffer=buf;filter.type="lowpass";filter.frequency.value=cutoff;
  gain.gain.value=volume;
  src.connect(filter);filter.connect(gain);gain.connect(master);
  src.start(now);
 }
 function play(id){
  if(!enabled)return;
  switch(id){
   case "fire":noise(.11,.37,1200);tone(122,.095,"sawtooth",.19,.35);break;
   case "hit":tone(610,.07,"square",.085,.56);break;
   case "dry":tone(380,.025,"square",.08,.63);break;
   case "reload":tone(680,.04,"triangle",.12,.73);setTimeout(()=>tone(520,.055,"triangle",.13,.67),180);break;
   case "step":noise(.048,.043,290);break;
   case "hurt":tone(155,.11,"sawtooth",.14,.68);break;
   case "death":tone(270,.23,"sawtooth",.12,.16);break;
   case "victory":for(let i=0;i<3;i++)setTimeout(()=>tone(400*Math.pow(1.22,i),.24,"triangle",.15,1.03),i*140);break;
  }
 }
 return {unlock:ensure,play,setEnabled(v){enabled=!!v;if(master)master.gain.value=enabled?.31:0;},isEnabled:()=>enabled,available:()=>!!(window.AudioContext||window.webkitAudioContext)};
}
root.KarmaAudio=create();
})(globalThis);
