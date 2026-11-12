import { placeLocked, residentPlace, weather } from './engine';
import { RESIDENT_HOME } from './story';
import type { Place, ValleyState } from './types';

// Feet and crop roots use the same 768 × 512 coordinate system as the map.
export const FARM_PLOTS = [
  {x:137,y:368},{x:184,y:356},{x:223,y:345},
  {x:168,y:390},{x:211,y:378},{x:254,y:367},
];
const SLOTS: Partial<Record<Place, {x:number;y:number}[]>> = {
  farm:[{x:87,y:335},{x:112,y:333},{x:182,y:328},{x:214,y:325}],
  square:[{x:310,y:249},{x:334,y:254},{x:348,y:273},{x:428,y:267},{x:453,y:255},{x:455,y:279}],
  bridge:[{x:565,y:327},{x:590,y:329},{x:620,y:327},{x:653,y:328},{x:680,y:326}],
  tavern:[{x:487,y:263},{x:514,y:265},{x:549,y:256},{x:575,y:255}],
  forest:[{x:344,y:138},{x:353,y:159},{x:338,y:182}],
  cabin:[{x:336,y:87},{x:360,y:101},{x:381,y:86}],
  observatory:[{x:142,y:104},{x:159,y:117},{x:178,y:128}],
};
export function outdoorResidents(state: ValleyState) {
  return Object.entries(SLOTS).flatMap(([key,slots])=>{
    const place=key as Place;
    if(placeLocked(state,place))return [];
    const ids=Object.keys(RESIDENT_HOME).filter(id=>id!==state.companion&&residentPlace(state,id)===place);
    // Rotate who is outside each day; everyone else remains available inside.
    const offset=ids.length?(state.day-1)%ids.length:0;
    const ordered=[...ids.slice(offset),...ids.slice(0,offset)];
    if(place==='bridge'&&ordered.includes('43'))ordered.splice(0,0,...ordered.splice(ordered.indexOf('43'),1));
    return slots.slice(0,ids.length).map((point,i)=>({id:ordered[i],place,...point}));
  });
}
export function residentPose(id:string,tick:number) {
  const phase=(tick+Number(id)*7)%48;
  const moving=phase<8||(phase>=24&&phase<32);
  const x=phase<8?phase:phase<24?8:phase<32?32-phase:0;
  return {dx:x-4,frame:moving?Math.floor(phase/2)%4:0,facing:(moving?(phase<8?'right':'left'):'down') as 'right'|'left'|'down'};
}
export function sceneMood(state:ValleyState,eventId?:string) {
  const storyNight=['reflection','storm','banquet','fireworks','answer'].includes(eventId??'');
  return {
    night:storyNight||state.minute>=1140,
    dusk:!storyNight&&state.minute>=1020&&state.minute<1140,
    rain:eventId==='storm'||weather(state)==='雨',
    celebration:eventId==='fireworks',
    storyNight,
  };
}
