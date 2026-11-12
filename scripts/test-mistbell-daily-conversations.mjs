import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const module={exports:{}};cache.set(file,module.exports);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',code)(s=>load(path.resolve(path.dirname(file),s+'.ts')),module,module.exports);cache.set(file,module.exports);return module.exports;}
const {newValley,act,parseSave,residentPlace}=load('src/game/mistbell/engine.ts');
const {conversationView}=load('src/game/mistbell/conversations.ts');
const {ALL_DAILY_TOPICS,topicsFor,conversationContext}=load('src/game/mistbell/conversationTopics.ts');
const {HOME_OF}=load('src/game/mistbell/homes.ts');
const {EVENTS}=load('src/game/mistbell/story.ts');
const ids=Array.from({length:48},(_,i)=>String(i+1));
function settled(id){return {...newValley(),day:3,minute:480,place:HOME_OF[id],companion:id==='48'?'1':'48',conversations:{[id]:{day:1,place:HOME_OF[id],choices:[0,0,0],continuedDay:2}},friendship:{[id]:0}};}
function choose(s,id,index){const v=conversationView(s,id);return act(s,{type:'conversation',id,token:v.token,step:v.step,choice:index}).state;}
function finish(s,id){let turns=0;while(conversationView(s,id).choices.length){const v=conversationView(s,id);const n=v.choices.reduce((best,c,i)=>c.affinity>v.choices[best].affinity?i:best,0);const after=choose(s,id,n);assert.notEqual(after,s,'Choice must advance '+id+'/'+v.topic);s=after;assert.ok(++turns<=2);}return s;}
function open(s,id,next=false){return act(s,{type:'openConversation',id,next,token:next?conversationView(s,id).token:undefined}).state;}
assert.equal(new Set(ALL_DAILY_TOPICS.map(t=>t.id)).size,ALL_DAILY_TOPICS.length);
assert.equal(ALL_DAILY_TOPICS.filter(t=>t.kind==='personal').length,48);
assert.equal(ALL_DAILY_TOPICS.filter(t=>t.kind==='friend').length,48);
for(const t of ALL_DAILY_TOPICS){assert.ok(t.opening&&t.choices.length>=2);assert.equal(!!t.followup,!!t.next.length);for(const flag of [...t.requires??[],...t.until??[]])assert.ok(EVENTS.some(e=>e.id===flag),'Known gate '+flag);}
let exchanges=0,recalls=0;
for(const id of ids){
 let s=settled(id),allSeen=new Set();
 for(let day=3;day<31;day++){
  s={...s,day,minute:[480,650,800,1000,1180,1320][day%6],daily:[]};s.place=residentPlace(s,id);
  const before=s.friendship[id]??0;
  s=open(s,id);assert.ok(conversationView(s,id).choices.length,'No exhausted NPC next day: '+id+'/'+day);
  const today=new Set();
  for(let count=0;count<3;count++){
   const topic=s.dailyConversations[id].active.topic;assert.ok(!today.has(topic),'No same-day repetition');today.add(topic);allSeen.add(topic);
   if(conversationView(s,id).recall)recalls++;
   const original=s;s=finish(s,id);assert.equal(original.dailyConversations[id].active.choices.length,0,'Previous state immutable');
   assert.deepEqual(parseSave(JSON.stringify(s)),s,'Save after every exchange');exchanges++;
   assert.ok((s.friendship[id]??0)-before<=3,'Daily positive cap, even across topics');
   if(s.dailyConversations[id].active.context===conversationContext(s,id).key)assert.equal(open(s,id),s,'Completed reply stays visible when reopening same context');
   if(!conversationView(s,id).nextAvailable)break;
   s=open(s,id,true);
  }
 }
 assert.ok(allSeen.size>=4,'Each resident has a continuing rotation: '+id);
}
// Save/reload mid-conversation, and stale buttons cannot affect a new topic.
let s=open(settled('12'),'12');let first=conversationView(s,'12');assert.ok(first.choices.length);
const captured={type:'conversation',id:'12',token:first.token,step:first.step,choice:0};
s=act(s,captured).state;assert.equal(act(s,captured).state,s,'Double click awards once');
s=parseSave(JSON.stringify(s));assert.equal(conversationView(s,'12').token,first.token);
s=finish(s,'12');const ended=s;s=open(s,'12',true);assert.notEqual(conversationView(s,'12').token,first.token);assert.equal(act(s,captured).state,s,'Old topic button rejected');assert.equal(act(s,{type:'openConversation',id:'12',next:true,token:conversationView(ended,'12').token}).state,s,'Double next rejected');assert.equal(open(s,'12',true),s,'Cannot skip unfinished exchange');
// Affection unlock applies immediately when reopening a completed conversation.
let bond=finish(open(settled('25'),'25'),'25');bond={...bond,friendship:{'25':30}};bond=open(bond,'25');assert.equal(bond.dailyConversations['25'].active.topic,'friend-25');
for(const id of ids){assert.ok(!topicsFor(settled(id),id).some(t=>t.kind==='friend'));assert.ok(topicsFor({...settled(id),friendship:{[id]:30}},id).some(t=>t.id==='friend-'+id));}
// Each story reaction is strictly gated and limited to the named cast.
for(const t of ALL_DAILY_TOPICS.filter(t=>t.kind==='story')){
 for(const id of t.people){let base={...settled(id),day:112,flags:[...t.requires]};assert.ok(topicsFor(base,id).some(x=>x.id===t.id));for(const missing of t.requires)assert.ok(!topicsFor({...base,flags:base.flags.filter(f=>f!==missing)},id).some(x=>x.id===t.id));if(t.until?.length)assert.ok(!topicsFor({...base,flags:[...base.flags,t.until[0]]},id).some(x=>x.id===t.id));}
 const outsider=ids.find(id=>!t.people.includes(id));assert.ok(!topicsFor({...settled(outsider),day:112,flags:t.requires},outsider).some(x=>x.id===t.id));
}
const ghost=settled('43');assert.ok(!topicsFor(ghost,'43').some(t=>t.kind==='story'));assert.ok(topicsFor({...ghost,flags:['boundary']},'43').some(t=>t.id==='story-ghost-boundary'));
// Newly reached plot takes priority; resolved worries no longer appear.
let peter=finish(open(settled('12'),'12'),'12');peter={...peter,flags:['peterPast']};peter=open(peter,'12');assert.equal(peter.dailyConversations['12'].active.topic,'story-peter-after-past');
// Actual schedule, weather and the companion's physical location select topics.
const free={...newValley(),day:112,flags:EVENTS.map(e=>e.id),houseFixed:true,harvested:2,caught:1,repaired:true,companion:'48'};
const bread={...free,minute:800,place:'square'};assert.ok(conversationContext(bread,'2').tags.includes('bread'));assert.ok(topicsFor(bread,'2').some(t=>t.id==='bread-wrap'));
const field={...free,minute:600,place:'farm'};assert.ok(topicsFor(field,'1').some(t=>t.id==='field-shade'));assert.ok(!topicsFor({...field,minute:480,place:HOME_OF['1']},'1').some(t=>t.id==='field-shade'));
const companion={...bread,companion:'2',place:'forest'};assert.ok(!conversationContext(companion,'2').tags.includes('bread'));assert.ok(topicsFor(companion,'2').some(t=>t.id==='walking-together'));
assert.ok(topicsFor({...settled('1'),day:5},'1').some(t=>t.id==='rain-slow'));assert.ok(!topicsFor({...settled('1'),day:6},'1').some(t=>t.id==='rain-slow'));
// Daylight topics stop at dusk; unanswered scenes can refresh, chosen replies persist.
const atHome=settled('12'),atNight={...atHome,minute:1320};
assert.ok(topicsFor(atHome,'12').some(t=>t.id==='home-light'));
assert.ok(!topicsFor(atHome,'12').some(t=>t.id==='home-lamp'));
assert.ok(!topicsFor(atNight,'12').some(t=>t.id==='home-light'));
assert.ok(topicsFor(atNight,'12').some(t=>t.id==='home-lamp'));
const observing={...free,day:113,minute:1050,place:'observatory'};
assert.ok(topicsFor(observing,'37').some(t=>t.id==='sky-notes'));
assert.ok(!topicsFor({...observing,minute:1100},'37').some(t=>t.id==='sky-notes'));
assert.ok(topicsFor({...observing,minute:1100},'37').some(t=>t.id==='sky-night'));
let daylight=open(atHome,'12');assert.equal(daylight.dailyConversations['12'].active.topic,'home-light');
let nightOpen=open({...daylight,minute:1320},'12');assert.notEqual(nightOpen.dailyConversations['12'].active.topic,'home-light');
daylight=choose(daylight,'12',0);const midReply={...daylight,minute:1320};assert.equal(open(midReply,'12'),midReply);
// Original promise survives switching to a different daily topic.
let promised={...settled('12'),conversations:{'12':{day:3,place:HOME_OF['12'],choices:[0,0]}},day:3};promised=finish(open(promised,'12'),'12');promised={...promised,day:4,daily:[]};promised=open(promised,'12');assert.equal(conversationView(promised,'12').token,'intro');assert.equal(conversationView(promised,'12').step,2);
assert.deepEqual(parseSave(JSON.stringify(newValley())),newValley());
assert.throws(()=>parseSave(JSON.stringify({...s,conversationRewards:{'12':{day:3,earned:99}}})));
assert.throws(()=>parseSave(JSON.stringify({...s,dailyConversations:{'12':{sequence:1,history:{},active:{topic:'future',token:'12:3:1',day:3,place:'farm',context:'',choices:[],previous:[],change:0}}}})));
console.log(`Daily conversations passed: ${ALL_DAILY_TOPICS.length} new topics, ${exchanges} exchanges across 48 residents / 28 days, ${recalls} saved callbacks; daily cap, story/affection/schedule/weather gates, legacy continuation and stale controls.`);
