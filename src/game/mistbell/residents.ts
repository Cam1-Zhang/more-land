import {HOME_OF,HOMES,isHome} from './homes';
import {romancePlan,activeLifeScenes} from './social';
import {CHAPTERS,EVENTS,RESIDENT_HOME} from './story';
import {DAILY_DIALOGUE} from './dailyDialogue';
import {eventReason,weather} from './engine';
import type {Place,ValleyState} from './types';
export type ResidentPlan={place:Place;activity:string;walking:boolean;story?:string};
// These are story participants and work/social groups, not inferred romantic relationships.
export const STORY_CAST:Record<string,string[]>={
 welcome:['6','2','7','8','16'],ghost:['43','7'],clock:['6'],warning:['43'],peterRiver:['12','4','5','43'],
 debate:['6','12','37','43'],photo:['6'],peterPast:['12'],widow:['38'],ghostPast:['43'],boundary:['43'],
 canalMap:['38','12'],mechanism:['6','37'],moriWater:['37'],ada:['42'],kaspar:['39'],devin:['15'],frankRepair:['6'],noVillain:['42','39','15','6'],
 door:['43'],impossibleRoad:['43','40'],closeDoor:['43'],rules:['6','37','38','39'],ghostTrust:['43'],nameplate:['43','12'],lastMemory:['43'],returned:['43'],
 teamWater:['6','37','42'],teamRecords:['39','41','48'],teamSafety:['47','44','29'],teamSupplies:['2','16','23'],teamRoutes:['15','31','33'],teamSpace:['40','43','38'],banquet:['8','16','43','2'],fireworks:['8','16','43'],answer:['43'],
};
const tasks:Partial<Record<Place,string[]>>={farm:['检查田垄','整理种子','照料菜苗','搬运农具'],square:['采购生活用品','整理公告','在钟塔下等朋友','给邻居送东西'],bridge:['看河水的流向','在河岸钓鱼','沿着河岸散步'],tavern:['收拾餐桌','和朋友吃饭','在吧台帮忙'],forest:['寻找草药','收集倒下的树枝','查看林间小路'],cabin:['整理旧档案','检查维修工具'],observatory:['记录天气','整理观测笔记'],canal:['检查水渠入口'],sluice:['记录水位'],door:['观察检修区'],heart:['检查旧事故现场']};
const outings:{ids:string[];place:Place;start:number;end:number;activity:string;walking:boolean}[]=[
  {ids:['5','19'],place:'farmRoad',start:600,end:720,activity:'查看苹果树，商量今年的收成',walking:true},
  {ids:['18','32'],place:'marketRoad',start:660,end:780,activity:'在花园长椅边交换新读的故事',walking:false},
  {ids:['21','31'],place:'bridgeRoad',start:720,end:840,activity:'检查船屋，沿水边散步',walking:true},
  {ids:['13','33'],place:'forestRoad',start:600,end:720,activity:'检查林间的通行口',walking:true},
  {ids:['25','27'],place:'hillRoad',start:720,end:840,activity:'在坡地记录风向和云的变化',walking:false},
  {ids:['12','44'],place:'canalRoad',start:840,end:960,activity:'沿河岸观察今天的水位',walking:true},
  {ids:['4','7'],place:'southRoad',start:600,end:720,activity:'照看邻里花园里的花',walking:true},
  {ids:['14','20'],place:'riverRoad',start:840,end:960,activity:'在草甸晒太阳，等晾好的衣服',walking:false},
 ];
export function residentPlan(s:ValleyState,id:string,ch:number):ResidentPlan{
 const event=EVENTS.find(e=>e.chapter===ch&&s.day>=CHAPTERS[ch]?.day&&!s.flags.includes(e.id)&&e.requires?.every(f=>s.flags.includes(f))!==false&&STORY_CAST[e.id]?.includes(id));
 if(event)return {place:event.place,activity:`${event.title}`,walking:false,story:event.id};
 const residence=HOME_OF[id];
 if(s.minute>=1260||s.minute<540)return {place:residence,activity:id==='43'?'整理窗边的旧物':'在家休息',walking:false};
 const visit=activeLifeScenes(s).find(e=>e.ids.includes(id));
 if(visit)return {place:visit.place,activity:visit.title,walking:false};
 if(s.minute>=1140&&Number(id)%3!==s.day%3)return {place:residence,activity:HOMES[residence].kind==='family'?'和家人准备晚饭，聊今天的事':id==='43'?'在自己的窗边整理旧物':'准备晚饭，享受自己的时间',walking:Number(id)%2===0};
 if(s.minute>=1080&&s.minute<1140&&['2','14','1'].includes(id)&&s.day%7===2)return {place:'victorFamilyHome',activity:'试吃新烤的香草点心',walking:false};
 if(s.minute>=1140&&['26','35','8','3','7'].includes(id)&&s.day%7===5)return {place:'tavern',activity:'参加酒馆游戏夜',walking:true};
 const gatherings=[
  {day:0,ids:['6','37','39'],start:1020,end:1140,place:'frankFamilyHome' as Place,activity:'和老搭档下棋、整理工具'},
  {day:1,ids:['18','13'],start:840,end:960,place:'forest' as Place,activity:'一起调查林间的小事'},
  {day:3,ids:['19','23','45'],start:1080,end:1140,place:'westLane' as Place,activity:'黄昏散步，交换旧故事'},
  {day:4,ids:['9','22','32'],start:840,end:960,place:'square' as Place,activity:'一起核对公共记录'},
  {day:6,ids:['42','48'],start:840,end:960,place:'moriFamilyHome' as Place,activity:'讨论观测数据与人物关系'},
 ];
 const meeting=gatherings.find(g=>g.day===s.day%7&&g.ids.includes(id)&&s.minute>=g.start&&s.minute<g.end);
 if(meeting)return {place:meeting.place,activity:meeting.activity,walking:false};
 // Short daily outings make the connecting gardens part of village life.
 // Story appearances and personal appointments above always take priority.

 const outing=outings.find(o=>o.ids.includes(id)&&s.minute>=o.start&&s.minute<o.end);
 if(outing)return {place:outing.place,activity:outing.activity,walking:outing.walking};
 const personal=romancePlan(s,id);
 if(personal&&!(['cabin','observatory','canal'].includes(personal.place)&&ch<4))return {...personal,walking:Number(id)%3!==0};
 if(s.minute<1080&&['9','22','42','36'].includes(id))return {place:'square',activity:'整理公共档案，核对邻居留下的记录',walking:Number(id)%2===0};
 if(s.minute<1080&&['17','24','34','30'].includes(id))return {place:s.minute<720?'neighborhood':s.minute<960?'justiceFamilyHome':'bridge',activity:'处理街区的修缮和日常事务',walking:Number(id)%2===0};
 if(s.minute<1080&&['25','27','40','47'].includes(id))return {place:s.minute<720?'highlands':s.minute<960?'moriFamilyHome':'square',activity:'在北坡整理观测器具和社区记录',walking:Number(id)%2===0};
 const n=Number(id),home=RESIDENT_HOME[id]??'square',phase=s.minute<720?0:s.minute<960?1:s.minute<1140?2:3;
 let place:Place=home,activity='';
 if(id==='43'){place='bridge';activity='看着桥下的水';}
 else if(id==='37'){place='observatory';activity='整理水位与天气记录';}
 else if(id==='6'){place=!s.houseFixed&&ch<2?'farm':s.minute>=1080&&ch>=4?'canal':'cabin';activity=place==='farm'?'检查农舍屋顶':place==='canal'?'巡查旧水渠':'整理守谷会旧物';}
 else if(['2','1'].includes(id)){place=phase===0?'farm':phase===1?'square':phase===2?'farm':'tavern';activity=id==='2'?(phase===1?'给广场的邻居送面包':'准备面包和农场补给'):(phase===1?'帮 Momo 搬送面包':'帮忙照料田地');}
 else if(['7','4'].includes(id)){place=phase===1?'bridge':phase===3?'tavern':'square';activity=phase===1?'结伴在河边散步':'整理刚采来的花';}
 else if(['8','16'].includes(id)){place=phase===0?'square':'tavern';activity=id==='8'?'为晚上的聚会做准备':'帮邻居准备晚饭';}
 else if(['38','39'].includes(id)){place=phase===1&&ch>=4?'cabin':phase===3?'tavern':home;activity=place==='cabin'?'和守谷会的旧友整理记录':'整理旧物，和邻居聊近况';}
 else if(phase===1){place=home==='forest'?'forest':home==='observatory'?'observatory':'square';}
 else if(phase===2){place=n%4===0?'bridge':home;}
 else if(phase===3){place=n%3===0?'tavern':n%3===1?'square':home;}
 if((['cabin','observatory','canal'].includes(place)&&ch<4)||(['sluice','door','heart'].includes(place)))place=HOME_OF[id];
 return {place,activity:activity||(tasks[place]??['照看自己的日常事务'])[(n+s.day)%(tasks[place]?.length??1)],walking:!['6','37','43'].includes(id)&&n%3!==0};
}
export function residentStory(s:ValleyState,id:string){
 return EVENTS.find(e=>STORY_CAST[e.id]?.includes(id)&&!eventReason(s,e.id));
}
export function residentLines(s:ValleyState,id:string,_ch:number,visit=0){
 const lines=DAILY_DIALOGUE[id];if(!lines)return [];
 const pool=[...lines.daily];
 if(isHome(s.place)&&s.place===HOME_OF[id])pool.push(lines.home);
 if(weather(s)==='雨')pool.push(lines.rain);
 if((s.friendship[id]??0)>=20)pool.push(lines.friend);
 const text=pool[(s.day+Number(id)+Math.floor(s.minute/120)+visit)%pool.length];
 // One small topic per greeting, advanced a sentence at a time.
 return text.match(/[^。！？]+[。！？]?/g)?.map(s=>s.trim()).filter(Boolean)??[text];
}
