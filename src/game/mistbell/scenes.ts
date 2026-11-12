import {ROAD_IDS} from './world';
import {HOME_IDS,HOMES,isHome} from './homes';
import {furnitureAt} from './furniture';
import {HOME_INTERIORS} from './homeInteriors';
import {lifeAt} from './social';
import {forestResources,resourceName,resourceRadius,resourceTool,type ResourceNode} from './resources';
import { residentPlace, chapterIndex } from './engine';
import {GATEWAYS,gatewayGround} from './connections';
import {residentPlan} from './residents';
import { EVENTS } from './story';
import type { Place, ValleyState } from './types';
export type Point = {x:number;y:number};
export type Target = Point & {id:string;label:string;kind:'plot'|'npc'|'service'|'gather'|'valve'|'story'|'exit';value:string;tool?:string;hitbox?:Rect};
export type Rect={x:number;y:number;w:number;h:number};
export const ROOM_WIDTH=768, ROOM_HEIGHT=512, REACH=54;
export const ROOM_BOUNDS:Record<Place,Rect>={
 ...(Object.fromEntries(ROAD_IDS.map(id=>[id,{x:150,y:205,w:468,h:215}])) as Record<import('./types').RoadPlace,Rect>),
 ...(Object.fromEntries(HOME_IDS.map(id=>[id,{x:16,y:16,w:736,h:480}])) as Record<import('./types').HomePlace,Rect>),
 neighborhood:{x:90,y:195,w:588,h:235},westLane:{x:90,y:195,w:588,h:235},riverside:{x:90,y:195,w:588,h:235},highlands:{x:90,y:195,w:588,h:235},
 farm:{x:72,y:192,w:624,h:260}, square:{x:70,y:190,w:630,h:260}, bridge:{x:70,y:190,w:630,h:260},
 forest:{x:80,y:172,w:608,h:290}, tavern:{x:70,y:192,w:630,h:256}, cabin:{x:48,y:206,w:672,h:248},
 observatory:{x:60,y:214,w:648,h:242}, canal:{x:80,y:196,w:590,h:254}, sluice:{x:74,y:170,w:620,h:288}, door:{x:55,y:196,w:628,h:256}, heart:{x:75,y:200,w:614,h:250},
};
export const OBSTACLES:Partial<Record<Place,Rect[]>>={...Object.fromEntries(HOME_IDS.map(p=>[p,[...furnitureAt(p).map(f=>({x:f.rect.x+6,y:f.rect.y+f.rect.h*.25,w:Math.max(8,f.rect.w-12),h:f.rect.h*.75})),...HOME_INTERIORS[p].walls]])),tavern:[{x:113,y:226,w:105,h:83},{x:550,y:226,w:107,h:83}]};
export function walkable(place:Place,p:Point,nodes:ResourceNode[]=[]){if(isHome(place)&&!HOME_INTERIORS[place].floors.some(r=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h))return false;if(place==='bridgeRoad'&&p.y<205&&(p.x<146||p.x>174))return false;const b=ROOM_BOUNDS[place];return ((p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h)||gatewayGround(place,p))&&p.x>=16&&p.x<=752&&p.y>=16&&p.y<=504&&!(place==='forest'&&nodes.some(n=>n.hp>0&&Math.hypot(n.x-p.x,(n.y-p.y)*1.5)<resourceRadius(n)+7))&&!(OBSTACLES[place]??[]).some(r=>p.x>=r.x-(isHome(place)?4:8)&&p.x<=r.x+r.w+(isHome(place)?4:8)&&p.y>=r.y-5&&p.y<=r.y+r.h+5);}
export function distance(a:Point,b:Point){return Math.hypot(a.x-b.x,a.y-b.y);}
export function canReach(a:Point,b:Point){return distance(a,b)<=REACH;}
// Residents need room for the visible body, not merely a valid foot pixel.
// The background is flattened: there is no foreground wall layer to hide them.
export function residentStandable(place:Place,p:Point,nodes:ResourceNode[]=[]){
 if(!walkable(place,p,nodes))return false;
 if(!isHome(place))return true;
 const body={x:p.x-13,y:p.y-34,w:26,h:38},plan=HOME_INTERIORS[place];
 if(![body.x,body.x+body.w].every(x=>[body.y,p.y+4].every(y=>plan.floors.some(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h))))return false;
 return ![...plan.walls,...plan.furniture.map(f=>f.rect)].some(r=>body.x<r.x+r.w+3&&body.x+body.w>r.x-3&&body.y<r.y+r.h+3&&body.y+body.h>r.y-3);
}
export function residentSpawn(place:Place,desired:Point,nodes:ResourceNode[]=[]):Point{
 if(residentStandable(place,desired,nodes))return desired;
 let best:Point|undefined,bestDistance=Infinity;
 for(let y=40;y<=488;y+=8)for(let x=24;x<=744;x+=8){const p={x,y},d=distance(p,desired);if(d<bestDistance&&residentStandable(place,p,nodes)){best=p;bestDistance=d;}}
 return best??desired;
}
export function moveInRoom(place:Place,p:Point,dx:number,dy:number,nodes:ResourceNode[]=[]):Point{
 let next={...p};if(walkable(place,{x:p.x+dx,y:p.y},nodes))next.x+=dx;if(walkable(place,{x:next.x,y:p.y+dy},nodes))next.y+=dy;return next;
}
// Grid search is shared by mouse/touch movement and object approach, so clicks cannot cut through furniture.
export function route(place:Place,start:Point,end:Point,near=false,nodes:ResourceNode[]=[],allowed=(p:Point)=>walkable(place,p,nodes)):Point[]{
 const step=isHome(place)?8:16,key=(p:Point)=>`${p.x},${p.y}`,snap=(p:Point)=>({x:Math.round(p.x/step)*step,y:Math.round(p.y/step)*step});
 const snapped=snap(start);
 const roots=Array.from({length:25},(_,i)=>({x:snapped.x+(i%5-2)*step,y:snapped.y+(Math.floor(i/5)-2)*step})).filter(allowed).sort((a,b)=>distance(a,start)-distance(b,start));
 const root=roots[0];if(!root)return [];
 const queue=[root],parents=new Map<string,Point|null>([[key(root),null]]);let found:Point|undefined;
 for(let i=0;i<queue.length;i++){
  const p=queue[i];if(distance(p,end)<=(near?42:12)){found=p;break;}
  for(const [dx,dy] of [[step,0],[-step,0],[0,step],[0,-step]]){const n={x:p.x+dx,y:p.y+dy};if(!parents.has(key(n))&&allowed(n)&&allowed({x:p.x+dx/2,y:p.y+dy/2})){parents.set(key(n),p);queue.push(n);}}
 }
 if(!found)return [];
 const path:Point[]=[];for(let p:Point|null=found;p;p=parents.get(key(p))??null)path.unshift(p);
 if(!near&&allowed(end)&&path.length&&Array.from({length:8},(_,i)=>({x:path[path.length-1].x+(end.x-path[path.length-1].x)*(i+1)/8,y:path[path.length-1].y+(end.y-path[path.length-1].y)*(i+1)/8})).every(allowed))path.push(end);return path;
}
const object=(id:string,label:string,kind:Target['kind'],x:number,y:number,value=id):Target=>({id,label,kind,x,y,value});
export const FIXTURES:Record<Place,Target[]>={
 ...(Object.fromEntries(ROAD_IDS.map(id=>[id,[] as Target[]])) as Record<import('./types').RoadPlace,Target[]>),
 ...(Object.fromEntries(HOME_IDS.map(place=>[place,furnitureAt(place).map(f=>({...object('furniture-'+f.id,f.label,'service',f.x,f.y,'furniture-'+f.id),hitbox:f.rect}))])) as Record<import('./types').HomePlace,Target[]>),
 neighborhood:[],westLane:[],riverside:[],highlands:[],
 farm:[object('house','农舍 · 休息 / 修屋','service',195,203),object('mail','信箱 · 读信','story',286,199),object('well','水井','service',520,197)],
 square:[object('shop','种子铺','service',210,218),object('board','公告栏','service',515,194)],
 bridge:[object('fish','河岸 · 垂钓','service',598,197),object('rest','桥边歇脚','service',382,201)],
 tavern:[object('rest','吧台 · 歇脚','service',386,195)],
 forest:[object('wood','倒木 · 斧头','gather',216,240,'wood'),object('stone','矿石 · 镐子','gather',410,214,'stone'),object('herb','药草 · 采摘','gather',562,258,'herb')],
 cabin:[object('inspect','桌上的旧照片','story',368,214)],
 observatory:[object('inspect','观测笔记','story',178,220)],
 canal:[object('inspect','水渠地图','story',234,206),object('down','进入地下闸室','service',390,210)],
 sluice:[object('valve-0','北渠','valve',230,182,'0'),object('valve-1','中渠','valve',385,182,'1'),object('valve-2','旧渠','valve',538,182,'2'),object('repair','修复控制台','service',632,234)],
 door:[object('inspect','发光的木门','story',385,203)],heart:[object('inspect','石台上的铭牌','story',390,205)],
};
const NEIGHBOR_SPOTS:Partial<Record<Place,Point[]>>={
 bridge:[{x:150,y:264},{x:285,y:225},{x:238,y:360},{x:540,y:345},{x:650,y:264},{x:415,y:365},{x:572,y:244}],
 square:[{x:165,y:230},{x:575,y:238},{x:290,y:316},{x:473,y:330},{x:125,y:368},{x:633,y:382},{x:360,y:232},{x:392,y:390},{x:545,y:415},{x:232,y:416},{x:670,y:314},{x:95,y:275},{x:486,y:244},{x:205,y:306}],
 forest:[{x:135,y:282},{x:306,y:244},{x:500,y:298},{x:625,y:373},{x:360,y:410},{x:220,y:374}],
 cabin:[{x:170,y:250},{x:486,y:254},{x:300,y:354},{x:610,y:365}],
 observatory:[{x:526,y:270},{x:212,y:306},{x:388,y:338},{x:628,y:385}],
 canal:[{x:295,y:250},{x:472,y:315}],sluice:[{x:295,y:276},{x:482,y:344}],door:[{x:310,y:273},{x:478,y:339}],heart:[{x:319,y:271},{x:471,y:325}],
};
export function sceneTargets(state:ValleyState):Target[]{
 const occupied=state.place==='forest'?forestResources(state).map(n=>({...n,hp:n.maxHp})):[];
 const objects=[...FIXTURES[state.place].filter(t=>t.id!=='down'&&t.kind!=='gather'),...GATEWAYS[state.place].map(g=>object(g.id,g.label,'exit',g.x,g.y,g.to))];
 if(state.place==='forest')forestResources(state).filter(n=>n.hp>0).forEach(n=>objects.push({...object(n.id,resourceName(n),'gather',n.x,n.y,n.id),tool:resourceTool(n)}));
 if(state.place==='farm')state.plots.forEach((_,i)=>objects.push(object(`plot-${i}`,`田地 ${i+1}`,'plot',328+i%3*56,300+Math.floor(i/3)*56,String(i))));
 const residents=Array.from({length:48},(_,i)=>String(i+1)).filter(id=>residentPlace(state,id)===state.place);
 // Keep crop beds and the central route clear. Evening gatherings use a wider grid.
 residents.forEach((id,i)=>{
  const farm=state.place==='farm';
  const tavernSlots=Array.from({length:60},(_,n)=>({x:90+n%10*65,y:214+Math.floor(n/10)*43})).filter(p=>walkable(state.place,p)&&!objects.some(o=>o.kind!=='npc'&&distance(p,o)<34));
  let p=farm?{x:i%2?570:170,y:254+Math.floor(i/2)%4*48}:state.place==='tavern'?(tavernSlots[i]??{x:384,y:416}):(NEIGHBOR_SPOTS[state.place]?.[i]??{x:110+(i%9)*66,y:294+Math.floor(i/9)*46});
  // Reserve a little room around every resident, including depleted resource sites,
  // so mining does not move a neighbour's starting position during a conversation.
  const free=(point:Point)=>residentStandable(state.place,point,occupied)&&!objects.some(o=>o.kind==='npc'&&distance(o,point)<36);
  if(!free(p))p=(isHome(state.place)?Array.from({length:44*24},(_,n)=>({x:32+n%44*16,y:48+Math.floor(n/44)*16})):Array.from({length:81},(_,n)=>({x:p.x+(n%9-4)*16,y:p.y+(Math.floor(n/9)-4)*16}))).filter(free).sort((a,b)=>distance(a,p)-distance(b,p))[0]??p;
  if(free(p))objects.push(object(`npc-${id}`,'交谈','npc',p.x,p.y,id));
 });
 const life=lifeAt(state,[...residents,state.companion]);if(life)objects.push(object('life-'+life.id,life.title,'service',384,286,'life-'+life.id));
 const pending=EVENTS.filter(e=>e.chapter===chapterIndex(state)&&e.place===state.place&&!state.flags.includes(e.id));
 if(pending.length&&!objects.some(o=>o.kind==='story'))objects.push(object('inspect','附近的线索','story',state.place==='square'?385:310,224));
 return objects;
}

export function nearbyTarget(targets:Target[],actor:Point,tool:string,plots:{planted:boolean;growth:number}[]):Target|undefined{
 const list=targets.filter(t=>canReach(actor,t));
 const work=list.filter(t=>t.kind==='gather'?t.tool===tool:t.kind==='plot'&&(tool==='hand'?plots[Number(t.value)]?.growth>=2:!['axe','pick'].includes(tool)));
 return (work.length?work:list).sort((a,b)=>distance(actor,a)-distance(actor,b))[0];
}

export type ResidentActor=Target & {facing:'up'|'down'|'left'|'right';frame:number;activity:string};
const patrolCache=new Map<string,Point[]>();
export function residentActors(s:ValleyState,elapsed:number):ResidentActor[]{
 return sceneTargets(s).filter(t=>t.kind==='npc').map(t=>{
  const plan=residentPlan(s,t.value,chapterIndex(s));
  const phase=(elapsed/1000+Number(t.value)*2.3)%24;
  const dest={x:t.x+(Number(t.value)%2?40:-40),y:t.y+24};
  const nodes=s.place==='forest'?forestResources(s):[];
  const key=[s.place,t.id,t.x,t.y,...nodes.filter(n=>n.hp>0).map(n=>`${n.x}:${n.y}`)].join('|');
  if(plan.walking&&!patrolCache.has(key)){if(patrolCache.size>300)patrolCache.clear();patrolCache.set(key,route(s.place,t,dest,false,nodes,p=>residentStandable(s.place,p,nodes)));}
  const points=plan.walking?patrolCache.get(key)??[]:[];
  let moving=plan.walking&&points.length>1&&((phase>=5&&phase<10)||(phase>=15&&phase<20));
  const amount=phase<5?0:phase<10?(phase-5)/5:phase<15?1:phase<20?1-(phase-15)/5:0;
  let p={x:t.x,y:t.y},facing:ResidentActor['facing']='down';
  if(points.length>1){const lengths=points.slice(1).map((p,i)=>distance(points[i],p)),total=lengths.reduce((a,b)=>a+b,0);let remain=amount*total;p=points[0];
   for(let i=0;i<lengths.length;i++){if(remain<=lengths[i]){const a=points[i],b=points[i+1],ratio=lengths[i]?remain/lengths[i]:0;p={x:a.x+(b.x-a.x)*ratio,y:a.y+(b.y-a.y)*ratio};const dx=(b.x-a.x)*(phase>=15?-1:1),dy=(b.y-a.y)*(phase>=15?-1:1);facing=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';break;}remain-=lengths[i];p=points[i+1];}
  }
  if(!residentStandable(s.place,p,nodes)){p=t;moving=false;}
  return {...t,...p,activity:plan.activity,facing:moving?facing:'down',frame:moving?Math.floor(elapsed/150)%4:0};
 });
}
