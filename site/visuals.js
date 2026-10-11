(function(root){
const canvas=document.getElementById("scene"),ctx=canvas.getContext("2d");
const S=root.KarmaSim;
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function txt(t,x,y,size=14,color="#f0ecd9",align="left"){ctx.font="700 "+size+"px system-ui,sans-serif";ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(String(t),x,y);}
function gun(s){
const bob=Math.sin(s.bob*11)*Math.min(5,s.moving*3);
ctx.save();ctx.translate(590+bob,375+bob);ctx.rotate(s.muzzle?.025:0);
const rifle=s.weapon===1;
ctx.fillStyle="#232a27";ctx.beginPath();ctx.moveTo(170,95);ctx.lineTo(93,150);ctx.lineTo(-6,140);ctx.lineTo(29,100);ctx.fill();
ctx.fillStyle="#806346";ctx.beginPath();ctx.moveTo(43,92);ctx.lineTo(87,72);ctx.lineTo(118,108);ctx.lineTo(82,141);ctx.lineTo(35,133);ctx.fill();
ctx.fillStyle="#383d37";ctx.beginPath();ctx.moveTo(73,88);ctx.lineTo(242,17);ctx.lineTo(272,32);ctx.lineTo(110,125);ctx.fill();
ctx.strokeStyle="#9d9986";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(118,74);ctx.lineTo(355,4);ctx.stroke();
ctx.strokeStyle="#222927";ctx.lineWidth=14;ctx.beginPath();ctx.moveTo(133,80);ctx.lineTo(355,10);ctx.stroke();
ctx.strokeStyle="#a1a096";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(180,56);ctx.lineTo(350,8);ctx.stroke();
rect(102,93,28,69,"#30342f");rect(105,102,15,55,"#4e554b");
rect(210,30,5,27,"#343832");rect(215,27,20,5,"#77796f");
ctx.fillStyle="#6c5542";ctx.beginPath();ctx.moveTo(10,130);ctx.lineTo(78,140);ctx.lineTo(127,194);ctx.lineTo(38,211);ctx.fill();
ctx.fillStyle="#b49b7b";ctx.beginPath();ctx.moveTo(100,143);ctx.lineTo(148,169);ctx.lineTo(171,213);ctx.lineTo(118,218);ctx.fill();
if(rifle){rect(99,90,27,10,"#8a8c7c");rect(235,31,12,15,"#898b7b");}
if(s.muzzle>0){
ctx.globalAlpha=Math.min(1,s.muzzle*9);
ctx.fillStyle="#ffdf9d";ctx.beginPath();ctx.moveTo(365,5);ctx.lineTo(415,-31);ctx.lineTo(409,7);ctx.lineTo(431,34);ctx.lineTo(379,20);ctx.fill();ctx.globalAlpha=1;
}
ctx.restore();
}
function minimap(s){
const scale=6,x=20,y=72;rect(x-6,y-6,108,108,"#101915bb");
for(let j=0;j<16;j++)for(let i=0;i<16;i++)if(S.MAP[j][i]!=="0")rect(x+i*scale,y+j*scale,scale-1,scale-1,S.MAP[j][i]==="3"?"#a18b65":"#6c7366");
for(const b of s.bots)if(b.hp>0)rect(x+b.x*scale-2,y+b.y*scale-2,4,4,"#d87a65");
ctx.fillStyle="#ddd8a6";ctx.beginPath();ctx.arc(x+s.p.x*scale,y+s.p.y*scale,3,0,Math.PI*2);ctx.fill();
}
function hud(s){
rect(328,0,305,49,"#0c1210b9");rect(328,47,305,2,"#bd9a66");
txt("AXIS",355,21,11,"#c1a66f");txt("01  /  "+String(s.kills).padStart(2,"0"),355,39,14);
txt("KILLS "+s.kills+" / 12",480,23,18,"#e6ebdd","center");
const tm=Math.max(0,Math.ceil(s.time));
txt(String(Math.floor(tm/60)).padStart(2,"0")+":"+String(tm%60).padStart(2,"0"),480,40,13,"#c4ad81","center");
txt("ALLIES",605,22,11,"#afb6bd","right");
txt(String(s.bots.filter(b=>b.hp>0).length)+" ACTIVE",605,39,13,"#c9c8b7","right");
rect(18,464,267,58,"#101613b9");txt("VITAL STATUS",30,482,11,"#c9c3a4");
rect(30,493,200,12,"#333b31");rect(30,493,200*Math.max(0,s.p.hp)/100,12,s.p.hp<35?"#c56054":"#8ca678");
txt(Math.ceil(Math.max(0,s.p.hp))+" HP",274,505,19,"#f2e4b9","right");
rect(689,457,255,65,"#101613c9");
const w=S.WEAPONS[s.weapon];
txt(w.name,707,479,16,"#dcc093");txt(w.ammo===s.mag[s.weapon]?"READY":"COMBAT",918,477,10,"#acb8a3","right");
txt(String(s.mag[s.weapon]).padStart(2,"0"),706,508,29);
txt("/ "+s.reserve[s.weapon],784,507,17,"#a8aa93");
txt(s.reloading>0?"RELOADING":"AMMUNITION",927,509,11,"#c0b899","right");
minimap(s);
ctx.strokeStyle=s.hit>.01?"#ce554c":"#ebe5cd";ctx.lineWidth=2;const cx=480,cy=270;
ctx.beginPath();ctx.moveTo(cx-17,cy);ctx.lineTo(cx-6,cy);ctx.moveTo(cx+6,cy);ctx.lineTo(cx+17,cy);ctx.moveTo(cx,cy-17);ctx.lineTo(cx,cy-6);ctx.moveTo(cx,cy+6);ctx.lineTo(cx,cy+17);ctx.stroke();
if(s.hurt>0){ctx.fillStyle="rgba(154,16,10,"+Math.min(.32,s.hurt*.2)+")";ctx.fillRect(0,0,960,540);}
if(s.reloading>0)txt("RELOADING...",480,338,18,"#dfc18c","center");
}
root.KarmaView={draw(s){
const z=root.drawBattlefield(ctx,s);root.drawSoldiers(ctx,s,z);gun(s);hud(s);
}};
})(globalThis);
