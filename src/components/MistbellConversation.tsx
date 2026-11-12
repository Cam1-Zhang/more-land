import React from 'react';
import {Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {CHARACTERS} from '../data/mockData';
import {conversationView} from '../game/mistbell/conversations';
import type {Action,ValleyState} from '../game/mistbell/types';
import ExplorationSprite from './ExplorationSprite';

export default function MistbellConversation({state,id,onClose,onChoose}:{state:ValleyState;id:string;onClose:()=>void;onChoose:(action:Action)=>void}){
  const view=conversationView(state,id),name=CHARACTERS.find(c=>c.id===id)?.name??id;
  if(!view)return null;
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={s.overlay} accessibilityViewIsModal>
      <View style={s.box}>
        <View style={s.header}><View style={s.portrait}><ExplorationSprite character={id} scale={1.25}/></View>
          <View style={s.heading}><Text style={s.name}>{name}</Text><Text style={s.topic}>{view.topic}</Text></View>
          <Text accessibilityLiveRegion="polite" style={s.affinity}>♡ {state.friendship[id]??0}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="暂时结束交谈" onPress={onClose} style={s.close}><Text style={s.closeText}>×</Text></Pressable>
        </View>
        <ScrollView key={`${view.token}-${view.step}`} style={s.scroll} contentContainerStyle={s.content}>
          {!!view.recall&&view.step===0&&<Text style={s.said}>上回你说：{view.recall}</Text>}
          {!!view.said&&<Text style={s.said}>你：{view.said}</Text>}
          <View accessibilityLiveRegion="polite">
            {!!view.reply&&<Text style={s.line}>{view.reply}</Text>}
            {view.change!==0&&<Text style={s.affinity}>♡ 好感 {view.change>0?'+':''}{view.change}</Text>}
            {!!view.prompt&&<Text style={s.line}>{view.prompt}</Text>}
          </View>
          {view.choices.length>0?<View style={s.options}>
            <Text style={s.hint}>你想怎么回应？</Text>
            {view.choices.map((choice,index)=><Pressable key={`${view.step}-${index}`} accessibilityRole="button" accessibilityLabel={choice.label}
              onPress={()=>onChoose({type:'conversation',id,token:view.token,step:view.step,choice:index})}
              style={({pressed})=>[s.option,pressed&&s.pressed]}><Text style={s.optionText}>{choice.label}</Text></Pressable>)}
          </View>:<View style={s.options}>
            {view.waiting&&<Text style={s.hint}>改天再来，听听后来的事。</Text>}
            {view.nextAvailable&&<Pressable accessibilityRole="button" accessibilityLabel="聊聊别的" onPress={()=>onChoose({type:'openConversation',id,next:true,token:view.token})} style={s.option}><Text style={s.optionText}>聊聊别的</Text></Pressable>}
            <Pressable accessibilityRole="button" accessibilityLabel="结束交谈" onPress={onClose} style={s.option}><Text style={s.optionText}>回头见</Text></Pressable>
          </View>}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
const s=StyleSheet.create({
  overlay:{flex:1,justifyContent:'flex-end',alignItems:'center',padding:14,paddingBottom:24,backgroundColor:'#14211a35'},
  box:{width:'100%',maxWidth:800,maxHeight:'85%',backgroundColor:'#f2dcaa',borderWidth:4,borderColor:'#845532',borderRadius:4},
  header:{flexDirection:'row',alignItems:'center',gap:14,padding:16,paddingBottom:10,borderBottomWidth:1,borderColor:'#c5a16c'},
  portrait:{backgroundColor:'#dfbd83',paddingHorizontal:8,borderWidth:2,borderColor:'#b28c53'},
  heading:{flex:1,gap:5},name:{fontSize:19,fontWeight:'700',color:'#734726'},topic:{fontSize:12,color:'#8b6b43'},
  affinity:{color:'#8b4c49',fontSize:15},close:{padding:10},closeText:{fontSize:25,color:'#8b6841'},
  scroll:{flexShrink:1},content:{padding:20,gap:12},said:{fontSize:13,lineHeight:21,color:'#8b6b43',paddingBottom:4},
  line:{fontSize:16,lineHeight:27,color:'#3f3327',marginBottom:8},hint:{fontSize:12,color:'#8b6b43'},
  options:{gap:9,marginTop:6},option:{padding:13,borderWidth:1,borderColor:'#ab804c',backgroundColor:'#e8cb96',borderRadius:3},
  optionText:{fontSize:14,lineHeight:22,color:'#493423'},pressed:{backgroundColor:'#dab67a'},
});
