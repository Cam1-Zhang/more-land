import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const module={exports:{}};cache.set(file,module.exports);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',code)(s=>load(path.resolve(path.dirname(file),s+'.ts')),module,module.exports);cache.set(file,module.exports);return module.exports;}
const {newValley,residentPlace}=load('src/game/mistbell/engine.ts');
const {HOME_IDS}=load('src/game/mistbell/homes.ts');
const {sceneTargets,residentActors,residentStandable,route}=load('src/game/mistbell/scenes.ts');
const {EVENTS}=load('src/game/mistbell/story.ts');
const base={...newValley(),day:112,flags:EVENTS.map(e=>e.id),houseFixed:true,harvested:2,caught:1,repaired:true};
let poses=0;
for(const place of HOME_IDS)for(const minute of [480,700,1150,1320]){
 const state={...base,place,minute};
 const expected=Array.from({length:48},(_,i)=>String(i+1)).filter(id=>residentPlace(state,id)===place);
 const actual=sceneTargets(state).filter(t=>t.kind==='npc');
 assert.deepEqual(actual.map(t=>t.value),expected,'Do not hide residents to fix overlap: '+place);
 for(const t of actual){assert.ok(residentStandable(place,t),'Body clear: '+place+'/'+t.value);assert.ok(route(place,{x:384,y:432},t,true).length,'Still approachable');}
 for(let elapsed=0;elapsed<24000;elapsed+=375)for(const npc of residentActors(state,elapsed)){assert.ok(residentStandable(place,npc),'Entire patrol stays clear: '+place+'/'+npc.value);poses++;}
}
assert.equal(residentStandable('peterHome',{x:110,y:294}),false,'Regression: Peter cannot stand on his stove');
console.log(`Resident clearance passed: ${poses} poses, all scheduled residents present and approachable.`);

const {act,parseSave,eventReason}=load('src/game/mistbell/engine.ts');
const {conversationView}=load('src/game/mistbell/conversations.ts');
const {CONVERSATION_SCRIPTS}=load('src/game/mistbell/conversationData.ts');
const {residentStory}=load('src/game/mistbell/residents.ts');
const {residentSpawn}=load('src/game/mistbell/scenes.ts');
const {GATEWAYS}=load('src/game/mistbell/connections.ts');
assert.equal(Object.keys(CONVERSATION_SCRIPTS).length,48);
let branches=0;
for(const [id,script] of Object.entries(CONVERSATION_SCRIPTS)){
 assert.equal(script.choices.length,3);assert.equal(script.next.length,2);assert.equal(script.returnChoices.length,2);
 for(const choices of [script.choices,script.next,script.returnChoices]){
  assert.equal(new Set(choices.map(c=>c.label)).size,choices.length);
  for(const c of choices)assert.ok(c.label&&c.reply&&Number.isInteger(c.affinity)&&c.affinity>=-1&&c.affinity<=2);
 }
 for(let first=0;first<3;first++)for(let second=0;second<2;second++)for(let third=0;third<2;third++){
  let s={...newValley(),friendship:{[id]:20},companion:id};
  const start=s,view=conversationView(s,id);
  assert.equal(view.prompt,script.opening);assert.equal(s,start,'Opening never awards affinity');
  assert.equal(act(s,{type:'conversation',id,step:1,choice:0}).state,s,'Cannot skip first round');
  assert.equal(act(s,{type:'conversation',id,step:0,choice:99}).state,s,'Reject invalid option');
  s=act(s,{type:'conversation',id,step:0,choice:first}).state;
  assert.equal(start.conversations,undefined,'Immutable previous save');
  assert.equal(s.friendship[id],20+script.choices[first].affinity);
  assert.equal(conversationView(s,id).reply,script.choices[first].reply);
  assert.equal(act(s,{type:'conversation',id,step:0,choice:(first+1)%3}).state,s,'Duplicate/stale click cannot change answer or reward');
  s=parseSave(JSON.stringify(s));assert.equal(conversationView(s,id).step,1,'Reload resumes round two');
  s=act(s,{type:'conversation',id,step:1,choice:second}).state;
  assert.equal(s.friendship[id],20+script.choices[first].affinity+script.next[second].affinity);
  assert.equal(conversationView(s,id).choices.length,0,'Tomorrow followup is locked today');
  assert.equal(act(s,{type:'conversation',id,step:2,choice:third}).state,s);
  s={...s,day:s.day+1,daily:[]};assert.equal(conversationView(s,id).prompt,script.tomorrow);
  s=act(s,{type:'conversation',id,step:2,choice:third}).state;
  assert.equal(conversationView(s,id).reply,script.returnChoices[third].reply);
  assert.equal(conversationView(s,id).choices.length,0);
  assert.equal(s.friendship[id],20+script.choices[first].affinity+script.next[second].affinity+script.returnChoices[third].affinity);
  assert.equal(act(s,{type:'conversation',id,step:2,choice:third}).state,s);
  assert.deepEqual(parseSave(JSON.stringify(s)),s);
  const reward=s.friendship[id];s=act(s,{type:'talk',id}).state;assert.equal(s.friendship[id],reward,'Greeting cannot stack with branch reward');
  assert.equal(s.flags.length,0,'Daily chat cannot unlock or reveal plot events');branches++;
 }
 const early={...newValley(),companion:id,place:residentPlace(newValley(),id)};
 const story=residentStory(early,id);if(story)assert.equal(eventReason(early,story.id),null);
 const hidden={...early,day:1,place:'heart'};assert.equal(residentStory(hidden,id),undefined,'No future chapter dialogue');
}
const lower={...newValley(),companion:'1'};const negative=CONVERSATION_SCRIPTS['1'].choices.findIndex(c=>c.affinity<0);
assert.equal(act(lower,{type:'conversation',id:'1',step:0,choice:negative}).state.friendship['1'],0);
const upper={...lower,friendship:{'1':100}};const positive=CONVERSATION_SCRIPTS['1'].choices.findIndex(c=>c.affinity>0);
assert.equal(act(upper,{type:'conversation',id:'1',step:0,choice:positive}).state.friendship['1'],100);
assert.throws(()=>parseSave(JSON.stringify({...lower,conversations:{'1':{day:1,place:'farm',choices:[999]}}})));
assert.throws(()=>parseSave(JSON.stringify({...lower,conversations:{'1':{day:1,place:'farm',choices:[0,0,0],continuedDay:1}}})));
const away={...newValley(),place:'peterHome',companion:'2'};assert.equal(act(away,{type:'conversation',id:'1',step:0,choice:0}).state,away,'Cannot talk to absent resident');
for(const place of HOME_IDS)for(const gate of GATEWAYS[place]){
 const entry=GATEWAYS[gate.to].find(g=>g.to===place).spawn;
 const spawn=residentSpawn(place,{x:entry.x-28,y:entry.y});
 assert.ok(residentStandable(place,spawn),'Companion spawn clear '+place);
}
console.log(`Conversations passed: ${branches} complete choice paths across 48 residents; persisted replies, day gates, bounds, stale clicks, story gates and old-save compatibility.`);
