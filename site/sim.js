(function(root) {
"use strict";
const MAP=[
"1111111111111111","1000000000000001","1000000000000001",
"1000033000000001","1000000000000001","1000111000000001",
"1000101000000001","1000000000330001","1000000000000001",
"1000000011100001","1000000010000001","1003300000000001",
"1000000000000001","1000000000000001","1000000000000001",
"1111111111111111"
];
const WEAPONS=[{name:"MP40",ammo:32,damage:34,rate:.13,reload:1.8,range:15,reserve:192},{name:"MOSIN-NAGANT",ammo:5,damage:85,rate:.9,reload:2.3,range:24,reserve:35}];
const SPAWNS=[[12.5,2.5],[12.5,7.5],[3.5,13.5],[10.5,13.5],[7.5,2.5],[13.5,13.5]];
function cell(x,y,map=MAP){return map[Math.floor(y)]?.[Math.floor(x)]||"1";}
function solid(x,y,map=MAP){return cell(x,y,map)!=="0";}
function free(x,y,r=.23){return !solid(x-r,y-r)&&!solid(x+r,y-r)&&!solid(x-r,y+r)&&!solid(x+r,y+r);}
function move(e,dx,dy){if(free(e.x+dx,e.y))e.x+=dx;if(free(e.x,e.y+dy))e.y+=dy;return e;}
function wrap(a){return Math.atan2(Math.sin(a),Math.cos(a));}
function ray(x,y,dx,dy,maxDist=24){
let mx=Math.floor(x),my=Math.floor(y),ddx=Math.abs(1/(dx||1e-9)),ddy=Math.abs(1/(dy||1e-9)),sx=dx<0?-1:1,sy=dy<0?-1:1;
let ax=(dx<0?x-mx:mx+1-x)*ddx,ay=(dy<0?y-my:my+1-y)*ddy;
for(let i=0;i<80;i++){
const side=ax<ay?0:1;
if(side===0){mx+=sx;ax+=ddx;}else{my+=sy;ay+=ddy;}
const distance=side===0?ax-ddx:ay-ddy;
if(cell(mx,my)!=="0"||distance>maxDist){let hit=side===0?y+dy*distance:x+dx*distance;return {distance:Math.min(distance,maxDist),side,tile:cell(mx,my),u:hit-Math.floor(hit)};}
}
return {distance:maxDist,side:0,tile:"1",u:0};
}
function visible(a,b){const d=Math.hypot(a.x-b.x,a.y-b.y);return ray(a.x,a.y,(b.x-a.x)/d,(b.y-a.y)/d,d+1).distance>=d-.16;}
function target(player,bots,angle,maxRange){
let hit=null,nearest=Infinity;
for(const b of bots){if(b.hp<=0)continue;const d=Math.hypot(b.x-player.x,b.y-player.y);if(d>=nearest||d>maxRange)continue;
if(Math.abs(wrap(Math.atan2(b.y-player.y,b.x-player.x)-angle))<Math.atan2(.35,d)&&visible(player,b)){hit=b;nearest=d;}}
return hit;
}
root.KarmaSim={MAP,WEAPONS,SPAWNS,cell,solid,free,move,wrap,ray,visible,target};
})(globalThis);
