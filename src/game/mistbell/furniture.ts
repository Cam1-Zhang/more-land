import {HOME_INTERIORS} from './homeInteriors';
import {HOMES,isHome} from './homes';
import type {Place,ValleyState} from './types';

type Rect={x:number;y:number;w:number;h:number};
export type FurnitureKind='bed'|'table'|'chair'|'kitchen'|'shelf'|'desk'|'wardrobe'|'album'|'hearth';
export type Furniture={id:string;kind:FurnitureKind;label:string;rect:Rect;x:number;y:number;seat?:{x:number;y:number;facing:'down'|'left'|'right'}};
export function furnitureAt(place:Place):Furniture[]{
 if(!isHome(place))return [];
 const h=HOMES[place];
 return HOME_INTERIORS[place].furniture.map(f=>{
  if(f.id==='album'&&h.kind==='solo')return {...f,label:place==='socratesFamilyHome'?'书房收藏':'屋主的旧物'};
  if(f.kind!=='bed')return f;
  const index=Number(f.id.slice(4))-1;
  const owner=h.layout==='couple'?h.residentNames.join(' 与 '):h.layout==='generations'?(index===0?h.residentNames[0]:index===1?h.residentNames.slice(1,3).join(' 与 '):h.residentNames[3]):h.residentNames[index];
  return {...f,label:owner+' 的床'};
 });
}
export function furnitureById(place:Place,id:string){return furnitureAt(place).find(f=>f.id===id);}
export function furnitureText(s:ValleyState,f:Furniture):string[]{
 if(!isHome(s.place))return [];
 const h=HOMES[s.place];
 switch(f.kind){
  case 'bed':return ['这是屋主的私人床铺，整理得很仔细。','只能在你自己的农舍睡觉；这里不能睡觉，也不能借宿。'];
  case 'album':return [h.relations,h.description];
  case 'wardrobe':return ['衣柜里放着屋主的日常衣物。','你轻轻带上柜门，没有翻动别人的东西。'];
  case 'kitchen':return ['锅和碗都洗干净了。可以用自己带来的蔬菜做一份热汤。','每户每天可以做一份；消耗 1 份蔬菜，恢复 20 体力，用时 20 分钟。'];
  case 'chair':return ['椅子很结实，可以坐下来歇一会儿。','休息 10 分钟，每天前 3 次各恢复 8 体力，不会跳到第二天。'];
  case 'hearth':return ['柴火在炉膛里轻轻响着。屋里比外面暖和一些。'];
  case 'shelf':return ['书架上有生活手册、旧书和夹着书签的故事。','读到的家中小事可以记进手记。'];
  case 'desk':return [h.relations,'桌上留着日常计划。私人的信件合着，你没有打开。'];
  default:return [h.kind==='family'?'桌上摆着家人常用的杯子，椅子各有惯常的位置。':'桌上放着屋主常用的杯子和一本合上的书。',h.relations];
 }
}
