/* Wave10 data-driven ORIGINAL-ERA historical weapon candidates.
 * Names grounded in retrospective Karma Online 2002-2006 article/wiki.
 * Stat values and models are AUTHORED approximations, NOT original balance.
 * No manufacturer assets or commercial game content copied.
 */
(function(root){"use strict";
const src="https://namu.moe/w/카르마%20온라인";
const items=[
 ["mp38","MP 38","german","smg",32,31,.115,1.85,192,38,"confirmed-description"],
 ["mp40","MP 40","german","smg",32,32,.125,1.85,192,38,"confirmed-solo-version"],
 ["kar98","Kar98k","german","rifle",5,83,.93,2.4,45,82,"confirmed-description"],
 ["kar98scope","Kar98k · Scope","german","sniper",5,99,1.22,2.8,35,100,"confirmed-description"],
 ["fg42","FG 42","german","rifle",20,43,.16,2.65,120,50,"confirmed-solo-version"],
 ["stg44","StG 44","german","rifle",30,38,.14,2.4,180,44,"later-update"],
 ["mg34","MG 34","german","lmg",50,41,.103,4.1,200,55,"confirmed-description"],
 ["luger","Luger P08","german","pistol",8,34,.31,1.7,64,24,"confirmed-description"],
 ["panzer","Panzerfaust","german","launcher",1,100,2.15,3.9,5,55,"confirmed-description"],
 ["m24","M24 Grenade","german","grenade",1,80,1.35,1.6,6,22,"historic-candidate"],
 ["riflegrenade","Rifle Grenade","german","launcher",1,85,1.8,3,8,55,"confirmed-description"],
 ["knifeg","Combat Knife","german","melee",1,120,.52,.3,1,2.25,"confirmed-description"],
 ["ppsh41","PPSh-41","soviet","smg",71,29,.09,2.4,213,32,"confirmed-description"],
 ["pps43","PPS-43","soviet","smg",35,33,.105,2.2,175,38,"confirmed-description"],
 ["mosin","Mosin-Nagant","soviet","rifle",5,83,.93,2.4,45,82,"confirmed-description"],
 ["mosinscope","Mosin-Nagant · Scope","soviet","sniper",5,99,1.22,2.8,35,100,"confirmed-description"],
 ["dp28","DP-28 Degtyaryov","soviet","lmg",47,41,.112,4.2,188,55,"confirmed-description"],
 ["tokarev","Tokarev TT-33","soviet","pistol",8,34,.31,1.7,64,24,"confirmed-description"],
 ["tommy","Tommy Gun · Thompson","soviet","smg",30,36,.125,2.55,150,38,"later-update"],
 ["bazooka","M9 Bazooka","soviet","launcher",1,100,2.15,3.9,5,55,"confirmed-description"],
 ["crossbow","Explosive Crossbow","soviet","launcher",1,95,1.12,2.1,8,28,"later-update"],
 ["rgd33","RGD-33 Grenade","soviet","grenade",1,80,1.35,1.6,6,22,"historic-candidate"],
 ["knifes","Combat Knife","soviet","melee",1,120,.52,.3,1,2.25,"confirmed-description"]
];
const weapons=Object.freeze(Object.fromEntries(items.map(([id,name,team,kind,mag,damage,rate,reload,reserve,range,confidence])=>
  [id,Object.freeze({id,name,team,kind,mag,damage,rate,reload,reserve,range,confidence,source:src})]
)));
const list=team=>Object.values(weapons).filter(w=>w.team===team);
const selected=(team,id)=>weapons[id]&&weapons[id].team===team?weapons[id]:weapons[team==="soviet"?"ppsh41":"mp38"];
root.KarmaArsenal={weapons,list,selected,source:src};
})(globalThis);
