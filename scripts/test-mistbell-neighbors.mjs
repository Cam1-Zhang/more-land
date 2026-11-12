import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import ts from 'typescript';
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const module={exports:{}};cache.set(file,module.exports);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',code)(s=>load(path.resolve(path.dirname(file),s+'.ts')),module,module.exports);cache.set(file,module.exports);return module.exports;}
const {HOMES,HOME_OF,HOME_IDS,LEGACY_HOME_PLACES}=load('src/game/mistbell/homes.ts');
const {RELATIONSHIPS,ROMANCES,bondEvent,LIFE_SCENES,activeLifeScenes,lifeAt}=load('src/game/mistbell/social.ts');
const {GATEWAYS,OPPOSITE,gatewayAt}=load('src/game/mistbell/connections.ts');
const {newValley,act,parseSave,residentPlace}=load('src/game/mistbell/engine.ts');
const {EVENTS}=load('src/game/mistbell/story.ts');
const {route,sceneTargets}=load('src/game/mistbell/scenes.ts');
const {WORLD_TILES,ROAD_IDS}=load('src/game/mistbell/world.ts');
const {furnitureAt}=load('src/game/mistbell/furniture.ts');
const {walkable}=load('src/game/mistbell/scenes.ts');
const {residentPlan}=load('src/game/mistbell/residents.ts');
const ids=HOME_IDS.flatMap(h=>HOMES[h].residents);
assert.equal(ids.length,48);assert.equal(new Set(ids).size,48);assert.equal(HOME_IDS.length,24);
assert.equal(RELATIONSHIPS.length,60);assert.deepEqual(new Set(RELATIONSHIPS.flatMap(r=>r.ids)),new Set(ids));
assert.equal(Object.keys(ROMANCES).length,6);
const free={...newValley(),day:112,minute:1020,flags:EVENTS.map(e=>e.id),houseFixed:true,harvested:2,caught:1,repaired:true,friendship:Object.fromEntries(ids.map(id=>[id,100]))};
let pairs=0;
for(const [from,gates] of Object.entries(GATEWAYS))for(const gate of gates){
 const reverse=GATEWAYS[gate.to].find(g=>g.to===from);assert.ok(reverse);
 assert.equal(gate.heading,OPPOSITE[reverse.heading]);assert.equal(gate.spawn.facing,gate.heading);
 assert.equal(reverse.spawn.facing,reverse.heading);
 assert.equal(Math.hypot(reverse.spawn.x-gate.x,reverse.spawn.y-gate.y),56,'Exit returns to the same doorway');
 assert.ok(route(gate.to,gate.spawn,reverse).length);assert.equal(gatewayAt(gate.to,gate.spawn),undefined);
 if(WORLD_TILES[from]&&WORLD_TILES[gate.to]){
  const a=WORLD_TILES[from],b=WORLD_TILES[gate.to];
  const direction={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[gate.heading];
  assert.deepEqual([b[0]-a[0],b[1]-a[1]],direction,`Atlas adjacency ${gate.id}`);
  assert.equal(gate.axis==='horizontal'?gate.y:gate.x,gate.axis==='horizontal'?reverse.y:reverse.x,`Aligned seam ${gate.id}`);
 }
 pairs++;
}
for(const home of HOME_IDS){
 for(const id of HOMES[home].residents)assert.equal(HOME_OF[id],home);
 assert.equal(GATEWAYS[home].length,1);assert.equal(GATEWAYS[home][0].to,HOMES[home].district);
 for(const f of furnitureAt(home)){assert.ok(route(home,{x:384,y:432},f,true).length,`Reach ${home}/${f.id}`);assert.equal(walkable(home,{x:f.rect.x+f.rect.w/2,y:f.rect.y+f.rect.h/2}),false,`Solid ${home}/${f.id}`);}
}
for(const id of ids)assert.equal(residentPlace({...free,minute:480},id),HOME_OF[id],'All residents have a morning home');
let personal=0;
for(const [id,r] of Object.entries(ROMANCES))for(const choice of ['friend','dating']){
 let state={...free,bonds:{},friendship:{...free.friendship}};
 for(let stage=0;stage<3;stage++){
  state={...state,day:112+stage,place:r.events[stage].place};assert.equal(residentPlace(state,id),state.place);
  assert.equal(bondEvent(state,id)?.stage,stage);
  if(stage===2)assert.equal(act(state,{type:'bond',id}).state,state,'Romance never auto-confirms');
  const before=state;state=act(state,{type:'bond',id,choice:stage===2?choice:undefined}).state;
  assert.equal(state.bonds[id].stage,stage+1);assert.equal(before.bonds[id]?.stage??0,stage);
  assert.deepEqual(parseSave(JSON.stringify(state)),state);
  assert.equal(act(state,{type:'bond',id,choice}).state,state,'No replay on the same day');personal++;
 }
 assert.equal(state.bonds[id].status,choice);
}
const ghost={...free,place:'ghostHome',bonds:{'43':{stage:2,status:'friend',day:111}},flags:free.flags.filter(f=>f!=='lastMemory')};
assert.equal(bondEvent(ghost,'43'),null,'Ghost route respects memory reveal');
for(const e of LIFE_SCENES){const s={...free,minute:1200,place:e.place,lifeSeen:LIFE_SCENES.filter(other=>other.id!==e.id).map(other=>other.id),bonds:{'48':{stage:2,status:'friend',day:111}}};assert.ok(e.ready(s));const after=act(s,{type:'life',id:e.id}).state;assert.ok(after.lifeSeen.includes(e.id));assert.equal(act(after,{type:'life',id:e.id}).state,after);assert.deepEqual(parseSave(JSON.stringify(after)),after);}
let gift={...free,place:'bridge',companion:'43',inventory:{...free.inventory,stone:1,bread:1},friendship:{...free.friendship,'43':0}};
assert.equal(act(gift,{type:'gift',id:'43',item:'bread'}).state,gift,'Ghost does not eat');
gift=act(gift,{type:'gift',id:'43',item:'stone'}).state;assert.equal(gift.friendship['43'],9);assert.equal(gift.inventory.stone,0);
assert.deepEqual(parseSave(JSON.stringify(newValley())),newValley(),'Old saves need no reset');
for(const road of ROAD_IDS){
 assert.equal(GATEWAYS[road].filter(g=>g.kind==='road').length,2);
 assert.equal(parseSave(JSON.stringify({...free,place:road})).place,road);
 assert.ok([600,660,720,780,840,900].some(minute=>ids.some(id=>residentPlan({...free,minute},id,14).place===road)),`Resident outings ${road}`);
}
const artSource=fs.readFileSync('src/game/mistbell/sceneArt.ts','utf8');
const artFiles=[...artSource.matchAll(/require\('([^']+)'\)/g)].map(m=>path.resolve('src/game/mistbell',m[1]));
assert.equal(artFiles.length,Object.keys(GATEWAYS).length);
for(const file of artFiles){const image=fs.readFileSync(file);assert.equal(image.readUInt32BE(16),1536);assert.equal(image.readUInt32BE(20),1024);}
assert.throws(()=>parseSave(JSON.stringify({...free,bonds:{'43':{stage:1,status:'dating',day:112}}})));
assert.throws(()=>parseSave(JSON.stringify({...free,lifeSeen:['unknown']})));

assert.equal(HOME_IDS.filter(h=>HOMES[h].kind==='family').length,16);
assert.equal(HOME_IDS.filter(h=>HOMES[h].kind==='solo').length,8);
for(const [oldPlace,newPlace] of Object.entries(LEGACY_HOME_PLACES))assert.deepEqual(parseSave(JSON.stringify({...free,place:oldPlace})),{...free,place:newPlace},'Legacy move preserves all progress');
for(const home of HOME_IDS){
 const s={...free,place:home,energy:40,minute:1200,inventory:{...free.inventory,vegetable:2}};
 assert.equal(act(s,{type:'sleep'}).state,s,'No sleep in another household, including romance homes');
 for(const f of furnitureAt(home)){
  if(f.kind==='bed')for(const use of ['rest','cook','read'])assert.equal(act(s,{type:'furniture',id:f.id,use}).state,s,'Beds inspect only');
  if(f.kind==='chair'){const next=act(s,{type:'furniture',id:f.id,use:'rest'}).state;assert.equal(next.minute,1210);assert.equal(next.day,s.day);assert.equal(next.energy,48);}
  if(f.kind==='kitchen'){const next=act(s,{type:'furniture',id:f.id,use:'cook'}).state;assert.equal(next.inventory.vegetable,1);assert.equal(next.energy,60);assert.equal(next.minute,1220);assert.equal(act(next,{type:'furniture',id:f.id,use:'cook'}).state,next);}
 }
}
assert.ok(furnitureAt('ghostHome').every(f=>!['bed','kitchen'].includes(f.kind)));
const late={...free,place:'hankFamilyHome',minute:1315,energy:50};
const rest=act(late,{type:'furniture',id:'sofa',use:'rest'}).state;assert.equal(rest.minute,1320);assert.equal(rest.day,late.day);assert.equal(act(rest,{type:'furniture',id:'sofa',use:'rest'}).state,rest);
assert.equal(act({...free,place:'farm'},{type:'sleep'}).state.day,free.day+1,'Own farmhouse still supports sleep');
console.log(`Neighbors passed: 48 residents in 24 homes, 60 relations, ${pairs} directional entrances, ${personal} personal-event choices, ${LIFE_SCENES.length} life scenes, furniture, bed permissions and legacy migration.`);


for(let day=112;day<119;day++){const s={...free,day,minute:1200,bonds:{'48':{stage:2,status:'friend',day:111}}};const events=activeLifeScenes(s),cast=events.flatMap(e=>e.ids);assert.equal(new Set(cast).size,cast.length,'No double-booked visitors');for(const e of events)for(const id of e.ids)assert.equal(residentPlace(s,id),e.place,'Gathering cast actually attends');}
assert.equal(lifeAt({...free,minute:1200,place:'hankFamilyHome'},[]),undefined,'No dialogue with absent participants');

assert.deepEqual(HOMES.socratesFamilyHome.residents,['41']);
assert.equal(HOMES.socratesFamilyHome.kind,'solo');
assert.equal(furnitureAt('socratesFamilyHome').filter(f=>f.kind==='bed').length,1);
assert.equal(RELATIONSHIPS.some(r=>r.family&&r.ids.includes('41')),false,'Socrates has no relatives');
assert.equal(HOME_OF['32'],'ritaBenHome');assert.equal(HOME_OF['5'],'ritaBenHome');

const {HOME_INTERIORS}=load('src/game/mistbell/homeInteriors.ts');
assert.equal(new Set(HOME_IDS.map(h=>JSON.stringify(HOME_INTERIORS[h].rooms))).size,24,'Every home has its own geometry');
for(const home of HOME_IDS){
 const plan=HOME_INTERIORS[home];
 for(const room of plan.rooms)assert.ok(route(home,{x:384,y:432},{x:room.x+room.w/2,y:room.y+room.h/2},true).length,`Room reachable: ${home}/${room.role}`);
 for(const minute of [480,1200,1320])for(const npc of sceneTargets({...free,place:home,minute}).filter(t=>t.kind==='npc'))assert.ok(walkable(home,npc),`Resident on floor: ${home}/${npc.value}`);
}
const legacyFamily={...free,journal:[{day:1,text:'白石问答屋 · Socrates是Rita和Ben的父亲；Rita是Ben的姐姐。'}]};
assert.ok(!parseSave(JSON.stringify(legacyFamily)).journal[0].text.includes('父亲'));

const homeArts=HOME_IDS.map(h=>path.resolve('assets/mistbell/scenes/homes',h+'-plan.png'));
assert.equal(new Set(homeArts.map(p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'))).size,24,'24 distinct finished house paintings');
for(const h of HOME_IDS){
 assert.ok(artSource.includes("homes/"+h+"-plan.png"),'Scene and atlas use individual home art');
 const expected={solo:1,two:2,three:3,couple:1,generations:3,ghost:0}[HOMES[h].layout];
 assert.equal(furnitureAt(h).filter(f=>f.kind==='bed').length,expected,'Beds match household '+h);
}
