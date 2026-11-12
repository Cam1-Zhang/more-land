import type {ConversationChoice,ConversationScript} from './conversations';
export type DailyTopic=ConversationScript & {id:string;kind:'personal'|'activity'|'friend'|'story';people?:string[];requires?:string[];until?:string[];storyOrder?:number;minBond?:number;tags?:string[]};
export const answer=(label:string,reply:string,affinity=0):ConversationChoice=>({label,reply,affinity});
export function topic(id:string,title:string,opening:string,choices:ConversationChoice[],followup:string,next:ConversationChoice[],rules:Partial<DailyTopic>={}):DailyTopic{
 return {id,topic:title,opening,choices,followup,next,tomorrow:'',kind:'activity',...rules};
}
