(function(root){
const S=root.KarmaSim;
function makeBot(i){const pos=S.SPAWNS[i%S.SPAWNS.length];return {x:pos[0],y:pos[1],hp:100,cool:1.2+(i%3)*.65,respawn:0,seed:i};}
function update(s,dt){
for(const b of s.bots){
if(b.hp<=0){b.respawn-=dt;if(b.respawn<=0){const n=makeBot(b.seed);Object.assign(b,n);}continue;}
const p=s.p,dx=p.x-b.x,dy=p.y-b.y,d=Math.hypot(dx,dy);
b.cool-=dt;
if(d<12&&d>1.5){
const speed=dt*(d<5?.54:.86);
S.move(b,dx/d*speed,dy/d*speed);
}
if(d<9&&b.cool<=0&&S.visible(b,p)){
b.cool=1.7+Math.random()*1.6;
if(Math.random()<.78){p.hp=Math.max(0,p.hp-(5+Math.floor(Math.random()*7)));s.hurt=1.3;}
}
}
}
root.KarmaActors={makeBot,update};
})(globalThis);