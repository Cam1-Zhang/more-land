import {ROAD_IDS} from './world';
import type {Place} from './types';
import {HOME_IDS,HOMES} from './homes';
export type Facing='up'|'down'|'left'|'right';
export type Gateway={id:string;to:Place;x:number;y:number;axis:'vertical'|'horizontal';heading:Facing;kind:'road'|'door';spawn:{x:number;y:number;facing:Facing};label:string};
export const OPPOSITE:Record<Facing,Facing>={up:'down',down:'up',left:'right',right:'left'};
const places:Place[]=['farm','square','bridge','tavern','forest','cabin','observatory','canal','sluice','door','heart','neighborhood','westLane','riverside','highlands',...HOME_IDS,...ROAD_IDS];
export const GATEWAYS=Object.fromEntries(places.map(p=>[p,[] as Gateway[]])) as Record<Place,Gateway[]>;
const vectors:Record<Facing,[number,number]>={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
function link(a:Place,ap:[number,number],heading:Facing,b:Place,bp:[number,number],al:string,bl:string,kind:Gateway['kind']='road'){
 const opposite=OPPOSITE[heading],v=vectors[heading];
 GATEWAYS[a].push({id:`${a}-${b}`,to:b,x:ap[0],y:ap[1],axis:v[0]?'horizontal':'vertical',heading,kind,spawn:{x:bp[0]+v[0]*56,y:bp[1]+v[1]*56,facing:heading},label:al});
 GATEWAYS[b].push({id:`${b}-${a}`,to:a,x:bp[0],y:bp[1],axis:v[0]?'horizontal':'vertical',heading:opposite,kind,spawn:{x:ap[0]-v[0]*56,y:ap[1]-v[1]*56,facing:opposite},label:bl});
}
const W:[number,number]=[24,280],E:[number,number]=[744,280],N:[number,number]=[384,18],S:[number,number]=[384,494];
function passage(a:Place,middle:Place,b:Place,heading:'right'|'up'|'down',aName:string,middleName:string,bName:string){
 const from=heading==='right'?E:heading==='up'?N:S;
 const to=heading==='right'?W:heading==='up'?S:N;
 link(a,from,heading,middle,to,middleName,aName);
 link(middle,from,heading,b,to,bName,middleName);
}
passage('farm','farmRoad','westLane','right','旧农场','苹果树草地','西农场巷');
passage('westLane','marketRoad','square','right','西农场巷','村口花园','钟塔广场');
passage('square','bridgeRoad','bridge','right','钟塔广场','船屋草坪','河边石桥');
passage('square','forestRoad','forest','up','钟塔广场','风铃林隙','北部森林');
passage('square','southRoad','neighborhood','down','钟塔广场','邻里花园','南住宅街');
passage('neighborhood','riverRoad','riverside','right','南住宅街','雏菊草甸','河岸住区');
passage('forest','hillRoad','highlands','up','北部森林','白桦花坡','北坡');
passage('bridge','canalRoad','canal','up','河边石桥','芦苇河岸','水渠入口');
function door(from:Place,x:number,y:number,to:Place,label:string,back:string){link(from,[x,y],'up',to,[384,488],label,back,'door');}
door('square',666,182,'tavern','暖灯酒馆','钟塔广场');
door('highlands',128,174,'cabin','守谷会木屋','北坡');
door('highlands',677,174,'observatory','旧天文台','北坡');
// Every visible residential doorway owns one household; the return uses the same threshold.
for(const id of HOME_IDS){const h=HOMES[id];door(h.district,h.door.x,h.door.y,id,h.doorLabel,'回到屋外');}
door('canal',390,181,'sluice','地下闸室','水渠入口');
link('sluice',[744,251],'right','door',[24,251],'检修区','地下闸室');
door('door',384,157,'heart','旧事故现场','无名木门');
export function gatewayAt(place:Place,p:{x:number;y:number}){return GATEWAYS[place].find(g=>Math.abs(p.x-g.x)<(g.axis==='horizontal'?16:25)&&Math.abs(p.y-g.y)<(g.axis==='horizontal'?24:16));}
export function gatewayGround(place:Place,p:{x:number;y:number}){return GATEWAYS[place].some(g=>{const v=vectors[g.heading],inward=(p.x-g.x)*-v[0]+(p.y-g.y)*-v[1],side=Math.abs((p.x-g.x)*v[1]-(p.y-g.y)*v[0]);return side<34&&inward>=-12&&inward<(g.kind==='road'?220:92);});}
export function nextRoad(from:Place,to:Place):Gateway|undefined{
 const queue=[from],seen=new Set([from]),first=new Map<Place,Gateway>();
 for(const here of queue)for(const g of GATEWAYS[here])if(!seen.has(g.to)){first.set(g.to,first.get(here)??g);if(g.to===to)return first.get(g.to);seen.add(g.to);queue.push(g.to);}
}

// Measured opening beside the clock tower; the forest clearing has the same seam.
GATEWAYS.square.find(g=>g.to==='forestRoad')!.x=420;
GATEWAYS.forestRoad.find(g=>g.to==='square')!.x=420;
GATEWAYS.square.find(g=>g.to==='forestRoad')!.spawn.x=420;
GATEWAYS.forestRoad.find(g=>g.to==='square')!.spawn.x=420;
