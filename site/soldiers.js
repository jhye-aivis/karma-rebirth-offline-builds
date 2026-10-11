(function(root){
const S=root.KarmaSim;
root.drawSoldiers=function(ctx,s,z){
const p=s.p;
const ordered=[...s.bots].filter(b=>b.hp>0).sort((a,b)=>Math.hypot(b.x-p.x,b.y-p.y)-Math.hypot(a.x-p.x,a.y-p.y));
for(const b of ordered){
const dx=b.x-p.x,dy=b.y-p.y,d=Math.hypot(dx,dy);
const a=S.wrap(Math.atan2(dy,dx)-p.a);
if(Math.abs(a)>.8||d<.18||d>22)continue;
const x=480+Math.tan(a)/.72*480;
if(x<0||x>960||z[Math.min(479,Math.max(0,Math.floor(x/2)))]<d-.38)continue;
const h=Math.min(540,310/d),y=270+h*.12;
ctx.save();ctx.translate(x,y);ctx.scale(h/140,h/140);
ctx.fillStyle="#0005";ctx.beginPath();ctx.ellipse(0,82,26,7,0,0,Math.PI*2);ctx.fill();
ctx.fillStyle="#424a3a";ctx.fillRect(-17,38,13,41);ctx.fillRect(4,38,13,41);
ctx.fillStyle="#333e33";ctx.fillRect(-18,64,14,8);ctx.fillRect(4,64,14,8);
ctx.fillStyle="#65704e";ctx.beginPath();ctx.moveTo(-26,-23);ctx.lineTo(23,-23);ctx.lineTo(25,46);ctx.lineTo(-21,46);ctx.closePath();ctx.fill();
ctx.fillStyle="#303c31";ctx.fillRect(-12,-22,24,66);
ctx.fillStyle="#7b7b59";ctx.fillRect(-23,-15,9,38);ctx.fillRect(15,-16,9,38);
ctx.fillStyle="#766d52";ctx.fillRect(-10,-31,20,17);
ctx.fillStyle="#b7a18a";ctx.fillRect(-10,-40,20,22);
ctx.fillStyle="#4d573d";ctx.beginPath();ctx.ellipse(0,-44,19,11,0,Math.PI,Math.PI*2);ctx.lineTo(19,-40);ctx.lineTo(-19,-40);ctx.fill();
ctx.fillStyle="#292d28";ctx.fillRect(-28,1,61,7);ctx.fillRect(26,-5,8,7);
ctx.fillStyle="#989c91";ctx.fillRect(29,-3,30,3);
ctx.fillStyle="#b29d85";ctx.fillRect(5,4,14,9);
ctx.fillStyle="#b23631";ctx.fillRect(-13,11,26,3);
ctx.restore();
if(b.hp<100){const bw=Math.min(56,h*.42);ctx.fillStyle="#10190ece";ctx.fillRect(x-bw/2,y-h*.62,bw,5);ctx.fillStyle="#bf7256";ctx.fillRect(x-bw/2,y-h*.62,bw*b.hp/100,5);}
}
};
})(globalThis);
