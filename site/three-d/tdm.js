/* Historical-style WWII 4v4, entirely original offline AI prototype.
  "German" and "Soviet" are faction labels, not claims of original Karma game balance. */
(function(root){"use strict";
const TEAM_A="german",TEAM_B="soviet",TEAMS=[TEAM_A,TEAM_B];
const opposite=t=>t===TEAM_A?TEAM_B:TEAM_A;
function navPoint(map,x,z){return map&&root.KarmaMaps3D.isWalkable(map,x,z,.37);}
function spawnPoints(map,team){
 const sign=team===TEAM_A?1:-1, result=[];
 // deterministic, walkable, separated rally points near opposite ends of each map
 for(const z of [sign*23,sign*19,sign*14,sign*8,sign*2,0,-sign*6])
 for(const x of [-22,-15,-8,-1,6,13,21]){
   if(navPoint(map,x,z)&&result.every(p=>Math.hypot(p.x-x,p.z-z)>4.5))result.push({x,z});
   if(result.length>=8)return result;
 }
 return result.length?result:[{x:0,z:22*sign}];
}
function newBot(id,team,position){return {id,team,x:position.x,z:position.z,hp:100,maxHp:100,alive:true,respawn:0,cooldown:1.2+id*.13,anim:id*.9,angle:0,path:[],repath:0,brain:"patrol",kills:0,deaths:0,ammo:team==="german"?32:71,reloading:0,shotTimer:0,speed:0};}
const DIFFICULTIES={
 rookie:{accuracy:.43,damage:.72,fireRate:1.32,movement:.85},
 normal:{accuracy:.68,damage:1,fireRate:1,movement:1},
 veteran:{accuracy:.84,damage:1.16,fireRate:.78,movement:1.15}
};
function create(map,playerTeam=TEAM_A,seed=3,difficulty="normal"){
 const spots={german:spawnPoints(map,TEAM_A),soviet:spawnPoints(map,TEAM_B)};
 const bots=[];
 for(const t of TEAMS){const n=t===playerTeam?3:4;for(let i=0;i<n;i++){
  const p=spots[t][(i+1)%spots[t].length],bot=newBot(bots.length,t,p);
  bot.variantId=root.KarmaWave23Variants?.cycle(t,i+seed)?.id||null;
  bot.loadout=root.KarmaWave23Variants?.manifest[t]?.find(v=>v.id===bot.variantId)||null;
  bots.push(bot);
 }}
 // Respect each map's authored camera-friendly spawn instead of first grid scan cell.
 const authored=map.spawn?{x:map.spawn[0],z:map.spawn[2]}:null;
 const pl=playerTeam===TEAM_A&&authored&&navPoint(map,authored.x,authored.z)?authored:spots[playerTeam][0];
 return {map,playerTeam,bots,playerSpawn:{...pl},score:{german:0,soviet:0},targetScore:20,limit:300,clock:300,status:"running",playerDeadTimer:0,events:[],damageEvents:[],damageSerial:0,seed,spawns:spots,tick:0,difficulty:DIFFICULTIES[difficulty]?difficulty:"normal"};
}
function canSee(map,from,to){
 const d=Math.hypot(to.x-from.x,to.z-from.z);
 if(d<.01)return true;
 const steps=Math.ceil(d/.45);
 for(let i=1;i<steps;i++){const t=i/steps;const x=from.x+(to.x-from.x)*t,z=from.z+(to.z-from.z)*t;if(!navPoint(map,x,z))return false;}
 return true;
}
function friendlyLaneBlocked(actors,shooter,target,radius=.52){
 const dx=target.x-shooter.x,dz=target.z-shooter.z,lengthSq=dx*dx+dz*dz;
 if(lengthSq<.04)return false;
 for(const ally of actors){
  if(ally===shooter||ally.team!==shooter.team||ally.hp<=0||ally.alive===false)continue;
  const t=((ally.x-shooter.x)*dx+(ally.z-shooter.z)*dz)/lengthSq;
  if(t<=.08||t>=.92)continue;
  const x=shooter.x+dx*t,z=shooter.z+dz*t;
  if(Math.hypot(ally.x-x,ally.z-z)<radius)return true;
 }
 return false;
}
function route(map,from,to) {
 const size=1.7,min=-27,N=33, cell=(v)=>Math.min(N-1,Math.max(0,Math.round((v-min)/size)));
 const sx=cell(from.x),sz=cell(from.z),tx=cell(to.x),tz=cell(to.z);
 const start=sz*N+sx,end=tz*N+tx,prev=new Int32Array(N*N);prev.fill(-2);
 const queue=new Int32Array(N*N);let head=0,tail=0;queue[tail++]=start;prev[start]=-1;
 const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
 while(head<tail){const node=queue[head++];if(node===end)break;const x=node%N,z=Math.floor(node/N);
 for(const [dx,dz] of dirs){const nx=x+dx,nz=z+dz;if(nx<0||nx>=N||nz<0||nz>=N)continue;
 const ni=nz*N+nx;if(prev[ni]!==-2)continue;
 if(!navPoint(map,min+nx*size,min+nz*size))continue;
 prev[ni]=node;queue[tail++]=ni;
 }}
 if(prev[end]===-2)return [];
 const cells=[];for(let node=end;node!==start&&node>=0;node=prev[node])cells.push({x:min+(node%N)*size,z:min+Math.floor(node/N)*size});
 return cells.reverse();
}
function findCover(map,bot,threat){
 let best=null,bestScore=-Infinity;
 for(const radius of [2.5,4.5,6]){
  for(let i=0;i<16;i++){
   const theta=i*Math.PI/8,x=bot.x+Math.cos(theta)*radius,z=bot.z+Math.sin(theta)*radius;
   const point={x,z};
   if(!navPoint(map,x,z)||canSee(map,threat,point))continue;
   const score=12-Math.hypot(x-bot.x,z-bot.z)+Math.min(5,Math.hypot(x-threat.x,z-threat.z))*.1;
   if(score>bestScore&&route(map,bot,point).length){best=point;bestScore=score;}
  }
 }
 return best;
}
function damage(match,victim,attacker,amount,meta=null){
 if(match.status!=="running"||victim.hp<=0||victim.team===attacker.team)return false;
 const previousHp=victim.hp;
 victim.hp=Math.max(0,victim.hp-amount);
 // Wave23 authoritative DAMAGE event. Cosmetic clients never invent damage;
 // 'head' is used only if precise 3D ray height was supplied by the caller.
 // Other cases are 'body', not unverified arm/leg/head claims.
 match.damageEvents??=[];match.damageSerial=(match.damageSerial||0)+1;
 match.damageEvents.push({id:match.damageSerial,at:match.tick,
   attackerId:attacker.id??"player",victimId:victim.id??"player",
   attackerTeam:attacker.team,victimTeam:victim.team,
   x:victim.x,z:victim.z,
   attackerX:attacker.x,attackerZ:attacker.z,
   amount:previousHp-victim.hp,remainingHp:victim.hp,
   part:meta?.part==="head"?"head":"body",
   hasPrecisePart:meta?.part==="head"&&meta?.headSphereTest===true,
   material:meta?.material||"fabric"});
 if(match.damageEvents.length>48)match.damageEvents.splice(0,match.damageEvents.length-48);
 // True 64-joint reaction data is consumed only by the presentation renderer.
 // No gameplay knockback, hitbox displacement or speed penalty is introduced.
 victim.hitReactionTimer=.22;
 victim.hitReactionSide=Math.sin(Math.atan2(attacker.x-victim.x,-(attacker.z-victim.z))-(victim.angle||0))<0?-1:1;
 if(victim.hp!==0)return true;
 victim.alive=false;victim.deaths=(victim.deaths||0)+1;victim.respawn=3.5;
 match.score[attacker.team]+=1;attacker.kills=(attacker.kills||0)+1;
 match.events.unshift({type:"kill",team:attacker.team,source:attacker.id??"player",target:victim.id??"player",at:match.tick});
 match.events.length=Math.min(match.events.length,12);
 if(match.score[attacker.team]>=match.targetScore)match.status="finished";
 return true;
}
function playerShoot(match,player,angle,weaponDamage=40,weaponRange=45,pitch=0,clearLine=null,screenAim=null){
 const dir={x:Math.sin(angle),z:-Math.cos(angle)};
 let victim=null,dist=Infinity;
 for(const b of match.bots){if(!b.alive||b.team===player.team)continue;
 const dx=b.x-player.x,dz=b.z-player.z,d=Math.hypot(dx,dz);
 const aim=(dx*dir.x+dz*dir.z)/d;
 if(d>weaponRange||d>=dist)continue;
 if(screenAim?!screenAim(b):aim<Math.cos(Math.atan2(.5,d)))continue;
 const hitY=(player.eyeHeight||1.65)+Math.tan(pitch)*d;
 if(!screenAim&&Math.abs(hitY-1.2)>.77)continue;
 if(!canSee(match.map,player,b))continue;
 if(clearLine&&!clearLine(b))continue;
 victim=b;dist=d;
 }
 if(victim)damage(match,victim,player,weaponDamage);
 return victim;
}
function respawnBot(match,b){
 const places=match.spawns[b.team],hostile=match.bots.filter(o=>o.team!==b.team&&o.alive);
 const safest=[...places].sort((a,c)=>{
  const dist=q=>Math.min(60,...hostile.map(o=>Math.hypot(o.x-q.x,o.z-q.z)));
  return dist(c)-dist(a);
 });
 const p=safest[(b.id+Math.floor(match.tick))%Math.min(3,safest.length)];
 b.x=p.x;b.z=p.z;b.hp=100;b.alive=true;b.cooldown=1.1;b.repath=0;b.path=[];b.respawn=0;b.cover=null;b.coverTimer=0;b.ammo=b.team==="german"?32:71;b.reloading=0;b.speed=0;
}
function update(match,player,dt){
 if(match.status!=="running")return;
 match.tick+=dt;match.clock=Math.max(0,match.clock-dt);
 if(match.clock===0){match.status="finished";return;}
 player.team=match.playerTeam;
 const cfg=DIFFICULTIES[match.difficulty]||DIFFICULTIES.normal;
 if(player.hp<=0){
  match.playerDeadTimer-=dt;
  if(match.playerDeadTimer<=0){player.hp=100;player.x=match.playerSpawn.x;player.z=match.playerSpawn.z;match.playerDeadTimer=0;}
 }
 const all=match.bots.concat(player);
 for(const b of match.bots){
  b.anim+=dt;
  b.hitReactionTimer=Math.max(0,(b.hitReactionTimer||0)-dt);
  b.shotTimer=Math.max(0,(b.shotTimer||0)-dt);
  b.speed=0;
  if(!b.alive){b.respawn-=dt;if(b.respawn<=0)respawnBot(match,b);continue;}
  b.cooldown-=dt;
  if(b.reloading>0){b.reloading-=dt;if(b.reloading<=0){b.ammo=b.team==="german"?32:71;b.reloading=0;}}
  const enemies=all.filter(e=>e!==b&&e.team!==b.team&&e.hp>0&&e.alive!==false);
  enemies.sort((a,c)=>{
   const score=e=>Math.hypot(e.x-b.x,e.z-b.z)+match.bots.filter(ally=>ally!==b&&ally.team===b.team&&ally.focusTarget===e.id).length*4;
   return score(a)-score(c);
  });
  const t=enemies[0];if(!t)continue;
  b.focusTarget=t.id??"player";
  const dx=t.x-b.x,dz=t.z-b.z,dist=Math.hypot(dx,dz);
  b.angle=Math.atan2(dx,-dz);
  const visible=dist<23&&canSee(match.map,b,t);
  const fireLaneBlocked=visible&&friendlyLaneBlocked(all,b,t);
  if(b.coverTimer>0)b.coverTimer-=dt;
  if(b.hp<38&&visible&&b.coverTimer<=0){b.cover=findCover(match.map,b,t);b.coverTimer=3.5;b.repath=0;}
  b.brain=b.cover&&b.coverTimer>0?"cover":fireLaneBlocked?"reposition":visible?"attack":"seek";
  if(b.ammo<=0&&b.reloading<=0)b.reloading=b.team==="german"?1.85:2.4;
  if(visible&&!fireLaneBlocked&&dist<19&&b.cooldown<=0&&b.reloading<=0&&b.ammo>0){
   b.cooldown=(1.0+(b.id%4)*.24)*cfg.fireRate;
   b.ammo--;b.shotTimer=.22;
   const accuracy=Math.max(.1,cfg.accuracy-dist*.018);
   if((Math.sin(match.tick*7.51+b.id*83)*43758.54%1+1)%1<accuracy){
     damage(match,t,b,Math.max(1,Math.round((12+((b.id*7)%9))*cfg.damage)));
     if(t===player&&t.hp===0)match.playerDeadTimer=3.5;
   }
  }
  let dest=b.brain==="cover"?b.cover:visible&&(dist>6||fireLaneBlocked)?t:visible?null:t;
  if((b.brain==="attack"||b.brain==="reposition")&&dest){
    const flankSign=b.id%2?1:-1;
    const x=t.x+(-dz/dist)*flankSign*2.4,z=t.z+(dx/dist)*flankSign*2.4;
    if(navPoint(match.map,x,z))dest={x,z};
  }
  if(!dest)continue;
  b.repath-=dt;
  if(b.repath<=0){b.path=route(match.map,b,dest);b.repath=1.2+(b.id%3)*.3;}
  while(b.path.length&&Math.hypot(b.path[0].x-b.x,b.path[0].z-b.z)<.75)b.path.shift();
  const next=b.path[0]||dest;
  const mx=next.x-b.x,mz=next.z-b.z,l=Math.hypot(mx,mz);
  if(l>.01){const step=Math.min(l,dt*2.2*cfg.movement),vx=mx/l*step,vz=mz/l*step;
   const oldX=b.x,oldZ=b.z;
   root.KarmaMaps3D.walk(match.map,b,vx,vz);
   b.speed=Math.hypot(b.x-oldX,b.z-oldZ)/Math.max(.001,dt);
  }
 }
}
root.KarmaTDM={TEAM_A,TEAM_B,TEAMS,DIFFICULTIES,spawnPoints,create,canSee,friendlyLaneBlocked,route,findCover,damage,playerShoot,update};
})(globalThis);
