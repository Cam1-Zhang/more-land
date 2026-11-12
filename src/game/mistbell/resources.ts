import type {ValleyState} from './types';
export type ResourceNode={id:string;kind:'stone'|'wood'|'herb';size:1|2|3;x:number;y:number;hp:number;maxHp:number;respawnDay:number};
const SPOTS=Array.from({length:40},(_,i)=>({x:[140,205,270,490,555,620,165,595][i%8],y:236+Math.floor(i/8)*45}));
export const resourceName=(n:ResourceNode)=>n.kind==='stone'?['小石头','石块','大岩石'][n.size-1]:n.kind==='wood'?n.size===3?'大树桩':'倒木':'草药';
export const resourceCell=(n:ResourceNode)=>n.kind==='stone'?n.size-1:n.kind==='wood'?n.size===3?4:3:5;
export const resourceTool=(n:ResourceNode)=>n.kind==='stone'?'pick':n.kind==='wood'?'axe':'hand';
export const resourceYield=(n:ResourceNode)=>n.kind==='herb'?1:n.size===3?6:n.size===2?3:1;
export const resourceRadius=(n:ResourceNode)=>n.kind==='herb'?8:n.size===3?24:n.size===2?17:11;
function generate(slot:number,day:number,others:ResourceNode[],old?:ResourceNode):ResourceNode{
 const kind=(['stone','stone','stone','wood','wood','herb','stone','wood','herb'] as const)[slot%9],size=(kind==='herb'?1:slot===7?3:slot%3+1) as 1|2|3,maxHp=kind==='herb'?1:size===3?4:size===2?2:1;
 const first=(day*13+slot*17)%SPOTS.length;
 const spot=Array.from({length:SPOTS.length},(_,i)=>SPOTS[(first+i)%SPOTS.length]).find(p=>(!old||Math.hypot(p.x-old.x,p.y-old.y)>50)&&others.every(n=>n.hp<=0||Math.hypot(p.x-n.x,p.y-n.y)>52))??SPOTS[first];
 return {id:`forest-${slot}`,kind,size,...spot,hp:maxHp,maxHp,respawnDay:0};
}
export function initialResources(day:number){const list:ResourceNode[]=[];for(let i=0;i<9;i++)list.push(generate(i,day,list));return list;}
export function forestResources(s:ValleyState):ResourceNode[]{return s.resources??initialResources(s.day);}
export function renewResources(nodes:ResourceNode[],day:number){const result=nodes.map(n=>({...n}));for(let i=0;i<result.length;i++){const n=result[i];if(n.hp===0&&n.respawnDay<=day)result[i]=generate(Number(n.id.split('-')[1]),day,result,n);}return result;}
export function validResources(value:unknown):value is ResourceNode[]{
 if(!Array.isArray(value)||value.length>30)return false;const ids=new Set();
 return value.every(n=>{if(!n||!/^forest-[0-8]$/.test(n.id)||ids.has(n.id))return false;ids.add(n.id);return ['stone','wood','herb'].includes(n.kind)&&[1,2,3].includes(n.size)&&Number.isInteger(n.hp)&&Number.isInteger(n.maxHp)&&n.maxHp>=1&&n.maxHp<=4&&n.hp>=0&&n.hp<=n.maxHp&&Number.isFinite(n.x)&&Number.isFinite(n.y)&&n.x>=100&&n.x<=650&&n.y>=210&&n.y<=430&&Number.isInteger(n.respawnDay)&&n.respawnDay>=0;});
}
