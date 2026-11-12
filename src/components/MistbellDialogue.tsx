import React,{useEffect,useRef,useState} from 'react';
import {Modal,Platform,Pressable,StyleSheet,Text,View} from 'react-native';
import {CHARACTERS} from '../data/mockData';
import type {Line} from '../game/mistbell/types';
import ExplorationSprite from './ExplorationSprite';
const people=Object.fromEntries(CHARACTERS.map(c=>[c.name,c.id]));
export default function MistbellDialogue({lines,onClose,onFinish,choices}:{lines:Line[];onClose:()=>void;onFinish:()=>void;choices?:{label:string;onPress:()=>void}[]}){
 const [page,setPage]=useState(0),done=useRef(false),latest=useRef(()=>{});
 const advance=()=>{if(done.current)return;if(page<lines.length-1)setPage(p=>p+1);else if(!choices?.length){done.current=true;onFinish();}};latest.current=advance;
 useEffect(()=>{if(Platform.OS!=='web')return;const key=(e:KeyboardEvent)=>{if((e.target as HTMLElement)?.closest('button,[role="button"]'))return;if(['Space','Enter','KeyE'].includes(e.code)){e.preventDefault();e.stopPropagation();if(!e.repeat)latest.current();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 const line=lines[page],id=people[line.who];
 return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View accessibilityViewIsModal style={s.overlay}>
  <View style={s.box}><Pressable accessibilityRole="button" accessibilityLabel="结束对话" onPress={onClose} style={s.close}><Text style={s.closeText}>×</Text></Pressable>
   <Pressable accessibilityRole="button" accessibilityLabel={page<lines.length-1?'继续对话':'结束这段对话'} onPress={advance} style={s.content}>
    {id&&<View style={s.portrait}><ExplorationSprite character={id} scale={1.5}/></View>}
    <View style={s.words}><Text style={s.name}>{line.who}</Text><Text style={s.line}>{line.text}</Text><Text style={s.next}>{page<lines.length-1?'点击继续　▼':choices?.length?'请选择你的回答':'点击收起　◆'}</Text></View>
   </Pressable>
   {page===lines.length-1&&choices?.map(choice=><Pressable key={choice.label} accessibilityRole="button" accessibilityLabel={choice.label} onPress={()=>{if(done.current)return;done.current=true;choice.onPress();}} style={{padding:13,marginHorizontal:20,marginBottom:10,borderWidth:1,borderColor:'#9b7447',backgroundColor:'#e5c58d'}}><Text style={{color:'#493423',textAlign:'center'}}>{choice.label}</Text></Pressable>)}
  </View>
 </View></Modal>;
}
const s=StyleSheet.create({overlay:{flex:1,justifyContent:'flex-end',alignItems:'center',padding:14,paddingBottom:24,backgroundColor:'#14211a25'},box:{width:'100%',maxWidth:860,backgroundColor:'#f2dcaa',borderWidth:4,borderColor:'#845532',borderRadius:4},content:{flexDirection:'row',gap:18,padding:20,minHeight:155,alignItems:'center'},portrait:{padding:6,backgroundColor:'#dfbd83',borderWidth:2,borderColor:'#b28c53'},words:{flex:1,gap:9},name:{fontSize:17,fontWeight:'700',color:'#734726'},line:{fontSize:16,lineHeight:27,color:'#3f3327'},next:{fontSize:11,color:'#8b6b43',textAlign:'right',marginTop:6},close:{position:'absolute',right:0,top:0,zIndex:2,width:32,height:32,alignItems:'center',justifyContent:'center'},closeText:{fontSize:22,color:'#8b6841'}});
