import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const module={exports:{}};cache.set(file,module.exports);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',code)(s=>load(path.resolve(path.dirname(file),s+'.ts')),module,module.exports);cache.set(file,module.exports);return module.exports;}
const {newValley,act,parseSave,residentHere}=load('src/game/mistbell/engine.ts');
const {PLACES}=load('src/game/mistbell/story.ts');
const {route,sceneTargets,canReach,walkable,moveInRoom}=load('src/game/mistbell/scenes.ts');
let checked=0;
for(const place of Object.keys(PLACES))for(const minute of [600,1140]){
 const state={...newValley(),place,minute},start={x:384,y:416},targets=sceneTargets(state);
 if(minute===600&&['farm','square','bridge','forest'].includes(place))assert.ok(targets.some(t=>t.kind==='npc'),`NPC presence ${place}`);
 for(const t of targets){const points=route(place,start,t,true);assert.ok(points.length,`Reachable ${place}/${t.id}`);assert.ok(canReach(points.at(-1),t));for(const p of points)assert.ok(walkable(place,p),`Valid path ${place}/${t.id}`);if(t.kind==='npc')assert.ok(residentHere(state,t.value));checked++;}
}
let state=newValley();
for(const tool of ['seed','water','hand'])assert.equal(act(state,{type:'farmTool',index:0,tool}).state,state);
state=act(state,{type:'farmTool',index:0,tool:'hoe'}).state;
assert.equal(state.energy,98);assert.ok(state.plots[0].tilled);
assert.equal(act(state,{type:'farmTool',index:0,tool:'hoe'}).state,state);
state=act(state,{type:'farmTool',index:0,tool:'seed'}).state;
assert.equal(state.inventory.seed,5);
assert.equal(act(state,{type:'farmTool',index:0,tool:'seed'}).state,state);
for(let i=0;i<2;i++){
 state=act(state,{type:'farmTool',index:0,tool:'water'}).state;
 assert.equal(act(state,{type:'farmTool',index:0,tool:'water'}).state,state);
 state=act(state,{type:'sleep'}).state;
}
assert.equal(state.plots[0].growth,2);
assert.equal(act(state,{type:'farmTool',index:0,tool:'water'}).state,state);
state=act(state,{type:'farmTool',index:0,tool:'hand'}).state;
assert.equal(state.inventory.vegetable,1);assert.ok(state.plots[0].tilled);
assert.deepEqual(parseSave(JSON.stringify(state)),state);
const legacy=newValley();delete legacy.plots[0].tilled;legacy.plots[0].planted=true;assert.deepEqual(parseSave(JSON.stringify(legacy)),legacy);
assert.deepEqual(moveInRoom('tavern',{x:105,y:230},20,0),{x:105,y:230});
assert.equal(canReach({x:0,y:0},{x:55,y:0}),false);
console.log(`Local scenes passed: ${checked} reachable targets across all rooms/day-night; resident presence, proximity, furniture collision, ordered tools, harvest, legacy save migration.`);
const {TOOL_INFO,toolPhase}=load('src/game/mistbell/tools.ts');
for(const tool of Object.keys(TOOL_INFO)){
 const {duration,impact}=TOOL_INFO[tool];
 assert.equal(toolPhase(tool,0).impact,false);
 assert.equal(toolPhase(tool,duration*impact-1).impact,false);
 assert.equal(toolPhase(tool,duration*impact+1).impact,true);
 assert.equal(toolPhase(tool,duration).finished,true);
 assert.equal(toolPhase(tool,duration*2).progress,1);
}
console.log('Tool timing passed: all six tools have a single delayed impact and bounded completion.');

for(const start of [{x:70,y:220},{x:699,y:440}]){const path=route('square',start,{x:384,y:416});assert.ok(path.length);assert.ok(path.every(p=>walkable('square',p)));}
