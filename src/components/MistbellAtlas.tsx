import {CHARACTERS} from '../data/mockData';
import React,{useState} from 'react';
import {Image,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {HOME_IDS,HOMES,isHome} from '../game/mistbell/homes';
import {PLACES} from '../game/mistbell/story';
import {placeLocked} from '../game/mistbell/engine';
import {WORLD_TILES,ROAD_IDS} from '../game/mistbell/world';
import {SCENE_ART} from '../game/mistbell/sceneArt';
import type {Place,ValleyState} from '../game/mistbell/types';
import {PIXEL_ART_IMAGE} from '../theme/pixelArtImage';
const OUTSIDE:Partial<Record<Place,Place>>={cabin:'highlands',observatory:'highlands',tavern:'square',sluice:'canal',door:'canal',heart:'canal'};
const tiles=Object.entries(WORLD_TILES) as [Place,readonly [number,number]][];
const wilderness=Array.from({length:49},(_,i)=>[i%7,Math.floor(i/7)]).filter(([x,y])=>!tiles.some(([,p])=>p[0]===x&&p[1]===y));
export default function MistbellAtlas({state,onTravel}:{state:ValleyState;onTravel:(p:Place)=>void}){
 const district=isHome(state.place)?HOMES[state.place].district:state.place;
 const current=OUTSIDE[district]??district;
 const [selected,setSelected]=useState<Place>(current),[zoom,setZoom]=useState(false),[width,setWidth]=useState(600);
 const homes=HOME_IDS.filter(h=>HOMES[h].district===selected||(selected==='square'&&HOMES[h].district==='tavern'));
 const details:Place[]=[selected,...homes,...(selected==='highlands'?['cabin','observatory'] as Place[]:selected==='square'?['tavern'] as Place[]:selected==='canal'?['sluice','door','heart'] as Place[]:[])];
 const mapWidth=zoom?Math.max(width*2,1008):width;
 return <View style={styles.container}>
  <View style={styles.toolbar}><Text style={styles.title}>雾铃谷</Text><Pressable accessibilityRole="button" accessibilityLabel={zoom?'缩小地图':'放大地图'} onPress={()=>setZoom(v=>!v)} style={styles.control}><Text style={styles.text}>{zoom?'全谷':'放大'}</Text></Pressable></View>
  <View onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={styles.viewport}>
   <ScrollView horizontal showsHorizontalScrollIndicator={zoom}><ScrollView nestedScrollEnabled style={{height:width/1.5}} showsVerticalScrollIndicator={zoom}>
    <View accessibilityLabel="雾铃谷地图，北上南下，场景按实际相邻位置排列" style={[styles.map,{width:mapWidth,height:mapWidth/1.5}]}>
     {wilderness.map(([x,y])=><Image key={`${x}-${y}`} accessible={false} source={require('../../assets/mistbell/nordic-forest-fill.png')} resizeMode="stretch" style={[styles.tile,PIXEL_ART_IMAGE,{left:`${x/7*100}%`,top:`${y/7*100}%`,width:`${100/7}%`,height:`${100/7}%`}]}/>)}
     {tiles.map(([id,[x,y]])=><Pressable key={id} accessibilityRole="button" accessibilityLabel={`查看${PLACES[id].name}`} accessibilityState={{selected:selected===id}} onPress={()=>setSelected(id)} style={[styles.tile,{left:`${x/7*100}%`,top:`${y/7*100}%`,width:`${100/7}%`,height:`${100/7}%`}]}>
      <Image source={SCENE_ART[id]} style={[StyleSheet.absoluteFill,PIXEL_ART_IMAGE]} resizeMode="stretch"/>
      {selected===id&&<View pointerEvents="none" style={styles.outline}/>}
      {(zoom||!ROAD_IDS.includes(id as typeof ROAD_IDS[number])||id===selected)&&<Text numberOfLines={1} style={styles.label}>{current===id?'◆ ':''}{PLACES[id].name}</Text>}
     </Pressable>)}
    </View>
   </ScrollView></ScrollView>
  </View>
  <Text style={styles.caption}>◆ 所在街区 · 点选查看 · 放大后可拖动地图</Text>
  <View style={styles.previewRow}><Image accessibilityLabel={`${PLACES[selected].name}实景`} source={SCENE_ART[selected]} resizeMode="contain" style={[styles.preview,PIXEL_ART_IMAGE]}/><View style={styles.description}><Text style={styles.title}>{PLACES[selected].name}</Text><Text style={styles.caption}>{PLACES[selected].subtitle}</Text></View></View>
  <View style={styles.destinations}>{details.map(place=><Pressable key={place} accessibilityRole="button" accessibilityLabel={`沿路前往${PLACES[place].name}`} onPress={()=>onTravel(place)} style={styles.destination}><Text style={styles.text}>{placeLocked(state,place)?'· ':''}{PLACES[place].name} →</Text>{isHome(place)&&<Text style={styles.caption}>{HOMES[place].residents.map(id=>CHARACTERS.find(c=>c.id===id)?.name).join('、')} · {HOMES[place].kind==='family'?'家人同住':'独居'}</Text>}</Pressable>)}</View>
 </View>;
}
const styles=StyleSheet.create({
 container:{gap:10},toolbar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},title:{fontSize:16,fontWeight:'700',color:'#f0ddb3'},control:{paddingHorizontal:16,paddingVertical:8,borderWidth:1,borderColor:'#74805c'},
 viewport:{width:'100%',borderWidth:1,borderColor:'#74805c',overflow:'hidden'},map:{backgroundColor:'#153f2c'},tile:{position:'absolute'},outline:{...StyleSheet.absoluteFillObject,borderWidth:2,borderColor:'#ffe493'},label:{position:'absolute',bottom:2,left:2,right:2,color:'#fff3c9',backgroundColor:'#193225cc',textAlign:'center',fontSize:9,paddingVertical:2},caption:{fontSize:11,color:'#b5c0a6',lineHeight:17},previewRow:{flexDirection:'row',alignItems:'center',gap:14},preview:{width:156,aspectRatio:1.5},description:{flex:1,gap:6},destinations:{flexDirection:'row',flexWrap:'wrap',gap:8},destination:{borderWidth:1,borderColor:'#74805c',backgroundColor:'#304535',padding:10,gap:3},text:{fontSize:13,color:'#f0ddb3'},
});
