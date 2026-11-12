import {topicsFor,topicById,conversationContext} from './conversationTopics';
import {CONVERSATION_SCRIPTS} from './conversationData';
import {PLACES} from './story';
import type {ValleyState} from './types';

export type ConversationChoice={label:string;reply:string;affinity:number};
export type ConversationScript={
  topic:string;opening:string;choices:ConversationChoice[];
  followup:string;next:ConversationChoice[];tomorrow:string;
  returnChoices?:ConversationChoice[];
};

// Choices, not modal state, determine progress. Reopening or loading resumes the
// same exchange, and a stale button can never award a second relationship change.
export function conversationView(s:ValleyState,id:string){
  const active=s.dailyConversations?.[id]?.active;
  if(active){
    const script=topicById(active.topic);if(!script)return null;
    const sets=script.next.length?[script.choices,script.next]:[script.choices];
    const step=active.choices.length,previous=step?sets[step-1]?.[active.choices[step-1]]:undefined;
    return {topic:script.topic,token:active.token,step,prompt:step===0?script.opening:step===1&&sets.length>1?script.followup:'',
      reply:previous?.reply??'',said:previous?.label??'',change:active.change,choices:sets[step]??[],waiting:false,
      recall:active.previous.length?script.choices[active.previous[0]]?.label:undefined,
      nextAvailable:step===sets.length&&!!nextConversationTopic(s,id)};
  }
  const script=CONVERSATION_SCRIPTS[id];if(!script)return null;
  const memory=s.conversations?.[id],chosen=memory?.choices??[],step=chosen.length;
  const sets=[script.choices,script.next,script.returnChoices??[]];
  const previous=step?sets[step-1]?.[chosen[step-1]]:undefined;
  const returning=step===2&&s.day>memory!.day&&!!script.returnChoices?.length;
  const prompt=step===0?script.opening:step===1?script.followup:returning?script.tomorrow:'';
  return {topic:script.topic,token:'intro',recall:undefined,nextAvailable:step>=2&&!returning&&!!nextConversationTopic(s,id),step,prompt,change:returning?0:memory?.change??0,
    reply:returning?'':previous?.reply??'',said:returning?'':previous?.label??'',
    choices:step<2||returning?sets[step]:[],
    waiting:step===2&&!returning&&!!script.returnChoices?.length,
  };
}

export function validConversations(value:ValleyState['conversations'],day:number){
  if(value===undefined)return true;
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  return Object.entries(value).every(([id,m])=>{
    const script=CONVERSATION_SCRIPTS[id];
    if(!script||!m||!PLACES[m.place]||!Number.isInteger(m.day)||m.day<1||m.day>day||!Array.isArray(m.choices)||m.choices.length<1||m.choices.length>3)return false;
    const sets=[script.choices,script.next,script.returnChoices??[]];
    if(m.choices.some((n,i)=>!Number.isInteger(n)||!sets[i]?.[n]))return false;
    if(m.change!==undefined&&(!Number.isInteger(m.change)||m.change < -1||m.change>2))return false;
    return m.choices.length===3?Number.isInteger(m.continuedDay)&&m.continuedDay!>m.day&&m.continuedDay!<=day:m.continuedDay===undefined;
  });
}

export function nextConversationTopic(s:ValleyState,id:string){
 const memory=s.dailyConversations?.[id];
 const candidates=topicsFor(s,id).filter(t=>memory?.history[t.id]?.day!==s.day&&t.id!==memory?.active?.topic);
 const priority=(t:ReturnType<typeof topicsFor>[number])=>t.kind==='story'?4:t.kind==='friend'?3:t.kind==='activity'&&!t.tags?.includes('any')?2:1;
 // New story reactions are urgent; otherwise prefer fresh topics, then least recent.
 // Day/id break ties deterministically so rendering or reload never shuffles answers.
 const order=(key:string)=>[...key].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,s.day*13+Number(id));
 candidates.sort((a,b)=>{
  const ah=memory?.history[a.id],bh=memory?.history[b.id];
  const urgentA=a.kind==='story'&&!ah?1:0,urgentB=b.kind==='story'&&!bh?1:0;
  return urgentB-urgentA||(urgentA&&urgentB?(b.storyOrder??0)-(a.storyOrder??0):0)||Number(!!ah)-Number(!!bh)||(ah?.day??0)-(bh?.day??0)||priority(b)-priority(a)||order(a.id)-order(b.id);
 });
 return candidates[0];
}

export function openConversation(s:ValleyState,id:string,next=false,token?:string){
 const old=s.dailyConversations?.[id],active=old?.active;
 if(next&&token!==(active?.token??'intro'))return false;
 const context=conversationContext(s,id),intro=s.conversations?.[id];
 const introReady=!intro||intro.choices.length<2||intro.choices.length===2&&intro.day<s.day;
 const activeScript=active&&topicById(active.topic);
 const rounds=activeScript?(activeScript.next.length?2:1):0;
 if(next&&(active?active.choices.length<rounds:(intro?.choices.length??0)<2))return false;
 // Preserve a reply already in progress. An unanswered activity can be replaced
 // when its context has ended (for example daylight at home becoming nighttime).
 const activeStillRelevant=!!active&&topicsFor(s,id).some(t=>t.id===active.topic);
 if(!next&&active&&active.day===s.day&&active.place===s.place&&active.choices.length<rounds&&(active.choices.length>0||activeStillRelevant))return false;
 // Keep an old personal story's promised followup ahead of new topics next day.
 if(!next&&introReady){
  if(active)s.dailyConversations={...s.dailyConversations,[id]:{...old!,active:undefined}};
  return !!active;
 }
 if(!next&&active&&active.day===s.day&&active.context===context.key)return false;
 const selected=nextConversationTopic(s,id);if(!selected)return false;
 const sequence=(old?.sequence??0)+1;
 s.dailyConversations={...s.dailyConversations,[id]:{sequence,history:{...old?.history},active:{topic:selected.id,token:`${id}:${s.day}:${sequence}`,day:s.day,place:s.place,context:context.key,choices:[],previous:old?.history[selected.id]?.choices??[],change:0}}};
 return true;
}

export function conversationAffinity(s:ValleyState,id:string,amount:number){
 const old=s.conversationRewards?.[id];
 const earned=old?.day===s.day?old.earned:s.daily.includes('talk-'+id)?3:0;
 const allowed=amount>0?Math.min(amount,Math.max(0,3-earned)):amount;
 const before=s.friendship[id]??0;
 s.friendship[id]=Math.max(0,Math.min(100,before+allowed));
 const delta=s.friendship[id]-before;
 s.conversationRewards={...s.conversationRewards,[id]:{day:s.day,earned:earned+Math.max(0,delta)}};
 return delta;
}

export function validDailyConversations(s:ValleyState){
 const int=(n:unknown,max=1000000)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<=max;
 if(s.conversationRewards!==undefined){
  if(!s.conversationRewards||typeof s.conversationRewards!=='object'||Array.isArray(s.conversationRewards))return false;
  if(Object.entries(s.conversationRewards).some(([id,r])=>!CONVERSATION_SCRIPTS[id]||!r||!int(r.day,s.day)||r.day<1||!int(r.earned,3)))return false;
 }
 if(s.dailyConversations===undefined)return true;
 if(!s.dailyConversations||typeof s.dailyConversations!=='object'||Array.isArray(s.dailyConversations))return false;
 return Object.entries(s.dailyConversations).every(([id,m])=>{
  if(!CONVERSATION_SCRIPTS[id]||!m||!int(m.sequence)||!m.history||typeof m.history!=='object'||Array.isArray(m.history))return false;
  const validChoices=(topic:string,choices:unknown,complete=false)=>{
   const script=topicById(topic);if(!script||script.people&&!script.people.includes(id)||!Array.isArray(choices))return false;
   const sets=script.next.length?[script.choices,script.next]:[script.choices];
   return choices.length<=sets.length&&(!complete||choices.length===sets.length)&&choices.every((n,i)=>int(n)&&!!sets[i][n]);
  };
  if(Object.entries(m.history).some(([topic,h])=>!h||!int(h.day,s.day)||h.day<1||!int(h.count)||h.count<1||!validChoices(topic,h.choices,true)))return false;
  const a=m.active;if(a===undefined)return true;
  return !!a&&int(a.day,s.day)&&a.day>0&&!!PLACES[a.place]&&a.token===`${id}:${a.day}:${m.sequence}`&&typeof a.context==='string'&&a.context.length<400&&Number.isInteger(a.change)&&a.change>=-1&&a.change<=2&&validChoices(a.topic,a.choices)&&validChoices(a.topic,a.previous);
 });
}
