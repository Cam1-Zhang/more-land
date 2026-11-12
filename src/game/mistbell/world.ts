import type {Place, RoadPlace} from './types';

export const ROAD_IDS:RoadPlace[]=['farmRoad','marketRoad','bridgeRoad','forestRoad','hillRoad','canalRoad','southRoad','riverRoad'];
// Each cell is one playable 768 × 512 screen. The atlas renders these same screens.
export const WORLD_TILES:Partial<Record<Place,readonly [number,number]>>={
 highlands:[4,0],hillRoad:[4,1],forest:[4,2],canal:[6,2],
 forestRoad:[4,3],canalRoad:[6,3],
 farm:[0,4],farmRoad:[1,4],westLane:[2,4],marketRoad:[3,4],square:[4,4],bridgeRoad:[5,4],bridge:[6,4],
 southRoad:[4,5],neighborhood:[4,6],riverRoad:[5,6],riverside:[6,6],
};
export const ROAD_INFO:Record<RoadPlace,{name:string;subtitle:string;x:number;y:number}>={
 farmRoad:{name:'苹果树草地',subtitle:'苹果树下的草地，连接旧农场与西巷。',x:165,y:328},
 marketRoad:{name:'村口花园',subtitle:'邻居在长椅旁种下了新的花。',x:384,y:328},
 bridgeRoad:{name:'船屋草坪',subtitle:'穿过水边的草地，就能看见石桥。',x:603,y:328},
 forestRoad:{name:'风铃林隙',subtitle:'钟声渐远，杉树间留着一片花草空地。',x:494,y:256},
 hillRoad:{name:'白桦花坡',subtitle:'沿着缓坡走，北坡的屋顶慢慢露出来。',x:494,y:109},
 canalRoad:{name:'芦苇河岸',subtitle:'顺着水声向北，便是旧水渠。',x:713,y:256},
 southRoad:{name:'邻里花园',subtitle:'穿过花园，便是南住宅街。',x:494,y:402},
 riverRoad:{name:'雏菊草甸',subtitle:'晾衣绳在风里摇晃，河岸住区就在前方。',x:603,y:475},
};
