(function(root){
const S=root.KarmaSim;
root.drawBattlefield=function(ctx,s){
const W=960,H=540,p=s.p;
const sky=ctx.createLinearGradient(0,0,0,300);
sky.addColorStop(0,"#5d6c70");sky.addColorStop(.6,"#a1a39a");sky.addColorStop(1,"#d6b8a0");
ctx.fillStyle=sky;ctx.fillRect(0,0,W,H/2);
ctx.fillStyle="#64634e";ctx.fillRect(0,H/2,W,H/2);
const floor=ctx.createLinearGradient(0,260,0,540);
floor.addColorStop(0,"#88816a");floor.addColorStop(.35,"#5c5a4d");floor.addColorStop(1,"#292d26");
ctx.fillStyle=floor;ctx.fillRect(0,270,W,270);
ctx.fillStyle="#56594f";
for(let k=0;k<17;k++){const a=k/17*Math.PI*2;const x=W/2+Math.sin(a+p.a)*460;const y=238+Math.cos(a)*9;ctx.fillRect(x,y,2,18);}
const z=[];
for(let x=0;x<W;x+=2){
const angle=p.a+Math.atan((x/W*2-1)*.72);
const dx=Math.cos(angle),dy=Math.sin(angle),hit=S.ray(p.x,p.y,dx,dy);
const dist=Math.max(.13,hit.distance*Math.cos(angle-p.a));
z[Math.floor(x/2)]=dist;
let h=Math.min(1600,490/dist),top=270-h/2;
const shade=Math.max(.21,1-dist/23)*(hit.side?.78:1);
const grain=Math.floor(hit.u*17)%6;
let color=hit.tile==="3"?[113,95,64]:hit.tile==="2"?[79,91,94]:[124,125,112];
const mort=((Math.floor(hit.u*9)%3)===0)?-20:0;
const rg=color.map(v=>Math.round(Math.max(0,v*shade+mort+grain*1.4)));
ctx.fillStyle="rgb("+rg.join(",")+")";ctx.fillRect(x,top,2,h+1);
const uv=hit.u*11;
if(hit.tile==="3"){
ctx.fillStyle="rgba(31,28,22,.58)";ctx.fillRect(x,top+h*.16,2,Math.max(1,h*.025));
ctx.fillRect(x,top+h*.82,2,Math.max(1,h*.025));
if(Math.floor(uv)%5===0)ctx.fillRect(x,top,2,h);
}else{
ctx.fillStyle="rgba(24,27,25,.28)";
if(Math.floor(uv)%4===0)ctx.fillRect(x,top,2,h);
const segment=Math.max(5,h/7);
for(let yy=top;yy<top+h;yy+=segment){ctx.fillRect(x,yy,2,Math.max(1,segment*.05));}
}
const fog=Math.min(.78,Math.max(0,(dist-8)/25));
if(fog){ctx.fillStyle="rgba(155,151,135,"+fog+")";ctx.fillRect(x,top,2,h);}
}
return z;
};
})(globalThis);
