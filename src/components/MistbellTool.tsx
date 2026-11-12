import React from 'react';
import {Image,Platform,View} from 'react-native';
import {TOOL_INFO,type FarmTool} from '../game/mistbell/tools';
import type {Point} from '../game/mistbell/scenes';
import type {Facing} from './ExplorationSprite';
const pixel=Platform.OS==='web'?{imageRendering:'pixelated'} as any:undefined;
export function ToolIcon({tool,size=28}:{tool:FarmTool;size?:number}){
 const cell=TOOL_INFO[tool].cell;
 return <View pointerEvents="none" style={{width:size,height:size,overflow:'hidden'}}><Image source={require('../../assets/mistbell/tools.png')} resizeMode="stretch" style={[{position:'absolute',width:size*3,height:size*2,left:-(cell%3)*size,top:-Math.floor(cell/3)*size},pixel]}/></View>;
}
export type ToolAnimation={tool:FarmTool;origin:Point;point:Point;facing:Facing;progress:number;started:number};
export function ToolAction({action}:{action:ToolAnimation}){
 const {tool,origin,point,facing,progress:p}=action,impact=TOOL_INFO[tool].impact;
 const hit=p>=impact,after=Math.max(0,(p-impact)/(1-impact));
 const gripX=origin.x+(facing==='left'?-10:facing==='right'?11:6),gripY=origin.y-16;
 const aim=Math.atan2(point.y-gripY,point.x-gripX)*180/Math.PI;
 const swing=p<impact?aim-20+110*Math.pow(p/impact,2):aim+90-55*after;
 const pourAngle=((aim-(facing==='left'?-155:-25)+540)%360)-180;
 const small=tool==='water'||tool==='seed',size=small?24:32,anchorX=small?12:16,anchorY=small?13:28;
 const particles=Array.from({length:tool==='water'?9:6},(_,i)=>i);
 return <>
  {tool!=='hand'&&<View pointerEvents="none" style={{position:'absolute',left:gripX-anchorX,top:gripY-anchorY,width:size,height:size,zIndex:Math.round(origin.y)+(facing==='up'?-1:2),transformOrigin:small?'50% 54%':'50% 88%',transform:[{rotate:`${tool==='water'?Math.min(1,p/.25)*pourAngle:tool==='seed'?Math.sin(p*Math.PI)*50:swing}deg`},{scaleX:tool==='water'&&facing==='left'?-1:1}] } as any}><ToolIcon tool={tool} size={size}/></View>}
  {hit&&particles.map(i=>{
   const angle=i/particles.length*Math.PI*2,water=tool==='water';
   const travel=water?(after*2+i*.15)%1:after;
   const x=point.x+Math.cos(angle)*(4+travel*17),y=point.y+(water?-23+travel*30:Math.sin(angle)*travel*9-Math.sin(travel*Math.PI)*13);
   return <View key={i} pointerEvents="none" style={{position:'absolute',left:x,top:y,width:water?2:tool==='seed'?2:3,height:water?5:3,backgroundColor:water?'#b4e8fb':tool==='pick'?'#d9d6b9':tool==='hand'?'#f2dc80':tool==='seed'?'#ead7a4':'#bc8854',opacity:water?.9:1-after,zIndex:700}}/>;
  })}
  {hit&&tool==='water'&&<View pointerEvents="none" style={{position:'absolute',left:point.x-15-after*6,top:point.y-7,width:30+after*12,height:13,borderWidth:1,borderColor:'#99d8ed',opacity:1-after,zIndex:10}}/>}
 </>;
}
