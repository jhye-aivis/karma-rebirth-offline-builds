/* Wave 05 authored humanoid FK skeletal rig; animated joint graph, not imported/skinned copyrighted models. */
(function(root){"use strict";
 const humanoid=[
  ["root",-1,[0,.96,0]],
  ["chest",0,[0,.39,0]],
  ["neck",1,[0,.24,0]],
  ["head",2,[0,.20,0]],
  ["helmet",3,[0,.19,0]],
  ["hipL",0,[-.16,-.12,0]],
  ["kneeL",5,[0,-.42,.06]],
  ["ankleL",6,[0,-.40,-.08]],
  ["hipR",0,[.16,-.12,0]],
  ["kneeR",8,[0,-.42,.06]],
  ["ankleR",9,[0,-.40,-.08]],
  ["shoulderL",1,[-.35,.07,0]],
  ["elbowL",11,[-.05,-.29,-.08]],
  ["wristL",12,[.08,-.24,-.22]],
  ["shoulderR",1,[.35,.07,0]],
  ["elbowR",14,[.05,-.27,-.22]],
  ["wristR",15,[-.09,-.19,-.31]]
 ];
 const connections=[
  ["root","chest",.29,"uniform"],["chest","neck",.12,"uniform"],
  ["neck","head",.19,"skin"],["head","helmet",.27,"helmet"],
  ["hipL","kneeL",.13,"uniform"],["kneeL","ankleL",.1,"boot"],
  ["hipR","kneeR",.13,"uniform"],["kneeR","ankleR",.1,"boot"],
  ["shoulderL","elbowL",.11,"uniform"],["elbowL","wristL",.085,"uniform"],
  ["shoulderR","elbowR",.11,"uniform"],["elbowR","wristR",.085,"uniform"]
 ];
 const CLIPS=["idle","walk","run","shoot","reload","death","crouch"];
 function pose(t,heading=0,position={x:0,z:0},team="german",clip="walk"){
  const nodes={},speed=clip==="run"?10:6;
  const stride=clip==="walk"?.8:clip==="run"?1.45:.04;
  const swing=Math.sin(t*speed)*stride,bounce=Math.abs(Math.sin(t*speed))*.025*(stride||0);
  const c=Math.cos(heading),s=Math.sin(heading);
  for(const [name,parent,offset] of humanoid){
   let [x,y,z]=offset;
   if(name==="root")y+=bounce;
   if(name==="kneeL"){z+=Math.max(0,swing)*.21;y+=Math.max(0,swing)*.1;}
   if(name==="kneeR"){z+=Math.max(0,-swing)*.21;y+=Math.max(0,-swing)*.1;}
   if(name==="ankleL")z+=-swing*.18;
   if(name==="ankleR")z+=swing*.18;
   if(name==="elbowL")z+=swing*.12;
   if(name==="elbowR")z-=swing*.12;
   if(clip==="shoot"){
    if(name==="shoulderL"||name==="shoulderR")z-=.12;
    if(name==="elbowL"||name==="elbowR")z-=.2;
    if(name==="wristL"||name==="wristR")z-=.24;
   }
   if(clip==="reload"){
    const reach=Math.sin(t*5)*.16;
    if(name==="wristL"||name==="wristR"){y-=.18;z+=.28+reach;}
    if(name==="elbowL"||name==="elbowR"){z+=.12;y-=.09;}
   }
   if(clip==="death"){
     if(name==="root")y-=.55;
     if(name==="chest")y-=.11;
     if(name==="head")z+=.21;
     if(name==="kneeL"||name==="kneeR")y+=.16;
   }
   if(clip==="crouch"){
     if(name==="root")y-=.34;
     if(name==="hipL"||name==="hipR")z+=.06;
     if(name==="kneeL"||name==="kneeR"){z+=.2;y+=.19;}
     if(name==="ankleL"||name==="ankleR")z-=.15;
   }
   const origin=parent<0?[0,0,0]:nodes[humanoid[parent][0]].local;
   const local=[origin[0]+x,origin[1]+y,origin[2]+z];
   nodes[name]={local,world:[position.x+local[0]*c-local[2]*s,local[1],position.z+local[0]*s+local[2]*c]};
  }
  const material=t=>t==="uniform"?(team==="german"?"german":"soviet"):t==="helmet"?(team==="german"?"helmetAxis":"helmetUSSR"):t;
  return {nodes,connections:connections.map(([from,to,r,mat])=>({from:nodes[from].world,to:nodes[to].world,r,material:material(mat)})),team};
 }
 root.KarmaRig={pose,joints:humanoid.map(j=>j[0]),boneCount:connections.length,CLIPS};
})(globalThis);
