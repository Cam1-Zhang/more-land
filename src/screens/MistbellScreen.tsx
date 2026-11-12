import {furnitureById,furnitureText} from '../game/mistbell/furniture';
import {HOMES,HOME_OF,HOME_IDS,isHome} from '../game/mistbell/homes';
import {ROMANCES,relationsFor,bondEvent,bondHint,lifeAt} from '../game/mistbell/social';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, Backpack, X, Fish, Check, Sparkles, Map, Menu } from 'lucide-react-native';
import MistbellDialogue from '../components/MistbellDialogue';
import MistbellConversation from '../components/MistbellConversation';
import {residentPlan,residentStory} from '../game/mistbell/residents';
import {nextRoad,type Gateway} from '../game/mistbell/connections';
import MistbellLocalScene from '../components/MistbellLocalScene';
import type { Target } from '../game/mistbell/scenes';
import MistbellAtlas from '../components/MistbellAtlas';
import ExplorationSprite from '../components/ExplorationSprite';
import { CHARACTERS } from '../data/mockData';
import { DEFAULT_PIXEL_AVATAR_CONFIG, USER_PIXEL_AVATAR_CONFIG_KEY, parsePixelAvatarConfig } from '../constants/avatarCreator';
import { CHAPTERS, CLUES, EVENTS, PLACES } from '../game/mistbell/story';
import { chapterIndex, dailyRequest, dateLabel, eventReason, ITEM_NAMES, objectives, placeLocked, REPAIR_COST, residentPlace, timeLabel, weather } from '../game/mistbell/engine';
import { useValleySave } from '../game/mistbell/useValleySave';
import type { Action, Item, Place, StoryEvent, ValleyState } from '../game/mistbell/types';
import { GAME_PIXEL_CJK_FONT_FAMILY } from '../theme/pixelFont';
import ExplorationScreen from './ExplorationScreen';
const CHARACTER_BY_NAME=Object.fromEntries(CHARACTERS.map(c=>[c.name,c]));
const CHARACTER_BY_ID=Object.fromEntries(CHARACTERS.map(c=>[c.id,c]));
type Panel='journal'|'bag'|'people'|'menu'|null;
function Button({label,onPress,disabled=false,quiet=false}:{label:string;onPress:()=>void;disabled?:boolean;quiet?:boolean}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({pressed})=>[s.button,quiet&&s.quiet,disabled&&s.disabled,pressed&&s.pressed]}><Text style={[s.buttonText,quiet&&s.quietText]}>{label}</Text></Pressable>;
}
function Sheet({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}) {
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={s.scrim}><View accessibilityViewIsModal style={s.sheet}>
    <View style={s.sheetHead}><Text accessibilityRole="header" style={s.sheetTitle}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="关闭面板" onPress={onClose} style={s.iconButton}><X size={22} color="#eeddb1"/></Pressable></View>{children}
  </View></View></Modal>;
}
function StoryDialog({event,onClose,onComplete}:{event:StoryEvent;onClose:()=>void;onComplete:(choice:number)=>void}) {
  const [selected,setSelected]=useState<number|null>(null);
  const choice=selected===null?undefined:event.choices?.[selected];
  if(choice)return <MistbellDialogue key="reply" lines={[{who:'你',text:choice.label},{who:'旁白',text:choice.reply}]} onClose={onClose} onFinish={()=>onComplete(selected!)}/>;
  return <MistbellDialogue lines={event.lines} onClose={onClose} onFinish={()=>onComplete(0)} choices={event.choices?.map((c,i)=>({label:c.label,onPress:()=>setSelected(i)}))}/>;
}
function Fishing({onClose,onCatch}:{onClose:()=>void;onCatch:(hit:boolean)=>void}) {
  const [position,setPosition]=useState(0),[slow,setSlow]=useState(false);
  const positionRef=useRef(0),done=useRef(false);
  useEffect(()=>{const start=Date.now();const timer=setInterval(()=>{const p=(Math.sin((Date.now()-start)/(slow?750:400))+1)/2;positionRef.current=p;setPosition(p);},35);return()=>clearInterval(timer);},[slow]);
  return <Sheet title="河边垂钓" onClose={onClose}><View style={s.dialogContent}>
    <Fish size={40} color="#9dbfc1"/><Text style={s.cream}>等浮标进入绿色区域，再收竿。</Text><Text style={s.muted}>每次收竿消耗 6 体力 · 20 分钟</Text>
    <View style={s.fishTrack}><View style={s.fishTarget}/><View style={[s.fishNeedle,{left:`${position*96}%`}]}/></View>
    <Button label="收竿" onPress={()=>{if(done.current)return;done.current=true;onCatch(positionRef.current>=.32&&positionRef.current<=.68);}}/>
    <Button quiet label={slow?'慢速模式：开':'切换慢速模式'} onPress={()=>setSlow(v=>!v)}/>
  </View></Sheet>;
}
export default function MistbellScreen(){
  const navigation=useNavigation<NavigationProp<{Home:undefined;HallScene:undefined}>>();
  const insets=useSafeAreaInsets();
  const {state,ready,error,status,message,messageId,dispatch,load,retrySave,notify}=useValleySave();
  const [roam,setRoam]=useState(false),[panel,setPanel]=useState<Panel>(null),[journalTab,setJournalTab]=useState<'tasks'|'clues'|'diary'>('tasks');
  const [profile,setProfile]=useState<string|null>(null),[heldGift,setHeldGift]=useState<Item|null>(null);
  const [encounter,setEncounter]=useState<{key:string;lines:{who:string;text:string}[];action?:Action;romance?:string}|null>(null);
  const [search,setSearch]=useState(''),[dialog,setDialog]=useState<StoryEvent|null>(null),[fishing,setFishing]=useState(false),[person,setPerson]=useState<string|null>(null);
  const [avatar,setAvatar]=useState(DEFAULT_PIXEL_AVATAR_CONFIG);
  const [mapOpen,setMapOpen]=useState(false),[service,setService]=useState<string|null>(null);
  useEffect(()=>{let alive=true;void AsyncStorage.getItem(USER_PIXEL_AVATAR_CONFIG_KEY).then(raw=>{if(alive)setAvatar(parsePixelAvatarConfig(raw)??DEFAULT_PIXEL_AVATAR_CONFIG);}).catch(()=>undefined);return()=>{alive=false;};},[]);
  const [entry,setEntry]=useState<{x:number;y:number;facing?:'up'|'down'|'left'|'right'}>({x:384,y:404}),[walkTo,setWalkTo]=useState<{place:Place;id:number}|null>(null);
  const cross=(gate:Gateway)=>{const reason=placeLocked(state,gate.to);if(reason){notify(reason);return;}setSeatRequest(null);setEntry(gate.spawn);dispatch({type:'travel',place:gate.to});};
  const go=(place:Place)=>{
    const reason=placeLocked(state,place);if(reason){notify(reason);return;}
    setPerson(null);setPanel(null);setMapOpen(false);setService(null);
    if(state.place===place){notify('你已经在这里。');return;}
    const road=nextRoad(state.place,place);if(road){setWalkTo({place:road.to,id:Date.now()});notify(`沿这条路前往${PLACES[road.to].name}。`);}

  };
  const [seatRequest,setSeatRequest]=useState<{id:number;x:number;y:number;facing:'down'|'left'|'right'}|null>(null);
  const run=(action:Action)=>dispatch(action);
  const furniture=service?.startsWith('furniture-')?furnitureById(state.place,service.slice(10)):undefined;
  const ch=chapterIndex(state),chapter=CHAPTERS[ch],local=PLACES[state.place];
  const tasks=objectives(state),events=EVENTS.filter(e=>e.chapter===ch&&e.place===state.place&&!state.flags.includes(e.id));
  const request=dailyRequest(state);
  if(roam)return <ExplorationScreen onReturnToValley={()=>setRoam(false)}/>;
  if(!ready)return <View style={[s.root,s.center]}>{error?<><Text style={s.cream}>{error}</Text><Button label="重试读取存档" onPress={()=>void load()}/><Button quiet label="返回首页" onPress={()=>navigation.navigate('Home')}/></>:<><ActivityIndicator color="#dec38b"/><Text style={s.cream}>打开雾铃谷的手记…</Text></>}</View>;
  const interact=(target:Target)=>{
    if(target.kind==='npc'){
      if(heldGift){run({type:'gift',id:target.value,item:heldGift});setHeldGift(null);return;}
      const story=residentStory(state,target.value);
      if(story){setDialog(story);return;}
      const bond=bondEvent(state,target.value);
      const life=lifeAt(state,CHARACTERS.filter(c=>c.id===state.companion||residentPlace(state,c.id)===state.place).map(c=>c.id));
      if(life&&life.ids.includes(target.value)){setEncounter({key:life.id,lines:life.lines,action:{type:'life',id:life.id}});return;}
      if(bond){setEncounter({key:target.value+'-'+bond.stage,lines:bond.lines,action:{type:'bond',id:target.value},romance:bond.choice?target.value:undefined});return;}

      run({type:'openConversation',id:target.value});setPerson(target.value);
    }
    else if(target.value.startsWith('furniture-')){
      const f=furnitureById(state.place,target.value.slice(10));if(!f)return;
      if(['bed','wardrobe','hearth'].includes(f.kind))setEncounter({key:target.value,lines:furnitureText(state,f).map(text=>({who:f.label,text}))});
      else setService(target.value);
    }
    else if(target.value.startsWith('life-')){const life=lifeAt(state,CHARACTERS.filter(c=>c.id===state.companion||residentPlace(state,c.id)===state.place).map(c=>c.id));if(life)setEncounter({key:life.id,lines:life.lines,action:{type:'life',id:life.id}});}
    else if(target.kind==='story'){
      const available=events.filter(e=>!eventReason(state,e.id));
      if(available.length===1)setDialog(available[0]);
      else if(available.length>1)setDialog(available[0]);
      else notify(events.length?eventReason(state,events[0].id)!:'这里的发现已经记录在手记中。');
    }else if(target.value==='fish')setFishing(true);
    else if(target.value==='down')go('sluice');
    else if(target.value==='well')notify('水壶已经装满，可以继续浇水。');
    else setService(target.value);
  };
  return <View style={[s.root,{paddingTop:insets.top,paddingBottom:insets.bottom}]}>
    <MistbellLocalScene seatRequest={seatRequest} key={state.place} entry={entry} walkTo={walkTo} onCross={cross} state={state} avatar={avatar} paused={!!dialog||!!panel||!!person||fishing||mapOpen||!!service||!!profile||!!encounter} message={message} messageId={messageId} run={run} notify={notify} onInteract={interact} onMap={()=>setMapOpen(true)}/>
    <View pointerEvents="box-none" style={[s.hud,{top:insets.top+10}]}>
      <View style={s.hudCard}><Text style={s.hudPlace}>{local.name}</Text><Text style={s.hudSmall}>{dateLabel(state.day).replace('第1年 · ','')} · {timeLabel(state.minute)} · {weather(state)}</Text><View style={s.row}><View accessibilityLabel={`体力 ${state.energy}/100`} style={s.hudEnergy}><View style={{height:'100%',width:`${state.energy}%`,backgroundColor:state.energy<20?'#b66848':'#66854b'}}/></View><Text style={s.hudSmall}>{state.energy} ⚡　{state.coins} 金</Text></View></View>
      <View style={s.hudButtons}>
        {heldGift&&<Button quiet label={`拿着${ITEM_NAMES[heldGift]} · 取消`} onPress={()=>setHeldGift(null)}/>}
        <Pressable accessibilityRole="button" accessibilityLabel="山谷地图" onPress={()=>setMapOpen(true)} style={s.hudIcon}><Map size={20} color="#583d28"/></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="打开手记" onPress={()=>setPanel('journal')} style={s.hudIcon}><BookOpen size={20} color="#583d28"/></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="打开背包" onPress={()=>setPanel('bag')} style={s.hudIcon}><Backpack size={20} color="#583d28"/></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="游戏菜单" onPress={()=>setPanel('menu')} style={s.hudIcon}><Menu size={20} color="#583d28"/></Pressable>
      </View>
    </View>
    {mapOpen&&<Sheet title="山谷地图 · 选择目的地" onClose={()=>setMapOpen(false)}><ScrollView contentContainerStyle={s.dialogContent}>
      <Text style={s.muted}>地图用来辨认方向。选择地点会带你走向通往那里的道路；走到路口自动进入相邻场景。</Text><Text accessibilityLiveRegion="polite" style={s.muted}>{message}</Text>
      <MistbellAtlas state={state} onTravel={go}/>
      <Button quiet label="进入对局木屋" onPress={()=>navigation.navigate('HallScene')}/>
    </ScrollView></Sheet>}
    {service&&<Sheet title={furniture?furniture.label:service==='house'?'回到农舍':service==='shop'?'种子铺':service==='board'?'今日委托':service==='story'?'调查附近的线索':service==='repair'?'联合修复控制台':'坐下歇一会儿'} onClose={()=>setService(null)}><ScrollView contentContainerStyle={s.dialogContent}>
      <Text accessibilityLiveRegion="polite" style={s.reply}>{message}</Text>
      {furniture&&<>
        {furnitureText(state,furniture).map((line,i)=><Text key={i} style={s.dialogText}>{line}</Text>)}
        {furniture.kind==='chair'&&<Button label="坐一会儿 · 10 分钟" onPress={()=>{run({type:'furniture',id:furniture.id,use:'rest'});if(furniture.seat)setSeatRequest({...furniture.seat,id:Date.now()});setService(null);}}/>}
        {furniture.kind==='kitchen'&&<Button label="煮蔬菜汤 · 消耗 1 份蔬菜" disabled={state.inventory.vegetable<1||state.daily.includes('home-meal-'+state.place)} onPress={()=>run({type:'furniture',id:furniture.id,use:'cook'})}/>}
        {['table','shelf','desk','album'].includes(furniture.kind)&&<Button label="把家中小事记进手记" onPress={()=>run({type:'furniture',id:furniture.id,use:'read'})}/>}
      </>}
      {service==='house'&&<>
        <Text style={s.dialogText}>屋里很安静。休息到明天，或者检查一下屋顶吧。</Text>
        <Button label="睡一晚 · 恢复体力" onPress={()=>{run({type:'sleep'});setService(null);}}/>
        <Button quiet label={state.houseFixed?'农舍已经修好':'和 Frank 修屋 · 木材3 / 石料2'} disabled={state.houseFixed} onPress={()=>run({type:'fixHouse'})}/>
        {chapter&&chapter.day>state.day&&<Button quiet label={`度过平静的日子 → ${dateLabel(chapter.day)}`} onPress={()=>{run({type:'wait'});setService(null);}}/>}
      </>}
      {['house','rest'].includes(service)&&<Button quiet label="歇脚等到夜晚 · 19:00" disabled={state.minute>=1140} onPress={()=>{run({type:'waitNight'});setService(null);}}/>}
      {service==='shop'&&<><Text style={s.dialogText}>欢迎。种子放在这边，也可以把今天的收获卖给我。</Text>
        <Button label="买种子 · 8金" onPress={()=>run({type:'buy',item:'seed'})}/><Button quiet label="买面包 · 15金" onPress={()=>run({type:'buy',item:'bread'})}/>
        {(['vegetable','fish','herb'] as const).map(item=><Button key={item} quiet label={`出售${ITEM_NAMES[item]} · 持有${state.inventory[item]}`} disabled={!state.inventory[item]} onPress={()=>run({type:'sell',item})}/>)}
      </>}
      {service==='board'&&<><Text style={s.dialogText}>{request.who} 留了一张纸条：需要 {request.count} 份{ITEM_NAMES[request.item]}，报酬 35 金。</Text><Button label={state.daily.includes('request')?'今日委托已完成':'交付材料'} disabled={state.daily.includes('request')} onPress={()=>run({type:'request'})}/></>}
      {service==='story'&&events.map(event=><View key={event.id} style={s.gap}><Button quiet label={event.title} disabled={!!eventReason(state,event.id)} onPress={()=>{setService(null);setDialog(event);}}/>{eventReason(state,event.id)&&<Text style={s.muted}>{eventReason(state,event.id)}</Text>}</View>)}
      {service==='repair'&&<><Text style={s.dialogText}>走到三道阀门前调整水流，再回到这里和大家一起修复。</Text><Text style={s.muted}>{Object.entries(REPAIR_COST).map(([k,n])=>`${ITEM_NAMES[k as Item]} ${state.inventory[k as Item]}/${n}`).join(' · ')}</Text><Button label="一起恢复水流" onPress={()=>run({type:'repair'})}/></>}
    </ScrollView></Sheet>}
    {dialog&&<StoryDialog key={dialog.id} event={dialog} onClose={()=>setDialog(null)} onComplete={choice=>{run({type:'event',id:dialog.id,choice});setDialog(null);}}/>}
    {fishing&&<Fishing onClose={()=>setFishing(false)} onCatch={hit=>{run({type:'fish',hit});setFishing(false);}}/>}
    {encounter&&<MistbellDialogue key={encounter.key} lines={encounter.lines} onClose={()=>setEncounter(null)} onFinish={()=>{if(encounter.action)run(encounter.action);setEncounter(null);}} choices={encounter.romance?[
      {label:'我也喜欢你，想和你在一起',onPress:()=>{run({type:'bond',id:encounter.romance!,choice:'dating'});setEncounter(null);}},
      {label:'我想继续做知心朋友',onPress:()=>{run({type:'bond',id:encounter.romance!,choice:'friend'});setEncounter(null);}},
    ]:undefined}/>}
    {profile&&<Sheet title={CHARACTER_BY_ID[profile].name} onClose={()=>setProfile(null)}><ScrollView contentContainerStyle={s.dialogContent}>
      <Text style={s.cream}>住在{HOMES[HOME_OF[profile]].name} · 好感 {state.friendship[profile]??0}</Text>
      <Text style={s.cream}>{HOMES[HOME_OF[profile]].residents.map(id=>CHARACTER_BY_ID[id].name).join("、")} · {HOMES[HOME_OF[profile]].kind==='family'?'家人同住':'独居'}</Text><Text style={s.muted}>{HOMES[HOME_OF[profile]].relations}</Text><Text style={s.muted}>{HOMES[HOME_OF[profile]].description}</Text>
      {ROMANCES[profile]&&<><Text style={s.cream}>♡ 可发展感情 · {bondHint(state,profile)}</Text><Text style={s.muted}>有话想说时，16:00—19:00 会在约定地点等你。喜欢的日常礼物：{ROMANCES[profile].gifts.map(i=>ITEM_NAMES[i]).join('、')}。恋爱由你主动选择，也可以一直做朋友。</Text>{(state.bonds?.[profile]?.stage??0)<3&&<Button quiet label={`约定地点 · ${PLACES[ROMANCES[profile].events[state.bonds?.[profile]?.stage??0].place].name}`} onPress={()=>{go(ROMANCES[profile].events[state.bonds?.[profile]?.stage??0].place);setProfile(null);}}/>}</>}
      {relationsFor(profile).map(r=><View key={r.title+r.ids.join("-")} style={s.note}><Text style={s.storyTitle}>{r.title} · {r.ids.filter(id=>id!==profile).map(id=>CHARACTER_BY_ID[id].name).join(' / ')}</Text><Text style={s.cream}>{r.text}</Text></View>)}
      <Button quiet label={`拜访${HOMES[HOME_OF[profile]].name}`} onPress={()=>{go(HOME_OF[profile]);setProfile(null);}}/>
    </ScrollView></Sheet>}
    {person&&<MistbellConversation key={person} state={state} id={person} onClose={()=>setPerson(null)} onChoose={run}/>}
    {panel&&<Sheet title={panel==='journal'?'雾铃谷手记':panel==='bag'?'随身背包':panel==='menu'?'雾铃谷':'住在山谷里的人'} onClose={()=>setPanel(null)}>
      {panel==='menu'&&<ScrollView contentContainerStyle={s.dialogContent}>
        <Text style={s.dialogText}>WASD / 方向键走路，E 或空格互动。按 1–6 切换工具。也可以点击目标，小人会走近后操作。</Text>
        <Text style={s.muted}>锄头翻土 → 种子播种 → 水壶浇水 → 成熟后空手收获。手机使用屏幕方向键。走到路口自动换场景。和居民交谈时选择回应，对方会记住你的话；故事对白点击继续。</Text>
        <Button quiet label="查看48位居民" onPress={()=>{setSearch('');setPanel('people');}}/>
        <Button quiet label="原野自由散步" onPress={()=>{setPanel(null);setRoam(true);}}/>
        <Button quiet label="进入对局木屋" onPress={()=>{setPanel(null);navigation.navigate('HallScene');}}/>
        <Text style={s.muted}>{status}</Text>{status.includes('失败')&&<Button label="重试保存" onPress={retrySave}/>}
        <Button quiet label="返回首页" onPress={()=>navigation.navigate('Home')}/>
      </ScrollView>}
      {panel==='journal'&&<><View style={s.tabs}>{(['tasks','clues','diary'] as const).map((tab,i)=><Button key={tab} quiet={journalTab!==tab} label={['本章目标','已知线索','生活日记'][i]} onPress={()=>setJournalTab(tab)}/>)}</View>
        <ScrollView contentContainerStyle={s.dialogContent}>
          {journalTab==='tasks'&&<><Text style={s.speaker}>{chapter?.title??'第一年主线完成'}</Text>{chapter&&state.day<chapter.day&&<Text style={s.reply}>下一段故事从{dateLabel(chapter.day)}开始。可以继续生活，或回农舍度过平静的日子。</Text>}
            {tasks.map(task=><View key={task.label} style={s.objective}><View style={s.row}>{task.done?<Check size={18} color="#a5c18b"/>:<View style={s.checkBox}/>}<Text style={[s.cream,s.flex]}>{task.label}</Text></View>{!task.done&&<Button quiet label={`去${PLACES[task.place].name}`} onPress={()=>{setPanel(null);go(task.place);}}/>}</View>)}
            <Text style={s.muted}>完成章节 {Math.min(ch,14)}/14 · 已发现线索 {state.clues.length}/{Object.keys(CLUES).length}</Text>
          </>}
          {journalTab==='clues'&&(state.clues.length?state.clues.map(id=><View key={id} style={s.note}><Text style={s.storyTitle}>{CLUES[id].title}</Text><Text style={s.cream}>{CLUES[id].text}</Text></View>):<Text style={s.muted}>阅读信件、调查地点，线索会保存在这里。</Text>)}
          {journalTab==='diary'&&(state.journal.length?[...state.journal].reverse().map((entry,i)=><View key={i} style={s.note}><Text style={s.overline}>{dateLabel(entry.day)}</Text><Text style={s.cream}>{entry.text}</Text></View>):<Text style={s.muted}>你的山谷生活才刚刚开始。</Text>)}
        </ScrollView></>}
      {panel==='bag'&&<ScrollView contentContainerStyle={s.dialogContent}><Text style={s.muted}>收获可出售、送礼，也可留作联合修复的补给。</Text>
        {(Object.keys(ITEM_NAMES) as Item[]).map(item=><View key={item} style={s.inventoryRow}><Text style={s.cream}>{ITEM_NAMES[item]}</Text><Text style={s.speaker}>× {state.inventory[item]}</Text>{item!=='seed'&&<Button quiet label={`拿出${ITEM_NAMES[item]}送礼`} disabled={!state.inventory[item]} onPress={()=>{setHeldGift(item);setPanel(null);notify('走近想送礼的居民，点击交谈即可交给对方。');}}/>}</View>)}
        <Button label="吃面包 · 恢复35体力" disabled={!state.inventory.bread||state.energy>=100} onPress={()=>run({type:'eat'})}/>
        <Text style={s.reply}>种子可在广场购买；木材、石料、草药在北林采集；鱼在桥边钓取。没有体力时，回农场免费休息。</Text>
      </ScrollView>}
      {panel==='people'&&<><TextInput accessibilityLabel="搜索山谷居民" placeholder="搜索名字…" placeholderTextColor="#9ba88a" value={search} onChangeText={setSearch} style={s.search}/>
        <ScrollView contentContainerStyle={s.dialogContent}>{CHARACTERS.filter(c=>c.name.toLowerCase().includes(search.trim().toLowerCase())).map(c=><View key={c.id} style={s.peopleRow}>
          <ExplorationSprite character={c.id} scale={1}/><View style={s.flex}><Text style={s.cream}>{c.name}{c.id==='43'?' · 幽灵邻居':''}{ROMANCES[c.id]?' ♡':''}</Text><Text style={s.tiny}>{PLACES[residentPlace(state,c.id)].name} · {residentPlan(state,c.id,ch).activity} · 好感 {state.friendship[c.id]??0}</Text><Text style={s.tiny}>住处：{HOMES[HOME_OF[c.id]].name}</Text></View>
          <Button quiet label={`${c.name} 的关系`} onPress={()=>{setProfile(c.id);setPanel(null);}}/>
          <Button quiet label={`找 ${c.name}`} onPress={()=>{const place=residentPlace(state,c.id);if(placeLocked(state,place)){notify(placeLocked(state,place)!);setPanel(null);return;}go(place);notify(`走到 ${c.name} 身边，按 E 或点击角色交谈。`);}}/>
          <Button quiet label={state.companion===c.id?'同行中':`带上 ${c.name}`} disabled={state.companion===c.id} onPress={()=>run({type:'companion',id:c.id})}/>
        </View>)}</ScrollView></>}
    </Sheet>}
  </View>;
}
const s=StyleSheet.create({
  hud:{position:'absolute',left:10,right:10,flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:8,zIndex:1000},
  hudCard:{paddingHorizontal:10,paddingVertical:7,backgroundColor:'#ebcf93ed',borderWidth:2,borderColor:'#855a36',gap:3},hudPlace:{color:'#493521',fontSize:14,fontWeight:'700'},hudSmall:{fontSize:10,color:'#65492c'},hudEnergy:{width:50,height:6,backgroundColor:'#997c55'},
  hudButtons:{flexDirection:'row',flexWrap:'wrap',maxWidth:170,gap:4,justifyContent:'flex-end'},hudIcon:{width:38,height:38,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'#855a36',backgroundColor:'#e6c88e'},
  root:{flex:1,backgroundColor:'#182b26'},center:{alignItems:'center',justifyContent:'center',gap:16,padding:24},
  flex:{flex:1},gap:{gap:12},row:{flexDirection:'row',alignItems:'center',gap:8},wrap:{flexDirection:'row',flexWrap:'wrap',gap:8},
  header:{paddingHorizontal:24,paddingVertical:14,flexDirection:'row',alignItems:'center',gap:14,borderBottomWidth:1,borderColor:'#536044'},
  brand:{color:'#b8bc94',fontSize:10,letterSpacing:2.4},title:{fontFamily:GAME_PIXEL_CJK_FONT_FAMILY,color:'#f4dfad',fontSize:27,marginTop:4},
  smallTitle:{fontSize:14,color:'#b0bc98'},dateBlock:{gap:5,marginRight:15},
  iconButton:{width:40,height:40,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#64704e',backgroundColor:'#293d31'},
  statusBar:{paddingHorizontal:22,paddingVertical:9,flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#22392e'},
  stat:{color:'#ead5a7',fontSize:12},energy:{width:68,height:6,backgroundColor:'#16291f'},save:{fontSize:10,color:'#adba96',marginLeft:8},
  body:{flex:1,flexDirection:'row',padding:16,gap:18},bodyCompact:{flexDirection:'column',padding:10,gap:10},
  mapColumn:{flex:1,justifyContent:'center',gap:12},chapterStrip:{flexDirection:'row',gap:12,alignItems:'center',paddingVertical:4},
  mapColumnCompact:{flexGrow:0,flexShrink:0,flexBasis:'auto',gap:10},
  chapterNumber:{width:44,height:46,borderWidth:1,borderColor:'#8f905b',alignItems:'center',justifyContent:'center',backgroundColor:'#354331'},
  chapterNumberText:{fontFamily:GAME_PIXEL_CJK_FONT_FAMILY,fontSize:23,color:'#d7c48c'},
  chapterTitle:{fontFamily:GAME_PIXEL_CJK_FONT_FAMILY,fontSize:18,color:'#f1dfb3',marginBottom:5},
  mapFooter:{gap:10},sidebar:{width:320,flexGrow:0,flexShrink:0,borderWidth:1,borderColor:'#596344',backgroundColor:'#253b2f'},sidebarCompact:{width:'100%',flex:1,flexGrow:1,flexShrink:1},
  sidebarContent:{padding:16,gap:13,paddingBottom:30},placeName:{fontFamily:GAME_PIXEL_CJK_FONT_FAMILY,fontSize:22,color:'#f4e4ba'},
  message:{backgroundColor:'#152b24',padding:12,borderLeftWidth:3,borderColor:'#a7b274'},messageText:{color:'#d5dbb5',fontSize:12,lineHeight:19},
  cream:{color:'#eddfbd',fontSize:14,lineHeight:22},muted:{color:'#adbb9e',fontSize:12,lineHeight:19},tiny:{color:'#b1bd9f',fontSize:10,lineHeight:16},
  sectionTitle:{color:'#dfc995',fontSize:16,fontFamily:GAME_PIXEL_CJK_FONT_FAMILY,marginTop:5},
  button:{minHeight:39,paddingHorizontal:13,paddingVertical:10,backgroundColor:'#dec48a',borderWidth:1,borderColor:'#f2dea8',alignItems:'center',justifyContent:'center'},
  buttonText:{color:'#2d3424',fontSize:12,fontWeight:'600',textAlign:'center'},quiet:{backgroundColor:'#304535',borderColor:'#6a7753'},
  quietText:{color:'#e3d6af'},disabled:{opacity:.45},pressed:{opacity:.75},storyCard:{backgroundColor:'#364831',borderWidth:1,borderColor:'#9b9c60',padding:13,gap:10},
  overline:{fontSize:10,color:'#c5bc8c',letterSpacing:1.5},storyTitle:{color:'#efdbab',fontFamily:GAME_PIXEL_CJK_FONT_FAMILY,fontSize:17,lineHeight:25},
  plots:{flexDirection:'row',flexWrap:'wrap',gap:7},plot:{width:'31%',minHeight:88,backgroundColor:'#493f2d',borderWidth:1,borderColor:'#8e8055',alignItems:'center',justifyContent:'center',gap:3},
  residents:{gap:6},resident:{flexDirection:'row',alignItems:'center',gap:10,borderBottomWidth:1,borderColor:'#485a3f',paddingVertical:5},
  note:{padding:14,gap:8,borderWidth:1,borderColor:'#5c6a4b',backgroundColor:'#2c4233'},
  scrim:{flex:1,padding:18,alignItems:'center',justifyContent:'center',backgroundColor:'#091b18d9'},
  sheet:{width:'100%',maxWidth:680,maxHeight:'90%',backgroundColor:'#24392d',borderWidth:3,borderColor:'#c3a970'},
  sheetHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,padding:16,borderBottomWidth:1,borderColor:'#73815a'},
  sheetTitle:{flex:1,fontFamily:GAME_PIXEL_CJK_FONT_FAMILY,fontSize:23,color:'#f4dfb0'},dialogContent:{padding:22,gap:18},
  dialogWho:{flexDirection:'row',alignItems:'center',gap:18},speaker:{fontFamily:GAME_PIXEL_CJK_FONT_FAMILY,fontSize:20,color:'#f1d39b'},
  dialogText:{color:'#f0e2c2',fontSize:17,lineHeight:31,minHeight:76},reply:{padding:12,backgroundColor:'#182f25',color:'#d5dabb',fontSize:13,lineHeight:22},
  fireworks:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:15,padding:14,backgroundColor:'#202f3c'},
  tabs:{flexDirection:'row',paddingHorizontal:16,paddingTop:16,gap:8,flexWrap:'wrap'},
  objective:{padding:12,gap:10,borderBottomWidth:1,borderColor:'#4c5f43'},checkBox:{width:15,height:15,borderWidth:1,borderColor:'#b9b589'},
  inventoryRow:{flexDirection:'row',justifyContent:'space-between',paddingVertical:10,borderBottomWidth:1,borderColor:'#4b6044'},
  peopleRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:9,paddingBottom:10,borderBottomWidth:1,borderColor:'#4b6044'},
  search:{marginHorizontal:20,marginTop:16,padding:12,color:'#f2e1b8',borderWidth:1,borderColor:'#72805b',backgroundColor:'#1b3026'},
  fishTrack:{height:32,backgroundColor:'#162d35',borderWidth:2,borderColor:'#789590',position:'relative',marginVertical:12},
  fishTarget:{position:'absolute',left:'32%',width:'36%',height:'100%',backgroundColor:'#668d58'},
  fishNeedle:{position:'absolute',top:-5,width:8,height:38,backgroundColor:'#f8d382',borderWidth:1,borderColor:'#fff0bf'},
});
