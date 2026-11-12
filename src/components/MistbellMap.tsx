import React, { memo, useEffect, useState } from 'react';
import { AppState, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Svg, { Polyline } from 'react-native-svg';
import ExplorationSprite, { type Facing } from './ExplorationSprite';
import PixelAvatarSprite from './PixelAvatarSprite';
import MistbellWorldLayer from './MistbellWorldLayer';
import {sceneMood} from '../game/mistbell/worldScene';
import type { PixelAvatarConfig } from '../constants/avatarCreator';
import { PIXEL_ART_IMAGE } from '../theme/pixelArtImage';
import { PLACES } from '../game/mistbell/story';
import { placeLocked } from '../game/mistbell/engine';
import { routeBetween } from '../game/mistbell/routes';
import type { Place, ValleyState } from '../game/mistbell/types';
import { GAME_PIXEL_CJK_FONT_FAMILY } from '../theme/pixelFont';
const OVERWORLD=require('../../assets/mistbell/valley-pixel.png');
const UNDERGROUND=require('../../assets/mistbell/canal-pixel.png');

export default memo(function MistbellMap({ state, destination, avatar, onTravel, onArrive, onResident, onPlot, paused, sceneEvent, navigationOnly=false }: {
  state: ValleyState; destination: Place|null; avatar:PixelAvatarConfig;
  onTravel:(place:Place)=>void; onArrive:(place:Place)=>void;
  onResident:(id:string)=>void; onPlot:(index:number)=>void; paused:boolean; sceneEvent?:string; navigationOnly?:boolean;
}) {
  const [width,setWidth]=useState(768),[actor,setActor]=useState<{x:number;y:number;frame:number;facing:Facing}>({...PLACES[state.place],frame:0,facing:'down'});
  const focused=useIsFocused();
  const [active,setActive]=useState(AppState.currentState==='active');
  useEffect(()=>{const sub=AppState.addEventListener('change',s=>setActive(s==='active'));return()=>sub.remove();},[]);
  useEffect(()=>{
    if(!destination){setActor({...PLACES[state.place],frame:0,facing:'down'});return;}
    if(!active||!focused)return;
    const route=routeBetween(state.place,destination);
    if(!route.length){onArrive(destination);return;}
    let point={x:PLACES[state.place].x,y:PLACES[state.place].y}, index=0, ticks=0;
    const timer=setInterval(()=>{
      const target=route[index],dx=target.x-point.x,dy=target.y-point.y,dist=Math.hypot(dx,dy),step=Math.min(8,dist);
      if(dist>0) point={x:point.x+dx/dist*step,y:point.y+dy/dist*step};
      setActor({...point,frame:Math.floor(ticks++/3)%4,facing:Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up'});
      if(dist<=8){index++;if(index===route.length){clearInterval(timer);onArrive(destination);}}
    },40);
    return()=>clearInterval(timer);
  },[destination,state.place,active,focused,onArrive]);
  const scale=width/768,underground=!!PLACES[state.place].underground;
  const markers=(Object.keys(PLACES) as Place[]).filter(p=>!!PLACES[p].underground===underground);
  const path=destination?routeBetween(state.place,destination):[];
  const mood=sceneMood(state,sceneEvent);
  return <View style={styles.frame} onLayout={e=>setWidth(e.nativeEvent.layout.width)}>
    <Image accessibilityLabel={underground?'像素风旧水渠地图':'像素风雾铃谷地图'} source={underground?UNDERGROUND:OVERWORLD} resizeMode="stretch" style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'},PIXEL_ART_IMAGE]}/>
    {!underground&&!navigationOnly&&<MistbellWorldLayer state={state} scale={scale} running={active&&focused&&!paused} disabled={!!destination||paused} onResident={onResident} onPlot={onPlot}/>}
    {!underground&&(mood.night||mood.dusk||mood.rain)&&<View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:mood.night?'#14244988':mood.dusk?'#a6603438':'#2d4b6040'}]}/>}
    {!underground&&mood.rain&&<View pointerEvents="none" style={StyleSheet.absoluteFill}>{Array.from({length:42},(_,i)=><View key={i} style={{position:'absolute',left:((i*137+51)%768)*scale,top:((i*73+25)%512)*scale,width:scale,height:7*scale,backgroundColor:'#b3d3e577',transform:[{rotate:'15deg'}]}}/>)}</View>}
    {!underground&&mood.night&&[PLACES.square,PLACES.tavern,PLACES.farm].map((point,i)=><View pointerEvents="none" key={i} style={{position:'absolute',left:(point.x-6)*scale,top:(point.y-45)*scale,width:5*scale,height:7*scale,backgroundColor:'#ffd582',shadowColor:'#ffc36c',shadowRadius:9*scale,shadowOpacity:.8}}/>)}
    {path.length>0&&<Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 768 512" style={StyleSheet.absoluteFill}><Polyline points={[PLACES[state.place],...path].map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#fff1a3" strokeWidth="2" strokeDasharray="4 5" opacity={0.65}/></Svg>}
    {markers.map(place=>{
      const p=PLACES[place],locked=!!placeLocked(state,place),selected=state.place===place;
      return <Pressable key={place} accessibilityRole="button" accessibilityLabel={`前往${p.name}`} accessibilityState={{selected,disabled:!!destination}} disabled={!!destination}
        onPress={()=>onTravel(place)} style={[styles.pin,{left:p.x*scale-(width<500?35:42),top:(p.y+(place==='farm'?65:12))*scale,minWidth:width<500?70:84},width<500&&{paddingVertical:3,paddingHorizontal:4},selected&&styles.selected,locked&&styles.locked]}>
        <Text style={[styles.pinText,width<500&&{fontSize:10},selected&&{color:'#302617'}]}>{locked?'· ':selected?'◆ ':''}{p.name}</Text>
      </Pressable>;
    })}
    {!destination&&<View pointerEvents="none" style={{position:'absolute',left:actor.x*scale-28*scale,top:(actor.y-34)*scale}}>
      <PixelAvatarSprite config={avatar} size={28*scale}/>
    </View>}
    <View pointerEvents="none" style={{position:'absolute',left:(actor.x+(destination?-14:8))*scale,top:(actor.y-32)*scale,opacity:state.companion==='43'?0.8:1}}>
      <ExplorationSprite character={state.companion} facing={actor.facing} frame={actor.frame} scale={0.7*scale}/>
    </View>
    <View pointerEvents="none" style={[styles.caption,width<500&&{left:width-178,width:166}]}><Text style={[styles.captionText,width<500&&{fontSize:9}]}>{navigationOnly?'选择地点进入场景':destination?'沿着小路前行…':mood.storyNight?(width<500?'剧情中的夜晚':'故事中的夜晚 · 阅读后回到当前时间'):(width<500?'点居民交谈 · 点田地种植':'点击居民交谈 · 点击田地照料作物')}</Text></View>
    {underground&&<Pressable accessibilityRole="button" accessibilityLabel="返回地面" disabled={!!destination} onPress={()=>onTravel('canal')} style={styles.exit}><Text style={styles.captionText}>← 返回地面</Text></Pressable>}
  </View>;
});
const styles=StyleSheet.create({
  frame:{width:'100%',aspectRatio:1.5,overflow:'hidden',backgroundColor:'#203b35',borderWidth:2,borderColor:'#7a8250'},
  pin:{position:'absolute',paddingHorizontal:6,paddingVertical:5,backgroundColor:'#21372ee6',borderWidth:1,borderColor:'#b8ba7b',alignItems:'center'},
  selected:{backgroundColor:'#f0d697',borderColor:'#fff2c5'},locked:{opacity:0.75},
  pinText:{fontFamily:GAME_PIXEL_CJK_FONT_FAMILY,color:'#fff2ca',fontSize:11},
  caption:{position:'absolute',left:8,bottom:8,padding:6,backgroundColor:'#1c3028df'},
  captionText:{color:'#eee2b6',fontSize:11},exit:{position:'absolute',right:8,top:8,padding:10,backgroundColor:'#1c3028ef',borderWidth:1,borderColor:'#c4ad6b'},
});
