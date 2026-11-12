import {LEGACY_HOME_PLACES,HOMES,isHome} from './homes';
import {furnitureById} from './furniture';
import {bondEvent,ROMANCES,LIFE_SCENES,lifeAt} from './social';
import {forestResources,renewResources,resourceTool,resourceName,resourceYield,validResources} from './resources';
import {residentPlan} from './residents';
import {conversationView,validConversations,openConversation,conversationAffinity,validDailyConversations} from './conversations';
import {topicById} from './conversationTopics';
import { CHAPTERS, CLUES, EVENTS, PLACES, RESIDENT_HOME } from './story';
import type { Action, Item, Place, ValleyState } from './types';
export const SAVE_KEY = 'mistbell_valley_save_v1';
export const ITEM_NAMES: Record<Item, string> = { seed: '种子', wood: '木材', stone: '石料', herb: '草药', vegetable: '蔬菜', fish: '河鱼', bread: '面包' };
export const VALVE_NAMES = ['保留', '农田', '泄洪'];
export const REPAIR_COST: Partial<Record<Item, number>> = { wood: 6, stone: 6, vegetable: 2, fish: 2, herb: 2 };
export function newValley(): ValleyState {
  return { version: 1, day: 1, minute: 480, energy: 100, coins: 80, place: 'farm',
    inventory: { seed: 6, wood: 0, stone: 0, herb: 0, vegetable: 0, fish: 0, bread: 1 },
    plots: Array.from({ length: 6 }, () => ({ planted: false, growth: 0, watered: false })),
    flags: [], clues: [], friendship: {}, daily: [], harvested: 0, caught: 0,
    houseFixed: false, valves: [0, 0, 0], repaired: false, companion: '1', journal: [] };
}
export function chapterComplete(state: ValleyState, index: number) {
  const c = CHAPTERS[index];
  return c.events.every(id => state.flags.includes(id))
    && (!c.life || (state.houseFixed && state.harvested >= 2 && state.caught >= 1 && Object.keys(state.friendship).length >= 4))
    && (!c.repair || state.repaired);
}
export function chapterIndex(state: ValleyState) { const index = CHAPTERS.findIndex((_, i) => !chapterComplete(state, i)); return index < 0 ? CHAPTERS.length : index; }
export function calendar(day: number) { const n = day - 1; return { year: Math.floor(n / 112) + 1, season: ['春', '夏', '秋', '冬'][Math.floor(n % 112 / 28)], date: n % 28 + 1 }; }
export function dateLabel(day: number) { const c = calendar(day); return `第${c.year}年 · ${c.season} ${c.date}日`; }
export function timeLabel(minute: number) { return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`; }
export function weather(state: ValleyState) { return state.day === 26 || state.day % 5 === 0 ? '雨' : '晴'; }
export function placeLocked(state: ValleyState, place: Place): string | null {
  const ch = chapterIndex(state);
  if (place === 'cabin' && ch < 4) return '钟声响起后，跟随 Frank 找到木屋。';
  if (place === 'canal' && ch < 4) return '先调查暮春的两声钟。';
  if (place === 'observatory' && ch < 4) return '旧事浮现之后，再去拜访 Mori。';
  if (place === 'sluice' && !state.flags.includes('canalMap')) return '先按 Widow 的地图打开水渠入口。';
  if (place === 'door' && ch < 8) return '查清水流变化后，才能深入检修区。';
  if (place === 'heart' && ch < 10) return '先与 Ghost 约好重返事故现场。';
  return null;
}
export function eventReason(state: ValleyState, id: string): string | null {
  const event = EVENTS.find(e => e.id === id);
  if (!event) return '没有这个事件。';
  if (state.flags.includes(id)) return '已经记录在手记里。';
  if (event.chapter !== chapterIndex(state)) return '先完成当前章节。';
  if (state.day < CHAPTERS[event.chapter].day) return `故事将在${dateLabel(CHAPTERS[event.chapter].day)}继续，可在农舍度过平静的日子。`;
  if (event.place !== state.place) return `前往${PLACES[event.place].name}。`;
  if (event.requires?.some(flag => !state.flags.includes(flag))) return '先完成本章前面的调查。';
  if (event.itemCost && !hasItems(state, event.itemCost)) return '背包里的材料还不够。';
  return null;
}
export function objectives(state: ValleyState) {
  const ch = chapterIndex(state); if (ch >= CHAPTERS.length) return [{ label: '第一年主线完成 · 继续你的山谷生活', done: true, place: 'farm' as Place }];
  const list = EVENTS.filter(e => e.chapter === ch).map(e => ({ label: e.title, done: state.flags.includes(e.id), place: e.place }));
  if (CHAPTERS[ch].life) list.push(
    { label: '修补农舍（木材3、石料2）', done: state.houseFixed, place: 'farm' },
    { label: `收获作物 ${Math.min(state.harvested,2)}/2`, done: state.harvested >= 2, place: 'farm' },
    { label: `钓到河鱼 ${Math.min(state.caught,1)}/1`, done: state.caught >= 1, place: 'bridge' },
    { label: `认识邻居 ${Math.min(Object.keys(state.friendship).length,4)}/4`, done: Object.keys(state.friendship).length >= 4, place: 'square' },
  );
  if (CHAPTERS[ch].repair) list.push({ label: '准备材料、调好三道闸门、恢复水流', done: state.repaired, place: 'sluice' });
  return list;
}
export const SCENE_HOSTS:Partial<Record<Place,string[]>>={};
export function residentHere(state:ValleyState,id:string){return id===state.companion||residentPlace(state,id)===state.place;}
export function residentPlace(state:ValleyState,id:string):Place{return residentPlan(state,id,chapterIndex(state)).place;}
export function hasItems(state: ValleyState, cost: Partial<Record<Item, number>>) { return Object.entries(cost).every(([item, count]) => state.inventory[item as Item] >= count!); }
function pay(state: ValleyState, cost: Partial<Record<Item, number>>) { Object.entries(cost).forEach(([item,count]) => { state.inventory[item as Item] -= count!; }); }
function note(state: ValleyState, text: string) { state.journal = [...state.journal, { day: state.day, text }].slice(-180); }
function spend(state: ValleyState, energy: number, minutes = 15) { state.energy -= energy; state.minute = Math.min(1320, state.minute + minutes); }
function nextDay(state: ValleyState) {
  state.plots = state.plots.map(p => ({ ...p, growth: p.planted && (p.watered || weather(state) === '雨') ? Math.min(2, p.growth + 1) : p.growth, watered: false }));
  state.resources=renewResources(forestResources(state),state.day+1);
  state.day++; state.minute = 480; state.energy = 100; state.daily = [];
}
export function dailyRequest(state: ValleyState) {
  return ([{ item: 'vegetable', count: 2, who: 'Momo', id: '2' }, { item: 'fish', count: 1, who: 'Hank', id: '23' }, { item: 'herb', count: 2, who: 'Mia', id: '20' }] as const)[state.day % 3];
}
export function act(before: ValleyState, action: Action): { state: ValleyState; message: string } {
  const s: ValleyState = { ...before, inventory: { ...before.inventory }, plots: before.plots.map(p => ({ ...p })), flags: [...before.flags], clues: [...before.clues], friendship: { ...before.friendship }, daily: [...before.daily], valves: [...before.valves], journal: [...before.journal] };
  const fail = (message: string) => ({ state: before, message });
  const need = (energy: number) => s.energy >= energy;
  let message = '';
  switch (action.type) {
    case 'furniture': {
      const f=furnitureById(s.place,action.id);
      if(!f||!isHome(s.place))return fail('走近家里的家具再使用。');
      // NPC beds intentionally expose no action, even for friends or romantic partners.
      if(action.use==='rest'){
        if(f.kind!=='chair')return fail('只有椅子可以坐下休息。');
        if(s.minute>=1320)return fail('夜深了，可以回自己的农舍睡觉。');
        const rests=s.daily.filter(k=>k.startsWith('furniture-rest-')).length;
        s.minute=Math.min(1320,s.minute+10);
        if(rests<3){s.energy=Math.min(100,s.energy+8);s.daily.push('furniture-rest-'+rests);}
        message=rests<3?'坐着休息了 10 分钟，恢复 8 体力。':'安静坐了 10 分钟。今天已经休息得足够了。';
      }else if(action.use==='cook'){
        if(f.kind!=='kitchen')return fail('要在厨房料理台做饭。');
        const key='home-meal-'+s.place;
        if(s.daily.includes(key))return fail('今天已经在这里做过饭了。');
        if(s.minute>1300)return fail('夜深了，明天再来做饭吧。');
        if(s.inventory.vegetable<1)return fail('需要带 1 份自己的蔬菜。');
        if(s.energy>=100)return fail('现在体力充足，留到需要时再做吧。');
        s.inventory.vegetable--;s.energy=Math.min(100,s.energy+20);s.minute+=20;s.daily.push(key);
        message='用自己的蔬菜煮了一碗热汤，恢复 20 体力。';
      }else if(action.use==='read'){
        if(!['table','shelf','desk','album'].includes(f.kind))return fail('这里没有可以阅读的东西。');
        const key='furniture-read-'+s.place+'-'+f.id;
        if(s.daily.includes(key))return fail('这段家中小事已经记在今天的手记里了。');
        s.daily.push(key);note(s,HOMES[s.place].name+' · '+HOMES[s.place].relations);
        message='把这户人家的关系记进了手记。';
      }else return fail('这个物件不能这样使用。');
      break;
    }
    case 'bond': {
      const e=bondEvent(s,action.id);if(!e||!residentHere(s,action.id))return fail('等合适的时候，走近对方再聊吧。');
      if(e.choice&&!['friend','dating'].includes(action.choice??''))return fail('这份关系由你来选择。');
      s.bonds={...s.bonds,[action.id]:{stage:e.stage+1,status:e.choice?action.choice!:'friend',day:s.day}};
      note(s,`${ROMANCES[action.id].name} · ${e.title}${e.choice?(action.choice==='dating'?'：确认了恋爱关系。':'：选择继续做知心朋友。'):'。'}`);
      message=e.choice?(action.choice==='dating'?'你们确认了彼此的心意。':'你们决定珍惜这份友情。'):'这段相处被记进了手记。';break;
    }
    case 'life': {
      const e=lifeAt(s,Object.keys(RESIDENT_HOME).filter(id=>residentHere(s,id)));if(!e||e.id!==action.id)return fail('这段生活片段暂时没有发生。');
      s.lifeSeen=[...(s.lifeSeen??[]),e.id];note(s,`邻里故事 · ${e.title}`);message='把今天的小事记进了手记。';break;
    }
    case 'clock':
      if(s.minute>=1320)return fail('夜深了，回农舍休息吧。');
      s.minute=Math.min(1320,s.minute+5);message='';break;
    case 'travel': {
      const locked = placeLocked(s, action.place); if (locked) return fail(locked);
      if (s.place === action.place) return fail('已经在这里了。');
      s.place = action.place; spend(s, 0, 20); message = `来到${PLACES[s.place].name}。`; break;
    }
    case 'event': {
      const reason = eventReason(s, action.id); if (reason) return fail(reason);
      const event = EVENTS.find(e => e.id === action.id)!;
      if (event.choices && (!Number.isInteger(action.choice) || !event.choices[action.choice])) return fail('请先选择你的回答。');
      s.flags.push(event.id);
      if (event.clue && !s.clues.includes(event.clue)) s.clues.push(event.clue);
      if (event.itemCost) pay(s, event.itemCost);
      if (event.friendship) s.friendship[event.friendship] = Math.min(100,(s.friendship[event.friendship] ?? 0)+5);
      const choice = event.choices?.[action.choice];
      if (choice?.trust) s.friendship[choice.trust] = Math.min(100,(s.friendship[choice.trust] ?? 0)+3);
      note(s, `【${event.title}】${choice ? choice.label : event.lines[event.lines.length-1].text}`);
      spend(s, 0, 15); message = event.clue ? `新线索：${CLUES[event.clue].title}` : '这段故事已记入手记。';
      if (chapterIndex(s) > chapterIndex(before)) message = chapterIndex(s) === CHAPTERS.length ? '第一年主线完成。雾铃谷的生活仍在继续。' : `新章节：${CHAPTERS[chapterIndex(s)].title}`;
      break;
    }
    case 'openConversation': {
      const active=s.dailyConversations?.[action.id]?.active,intro=s.conversations?.[action.id];
      const continuing=action.next&&(active?active.day===s.day&&active.place===s.place:intro?.place===s.place&&(intro.day===s.day||intro.continuedDay===s.day));
      if(!RESIDENT_HOME[action.id]||(!residentHere(s,action.id)&&!continuing))return fail('先找到这位居民。');
      if(!openConversation(s,action.id,action.next,action.token))return fail('');
      message='';break;
    }
    case 'conversation': {
      const dynamic=s.dailyConversations?.[action.id],active=dynamic?.active;
      if(active){
        const continuing=active.day===s.day&&active.place===s.place;
        if(!residentHere(s,action.id)&&!continuing)return fail('先找到这位居民。');
        const view=conversationView(s,action.id),script=topicById(active.topic);
        if(!view||!script||action.token!==active.token||action.step!==view.step||!Number.isInteger(action.choice)||!view.choices[action.choice])return fail('这句回答已经说过了。');
        if(script.requires?.some(flag=>!s.flags.includes(flag)))return fail('现在还不能聊这件事。');
        const choice=view.choices[action.choice],delta=conversationAffinity(s,action.id,choice.affinity);
        const choices=[...active.choices,action.choice],complete=choices.length===(script.next.length?2:1);
        s.dailyConversations={...s.dailyConversations,[action.id]:{...dynamic!,active:{...active,choices,change:delta},history:{...dynamic!.history,...(complete?{[active.topic]:{day:s.day,count:(dynamic!.history[active.topic]?.count??0)+1,choices}}:{})}}};
        if(!s.daily.includes('talk-'+action.id))s.daily.push('talk-'+action.id);
        if(complete){spend(s,0,10);note(s,`${view.topic} · 你：${choice.label}`);}
        message=delta>0?`好感 +${delta}`:delta<0?`好感 ${delta}`:'对方记住了你的回答。';break;
      }
      if(action.token&&action.token!=='intro')return fail('这段对话已经换了话题。');
      const old=s.conversations?.[action.id];
      const continuing=action.step===1&&old?.choices.length===1&&old.day===s.day&&old.place===s.place;
      if(!RESIDENT_HOME[action.id]||(!residentHere(s,action.id)&&!continuing))return fail('先找到这位居民。');
      const view=conversationView(s,action.id);
      if(!view||view.step!==action.step||!Number.isInteger(action.choice)||!view.choices[action.choice])return fail('这句回答已经说过了，继续眼前的话题吧。');
      const choice=view.choices[action.choice];
      const delta=conversationAffinity(s,action.id,choice.affinity);
      s.conversations={...s.conversations,[action.id]:{day:view.step===1?s.day:old?.day??s.day,place:s.place,choices:[...(old?.choices??[]),action.choice],change:delta,...(view.step===2?{continuedDay:s.day}:{})}};
      // Legacy greeting rewards and choice rewards must not stack on one day.
      if(!s.daily.includes('talk-'+action.id))s.daily.push('talk-'+action.id);
      note(s,`${view.topic} · 你：${choice.label}`);
      if(view.step!==0)spend(s,0,10);
      message=delta>0?`好感 +${delta}`:delta<0?`好感 ${delta}`:'对方记住了你的回答。';
      break;
    }
    case 'talk': {
      if (!RESIDENT_HOME[action.id]) return fail('没有这位居民。');
      if (!residentHere(s,action.id)) return fail('先去这位居民所在的地方。');
      const key = 'talk-'+action.id;
      if (!s.daily.includes(key)) { conversationAffinity(s,action.id,3); s.daily.push(key); spend(s,0,10); }
      message = '你们聊了一会儿。今天的问候已经记住了。'; break;
    }
    case 'gift': {
      if (!RESIDENT_HOME[action.id] || !residentHere(s,action.id)) return fail('先找到这位居民。');
      if (!['vegetable','fish','herb','bread','wood','stone'].includes(action.item)) return fail('这个不适合作为礼物。');
      if(action.id==='43'&&['vegetable','fish','bread','herb'].includes(action.item))return fail('Ghost 轻轻摇头：留着自己吃吧，给我看看你捡到的石头就好。');
      if (s.daily.includes('gift-'+action.id)) return fail('今天已经送过礼物了，明天再来吧。');
      if (s.inventory[action.item] < 1) return fail('背包里没有这件礼物。');
      s.inventory[action.item]--; s.friendship[action.id] = Math.min(100,(s.friendship[action.id] ?? 0)+(ROMANCES[action.id]?.gifts.includes(action.item)?9:6)); s.daily.push('gift-'+action.id);
      message = '对方收下了礼物，记住了你的心意。'; break;
    }
    case 'farmTool': {
      if (s.place !== 'farm') return fail('回农场照料作物。');
      const p=s.plots[action.index];
      if (!Number.isInteger(action.index)||!p) return fail('没有这块田。');
      if (action.tool==='hoe') {
        if (p.planted||p.tilled) return fail('这块地已经翻好了，换种子播种吧。');
        if (!need(2)) return fail('体力不足，回农舍休息吧。');
        p.tilled=true; spend(s,2,5); message='土翻松了。选择种子，在这块地播种。'; break;
      }
      if (action.tool==='seed'&&(p.planted||!p.tilled)) return fail(p.planted?'这里已经种下作物了。':'先用锄头翻土，再播种。');
      if (action.tool==='water'&&(!p.planted||p.growth>=2)) return fail(p.planted?'已经成熟了，空手收获吧。':'先播种，再浇水。');
      if (action.tool==='hand'&&(!p.planted||p.growth<2)) return fail('作物成熟后，空手就可以收获。');
      if (!['seed','water','hand'].includes(action.tool)) return fail('请选择合适的工具。');
      return act(before,{type:'plot',index:action.index});
    }
    case 'plot': {
      if (s.place !== 'farm') return fail('回农场照料作物。');
      const p = s.plots[action.index]; if (!p) return fail('没有这块田。');
      if (!need(2)) return fail('体力不足，吃面包或回农舍休息。');
      if (!p.planted) {
        if (!s.inventory.seed) return fail('种子用完了，可以去广场商店购买。');
        s.inventory.seed--; p.tilled = true; p.planted = true; p.growth = 0; p.watered = false; message = weather(s)==='雨'?'种下了种子。今天的雨水会照料它。':'种下了种子。别忘了浇水。';
      } else if (p.growth >= 2) {
        p.planted=false; p.growth=0; p.watered=false; s.inventory.vegetable++; s.harvested++; message='收获一份蔬菜。可以出售、送礼或留作修渠补给。';
      } else {
        if (p.watered || weather(s) === '雨') return fail('今天已经有水了，休息一晚再看看。');
        p.watered=true; message='浇好了。经过两个有水的夜晚即可成熟。';
      }
      spend(s,2,10); break;
    }
    case 'resource': {
      if(s.place!=='forest')return fail('走到森林里的资源旁再采集。');
      s.resources=forestResources(s).map(n=>({...n}));
      const node=s.resources.find(n=>n.id===action.id);
      if(!node||node.hp<=0)return fail('这里已经采完了。过几天再来，别处可能会有新的资源。');
      if(action.tool!==resourceTool(node))return fail(node.kind==='stone'?'石头要用镐子开采。':node.kind==='wood'?'木材要用斧头采集。':'草药空手就能采摘。');
      if(!need(2))return fail('体力不足，回农舍休息吧。');
      node.hp--;spend(s,2,5);
      if(node.hp===0){const count=resourceYield(node);s.inventory[node.kind]+=count;node.respawnDay=s.day+1+(Number(node.id.split('-')[1])+s.day)%3;message=`采完${resourceName(node)}，获得${ITEM_NAMES[node.kind]}${count}份。`;}
      else message=`${resourceName(node)}裂开了一些，还需要${node.hp}次。`;
      break;
    }
    case 'gather': {
      if (s.place !== 'forest') return fail('北部森林可以采集材料。');
      if (!need(8)) return fail('体力不足，吃面包或回农舍休息。');
      const count=s.daily.filter(k=>k==='gather-'+action.item).length;
      if (count>=3) return fail('这一带今天已经采完，明天会有新的资源。');
      s.inventory[action.item] += action.item === 'herb' ? 1 : 2; s.daily.push('gather-'+action.item); spend(s,8,20);
      message=`获得${ITEM_NAMES[action.item]}${action.item==='herb'?1:2}份。`; break;
    }
    case 'fish': {
      if (s.place !== 'bridge') return fail('到河边石桥垂钓。');
      if (!need(6)) return fail('体力不足，吃面包或回农舍休息。');
      spend(s,6,20); if (action.hit) { s.inventory.fish++; s.caught++; message='钓到一条河鱼！'; } else message='鱼逃走了。浮标在绿色区域时再收竿。'; break;
    }
    case 'fixHouse': {
      if (s.place !== 'farm') return fail('回到农场再修屋。');
      if (s.houseFixed) return fail('农舍已经修好了。');
      if (!hasItems(s,{wood:3,stone:2})) return fail('还需要木材3份、石料2份。到北林采集即可。');
      if (!need(10)) return fail('先恢复一些体力再动工。');
      pay(s,{wood:3,stone:2}); s.houseFixed=true; spend(s,10,30); s.friendship['6']=Math.min(100,(s.friendship['6']??0)+5);
      message='你和 Frank 修好了屋顶。这里开始像一个家。'; note(s,message); break;
    }
    case 'waitNight':
      if (!['farm','bridge','tavern'].includes(s.place)) return fail('到农舍、石桥或酒馆找个地方歇脚。');
      if (s.minute>=1140) return fail('夜晚已经来了。');
      s.minute=1140; message='坐了一会儿，天色渐渐暗下来。邻居们去酒馆相聚，Ghost 仍在石桥边。'; break;
    case 'sleep':
      if (s.place !== 'farm') return fail('先回农舍休息。');
      nextDay(s); message=`早安。${dateLabel(s.day)}，体力恢复了。`; break;
    case 'wait': {
      if (s.place !== 'farm') return fail('回农舍安排接下来的日子。');
      const chapter=CHAPTERS[chapterIndex(s)];
      if (!chapter || s.day>=chapter.day) return fail('当前已经有可以推进的故事。');
      while(s.day<chapter.day) nextDay(s);
      message=`平静的日子过去了。来到${dateLabel(s.day)}，新的故事正在等待。`; note(s,message); break;
    }
    case 'buy': {
      if (s.place !== 'square') return fail('商店在钟塔广场。');
      const price=action.item==='seed'?8:15; if(s.coins<price) return fail('金币不够。可以出售收获或完成公告栏委托。');
      s.coins-=price; s.inventory[action.item]++; message=`买到一份${ITEM_NAMES[action.item]}。`; break;
    }
    case 'sell': {
      if(s.place!=='square') return fail('去广场商店出售。');
      if(!s.inventory[action.item]) return fail('没有可出售的物品。');
      const price={vegetable:25,fish:20,herb:12}[action.item]; s.inventory[action.item]--; s.coins+=price; message=`卖出${ITEM_NAMES[action.item]}，获得${price}金币。`; break;
    }
    case 'eat':
      if(!s.inventory.bread) return fail('没有面包。广场可以买，或者回家睡觉恢复体力。');
      if(s.energy>=100) return fail('现在体力充足。');
      s.inventory.bread--; s.energy=Math.min(100,s.energy+35); message='吃下面包，恢复35体力。'; break;
    case 'valve':
      if(s.place!=='sluice'||chapterIndex(s)!==11) return fail('等联合修复开始后，在闸室调整。');
      if(!Number.isInteger(action.index)||action.index<0||action.index>2) return fail('没有这道闸门。');
      s.valves[action.index]=(s.valves[action.index]+1)%3; message='闸门已调整，对照手记里的联合修复图。'; break;
    case 'repair': {
      if(s.place!=='sluice'||chapterIndex(s)!==11) return fail('先完成调查，再到闸室联合修复。');
      if(!CHAPTERS[11].events.every(id=>s.flags.includes(id))) return fail('六支小队还没有全部准备好。');
      if(!hasItems(s,REPAIR_COST)) return fail('材料不足。修复图列出了需要的补给。');
      if(s.valves.join(',')!=='1,2,0') return fail('水流还不稳定。按修复图：北渠接农田，中渠接泄洪，旧渠保留。');
      pay(s,REPAIR_COST); s.repaired=true;
      message='水流恢复了！第三声警报没有响。大家都平安回到了地面。'; note(s,message); break;
    }
    case 'request': {
      if(s.place!=='square') return fail('到广场公告栏交付。');
      if(s.daily.includes('request')) return fail('今天的委托已完成，明天再来。');
      const r=dailyRequest(s);
      if(s.inventory[r.item]<r.count) return fail(`${r.who}需要${r.count}份${ITEM_NAMES[r.item]}。`);
      s.inventory[r.item]-=r.count; s.coins+=35; s.friendship[r.id]=Math.min(100,(s.friendship[r.id]??0)+5); s.daily.push('request'); message='委托完成，获得35金币与邻居的感谢。'; note(s,message); break;
    }
    case 'companion':
      if(!RESIDENT_HOME[action.id]) return fail('没有这位伙伴。');
      s.companion=action.id; message='同行伙伴已更换。'; break;
  }
  return { state:s,message };
}
/** A damaged/newer save must never silently replace a player's progress. */
export function parseSave(raw: string | null): ValleyState {
  if(raw===null) return newValley();
  const s=JSON.parse(raw) as ValleyState;
  // Only the old address changes; inventory, story, bonds and dates remain intact.
  if(s&&Object.prototype.hasOwnProperty.call(LEGACY_HOME_PLACES,s.place))s.place=LEGACY_HOME_PLACES[s.place];
  const int=(n:unknown,min=0,max=1000000)=>typeof n==='number'&&Number.isInteger(n)&&n>=min&&n<=max;
  const strings=(a:unknown)=>Array.isArray(a)&&a.length<=1000&&a.every(v=>typeof v==='string');
  if(!s|| (s.resources!==undefined&&!validResources(s.resources)) ||s.version!==1||!int(s.day,1,100000)||!int(s.minute,480,1320)||!int(s.energy,0,100)||!int(s.coins)
    ||!PLACES[s.place]||!RESIDENT_HOME[s.companion]||!s.inventory||Object.keys(ITEM_NAMES).some(k=>!int(s.inventory[k as Item]))
    ||!Array.isArray(s.plots)||s.plots.length!==6||s.plots.some(p=>!p||typeof p.planted!=='boolean'||typeof p.watered!=='boolean'||(p.tilled!==undefined&&typeof p.tilled!=='boolean')||!int(p.growth,0,2))
    ||!strings(s.flags)||s.flags.some(f=>!EVENTS.some(e=>e.id===f))||!strings(s.clues)||s.clues.some(c=>!CLUES[c])||!strings(s.daily)
    ||!s.friendship||typeof s.friendship!=='object'||Array.isArray(s.friendship)||Object.entries(s.friendship).some(([id,n])=>!RESIDENT_HOME[id]||!int(n,0,100))
    ||!int(s.harvested)||!int(s.caught)||typeof s.houseFixed!=='boolean'||typeof s.repaired!=='boolean'
    ||!Array.isArray(s.valves)||s.valves.length!==3||s.valves.some(n=>!int(n,0,2))
    ||!Array.isArray(s.journal)||s.journal.length>180||s.journal.some(j=>!j||!int(j.day,1)||typeof j.text!=='string'))
    throw new Error('存档格式无法读取。原存档仍然保留，未被覆盖。');
  if(s.bonds!==undefined&&(!s.bonds||typeof s.bonds!=='object'||Array.isArray(s.bonds)||Object.entries(s.bonds).some(([id,b])=>!ROMANCES[id]||!b||!int(b.stage,1,3)||!['friend','dating'].includes(b.status)||b.status==='dating'&&b.stage!==3||!int(b.day,1,s.day))))throw new Error('人物关系存档无法读取。原存档仍然保留。');
  if(s.lifeSeen!==undefined&&(!strings(s.lifeSeen)||s.lifeSeen.some(id=>!LIFE_SCENES.some(e=>e.id===id))))throw new Error('邻里故事存档无法读取。原存档仍然保留。');
  if(!validConversations(s.conversations,s.day))throw new Error('对话进度无法读取。原存档仍然保留。');
  if(!validDailyConversations(s))throw new Error('日常对话记录无法读取。原存档仍然保留。');
  // Repair only the superseded generated kinship entry, preserving all progress.
  s.journal=s.journal.map(j=>({...j,text:j.text.replace('Socrates是Rita和Ben的父亲；Rita是Ben的姐姐。','Socrates独居，没有设定任何亲属。Rita与Ben另住芦苇书匠屋。')}));
  return s;
}
