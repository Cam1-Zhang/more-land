import type {ResourceNode} from './resources';
export type HomePlace = 'ritaBenHome' | 'frankFamilyHome' | 'hankFamilyHome' | 'moriFamilyHome' | 'kasparFamilyHome' | 'socratesFamilyHome' | 'justiceFamilyHome' | 'oldFoxFamilyHome' | 'noraFamilyHome' | 'victorFamilyHome' | 'peterHome' | 'widowHome' | 'ghostHome' | 'godEyeHome' | 'devinIvyHome' | 'sarahJulianHome' | 'mikeClaraHome' | 'oscarJillHome' | 'mageElenaHome' | 'vesperXanderHome' | 'tomBrothersHome' | 'frostHome' | 'kaiserHome' | 'ambassadorHome';
export type RoadPlace = 'farmRoad' | 'marketRoad' | 'bridgeRoad' | 'forestRoad' | 'hillRoad' | 'canalRoad' | 'southRoad' | 'riverRoad';
export type Place = RoadPlace | HomePlace | 'neighborhood' | 'westLane' | 'riverside' | 'highlands' | 'farm' | 'square' | 'bridge' | 'tavern' | 'forest' | 'cabin' | 'observatory' | 'canal' | 'sluice' | 'door' | 'heart';
export type Item = 'seed' | 'wood' | 'stone' | 'herb' | 'vegetable' | 'fish' | 'bread';
export type Plot = { planted: boolean; growth: number; watered: boolean; tilled?: boolean };
export type ValleyState = {
  dailyConversations?:Record<string,{sequence:number;active?:{topic:string;token:string;day:number;place:Place;context:string;choices:number[];change:number;previous:number[]};history:Record<string,{day:number;count:number;choices:number[]}>}>;
  conversationRewards?:Record<string,{day:number;earned:number}>;
  conversations?:Record<string,{day:number;place:Place;choices:number[];continuedDay?:number;change?:number}>;
  resources?:ResourceNode[];
  bonds?:Record<string,{stage:number;status:'friend'|'dating';day:number}>;
  lifeSeen?:string[];
  version: 1; day: number; minute: number; energy: number; coins: number; place: Place;
  inventory: Record<Item, number>; plots: Plot[]; flags: string[]; clues: string[];
  friendship: Record<string, number>; daily: string[]; harvested: number; caught: number;
  houseFixed: boolean; valves: number[]; repaired: boolean; companion: string;
  journal: { day: number; text: string }[];
};
export type Line = { who: string; text: string };
export type StoryEvent = {
  id: string; chapter: number; place: Place; title: string; lines: Line[];
  requires?: string[]; clue?: string; itemCost?: Partial<Record<Item, number>>;
  friendship?: string; choices?: { label: string; reply: string; trust?: string }[];
};
export type Chapter = { title: string; subtitle: string; day: number; events: string[]; life?: boolean; repair?: boolean };
export type Action =
  | { type:'clock' }
  | { type:'furniture'; id:string; use:'rest'|'cook'|'read' }
  | { type:'bond'; id:string; choice?:'friend'|'dating' }
  | { type:'life'; id:string }
  | { type:'resource'; id:string; tool:'hand'|'axe'|'pick' }
  | { type: 'travel'; place: Place }
  | { type: 'event'; id: string; choice: number }
  | { type: 'talk'; id: string }
  | { type:'conversation'; id:string; step:number; choice:number; token?:string }
  | { type:'openConversation'; id:string; next?:boolean; token?:string }
  | { type: 'gift'; id: string; item: Item }
  | { type: 'plot'; index: number }
  | { type: 'farmTool'; index: number; tool: 'hoe' | 'seed' | 'water' | 'hand' }
  | { type: 'gather'; item: 'wood' | 'stone' | 'herb' }
  | { type: 'fish'; hit: boolean }
  | { type: 'buy'; item: 'seed' | 'bread' }
  | { type: 'sell'; item: 'vegetable' | 'fish' | 'herb' }
  | { type: 'eat' } | { type: 'sleep' } | { type: 'wait' } | { type: 'waitNight' } | { type: 'fixHouse' }
  | { type: 'valve'; index: number } | { type: 'repair' } | { type: 'request' }
  | { type: 'companion'; id: string };
