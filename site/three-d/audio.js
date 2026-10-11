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
 function play(id,weapon=null){
  if(!enabled)return;
  switch(id){
   case "fire":{
    // Per-class short synthesized waveforms; stays local/offline and allocation
    // bounded by each successful shot, never player input repeats.
    const style={
     smg:[.075,.27,1280,158,.078,.12],
     rifle:[.17,.39,820,111,.18,.24],
     sniper:[.22,.49,660,82,.22,.26],
     lmg:[.13,.37,920,112,.12,.21],
     pistol:[.09,.23,1710,208,.083,.11],
     launcher:[.34,.51,510,58,.29,.27],
     grenade:[.28,.46,580,69,.22,.27],
     melee:[.055,.07,950,270,.045,.045]
    }[weapon?.kind]||[.09,.29,1100,137,.1,.15];
    noise(style[0],style[1],style[2]);
    tone(style[3],style[4],"sawtooth",style[5],weapon?.kind==="launcher"?.18:.4);
    break;
   }
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
