export type FarmTool='hand'|'hoe'|'seed'|'water'|'axe'|'pick';
export const TOOL_INFO:Record<FarmTool,{name:string;cell:number;duration:number;impact:number}>={
 hand:{name:'空手',cell:5,duration:500,impact:.45},hoe:{name:'锄头',cell:0,duration:800,impact:.56},
 seed:{name:'种子',cell:1,duration:620,impact:.42},water:{name:'水壶',cell:2,duration:1100,impact:.48},
 axe:{name:'斧头',cell:3,duration:780,impact:.54},pick:{name:'镐子',cell:4,duration:840,impact:.56},
};
export function toolPhase(tool:FarmTool,elapsed:number){const info=TOOL_INFO[tool],progress=Math.min(1,Math.max(0,elapsed/info.duration));return {progress,impact:progress>=info.impact,finished:progress>=1};}
