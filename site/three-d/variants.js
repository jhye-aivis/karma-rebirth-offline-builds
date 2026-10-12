/* Wave23 deterministic modular outfit slots. No per-bot cloned GPU geometry:
 * the six role-tagged equipment meshes live in TWO shared original CC0 GLBs. */
(function(root){"use strict";
const manifest={"version":23,"source":"self-authored CC0-base role mesh attachments, single GLB per faction","german":[{"id":"G01","faction":"german","role":"assault","body":"german_cc0_wave23","helmet":"stahlhelm","vest":"feldgrau","pouches":"mp40_triple_stick","backpack":"gasmask_canister","accessories":["webbing","gasmask"],"weapon":"mp40","lodProfile":"infantry","hideBaseGear":false},{"id":"G02","faction":"german","role":"rifleman","body":"german_cc0_wave23","helmet":"stahlhelm","vest":"field_jacket","pouches":"rifle_cartridge","backpack":"large_rucksack","accessories":["blanket_roll","canteen","cleaning_rod"],"weapon":"kar98","lodProfile":"infantry","hideBaseGear":false},{"id":"G03","faction":"german","role":"scout","body":"german_cc0_wave23","helmet":"stahlhelm","vest":"light_jacket","pouches":"minimal","backpack":"small_satchel","accessories":["light_cross_strap","mess_tin"],"weapon":"mp40","lodProfile":"scout","hideBaseGear":true}],"soviet":[{"id":"S01","faction":"soviet","role":"assault","body":"soviet_cc0_wave23","helmet":"ssh40","vest":"gymnastiorka","pouches":"ppsh_drum_pouches","backpack":"large_haversack","accessories":["blanket_roll","canteen"],"weapon":"ppsh41","lodProfile":"infantry","hideBaseGear":false},{"id":"S02","faction":"soviet","role":"rifleman","body":"soviet_cc0_wave23","helmet":"ssh40","vest":"rifle_tunic","pouches":"762_cartridge","backpack":"field_straps","accessories":["canteen","shovel"],"weapon":"mosin","lodProfile":"infantry","hideBaseGear":false},{"id":"S03","faction":"soviet","role":"scout","body":"soviet_cc0_wave23","helmet":"ssh40","vest":"light_tunic","pouches":"minimal","backpack":"small_satchel","accessories":["breadbag","short_bedroll"],"weapon":"ppsh41","lodProfile":"scout","hideBaseGear":true}]};
function stableHash(text){
 let h=2166136261;
 for(const ch of String(text)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}
 return h>>>0;
}
function pick(team,id,seed=3){
 const parts=manifest[team==="soviet"?"soviet":"german"];
 const pos=(stableHash(String(id)+":"+seed+":"+team)%parts.length);
 return parts[pos];
}
function cycle(team,index){const arr=manifest[team==="soviet"?"soviet":"german"];return arr[((index%arr.length)+arr.length)%arr.length];}
root.KarmaWave23Variants={manifest,pick,cycle,stableHash};
})(globalThis);
