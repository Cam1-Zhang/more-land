import type {Place} from './types';
import {PLACES} from './story';
import {GATEWAYS} from './connections';
export type MapPoint={x:number;y:number};
export function routeBetween(from:Place,to:Place):MapPoint[]{
 if(from===to)return [];
 const queue:Place[][]=[[from]],seen=new Set<Place>([from]);
 for(const path of queue){const last=path[path.length-1];if(last===to)return path.slice(1).map(p=>({x:PLACES[p].x,y:PLACES[p].y}));for(const g of GATEWAYS[last])if(!seen.has(g.to)){seen.add(g.to);queue.push([...path,g.to]);}}
 return [];
}
