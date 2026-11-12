import PixelAvatarSprite from './PixelAvatarSprite';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {AppState,Image,Platform,Pressable,StyleSheet,Text,View} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import {CHARACTERS} from '../data/mockData';
import type {PixelAvatarConfig} from '../constants/avatarCreator';
import type {Action,ValleyState} from '../game/mistbell/types';
import {act,weather,VALVE_NAMES,placeLocked} from '../game/mistbell/engine';
import {canReach,distance,moveInRoom,route,sceneTargets,residentActors,residentStandable,residentSpawn,nearbyTarget,type Point,type Target} from '../game/mistbell/scenes';
import ExplorationSprite,{type Facing} from './ExplorationSprite';
import MistbellPlayer from './MistbellPlayer';
import {ToolAction,ToolIcon,type ToolAnimation} from './MistbellTool';
import {GATEWAYS,gatewayAt,type Gateway} from '../game/mistbell/connections';
import {forestResources,resourceName,resourceTool,resourceCell,resourceRadius} from '../game/mistbell/resources';
import {TOOL_INFO,toolPhase} from '../game/mistbell/tools';
import {SCENE_ART as ART} from '../game/mistbell/sceneArt';
const TOOLS=[{id:'hand',name:'空手',icon:'✋'},{id:'hoe',name:'锄头',icon:'⌝'},{id:'seed',name:'种子',icon:'⁙'},{id:'water',name:'水壶',icon:'♧'},{id:'axe',name:'斧头',icon:'⚒'},{id:'pick',name:'镐子',icon:'⛏'}] as const;
type Tool=typeof TOOLS[number]['id'];
const VECTORS:Record<Facing,Point>={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
const KEYS:Record<string,Facing>={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
const NAMES=Object.fromEntries(CHARACTERS.map(c=>[c.id,c.name]));
const pixel=Platform.OS==='web'?{imageRendering:'pixelated'} as any:undefined;
export default function MistbellLocalScene({seatRequest,state,avatar,paused,message,messageId,run,notify,onInteract,onMap,entry,walkTo,onCross}:{seatRequest:{id:number;x:number;y:number;facing:'down'|'left'|'right'}|null;entry:Point & {facing?:Facing};walkTo:{place:ValleyState['place'];id:number}|null;onCross:(gate:Gateway)=>void;state:ValleyState;avatar:PixelAvatarConfig;paused:boolean;message:string;messageId:number;run:(a:Action)=>void;notify:(s:string)=>void;onInteract:(t:Target)=>void;onMap:()=>void}){
 const [seated,setSeated]=useState<typeof seatRequest>(null);
 useEffect(()=>{setSeated(seatRequest);},[seatRequest]);
 const focused=useIsFocused(),[active,setActive]=useState(true);
 const [follower,setFollower]=useState(()=>({...residentSpawn(state.place,{x:entry.x-28,y:entry.y},state.place==='forest'?forestResources(state):[]),facing:(entry.facing??'up') as Facing,frame:0})),trail=useRef<Point[]>([]),followRef=useRef(follower),followPath=useRef<Point[]>([]),followRouteAt=useRef(0);
 const [size,setSize]=useState({w:960,h:580}),[actor,setActor]=useState({...entry,facing:(entry.facing??'up') as Facing,frame:0}),[tool,setTool]=useState<Tool>('hand'),[effect,setEffect]=useState<ToolAnimation|null>(null),[goal,setGoal]=useState<Point|null>(null);
 const position=useRef(actor),held=useRef(new Map<string,Facing>()),path=useRef<Point[]>([]),pending=useRef<Target|null>(null),cooldown=useRef(0),swing=useRef<{animation:ToolAnimation;action:Action;committed:boolean}|null>(null);
 const [elapsed,setElapsed]=useState(0),simulation=useRef(0),clockSeconds=useRef(0),lastGate=useRef<string|null>(null);
 const resources=useMemo(()=>state.place==='forest'?forestResources(state):[],[state.resources,state.place,state.day]);
 const residents=useMemo(()=>residentActors(state,elapsed),[state,elapsed]);
 const roomTargets=useMemo(()=>sceneTargets(state).filter(t=>t.kind!=='npc'),[state]);
 const targets=useMemo(()=>[...roomTargets,...residents.filter(t=>t.value!==state.companion),{...follower,id:'companion',label:'同行伙伴',kind:'npc' as const,value:state.companion}],[roomTargets,residents,follower,state.companion]);
 const blocked=paused||!focused||!active;
 const [toast,setToast]=useState(true);
 useEffect(()=>{setToast(true);const timer=setTimeout(()=>setToast(false),5000);return()=>clearTimeout(timer);},[message,messageId]);
 const live=useRef({state,targets,tool,blocked,run,notify,onInteract,onMap,onCross,resources});live.current={state,targets,tool,blocked,run,notify,onInteract,onMap,onCross,resources};
 const stop=()=>{held.current.clear();path.current=[];pending.current=null;setGoal(null);};
 useEffect(()=>{if(blocked){stop();swing.current=null;setEffect(null);}},[blocked]);
 useEffect(()=>{const sub=AppState.addEventListener('change',s=>setActive(s==='active'));return()=>sub.remove();},[]);
 function nearest(){const c=live.current;return nearbyTarget(c.targets,position.current,c.tool,c.state.plots);}
 function interact(target?:Target){
  setSeated(null);
  const c=live.current,t=target?c.targets.find(t=>t.id===target.id):nearest();
  if(c.blocked||swing.current||Date.now()<cooldown.current)return;
  if(!t||!canReach(position.current,t)){c.notify('走近田地、物件或居民，再按 E 互动。');return;}
  cooldown.current=Date.now()+450;
  const dx=t.x-position.current.x,dy=t.y-position.current.y;
  position.current={...position.current,facing:Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up',frame:0};setActor(position.current);
  let action:Action;
  if(t.kind==='plot'){
   if(c.tool==='axe'||c.tool==='pick'){c.notify('田地需要锄头、种子和水壶；成熟后空手收获。');return;}
   action={type:'farmTool',index:Number(t.value),tool:c.tool};
  }else if(t.kind==='gather'){
   const node=c.resources.find(n=>n.id===t.value);if(!node)return;
   const wanted=resourceTool(node);
   if(c.tool!==wanted){c.notify(`先切换${TOOLS.find(x=>x.id===wanted)!.name}，再靠近采集。`);return;}
   if(!['axe','pick','hand'].includes(c.tool))return;
   action={type:'resource',id:t.value,tool:c.tool as 'axe'|'pick'|'hand'};
  }else if(t.kind==='valve'){c.run({type:'valve',index:Number(t.value)});return;}
  else if(t.kind==='exit'){const points=route(c.state.place,position.current,t,false,c.resources);path.current=points;pending.current=null;setGoal(t);return;}
  else {c.onInteract(t);return;}
  const preview=act(c.state,action);
  if(preview.state===c.state){c.notify(preview.message);return;}
  stop();
  const animation:ToolAnimation={point:t,origin:{...position.current},facing:position.current.facing,tool:c.tool,progress:0,started:Date.now()};
  swing.current={animation,action,committed:false};setEffect(animation);
 }
 const interaction=useRef(interact);interaction.current=interact;
 useEffect(()=>{
  if(Platform.OS!=='web')return;
  const keydown=(e:KeyboardEvent)=>{
   const el=e.target as HTMLElement;if(live.current.blocked||e.ctrlKey||e.metaKey||e.altKey||['INPUT','TEXTAREA','SELECT'].includes(el?.tagName)||el?.isContentEditable)return;
   if(KEYS[e.code]){e.preventDefault();setSeated(null);if(swing.current)return;held.current.set(e.code,KEYS[e.code]);path.current=[];pending.current=null;setGoal(null);}
   else if(['KeyE','Space'].includes(e.code)){e.preventDefault();if(!e.repeat)interaction.current();}
   else if(/^Digit[1-6]$/.test(e.code)){e.preventDefault();setTool(TOOLS[Number(e.code.slice(-1))-1].id);}
  };
  const keyup=(e:KeyboardEvent)=>held.current.delete(e.code),blur=()=>stop();
   const visibility=()=>{setActive(!document.hidden);if(document.hidden)stop();};
  window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);
  return()=>{window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);};
 },[]);
 useEffect(()=>{
  let last=Date.now();
  const timer=setInterval(()=>{
   const now=Date.now(),dt=Math.min(80,now-last)/1000;last=now;
   if(live.current.blocked)return;
   simulation.current+=dt*1000;clockSeconds.current+=dt;
   if(Math.floor(simulation.current/120)!==Math.floor((simulation.current-dt*1000)/120))setElapsed(simulation.current);
   if(clockSeconds.current>=15&&!swing.current){clockSeconds.current=0;live.current.run({type:'clock'});}
   if(swing.current){
    const current=swing.current,phase=toolPhase(current.animation.tool,now-current.animation.started);
    if(phase.impact&&!current.committed){current.committed=true;live.current.run(current.action);}
    if(phase.finished){swing.current=null;setEffect(null);}else setEffect({...current.animation,progress:phase.progress});
    return;
   }
   const heldFace=[...held.current.values()].at(-1),p=position.current;let face=heldFace,dx=0,dy=0;
   if(heldFace){dx=VECTORS[heldFace].x*110*dt;dy=VECTORS[heldFace].y*110*dt;}
   else if(path.current.length){const next=path.current[0],d=distance(p,next);if(d<3)path.current.shift();else{const step=Math.min(110*dt,d);dx=(next.x-p.x)/d*step;dy=(next.y-p.y)/d*step;face=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';}}
   const n=moveInRoom(live.current.state.place,p,dx,dy,live.current.resources),moving=distance(n,p)>.1;
   const next={...n,facing:face??p.facing,frame:moving?Math.floor(now/130)%4:0};
   if(moving||next.frame!==p.frame||next.facing!==p.facing){position.current=next;setActor(next);}
   const gate=gatewayAt(live.current.state.place,n);
   if(!gate)lastGate.current=null;
   if(moving&&gate&&lastGate.current!==gate.id){lastGate.current=gate.id;stop();const reason=placeLocked(live.current.state,gate.to);if(reason)live.current.notify(reason);else live.current.onCross(gate);return;}
   if(moving){
    trail.current.push({...n});
    if(trail.current.length>14){const spot=trail.current.shift()!,c=live.current;
     if(now-followRouteAt.current>=400&&residentStandable(c.state.place,spot,c.resources)){
      followRouteAt.current=now;followPath.current=route(c.state.place,followRef.current,spot,false,c.resources,p=>residentStandable(c.state.place,p,c.resources));
     }
    }
   }
   const old=followRef.current,waypoint=followPath.current[0];let followerMoved=false;
   if(waypoint){const d=distance(old,waypoint);if(d<2)followPath.current.shift();else{
    const step=Math.min(115*dt,d),fx=(waypoint.x-old.x)/d*step,fy=(waypoint.y-old.y)/d*step,spot={x:old.x+fx,y:old.y+fy};
    if(residentStandable(live.current.state.place,spot,live.current.resources)){
     const f={...spot,facing:(Math.abs(fx)>Math.abs(fy)?fx>0?'right':'left':fy>0?'down':'up') as Facing,frame:Math.floor(now/130)%4};followRef.current=f;setFollower(f);followerMoved=true;
    }else followPath.current=[];
   }}
   if(!followerMoved&&followRef.current.frame!==0){followRef.current={...followRef.current,frame:0};setFollower(followRef.current);}
   if(!heldFace&&!path.current.length&&pending.current){const target=live.current.targets.find(t=>t.id===pending.current?.id);pending.current=null;setGoal(null);if(target){if(canReach(position.current,target))interaction.current(target);else{path.current=route(live.current.state.place,position.current,target,true,live.current.resources);if(path.current.length)pending.current=target;}}}
   else if(!heldFace&&!path.current.length)setGoal(null);
  },40);
  return()=>{clearInterval(timer);swing.current=null;};
 },[]);
 function approach(t:Target){setSeated(null);
  if(blocked||swing.current)return;
  if(t.kind!=='exit'&&canReach(position.current,t)){interaction.current(t);return;}
  const points=route(state.place,position.current,t,t.kind!=='exit',resources);
  if(!points.length){notify('这边走不过去，换一条路试试。');return;}
  held.current.clear();path.current=points;pending.current=t.kind==='exit'?null:t;setGoal(t);
 }
 useEffect(()=>{if(!walkTo)return;setSeated(null);const gate=GATEWAYS[state.place].find(g=>g.to===walkTo.place);if(gate){path.current=route(state.place,position.current,gate,false,resources);pending.current=null;held.current.clear();setGoal(gate);}},[walkTo?.id]);
 const scale=Math.max(1,Math.max(size.w/768,size.h/512));
 const camera={x:Math.max(0,Math.min(768-size.w/scale,actor.x-size.w/scale/2)),y:Math.max(0,Math.min(512-size.h/scale,actor.y-size.h/scale/2))};
 const offset={x:Math.max(0,(size.w-768*scale)/2)-camera.x*scale,y:Math.max(0,(size.h-512*scale)/2)-camera.y*scale};
 function ground(e:any){if(blocked||swing.current)return;setSeated(null);const rect=e.currentTarget?.getBoundingClientRect?.();const x=rect?(e.nativeEvent.clientX??e.clientX)-rect.left:e.nativeEvent.locationX,y=rect?(e.nativeEvent.clientY??e.clientY)-rect.top:e.nativeEvent.locationY;const end={x:(x-offset.x)/scale,y:(y-offset.y)/scale};path.current=route(state.place,position.current,end,false,resources);pending.current=null;held.current.clear();setGoal(path.current.length?end:null);}
 const near=nearbyTarget(targets,actor,tool,state.plots);
 const plotLabel=(i:number)=>{const p=state.plots[i];return !p.planted?p.tilled?'已翻土':'待开垦':p.growth>=2?'成熟 · 空手收获':p.watered||weather(state)==='雨'?'已浇水':'需要浇水';};
 const label=(t:Target)=>t.kind==='npc'?`与 ${NAMES[t.value]} 交谈`:t.kind==='plot'?`${t.label} · ${plotLabel(Number(t.value))}`:t.kind==='gather'?`${t.label}${resources.find(n=>n.id===t.value)?.size===3?' · 需多次开采':''}`:t.kind==='exit'?`通往${t.label}`:t.kind==='valve'?`${t.label} · ${VALVE_NAMES[state.valves[Number(t.value)]]}`:t.label;
 return <View style={s.root}>
  <View style={s.viewport} onLayout={e=>setSize({w:e.nativeEvent.layout.width,h:e.nativeEvent.layout.height})}>
   <Pressable accessibilityLabel="场景地面，点击走路" onPress={ground} style={StyleSheet.absoluteFill}/>
   <View pointerEvents="box-none" style={{position:'absolute',left:offset.x,top:offset.y,width:768,height:512,transformOrigin:'top left',transform:[{scale}] } as any}>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}><Image source={ART[state.place]} resizeMode="stretch" style={[{position:'absolute',width:768,height:512},pixel]}/></View>
    {state.minute>=1140&&<View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'#14234655'}]}/>}
    {goal&&<View pointerEvents="none" style={{position:'absolute',left:goal.x-6,top:goal.y-3,width:12,height:6,borderWidth:1,borderColor:'#fff0b0'}}/>}
    {targets.filter(t=>t.kind==='plot').map(t=>{const p=state.plots[Number(t.value)],wet=p.watered||weather(state)==='雨';return <Pressable key={t.id} accessibilityRole="button" accessibilityLabel={label(t)} onPress={()=>approach(t)} style={{position:'absolute',left:t.x-24,top:t.y-18,width:48,height:36,backgroundColor:p.planted||p.tilled?wet?'#553d2c':'#90613c':'#60834166',borderWidth:2,borderColor:p.planted||p.tilled?'#4f3828':'#b7ba6666',zIndex:10}}>
      {(p.tilled||p.planted)&&[8,17,26].map(y=><View key={y} style={{position:'absolute',left:3,right:3,top:y,height:2,backgroundColor:wet?'#3f3027':'#71492f'}}/>)}
      {p.planted&&<View pointerEvents="none" style={{position:'absolute',left:-2,top:-24,width:48,height:48,overflow:'hidden'}}><Image source={require('../../assets/mistbell/crops.png')} style={[{position:'absolute',height:48,width:144,left:-48*p.growth},pixel]}/></View>}
     </Pressable>;})}
    {targets.filter(t=>t.kind==='gather').map(t=>{const node=resources.find(n=>n.id===t.value)!;const size=node.size===3?60:node.size===2?44:30,cell=resourceCell(node),damage=1-node.hp/node.maxHp;return <Pressable key={t.id} accessibilityRole="button" accessibilityLabel={`${label(t)}，剩余${node.hp}次`} onPress={()=>approach(t)} style={{position:'absolute',left:t.x-size/2,top:t.y-size*.8,width:size,height:size,zIndex:Math.round(t.y)}}>
     <View pointerEvents="none" style={{width:size,height:size,overflow:'hidden'}}><Image source={require('../../assets/mistbell/resources.png')} resizeMode="stretch" style={[{position:'absolute',width:size*3,height:size*2,left:-(cell%3)*size,top:-Math.floor(cell/3)*size},pixel]}/></View>
     {damage>0&&<View pointerEvents="none" style={{position:'absolute',left:size*.48,top:size*.25,width:2,height:size*.45,backgroundColor:'#302c25',transform:[{rotate:'25deg'}]}}/>}
     {damage>.4&&<View pointerEvents="none" style={{position:'absolute',left:size*.3,top:size*.5,width:size*.4,height:2,backgroundColor:'#302c25',transform:[{rotate:'-25deg'}]}}/>}
     {near?.id===t.id&&node.maxHp>1&&<View style={{height:3,backgroundColor:'#413c2b',width:size-8,marginLeft:4}}><View style={{height:3,width:`${node.hp/node.maxHp*100}%`,backgroundColor:'#cfb876'}}/></View>}
    </Pressable>;})}
    {targets.filter(t=>t.kind==='npc').map(t=>{const pose=residents.find(n=>n.id===t.id),talking=near?.id===t.id;return <Pressable key={t.id} accessibilityRole="button" accessibilityLabel={label(t)} onPress={()=>approach(t)} style={{position:'absolute',left:t.x-22,top:t.y-44,width:44,height:62,alignItems:'center',zIndex:Math.round(t.y)}}>
      <View style={t.value==='43'?{opacity:.78}:undefined}><ExplorationSprite character={t.value} scale={1} frame={t.id==='companion'?follower.frame:pose?.frame??0} facing={t.id==='companion'?follower.facing:talking?Math.abs(actor.x-t.x)>Math.abs(actor.y-t.y)?actor.x<t.x?'left':'right':actor.y<t.y?'up':'down':pose?.facing??'down'}/></View>{talking&&<Text style={s.name}>{NAMES[t.value]}</Text>}
     </Pressable>;})}
    {targets.filter(t=>!['plot','npc','gather'].includes(t.kind)).map(t=>t.kind==='exit'?<Pressable key={t.id} accessibilityRole="button" accessibilityLabel={`沿路前往${t.label}`} onPress={()=>approach(t)} style={{position:'absolute',left:t.y>=480?t.x+34:t.x<40?t.x+28:t.x>730?t.x-104:t.x-36,top:t.y>=480?t.y-98:t.y<40?t.y+82:t.y-30,width:74,height:36,zIndex:520,alignItems:'center',justifyContent:'center'}}>
      <View pointerEvents="none" style={{width:70,height:18,backgroundColor:'#b48650',borderWidth:2,borderColor:'#775330',alignItems:'center',justifyContent:'center'}}><Text numberOfLines={1} style={{fontSize:9,color:'#fff0c9'}}>{t.label}</Text></View><View pointerEvents="none" style={{width:4,height:10,backgroundColor:'#775330'}}/>
     </Pressable>:<Pressable key={t.id} accessibilityRole="button" accessibilityLabel={label(t)} onPress={()=>approach(t)} style={{position:'absolute',left:t.hitbox?.x??t.x-23,top:t.hitbox?.y??t.y-36,width:t.hitbox?.w??46,height:t.hitbox?.h??44,alignItems:'center',justifyContent:'flex-end',zIndex:30}}>
      {t.kind==='story'&&<Text style={s.marker}>✦</Text>}{near?.id===t.id&&<Text style={s.name}>{t.label.split(' · ')[0]}</Text>}
     </Pressable>)}

    <View pointerEvents="none" style={{position:'absolute',left:(seated?.x??actor.x)-20,top:(seated?.y??actor.y)-44+(effect?Math.sin(effect.progress*Math.PI)*2:0),zIndex:Math.round(seated?.y??actor.y)}}><View style={s.shadow}/>{seated?<PixelAvatarSprite config={avatar} size={40} pose="seated" facing={seated.facing}/>:<MistbellPlayer config={avatar} facing={actor.facing} frame={actor.frame}/>}</View>
    {effect&&<ToolAction action={effect}/>}
   </View>
   {size.w<700&&<View pointerEvents="box-none" style={s.touch}><View style={s.dpad}>{(['up','left','down','right'] as Facing[]).map((f,i)=><Pressable key={f} accessibilityRole="button" accessibilityLabel={`向${['上','左','下','右'][i]}走`} onPressIn={()=>{if(!blocked&&!swing.current){setSeated(null);path.current=[];pending.current=null;held.current.set('touch',f);}}} onPressOut={()=>held.current.delete('touch')} style={[s.direction,{left:[44,0,44,88][i],top:[0,44,44,44][i]}]}><Text style={s.text}>{['▲','◀','▼','▶'][i]}</Text></Pressable>)}</View><Pressable accessibilityRole="button" accessibilityLabel="互动或使用工具" disabled={blocked} onPress={()=>interact()} style={s.use}><Text style={s.text}>E · 互动</Text></Pressable></View>}
   <View pointerEvents="none" style={s.near}><Text numberOfLines={2} style={s.text}>{effect?`${TOOL_INFO[effect.tool].name}…`:near?near.kind==='exit'?`沿路前往${near.label}`:`E  ${label(near)}`:goal?'正在走过去…':''}</Text></View>
  </View>
  <View style={s.belt}>{TOOLS.map((t,i)=><Pressable accessibilityRole="button" accessibilityLabel={`选择${t.name}`} accessibilityState={{selected:tool===t.id}} key={t.id} onPress={()=>setTool(t.id)} style={[s.tool,tool===t.id&&s.selected]}><ToolIcon tool={t.id} size={30}/><Text style={s.toolText}>{tool===t.id?t.name:i+1}{t.id==='seed'?` · ${state.inventory.seed}`:''}</Text></Pressable>)}</View>
  {toast&&<View pointerEvents="none" accessibilityLiveRegion="polite" style={s.message}><Text numberOfLines={2} style={s.messageText}>{message}</Text></View>}
 </View>;
}
const s=StyleSheet.create({root:{flex:1,minHeight:300},top:{flexDirection:'row',alignItems:'center',gap:12,padding:10,backgroundColor:'#263e2f'},place:{color:'#f1dca7',fontSize:17,fontWeight:'700'},hint:{flex:1,color:'#b9c4a7',fontSize:11},map:{padding:9,borderWidth:1,borderColor:'#9e9c69'},text:{color:'#f4e4b9',fontSize:12},viewport:{flex:1,overflow:'hidden',backgroundColor:'#142820'},name:{color:'#ffedbe',fontSize:9,backgroundColor:'#183125ce',paddingHorizontal:3,lineHeight:14,whiteSpace:'nowrap'} as any,marker:{fontSize:19,color:'#faf0bd',textShadowColor:'#213325',textShadowRadius:2},shadow:{position:'absolute',width:22,height:7,borderRadius:12,backgroundColor:'#162b2266',left:9,top:39},touch:{position:'absolute',left:12,right:12,bottom:96,flexDirection:'row',justifyContent:'space-between',alignItems:'flex-end'},dpad:{width:132,height:88},direction:{position:'absolute',width:42,height:42,backgroundColor:'#243d2cb8',borderWidth:1,borderColor:'#bfbd8188',alignItems:'center',justifyContent:'center'},use:{padding:16,backgroundColor:'#243d2cdd',borderWidth:2,borderColor:'#c8b87e',minHeight:50},near:{position:'absolute',bottom:84,alignSelf:'center',backgroundColor:'#213023bc',padding:6,maxWidth:'92%'},belt:{position:'absolute',bottom:14,alignSelf:'center',flexDirection:'row',justifyContent:'center',gap:3,padding:5,backgroundColor:'#694529',borderWidth:2,borderColor:'#d6ad68',borderRadius:3},tool:{width:48,minHeight:52,alignItems:'center',justifyContent:'center',backgroundColor:'#c5995d',borderWidth:1,borderColor:'#eed2a0'},selected:{borderColor:'#f5dba0',borderWidth:2,backgroundColor:'#f3d18a'},toolIcon:{fontSize:20,color:'#f0d9aa'},toolText:{fontSize:9,color:'#4a3325',marginTop:3},message:{position:'absolute',top:76,alignSelf:'center',maxWidth:'85%',paddingHorizontal:12,paddingVertical:7,backgroundColor:'#24352ade',borderRadius:3},messageText:{color:'#d1ddba',fontSize:12,lineHeight:18}});
