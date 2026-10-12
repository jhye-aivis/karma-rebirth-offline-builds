/* Wave 03: independently modelled architectural blockouts. Geometry is NOT extracted from 2002 game. */
(function(root) {
  "use strict";
  function b(x,z,w,d,h,material,solid=true,y=0){return {x,z,w,d,h,material,solid,y};}
  function factory(){
    const a=[
      // 2007 Special Force licensed remake photographs: central container stacks,
      // brick factory facade to the side, tall chimney, narrow parallel service alley.
      // Relative topology is EVIDENCE-INSPIRED, all meter coordinates invented.
      b(0,-30,62,2,8,"wall"),b(0,30,62,2,8,"wall"),
      b(-30,0,2,60,8,"wall"),b(30,0,2,60,8,"wall"),
      b(23,0,11,51,13,"factorywall"),
      b(-27,3,2,43,9,"concrete"),
      b(-15,-17,5.5,13,2.9,"containerRust"), b(-15,-17,5.5,13,2.8,"containerBlue",false,3),
      b(-5,-6,6,12,2.9,"containerRust"),b(-5,-6,6,12,2.9,"containerBlue",false,2.9),
      b(6,4,6,13,2.9,"containerBlue"),b(6,4,6,13,2.9,"containerRust",false,2.9),
      b(12,-14,5.5,13,2.9,"containerRust"),b(12,-14,5.5,13,2.9,"containerRust",false,2.9),
      b(-16,12,6.3,12,2.9,"containerBlue"),b(-16,12,6.3,12,2.9,"containerRust",false,2.9),
      b(-5,17,5,6,2.9,"containerRust"),
      b(3,-22,3,3,1.8,"crate"),b(9,20,3,4,1.7,"crate"),
      b(-22,22,4,4,2.4,"crate"),b(-23,-8,2.6,2.6,2,"crate"),
      b(24,-18,2.2,2.2,17,"chimney",false,13),
      b(18,-5,1.3,2,2,"containerBlue",false,4.8),
      b(13,12,1.3,2,2,"containerRust",false,4.8),
      b(23,19,8,2,.4,"roof",false,13),
      b(-3,26,42,.17,.04,"laneMark",false,.012),
      b(-3,-26,42,.17,.04,"laneMark",false,.012)
    ];
    // Historic 2007 promotional photographs show warehouse windows, painted stack
    // edges and a striped industrial smokestack. Coordinates remain independently
    // invented and are intentionally decorative/non-colliding.
    for(const z of [-21,-13,-5,3,11,19]){
      for(const y of [4.5,8.6])a.push(b(17.39,z,.24,2.65,1.55,"window",false,y));
    }
    for(const y of [17.2,23.1,27.6])a.push(b(24,-18,2.3,2.3,.5,"chimneyStripe",false,y));
    // Wave15: original screenshot/VHS-era industrial material vocabulary.
    // All these props are INVENTED architectural details (not 2002 measured
    // geometry). Non-solid to keep original 4v4 navigation/bullet lanes.
    // An elevation line of rainpipes, painted steel lintels and roof ducts.
    for(const z of [-23,-16,-9,-2,5,12,19,25]){
      a.push(b(17.35,z,.32,.45,10.2,"drainPipe",false,2));
      a.push(b(17.12,z+.95,.28,3.0,.16,"steelLintel",false,7.25));
      a.push(b(17.10,z-1.1,.30,1.8,.17,"concreteChip",false,2.95));
    }
    for(const x of [-25,-20,-10,-1,9,18]){
      a.push(b(x,-27.8,2.6,.55,.22,"roofRust",false,7.3));
      a.push(b(x,27.8,3.0,.55,.16,"roofRust",false,7.4));
    }
    // Cable trays and narrow support posts on warehouse ground floor.
    for(const z of [-15,-3,9,20]){
      a.push(b(16.98,z,.18,3.7,.20,"steelLintel",false,3.25));
      a.push(b(17.02,z-1.65,.22,.24,2.6,"drainPipe",false,3.4));
    }
    // Small rough-stone debris piles behind existing crates (visual only).
    for(const [x,z] of [[3,-23],[8,20],[-22,21],[-22,-9]]){
      a.push(b(x+.8,z+.9,.72,.45,.23,"rubbleDark",false,.02));
      a.push(b(x-.4,z+1.1,.4,.53,.16,"rubbleBright",false,.025));
    }
    // Narrow freight-rail sleepers & broken paving near the player spawn:
    // geometry changes the actual visible foreground, all decorative only.
    for(const z of [25,22,19,16,13,10,7,4,1,-2,-5,-8,-11,-14,-17,-20]){
      a.push(b(4.1,z,3.8,.17,.055,"steelLintel",false,.02));
    }
    for(const x of [2.38,5.82])a.push(b(x,2,.09,51,.055,"railSteel",false,.07));
    for(const [x,z] of [[-1,22],[8,22],[10,14],[-1,14]]){
      a.push(b(x,z,1.22,.65,.12,"concreteChip",false,.035));
    }
    // Wave25: genuine 3D silhouette meshes on the existing collision walls.
    // A pitched, deep warehouse roof, round brick stack and angled loading
    // canopy are render-only: no changes to bot cover or player navigation.
    a.push({...b(23,0,12.8,52,3.2,"roofRust",false,13),shape:"gableRoof"});
    a.push({...b(24,-18,3.3,3.3,17.7,"chimney",false,13),shape:"roundTower",segments:12,cap:"chimneyStripe"});
    a.push({...b(16.25,-9,3.9,12,1.1,"roofRust",false,6.15),shape:"gableRoof"});
    for(const z of [-22,-11,0,11,22]){
      a.push({...b(16.8,z,.7,.7,10.6,"sandstone",false,2.2),shape:"roundTower",segments:8});
    }
    const metalStacks=a.filter(v=>v.material.startsWith("container")&&v.d>5);
    for(const stack of metalStacks){
      for(let i=1;i<=8;i++){
        const z=stack.z-stack.d/2+stack.d*i/9;
        a.push(b(stack.x-stack.w/2-.055,z,.09,.12,stack.h*.91,"containerRib",false,(stack.y||0)+.1));
        a.push(b(stack.x+stack.w/2+.055,z,.09,.12,stack.h*.91,"containerRib",false,(stack.y||0)+.1));
      }
    }
    // Wave21: six independently authored ROUNDED rust drums. A circular mesh
    // is built at runtime; these are NOT disguised Minecraft-style solid boxes.
    // Non-colliding only where they hug existing architectural cover so the
    // established 4v4 paths remain identical and ground navigation is stable.
    for(const [x,z] of [[-20,-23],[-20,-21.9],[14,8],[15,8.6],[-24,17],[11,-22]]){
      a.push({...b(x,z,.70,.70,1.02,"containerRust",false,0),shape:"drum"});
    }
    return {id:"factory",title:"FACTORY",subtitle:"2007 Special Force Factory 자료 참고 · 산업 시설 상세 개선",bounds:28,spawn:[3,0,23],facing:0,sky:[.45,.52,.56],ground:"ground",fog:[.54,.56,.52],blocks:a,targets:[[12,-3],[-15,4],[15,23],[-24,-22]],sourceConfidence:"verified 2007 derivative: stacked shipping containers, chimney, brick warehouse, service alley; additional 2026 drainpipes, freight rails, lintels, trim and rubble independent; original 2002 positions/scale unverified"};
  }
  function castle(){
    const a=[
      b(-30,0,2,60,13,"stone"),b(30,0,2,60,13,"stone"),
      b(0,-30,62,2,12,"stone"),b(-17,30,29,2,12,"stone"),b(17,30,29,2,12,"stone"),
      b(-25,-25,7,7,18,"stone"),b(25,-25,7,7,18,"stone"),
      b(-25,25,7,7,18,"stone"),b(25,25,7,7,18,"stone"),
      b(0,-17,18,13,11,"stone"),b(0,-17,19,14,.6,"roof",false,11),
      b(0,-4,6,10,4,"stone"),b(0,2,2,6,3,"stone"),
      b(-15,6,8,9,3.7,"stone"),b(14,6,8,9,3.7,"stone"),
      b(-12,16,5,5,2.1,"wood"),b(11,16,5,5,2.1,"wood"),
      b(0,25,8,2,8,"stone"), b(0,30,7,3,2,"stone",false,10),
      b(-10,28,4,3,2,"stone",false,12),b(10,28,4,3,2,"stone",false,12),
      b(-29,-8,3,3,2,"stone",false,13),b(29,7,3,3,2,"stone",false,13),
      // 2003 film 00:23–00:36 shows red inset openings and stone rampart facades.
      // These are visual citations for material vocabulary, NOT proof this is the Castle map.
      b(0,-9.95,2.9,.22,3.5,"archRed",false,.08),
      b(-6,-9.95,1.45,.26,1.85,"archRed",false,4.6),
      b(6,-9.95,1.45,.26,1.85,"archRed",false,4.6),
      b(-10,2,2,17,.15,"ochre",false,.01),
      b(10,2,2,17,.15,"ochre",false,.01),
      b(-2,22,2,2,1.2,"stone",false,8),
      b(2,22,2,2,1.2,"stone",false,8)
    ];
    // Wave15: add contrast and historically-inspired masonry silhouettes
    // without lying about the unlabelled 2003 video as a Castle floorplan.
    // Non-colliding trim on outer fort walls, narrow inset arrow-slits and
    // low rubble debris that does not change existing solid collision routes.
    for(const x of [-25,25]){
      for(const z of [-21,-14,-7,0,7,14,21]){
        a.push(b(x+(x<0?1.30:-1.30),z,.19,.60,1.8,"castleShadow",false,5.6));
        a.push(b(x+(x<0?1.40:-1.40),z,.25,.84,.14,"sandstone",false,7.43));
      }
    }
    for(const z of [-25,25]){
      for(const x of [-23,-16,-9,-2,5,12,19,26]){
        a.push(b(x,z+(z<0?1.20:-1.20),.65,.19,1.52,"castleShadow",false,5.3));
        a.push(b(x,z+(z<0?1.26:-1.26),.88,.24,.19,"sandstone",false,6.75));
      }
    }
    for(const [x,z] of [[-23,22],[-13,10],[18,-2],[11,18],[-7,-11],[22,11],[-19,-5]]){
      a.push(b(x,z,1.4,.82,.27,"rubbleBright",false,.03));
      a.push(b(x+.8,z+.9,.80,.55,.19,"rubbleDark",false,.05));
    }
    // Battlements are decoration only: original towers are not surveyed.
    for(const x of [-25,25])for(const z of [-25,25]){
      for(const dx of [-2,0,2]){
        a.push(b(x+dx,z-3.1,1.1,.90,1.25,"sandstone",false,18));
        a.push(b(x+dx,z+3.1,1.1,.90,1.25,"sandstone",false,18));
      }
    }
    for(const x of [-7,-3,3,7])a.push(b(x,-10.1,1.00,.16,.3,"ochre",false,3.95));
    // Flagstone walkway in the observable 3P spawn corridor; the light/dark
    // asymmetry replaces a single smooth concrete floor without fake textures.
    for(const z of [26,23.7,21.4,19.1,16.8,14.5,12.2,9.9,7.6]){
      for(const x of [-7.25,-4.8,-2.35,.10,2.55,5,7.45]){
        const variant=Math.round((x+z)*10)%4===0?"rubbleDark":"sandstone";
        a.push(b(x,z,2.04,1.68,.029,variant,false,.015));
      }
    }
    a.push(b(-9.2,21,.21,3.4,2.5,"archRed",false,3.7));
    a.push(b(9.2,18,.21,2.6,2.3,"archRed",false,3.85));
    // Wave25: original mesh-built fortifications. Existing square tower cores
    // remain as physical collision proxies; 12-sided masonry surfaces hide
    // those flat cubes without letting AI cut through the walls.
    for(const x of [-25,25])for(const z of [-25,25]){
      a.push({...b(x,z,10.25,10.25,18.35,"stone",false,0),shape:"roundTower",segments:12,cap:"sandstone",battlements:true});
    }
    a.push({...b(0,-17,19.3,15.3,3.8,"roof",false,11),shape:"gableRoof"});
    a.push({...b(0,-9.84,3.2,.6,4.8,"archRed",false,.12),shape:"archedPortal"});
    for(const x of [-6,6])a.push({...b(x,-9.84,1.55,.46,2.8,"archRed",false,4.4),shape:"archedPortal"});
    // A genuinely open gateway in the visible starting aisle; non-colliding
    // to retain the existing physical routes and 4v4 AI navigability.
    a.push({...b(0,15,5.2,.6,5.65,"sandstone",false,0),shape:"archedPortal",open:true});
    for(const x of [-19,19])for(const z of [-12,0,12]){
      a.push({...b(x,z,2.1,2.1,7.5,"stone",false,0),shape:"buttress"});
    }
    return {id:"castle",title:"CASTLE",subtitle:"석조 성곽 · 과거전 가상 Blockout · 석재/루블/성벽 상세 개선",bounds:28,spawn:[0,0,21],facing:0,sky:[.39,.46,.54],ground:"ground",fog:[.49,.48,.43],blocks:a,targets:[[-12,-6],[12,-6],[-19,20],[22,-19]],sourceConfidence:"2003 WWII film supports stone walls/red inset openings as visual vocabulary; new 2026 flagstone path/arrow slits/rubble/battlements independent; Castle map identity, layout & scale unverified"};
  }
  function training(){
    // Training is historically listed, but no verified contemporary floorplan.
    // This is an independently designed safe practice range, NOT a 1:1 map.
    const a=[
      b(0,-30,60,2,6,"wall"),b(0,30,60,2,6,"wall"),
      b(-30,0,2,60,6,"wall"),b(30,0,2,60,6,"wall"),
      b(-22,-6,2,38,4.3,"concrete"),b(22,-6,2,38,4.3,"concrete"),
      b(0,-22,42,1.8,5,"concrete"),b(0,-4,42,.2,.08,"laneMark",false,.006),
      b(-13,9,7,3,1.35,"crate"),b(12,9,7,3,1.35,"crate"),
      b(-12,-1,3,3,1.2,"wood"),b(12,-1,3,3,1.2,"wood"),
      b(-12,-14,3.5,1,.4,"crate",false,.05),b(0,-14,3.5,1,.4,"crate",false,.05),b(12,-14,3.5,1,.4,"crate",false,.05)
    ];
    for(const x of [-15,-5,5,15])a.push(b(x,17,1.4,.12,.06,"laneMark",false,.01));
    return {id:"training",title:"TRAINING",subtitle:"과거전 Training 맵 명칭 확인 · 원본 지형 미확보 · 자체 제작 훈련용 사격장",
     bounds:28,spawn:[0,0,23],facing:0,sky:[.52,.59,.62],ground:"ground",fog:[.58,.60,.56],blocks:a,
     targets:[[-15,-12],[-5,-12],[5,-12],[15,-12],[-12,2],[12,2]],
     sourceConfidence:"Original 2002 Karma map name Training listed in retrospective; coordinates, elevation and target range are independent demo inventions"};
  }
  const MAPS={factory:factory(),castle:castle(),training:training()};
  function isWalkable(map,x,z,r=.4){
    if(Math.abs(x)+r>map.bounds || Math.abs(z)+r>map.bounds)return false;
    return !map.blocks.some(v=>v.solid && (Math.abs(x-v.x)<v.w/2+r) && (Math.abs(z-v.z)<v.d/2+r));
  }
  function walk(map,player,dx,dz){
    if(isWalkable(map,player.x+dx,player.z))player.x+=dx;
    if(isWalkable(map,player.x,player.z+dz))player.z+=dz;
    return player;
  }
  root.KarmaMaps3D={MAPS,isWalkable,walk};
})(globalThis);
