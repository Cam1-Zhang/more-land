import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const cache=new Map();
function load(file) {
  file=path.resolve(file);
  if(cache.has(file))return cache.get(file);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};cache.set(file,module.exports);
  const require=specifier=>{assert.ok(specifier.startsWith('.'));return load(path.resolve(path.dirname(file),specifier+'.ts'));};
  new Function('require','module','exports',code)(require,module,module.exports);
  cache.set(file,module.exports);return module.exports;
}
const {act,newValley,chapterIndex,parseSave,placeLocked,eventReason,calendar,residentPlace,REPAIR_COST}=load('src/game/mistbell/engine.ts');
const {EVENTS,CHAPTERS,PLACES,RESIDENT_HOME,SMALL_TALK,CLUES}=load('src/game/mistbell/story.ts');
const {routeBetween}=load('src/game/mistbell/routes.ts');
const {forestResources,resourceTool}=load('src/game/mistbell/resources.ts');
let game=newValley(),steps=0;
function run(action,changes=true){
  const before=game,result=act(game,action);game=result.state;
  if(changes)assert.notEqual(game,before,`Rejected ${JSON.stringify(action)}: ${result.message}`);
  assert.deepEqual(parseSave(JSON.stringify(game)),game,'Every reachable state survives a save/load round trip');
  assert.ok(game.energy>=0&&game.energy<=100);
  assert.ok(Object.values(game.inventory).every(n=>Number.isInteger(n)&&n>=0));
  steps++;return result.message;
}
function travel(place){if(game.place!==place)run({type:'travel',place});}
function rest(){travel('farm');run({type:'sleep'});}
function energy(n,place){if(game.energy<n)rest();travel(place);}
function gather(item,count){while(game.inventory[item]<count){energy(2,'forest');const node=forestResources(game).find(n=>n.kind===item&&n.hp>0);if(!node){rest();continue;}run({type:'resource',id:node.id,tool:resourceTool(node)});}}
assert.equal(Object.keys(RESIDENT_HOME).length,48);
assert.equal(Object.keys(SMALL_TALK).length,48);
assert.equal(new Set(EVENTS.map(e=>e.id)).size,EVENTS.length);
for(const e of EVENTS){assert.ok(PLACES[e.place]);assert.ok(CHAPTERS[e.chapter].events.includes(e.id));assert.ok(e.lines.length>=2);for(const req of e.requires??[])assert.ok(EVENTS.some(x=>x.id===req));}
for(const place of Object.keys(PLACES).filter(p=>!PLACES[p].underground))for(const to of Object.keys(PLACES).filter(p=>!PLACES[p].underground&&p!==place)){
  const route=routeBetween(place,to);assert.ok(route.length>0,`Connected route ${place} to ${to}`);assert.deepEqual(route.at(-1),{x:PLACES[to].x,y:PLACES[to].y});
}
assert.equal(calendar(1).season,'春');assert.equal(calendar(29).season,'夏');assert.equal(calendar(112).date,28);assert.equal(calendar(113).year,2);
assert.ok(placeLocked(game,'sluice'));assert.ok(eventReason(game,'lastLetter'));
const initial=game;assert.equal(act(game,{type:'event',id:'lastLetter',choice:0}).state,initial);
assert.equal(act(game,{type:'plot',index:9}).state,initial);
run({type:'event',id:'letter',choice:0});
const once=game;assert.equal(act(game,{type:'event',id:'letter',choice:0}).state,once);
run({type:'event',id:'welcome',choice:0});
assert.equal(chapterIndex(game),1);
// Actual farming loop: dry soil does not advance, watering cannot be charged twice.
for(let i=0;i<6;i++)run({type:'plot',index:i});
run({type:'sleep'});assert.equal(game.plots[0].growth,0);
for(let i=0;i<6;i++)run({type:'plot',index:i});
const wet=game;assert.equal(act(game,{type:'plot',index:0}).state,wet);
run({type:'sleep'});assert.equal(game.plots[0].growth,1);
for(let i=0;i<6;i++)run({type:'plot',index:i});
run({type:'sleep'});assert.equal(game.plots[0].growth,2);
for(let i=0;i<6;i++)run({type:'plot',index:i});
assert.equal(game.harvested,6);assert.equal(game.inventory.vegetable,6);
gather('wood',4);gather('stone',2);energy(10,'farm');run({type:'fixHouse'});
travel('bridge');run({type:'fish',hit:false});assert.equal(game.caught,0);run({type:'fish',hit:true});run({type:'fish',hit:true});
for(const id of ['1','2','3','4']){travel(residentPlace(game,id));run({type:'talk',id});}
const id='4',friend=game.friendship[id];run({type:'talk',id});assert.equal(game.friendship[id],friend);
run({type:'gift',id,item:'vegetable'});const gifted=game;assert.equal(act(game,{type:'gift',id,item:'vegetable'}).state,gifted);
// Complete the entire year exclusively through public gameplay actions.
for(let chapter=1;chapter<CHAPTERS.length;chapter++){
  assert.equal(chapterIndex(game),chapter);
  if(game.day<CHAPTERS[chapter].day){travel('farm');run({type:'wait'});}
  for(const event of EVENTS.filter(e=>e.chapter===chapter)){
    travel(event.place);assert.equal(eventReason(game,event.id),null,`Available event ${event.id}`);
    if(event.choices)assert.equal(act(game,{type:'event',id:event.id,choice:99}).state,game);
    run({type:'event',id:event.id,choice:0});
  }
  if(chapter===11){
    for(const [item,count]of Object.entries(REPAIR_COST)){
      if(['wood','stone','herb'].includes(item))gather(item,count);
      else assert.ok(game.inventory[item]>=count,`Retained food supplies ${item}`);
    }
    travel('sluice');const unready=game;assert.equal(act(game,{type:'repair'}).state,unready);
    run({type:'valve',index:0});run({type:'valve',index:1});run({type:'valve',index:1});run({type:'repair'});
    assert.ok(game.repaired);assert.equal(act(game,{type:'repair'}).state,game);
  }
}
assert.equal(chapterIndex(game),14);assert.ok(game.flags.includes('lastLetter'));assert.equal(game.clues.length,Object.keys(CLUES).length);
assert.equal(game.day,112);
travel('farm');run({type:'sleep'});assert.equal(calendar(game.day).year,2);assert.equal(chapterIndex(game),14);
assert.throws(()=>parseSave('{bad'));assert.throws(()=>parseSave(JSON.stringify({...game,version:2})));
assert.throws(()=>parseSave(JSON.stringify({...game,inventory:{...game.inventory,wood:-1}})));
assert.throws(()=>parseSave(JSON.stringify({...game,flags:['not-real']})));
assert.deepEqual(initial,newValley(),'Reducer never mutates previous saves');
let shop={...newValley(),place:'square'};
shop=act(shop,{type:'buy',item:'seed'}).state;assert.equal(shop.coins,72);assert.equal(shop.inventory.seed,7);
const empty=shop;assert.equal(act(shop,{type:'sell',item:'fish'}).state,empty);
shop={...shop,inventory:{...shop.inventory,fish:2}};
shop=act(shop,{type:'sell',item:'fish'}).state;assert.equal(shop.coins,92);
shop=act(shop,{type:'request'}).state;assert.equal(shop.coins,127);assert.equal(shop.inventory.fish,0);
assert.equal(act(shop,{type:'request'}).state,shop,'Daily rewards cannot be claimed twice');
let depleted={...newValley(),place:'forest'};
for(let i=0;i<3;i++)depleted=act(depleted,{type:'gather',item:'wood'}).state;
assert.equal(act(depleted,{type:'gather',item:'wood'}).state,depleted,'Resources are limited per day');
const tired={...newValley(),place:'bridge',energy:0};assert.equal(act(tired,{type:'fish',hit:true}).state,tired);
let rain={...newValley(),day:5};rain=act(rain,{type:'plot',index:0}).state;rain=act(rain,{type:'sleep'}).state;assert.equal(rain.plots[0].growth,1,'Rain waters crops');
let friendly={...newValley(),friendship:{'6':100},inventory:{...newValley().inventory,wood:3,stone:2}};
friendly=act(friendly,{type:'fixHouse'}).state;assert.equal(friendly.friendship['6'],100);parseSave(JSON.stringify(friendly));
console.log(`Mistbell passed: ${CHAPTERS.length} chapters, ${EVENTS.length} events, ${game.clues.length} clues, ${steps} gameplay actions; farming, fishing, economy, daily limits, gates, puzzle, all 48 residents, routes and save round trips.`);

// Outdoor presentation respects schedules, companion identity and map bounds.
const {outdoorResidents,residentPose,sceneMood,FARM_PLOTS}=load('src/game/mistbell/worldScene.ts');
for(const day of [1,3,26,112])for(const minute of [480,1080,1140]) {
  const state={...game,day,minute};
  const people=outdoorResidents(state);
  assert.equal(new Set(people.map(p=>p.id)).size,people.length);
  assert.ok(!people.some(p=>p.id===state.companion));
  if(state.companion!=='43'&&residentPlace(state,'43')==='bridge')assert.ok(people.some(p=>p.id==='43'),'Ghost stays visible on the bridge');
  for(const p of people){assert.equal(p.place,residentPlace(state,p.id));for(let tick=0;tick<48;tick++){
    const pose=residentPose(p.id,tick);assert.ok(Math.abs(pose.dx)<=4);assert.ok(p.x+pose.dx>0&&p.x+pose.dx<768&&p.y>32&&p.y<512);
  }}
}
assert.equal(FARM_PLOTS.length,6);
const dayState=newValley();
assert.equal(sceneMood(dayState).night,false);
assert.equal(sceneMood(dayState,'reflection').night,true);
assert.equal(sceneMood(dayState,'storm').rain,true);
assert.equal(sceneMood(dayState,'lastLetter').night,false);
const evening=act(dayState,{type:'waitNight'}).state;
assert.equal(evening.minute,1140);assert.equal(evening.day,dayState.day);
assert.deepEqual(evening.plots,dayState.plots);assert.deepEqual(evening.inventory,dayState.inventory);
assert.equal(evening.energy,dayState.energy);
assert.equal(act(evening,{type:'waitNight'}).state,evening);
const underground={...dayState,place:'sluice'};
assert.equal(act(underground,{type:'waitNight'}).state,underground);
assert.deepEqual(parseSave(JSON.stringify(evening)),evening);
console.log('World presentation passed: outdoor schedules, Ghost, companion exclusion, walking bounds, story lighting, same-day evening wait.');
