import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const module={exports:{}};cache.set(file,module.exports);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',code)(s=>load(path.resolve(path.dirname(file),s+'.ts')),module,module.exports);cache.set(file,module.exports);return module.exports;}
const {newValley,act,parseSave,chapterIndex,residentPlace}=load('src/game/mistbell/engine.ts');
const {GATEWAYS,gatewayAt,nextRoad}=load('src/game/mistbell/connections.ts');
const {initialResources,forestResources,renewResources,resourceTool,resourceYield}=load('src/game/mistbell/resources.ts');
const {route,walkable,canReach,sceneTargets,residentActors,nearbyTarget}=load('src/game/mistbell/scenes.ts');
const {residentPlan}=load('src/game/mistbell/residents.ts');
const {EVENTS}=load('src/game/mistbell/story.ts');

let roads=0;
for(const [place,gates] of Object.entries(GATEWAYS))for(const gate of gates){
 assert.ok(GATEWAYS[gate.to].some(g=>g.to===place));
 assert.ok(walkable(gate.to,gate.spawn),`Arrival ${gate.id}`);
 assert.equal(gatewayAt(gate.to,gate.spawn),undefined,`No bounce ${gate.id}`);
 const path=route(place,{x:384,y:416},gate);
 assert.ok(path.length&&gatewayAt(place,path.at(-1))?.id===gate.id,`Walk into ${gate.id}`);
 for(const outgoing of GATEWAYS[gate.to])assert.ok(route(gate.to,gate.spawn,outgoing).length,`Walk from ${gate.id} to ${outgoing.id}`);
 roads++;
}
for(const from of Object.keys(GATEWAYS))for(const to of Object.keys(GATEWAYS))if(from!==to)assert.ok(nextRoad(from,to));

let state={...newValley(),place:'forest'};
const herbTarget=sceneTargets(state).find(t=>t.kind==='gather'&&t.tool==='hand');
const companion={id:'companion',kind:'npc',value:'1',x:herbTarget.x+25,y:herbTarget.y};
assert.equal(nearbyTarget([companion,herbTarget],companion,'hand',state.plots).id,herbTarget.id,'Picking herbs takes priority over talking to the follower');
const initial=forestResources(state),large=initial.find(n=>n.kind==='stone'&&n.size===3);
assert.equal(large.maxHp,4);
const hit={type:'resource',id:large.id,tool:'pick'};
assert.equal(act(state,{...hit,tool:'axe'}).state,state);
assert.equal(act({...state,energy:0},hit).state.energy,0);
for(let i=1;i<=4;i++){
 const before=state;state=act(state,hit).state;
 assert.equal(forestResources(before).find(n=>n.id===large.id).hp,5-i,'Reducer does not mutate previous resource state');
 assert.equal(state.resources.find(n=>n.id===large.id).hp,4-i);
 assert.equal(state.energy,100-2*i);assert.equal(state.minute,480+5*i);
 assert.equal(state.inventory.stone,i===4?6:0,'Reward only on final impact');
 state=parseSave(JSON.stringify(state));
}
assert.ok(!sceneTargets(state).some(t=>t.id===large.id),'Depleted object disappears');
assert.equal(act(state,hit).state,state,'No duplicate reward');
const returnTrip=act(act(state,{type:'travel',place:'square'}).state,{type:'travel',place:'forest'}).state;
assert.equal(returnTrip.resources.find(n=>n.id===large.id).hp,0,'Walking away does not regenerate');
const due=state.resources.find(n=>n.id===large.id).respawnDay;
const survivor=state.resources.find(n=>n.hp>0);
for(let day=2;day<=due;day++){
 state=act({...state,place:'farm'},{type:'sleep'}).state;
 const n=state.resources.find(n=>n.id===large.id);
 assert.equal(n.hp,day<due?0:4);
 assert.deepEqual(state.resources.find(n=>n.id===survivor.id),survivor,'Untouched resources remain');
 if(day===due)assert.ok(Math.hypot(n.x-large.x,n.y-large.y)>50,'Respawn in a different location');
}
for(const n of initial){
 let s={...newValley(),place:'forest'};
 for(let i=0;i<n.maxHp;i++)s=act(s,{type:'resource',id:n.id,tool:resourceTool(n)}).state;
 assert.equal(s.inventory[n.kind],resourceYield(n));assert.equal(s.resources.find(r=>r.id===n.id).hp,0);
}
let spawnChecks=0;
for(let day=1;day<=112;day++){
 const nodes=initialResources(day);
 const renewed=renewResources(nodes.map(n=>({...n,hp:0,respawnDay:day+1})),day+1);
 for(const list of [nodes,renewed])for(const n of list){
  assert.ok(walkable('forest',n));
  assert.ok(list.every(other=>other.id===n.id||Math.hypot(other.x-n.x,other.y-n.y)>52),'No overlapping resources');
  const path=route('forest',{x:384,y:448},n,true,list);
  assert.ok(path.length&&canReach(path.at(-1),n),`Reach resource ${day}/${n.id}`);
  assert.ok(path.every(p=>walkable('forest',p,list)));
  spawnChecks++;
 }
 for(const gate of GATEWAYS.forest)assert.ok(route('forest',{x:384,y:448},gate,false,nodes).length,'Road never blocked');
}
const free={...newValley(),day:112,flags:EVENTS.map(e=>e.id),houseFixed:true,harvested:2,caught:1,repaired:true,friendship:{'1':3,'2':3,'3':3,'4':3}};
let moving=false,resting=false,poses=0;
for(const minute of [480,750,1000,1200]){
 const s={...free,minute};
 const all=Object.keys(GATEWAYS).flatMap(place=>sceneTargets({...s,place}).filter(t=>t.kind==='npc'));
 assert.equal(all.length,48);assert.equal(new Set(all.map(t=>t.value)).size,48);
 for(const place of Object.keys(GATEWAYS))for(const ms of [0,7000,12000,17000])for(const npc of residentActors({...s,place},ms)){
  assert.equal(residentPlace(s,npc.value),place);
  assert.ok(walkable(place,npc,place==='forest'?forestResources(s):[]),`NPC ground ${place}/${npc.value}`);
  if(npc.frame>0)moving=true;else resting=true;poses++;
 }
}
assert.ok(moving&&resting);
assert.equal(residentPlace({...free,minute:480},'2'),'victorFamilyHome');
assert.equal(residentPlace({...free,minute:750},'2'),'square');
assert.equal(residentPlace({...free,minute:1320},'2'),'victorFamilyHome');
const investigating={...free,day:32,flags:EVENTS.filter(e=>e.chapter<4).map(e=>e.id)};
assert.equal(chapterIndex(investigating),4);
assert.ok(residentPlan(investigating,'6',4).story,'Story participants follow chapter events');
assert.deepEqual(act(newValley(),{type:'clock'}).state.minute,485);
console.log(`Living world passed: ${roads} paired road crossings, all connected trips, saved multi-hit mining/all resource kinds, ${spawnChecks} resource placements, ${poses} resident poses, schedules and story overrides.`);
