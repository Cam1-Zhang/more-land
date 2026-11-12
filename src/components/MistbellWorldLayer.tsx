import React, {memo, useEffect, useState} from 'react';
import {Image, Pressable, StyleSheet, View} from 'react-native';
import ExplorationSprite from './ExplorationSprite';
import {PIXEL_ART_IMAGE} from '../theme/pixelArtImage';
import {CHARACTERS} from '../data/mockData';
import {weather} from '../game/mistbell/engine';
import {FARM_PLOTS, outdoorResidents, residentPose} from '../game/mistbell/worldScene';
import type {ValleyState} from '../game/mistbell/types';
const CROPS=require('../../assets/mistbell/crops.png');
const NAMES=Object.fromEntries(CHARACTERS.map(c=>[c.id,c.name]));

export default memo(function MistbellWorldLayer({state,scale,running,disabled,onResident,onPlot}:{
  state:ValleyState;scale:number;running:boolean;disabled:boolean;
  onResident:(id:string)=>void;onPlot:(index:number)=>void;
}) {
  const [tick,setTick]=useState(0);
  useEffect(()=>{if(!running)return;const timer=setInterval(()=>setTick(t=>(t+1)%48),160);return()=>clearInterval(timer);},[running]);
  return <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
    {FARM_PLOTS.map((point,i)=>{
      const plot=state.plots[i],wet=plot.watered||weather(state)==='雨',label=!plot.planted?'播种':plot.growth>=2?'收获':wet?'已浇水':'浇水';
      return <Pressable key={i} accessibilityRole="button" accessibilityLabel={`地图田地${i+1}：${label}`} disabled={disabled} onPress={()=>onPlot(i)}
        style={{position:'absolute',left:(point.x-19)*scale,top:(point.y-19)*scale,width:38*scale,height:29*scale}}>
        {plot.planted&&[-9,8].map((dx,j)=><View pointerEvents="none" key={dx} style={{position:'absolute',left:(7+dx)*scale,top:(j===1?-5:0)*scale,width:24*scale,height:24*scale,overflow:'hidden'}}>
          <Image source={CROPS} resizeMode="stretch" style={[PIXEL_ART_IMAGE,{position:'absolute',width:72*scale,height:24*scale,left:-plot.growth*24*scale,top:0}]}/>
        </View>)}
        {plot.planted&&wet&&<View pointerEvents="none" style={{position:'absolute',left:18*scale,bottom:2*scale,width:3*scale,height:3*scale,backgroundColor:'#a7daee'}}/>}
      </Pressable>;
    })}
    {outdoorResidents(state).sort((a,b)=>a.y-b.y).map(person=>{
      const pose=residentPose(person.id,tick);
      return <Pressable key={person.id} accessibilityRole="button" accessibilityLabel={`地图居民 ${NAMES[person.id]}`} disabled={disabled} onPress={()=>onResident(person.id)}
        style={{position:'absolute',left:(person.x+pose.dx-14)*scale,top:(person.y-32)*scale,width:28*scale,height:34*scale,opacity:person.id==='43'?.78:1}}>
        <ExplorationSprite character={person.id} facing={pose.facing} frame={pose.frame} scale={.7*scale}/>
      </Pressable>;
    })}
  </View>;
});
