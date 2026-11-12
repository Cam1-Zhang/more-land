import type {Item,Line,Place,ValleyState} from './types';
import {HOME_OF} from './homes';
export const RELATIONSHIPS=[
  {
    "ids": [
      "6",
      "19"
    ],
    "title": "父子，Frank为父、Gary为子",
    "text": "父子，Frank为父、Gary为子。",
    "family": true
  },
  {
    "ids": [
      "19",
      "30"
    ],
    "title": "夫妻",
    "text": "夫妻。",
    "family": true
  },
  {
    "ids": [
      "19",
      "7"
    ],
    "title": "父女，Gary为父、Daisy为女",
    "text": "父女，Gary为父、Daisy为女。",
    "family": true
  },
  {
    "ids": [
      "30",
      "7"
    ],
    "title": "母女，Sofia为母、Daisy为女",
    "text": "母女，Sofia为母、Daisy为女。",
    "family": true
  },
  {
    "ids": [
      "6",
      "7"
    ],
    "title": "祖孙，Frank为祖父、Daisy为孙女",
    "text": "祖孙，Frank为祖父、Daisy为孙女。",
    "family": true
  },
  {
    "ids": [
      "23",
      "18"
    ],
    "title": "父女，Hank为父、Chloe为女",
    "text": "父女，Hank为父、Chloe为女。",
    "family": true
  },
  {
    "ids": [
      "23",
      "1"
    ],
    "title": "父子，Hank为父、Toby为子",
    "text": "父子，Hank为父、Toby为子。",
    "family": true
  },
  {
    "ids": [
      "18",
      "1"
    ],
    "title": "姐弟，Chloe为姐、Toby为弟",
    "text": "姐弟，Chloe为姐、Toby为弟。",
    "family": true
  },
  {
    "ids": [
      "37",
      "42"
    ],
    "title": "父女，Prof. Mori为父、Ada为女",
    "text": "父女，Prof. Mori为父、Ada为女。",
    "family": true
  },
  {
    "ids": [
      "37",
      "11"
    ],
    "title": "父女，Prof. Mori为父、Luna为女",
    "text": "父女，Prof. Mori为父、Luna为女。",
    "family": true
  },
  {
    "ids": [
      "42",
      "11"
    ],
    "title": "姐妹，Ada为姐、Luna为妹",
    "text": "姐妹，Ada为姐、Luna为妹。",
    "family": true
  },
  {
    "ids": [
      "39",
      "13"
    ],
    "title": "父子，Kaspar为父、Zack为子",
    "text": "父子，Kaspar为父、Zack为子。",
    "family": true
  },
  {
    "ids": [
      "39",
      "14"
    ],
    "title": "父女，Kaspar为父、Rose为女",
    "text": "父女，Kaspar为父、Rose为女。",
    "family": true
  },
  {
    "ids": [
      "13",
      "14"
    ],
    "title": "兄妹，Zack为兄、Rose为妹",
    "text": "兄妹，Zack为兄、Rose为妹。",
    "family": true
  },
  {
    "ids": [
      "32",
      "5"
    ],
    "title": "姐弟，Rita为姐、Ben为弟",
    "text": "姐弟，Rita为姐、Ben为弟。",
    "family": true
  },
  {
    "ids": [
      "47",
      "9"
    ],
    "title": "母女，Justice为母、Alice为女",
    "text": "母女，Justice为母、Alice为女。",
    "family": true
  },
  {
    "ids": [
      "47",
      "4"
    ],
    "title": "母女，Justice为母、Lily为女",
    "text": "母女，Justice为母、Lily为女。",
    "family": true
  },
  {
    "ids": [
      "9",
      "4"
    ],
    "title": "姐妹，Alice为姐、Lily为妹",
    "text": "姐妹，Alice为姐、Lily为妹。",
    "family": true
  },
  {
    "ids": [
      "45",
      "31"
    ],
    "title": "父子，Old Fox为父、Dante为子",
    "text": "父子，Old Fox为父、Dante为子。",
    "family": true
  },
  {
    "ids": [
      "45",
      "20"
    ],
    "title": "父女，Old Fox为父、Mia为女",
    "text": "父女，Old Fox为父、Mia为女。",
    "family": true
  },
  {
    "ids": [
      "31",
      "20"
    ],
    "title": "兄妹，Dante为兄、Mia为妹",
    "text": "兄妹，Dante为兄、Mia为妹。",
    "family": true
  },
  {
    "ids": [
      "34",
      "3"
    ],
    "title": "母子，Nora为母、Jack为子",
    "text": "母子，Nora为母、Jack为子。",
    "family": true
  },
  {
    "ids": [
      "29",
      "2"
    ],
    "title": "父女，Victor为父、Momo为女",
    "text": "父女，Victor为父、Momo为女。",
    "family": true
  },
  {
    "ids": [
      "15",
      "22"
    ],
    "title": "兄妹，Devin为兄、Ivy为妹",
    "text": "兄妹，Devin为兄、Ivy为妹。",
    "family": true
  },
  {
    "ids": [
      "16",
      "35"
    ],
    "title": "夫妻",
    "text": "夫妻。",
    "family": true
  },
  {
    "ids": [
      "17",
      "36"
    ],
    "title": "夫妻",
    "text": "夫妻。",
    "family": true
  },
  {
    "ids": [
      "26",
      "24"
    ],
    "title": "夫妻",
    "text": "夫妻。",
    "family": true
  },
  {
    "ids": [
      "28",
      "27"
    ],
    "title": "夫妻",
    "text": "夫妻。",
    "family": true
  },
  {
    "ids": [
      "40",
      "33"
    ],
    "title": "姐弟，Vesper为姐、Xander为弟",
    "text": "姐弟，Vesper为姐、Xander为弟。",
    "family": true
  },
  {
    "ids": [
      "10",
      "21"
    ],
    "title": "兄弟，Tom为兄、Leo为弟",
    "text": "兄弟，Tom为兄、Leo为弟。",
    "family": true
  },
  {
    "ids": [
      "10",
      "8"
    ],
    "title": "兄弟，Tom为兄、Sam为弟",
    "text": "兄弟，Tom为兄、Sam为弟。",
    "family": true
  },
  {
    "ids": [
      "21",
      "8"
    ],
    "title": "兄弟，Leo为兄、Sam为弟",
    "text": "兄弟，Leo为兄、Sam为弟。",
    "family": true
  },
  {
    "ids": [
      "6",
      "37",
      "39",
      "43"
    ],
    "title": "旧守谷会成员与长期旧识",
    "text": "偶尔在守谷会木屋碰面。普通日程里不会每天集合；主线推进后玩家才逐渐理解他们共同拥有的过去。",
    "family": false
  },
  {
    "ids": [
      "6",
      "12"
    ],
    "title": "旧世交与略带回避的长辈关系",
    "text": "Frank偶尔帮Peter修工具；Peter很少主动谈父亲和水渠，Frank也不会强迫他。",
    "family": false
  },
  {
    "ids": [
      "6",
      "38"
    ],
    "title": "旧友",
    "text": "Frank季节更替时会来检查Widow家的屋顶或排水，但Widow不喜欢被当成需要照顾的人。",
    "family": false
  },
  {
    "ids": [
      "38",
      "43"
    ],
    "title": "共享上一代记忆的朋友",
    "text": "Widow偶尔在傍晚去河边找Ghost，询问丈夫年轻时的一些普通小事。Ghost只在她主动问时回答。",
    "family": false
  },
  {
    "ids": [
      "12",
      "20"
    ],
    "title": "稳定友情",
    "text": "Mia偶尔陪Peter走到森林外围。主线后期重新进入水渠时，她也是最愿意陪他的人。",
    "family": false
  },
  {
    "ids": [
      "8",
      "43"
    ],
    "title": "奇怪但稳定的朋友",
    "text": "Sam在酒馆习惯给Ghost留一把椅子，即使Ghost并不需要坐。",
    "family": false
  },
  {
    "ids": [
      "8",
      "3",
      "7"
    ],
    "title": "爱惹小麻烦的朋友组",
    "text": "节庆准备、搬运工作或晚上闲逛时经常凑到一起，也是庆典假钟声事件最自然的组合。",
    "family": false
  },
  {
    "ids": [
      "16",
      "8"
    ],
    "title": "熟人式管束与温和冲突",
    "text": "Sam违反活动规则时Sarah经常第一个制止；两人没有真正恶意。",
    "family": false
  },
  {
    "ids": [
      "2",
      "14"
    ],
    "title": "朋友",
    "text": "每周一起试做面包、果酱或花草点心，偶尔把失败品送给其他居民。",
    "family": false
  },
  {
    "ids": [
      "11",
      "28"
    ],
    "title": "兴趣奇妙契合的朋友",
    "text": "在森林边讨论气场、天气、占卜和各种无法证明的东西，经常让旁观者分不清谁更认真。",
    "family": false
  },
  {
    "ids": [
      "9",
      "22",
      "32"
    ],
    "title": "记录与核对搭档",
    "text": "主线调查期会定期在广场资料桌整理维修日志：Alice负责大量抄录，Ivy查细节，Rita找矛盾。",
    "family": false
  },
  {
    "ids": [
      "42",
      "15"
    ],
    "title": "设施工作搭档",
    "text": "水渠事件后共同维护一份设施改动记录，避免任何人再单独修改地下系统却没人知道。",
    "family": false
  },
  {
    "ids": [
      "42",
      "48"
    ],
    "title": "分析方式不同的朋友",
    "text": "Ada逐条核对数据，God Eye寻找全局联系，两人偶尔在天文台比较各自画出的关系图。",
    "family": false
  },
  {
    "ids": [
      "15",
      "5"
    ],
    "title": "合作时容易卡住的熟人",
    "text": "一起修公共设施时，Devin坚持按步骤，Ben一旦认定方案就不改，常常先争很久再把东西修得很牢。",
    "family": false
  },
  {
    "ids": [
      "23",
      "45"
    ],
    "title": "酒馆老熟人",
    "text": "傍晚常在酒馆聊天。Old Fox讲真假难辨的故事，Hank负责指出自己以前听过几个不同版本。",
    "family": false
  },
  {
    "ids": [
      "13",
      "18"
    ],
    "title": "调查型朋友",
    "text": "喜欢把普通小事当谜案调查，例如追查谁拿走了公告栏旁最后一块点心。",
    "family": false
  },
  {
    "ids": [
      "21",
      "33"
    ],
    "title": "性格相反但配合不错的朋友",
    "text": "Xander负责推动事情，Leo负责提醒他别推得过头。公共活动中常被安排在一组。",
    "family": false
  },
  {
    "ids": [
      "31",
      "39"
    ],
    "title": "棋友",
    "text": "每周下一盘棋。Dante喜欢极高风险的走法，Kaspar经常说那一步没有道理。",
    "family": false
  },
  {
    "ids": [
      "25",
      "30"
    ],
    "title": "安静的观察型熟人",
    "text": "在酒馆或广场经常坐得不远，却很少主动聊天；偶尔会交换对某件事的简短判断。",
    "family": false
  },
  {
    "ids": [
      "27",
      "46"
    ],
    "title": "擅长语言与调解的同事型朋友",
    "text": "居民出现争执时经常有人找他们帮忙调解，两人也会私下讨论同一句话不同说法的效果。",
    "family": false
  },
  {
    "ids": [
      "29",
      "44"
    ],
    "title": "温和权力冲突",
    "text": "两人都喜欢主导会议，因此村里尽量避免让他们同时主持同一件事。",
    "family": false
  },
  {
    "ids": [
      "40",
      "47"
    ],
    "title": "原则分歧",
    "text": "Vesper认为部分信息应该控制公开时机，Justice强调事实应尽早核对，两人会有冷静但持续的争论。",
    "family": false
  },
  {
    "ids": [
      "34",
      "24"
    ],
    "title": "稳健派与奇招派朋友",
    "text": "Jill提出三个奇怪方案，Nora通常否掉两个，留下偶尔真的能用的第三个。",
    "family": false
  },
  {
    "ids": [
      "26",
      "35"
    ],
    "title": "社交活动搭档",
    "text": "偶尔在酒馆组织小游戏夜，Oscar负责热闹，Julian负责确保不同圈子的居民都能参与。",
    "family": false
  },
  {
    "ids": [
      "36",
      "41"
    ],
    "title": "推理讨论朋友",
    "text": "Clara指出一个模式后，Socrates习惯不停问她为什么认为那是规律，两人常在公告板前聊很久。",
    "family": false
  },
  {
    "ids": [
      "10",
      "17"
    ],
    "title": "轻微领导权竞争",
    "text": "Mike组织社区活动时Tom总希望负责一组；Mike后来干脆固定给他一项明确任务。",
    "family": false
  },
  {
    "ids": [
      "4",
      "12"
    ],
    "title": "因异常事件形成的熟人关系",
    "text": "Lily在河里看见疑似Peter的身影之后，再遇见类似事情会先去确认Peter本人在哪里。",
    "family": false
  },
  {
    "ids": [
      "5",
      "12",
      "3"
    ],
    "title": "主线早期的误会关系",
    "text": "Lily看见河中身影后Ben坚持认为Peter有所隐瞒，Jack跟着起哄；真相展开后两人会逐渐意识到自己判断过快。",
    "family": false
  }
];
export const relationsFor=(id:string)=>RELATIONSHIPS.filter(r=>r.ids.includes(id));
type BondScene={title:string;place:Place;lines:string[]};
export type Romance={name:string;gifts:Item[];events:BondScene[]};
export const ROMANCES:Record<string,Romance>={
 "13": {
  "name": "Zack",
  "gifts": [
   "wood",
   "stone"
  ],
  "events": [
   {
    "title": "放错的工具",
    "place": "square",
    "lines": [
     "仓库的工具不见了，我差点认定是有人拿走。",
     "原来在我自己的包里……我是不是总太快下结论？",
     "你没有跟着我怀疑别人。谢谢你等我查清楚。"
    ]
   },
   {
    "title": "森林夜路",
    "place": "forest",
    "lines": [
     "刚才那边有声音。我本来想直接追过去。",
     "先等等。你觉得呢？我们可以记下位置，明早再来。",
     "有人一起商量，好像比冲在最前面更有用。"
    ]
   },
   {
    "title": "留下来听",
    "place": "bridge",
    "lines": [
     "水渠修好以后，我一直在想那天的事。",
     "以前我觉得先冲出去才算有用，现在更想留下来听你说完。",
     "你愿意让我成为更亲近的人吗？"
    ]
   }
  ]
 },
 "18": {
  "name": "Chloe",
  "gifts": [
   "herb",
   "stone"
  ],
  "events": [
   {
    "title": "问题太多",
    "place": "square",
    "lines": [
     "我把最后一块点心的去向都查清了！",
     "你问我为什么总想知道答案……这个问题，我竟然答不上来。",
     "下次不调查也行。只是和你走走。"
    ]
   },
   {
    "title": "没有答案的一天",
    "place": "bridge",
    "lines": [
     "今天我们约好：不调查任何异常。",
     "聊种坏的菜，或者聊你喜欢的天气，都可以。",
     "原来不是每段相处都需要一个结论。"
    ]
   },
   {
    "title": "没有追问",
    "place": "hankFamilyHome",
    "lines": [
     "我给你留了一个安静的位置。",
     "你想说的时候再说。不想说，我也可以陪着。",
     "以后这样的日子，你愿意和我一起过吗？"
    ]
   }
  ]
 },
 "31": {
  "name": "Dante",
  "gifts": [
   "fish",
   "vegetable"
  ],
  "events": [
   {
    "title": "无害的约定",
    "place": "bridge",
    "lines": [
     "比比谁先钓到鱼？输的人负责把钓竿收好。",
     "好吧，不比也行。看你等浮标，比输赢有意思。",
     "明天还在这里碰头？"
    ]
   },
   {
    "title": "这次不赌",
    "place": "forest",
    "lines": [
     "那条突然出现的岔路？这次不赌。",
     "重要的事不能每回都押给运气。尤其你在旁边。",
     "记住来时的路，我们一起回去。"
    ]
   },
   {
    "title": "第一次问未来",
    "place": "bridge",
    "lines": [
     "以前我总想着下一件刺激的事。",
     "现在看着这座桥，会想明年也和你来这里。",
     "你愿意让我进入你的以后吗？"
    ]
   }
  ]
 },
 "32": {
  "name": "Rita",
  "gifts": [
   "herb",
   "wood"
  ],
  "events": [
   {
    "title": "整理记录",
    "place": "ritaBenHome",
    "lines": [
     "这一栏是维修日期，不是登记日期。格式差一点，意思就不同。",
     "你居然没有嫌我啰嗦。那就再核对一页吧。",
     "今天的记录里，我会写上你的名字。"
    ]
   },
   {
    "title": "我不知道",
    "place": "bridge",
    "lines": [
     "那个倒影和我们的位置对不上。",
     "我找了几个解释，都不成立。我不知道。",
     "能把这句话告诉你，好像也没有那么难。"
    ]
   },
   {
    "title": "不需要证明",
    "place": "ritaBenHome",
    "lines": [
     "你为什么总愿意来帮我？",
     "友情也好，别的心意也好，我都会认真听。",
     "有些事情很难验证，但我愿意相信你。"
    ]
   }
  ]
 },
 "43": {
  "name": "Ghost",
  "gifts": [
   "stone",
   "wood"
  ],
  "events": [
   {
    "title": "桥边的空位",
    "place": "bridge",
    "lines": [
     "这里还有一个位置。",
     "不用找话题。我只是习惯晚上看看河水。",
     "你愿意安静待一会儿，也很好。"
    ]
   },
   {
    "title": "一起走回去",
    "place": "bridge",
    "lines": [
     "前面是我能走到的边界。再远一点，就会变得很淡。",
     "我试过很多次了。你不必为我找一个奇迹。",
     "今天陪我走回家，好吗？"
    ]
   },
   {
    "title": "住在这里",
    "place": "ghostHome",
    "lines": [
     "以前我总以为，自己只是一个还没结束的事故。",
     "现在我有地址、有钥匙，也有人来敲门。",
     "我仍然是幽灵。你愿意和这样的我更亲近吗？"
    ]
   }
  ]
 },
 "48": {
  "name": "God Eye",
  "gifts": [
   "stone",
   "herb"
  ],
  "events": [
   {
    "title": "观察者的一天",
    "place": "square",
    "lines": [
     "今天广场上发生了五件小事，我都看见了。",
     "你问我自己做了什么……我好像一直站在旁边。",
     "明天不如一起做点事，再来观察结果。"
    ]
   },
   {
    "title": "错误的连线",
    "place": "godEyeHome",
    "lines": [
     "我以为安静的两个人不熟，其实他们每天一起看星星。",
     "知道很多事，不等于理解一个人。",
     "关于你，我想少一点推断，多一点倾听。"
    ]
   },
   {
    "title": "把自己画进去",
    "place": "godEyeHome",
    "lines": [
     "这张关系图以前没有我。我一直把自己放在图外。",
     "这一版画上了我，也画上了你。",
     "我们之间的线，要一起决定是什么。"
    ]
   }
  ]
 }
};
function bondStoryReady(s:ValleyState,id:string,stage:number){
 if(id==='43')return s.flags.includes(stage===0?'ghost':stage===1?'boundary':'lastMemory');
 return id!=='13'||stage!==2||s.repaired;
}
export function bondHint(s:ValleyState,id:string){
 const r=ROMANCES[id];if(!r)return '';
 const stage=s.bonds?.[id]?.stage??0;
 if(stage>=3)return s.bonds?.[id]?.status==='dating'?'恋人 · 关系已确认':'知心朋友 · 你选择了友情';
 if(!bondStoryReady(s,id,stage))return '等彼此的故事再往前走一点。';
 const needed=[12,30,55][stage];
 if((s.friendship[id]??0)<needed)return `下一段故事：好感 ${needed}`;
 if(id==='43'&&stage===2&&!s.flags.includes('lastMemory'))return '下一段故事：找回旧日记忆之后';
 if(id==='13'&&stage===2&&!s.repaired)return '下一段故事：恢复水流之后';
 return `下一段故事：${r.events[stage].title}`;
}
export function bondEvent(s:ValleyState,id:string){
 const r=ROMANCES[id],bond=s.bonds?.[id],stage=bond?.stage??0;
 if(!r||stage>=3||(s.friendship[id]??0)<[12,30,55][stage]||bond?.day===s.day)return null;
 if(!bondStoryReady(s,id,stage))return null;
 const e=r.events[stage];if(e.place!==s.place)return null;
 return {id,stage,title:e.title,lines:e.lines.map(text=>({who:r.name,text})),choice:stage===2};
}
export function romancePlan(s:ValleyState,id:string):{place:Place;activity:string}|null{
 const r=ROMANCES[id];if(!r)return null;
 const stage=s.bonds?.[id]?.stage??0;
 // Personal scenes have a predictable appointment; main story casting wins above this.
 const pending=stage<3&&bondStoryReady(s,id,stage)&&(s.friendship[id]??0)>=[12,30,55][stage]&&s.bonds?.[id]?.day!==s.day;
 if(pending&&s.minute>=960&&s.minute<1140)return {place:r.events[stage].place,activity:'等你来聊聊 · 16:00—19:00'};
 const schedule:Record<string,Place[]>={'13':['square','forest','bridge'],'18':['square','bridge','hankFamilyHome'],'31':['bridge','forest','tavern'],'32':['ritaBenHome','square','bridge'],'43':['bridge','cabin','bridge'],'48':['highlands','square','godEyeHome']};
 return {place:schedule[id][s.minute<720?0:s.minute<960?1:2],activity:'处理自己的事，晚些时候再和邻居见面'};
}
export type LifeScene={id:string;place:Place;ids:string[];title:string;lines:Line[];ready:(s:ValleyState)=>boolean};
export const FAMILY_SCENES:LifeScene[]=[
{
  "id": "family-frankFamilyHome",
  "place": "frankFamilyHome",
  "ids": [
    "6",
    "7",
    "19"
  ],
  "title": "榛木老宅的日常",
  "lines": [
    {
      "who": "Daisy",
      "text": "爷爷，你这个箱子到底为什么谁都不能碰？"
    },
    {
      "who": "Frank",
      "text": "因为里面都是没用的旧东西。"
    },
    {
      "who": "Gary",
      "text": "他说没用的时候，一般就是很重要。"
    }
  ]
,
ready:(s:ValleyState)=>s.minute>=1140&&s.minute<1260&&true
},
{
  "id": "family-hankFamilyHome",
  "place": "hankFamilyHome",
  "ids": [
    "18",
    "1",
    "23"
  ],
  "title": "风车檐屋的日常",
  "lines": [
    {
      "who": "Chloe",
      "text": "你昨晚十二点以后真的一次都没出门？"
    },
    {
      "who": "Toby",
      "text": "我、我为什么突然要证明这个？"
    },
    {
      "who": "Hank",
      "text": "因为你姐吃早饭之前已经审了两个人了。"
    }
  ]
,
ready:(s:ValleyState)=>s.minute>=1140&&s.minute<1260&&true
},
{
  "id": "family-moriFamilyHome",
  "place": "moriFamilyHome",
  "ids": [
    "11",
    "42",
    "37"
  ],
  "title": "北坡观星宅的日常",
  "lines": [
    {
      "who": "Luna",
      "text": "北边今天的风感觉是蓝色的。"
    },
    {
      "who": "Ada",
      "text": "风没有这个字段。"
    },
    {
      "who": "Prof. Mori",
      "text": "先别删，偶尔无法分类的记录反而最有价值。"
    }
  ]
,
ready:(s:ValleyState)=>s.minute>=1140&&s.minute<1260&&true
},
{
  "id": "family-kasparFamilyHome",
  "place": "kasparFamilyHome",
  "ids": [
    "13",
    "14",
    "39"
  ],
  "title": "棋盘石屋的日常",
  "lines": [
    {
      "who": "Zack",
      "text": "我已经知道是谁把我的工具拿走了。"
    },
    {
      "who": "Rose",
      "text": "你昨天也这么说，然后工具在你床底下。"
    },
    {
      "who": "Kaspar",
      "text": "先确认棋盘上真的少了一枚棋子，再决定攻击谁。"
    }
  ]
,
ready:(s:ValleyState)=>s.minute>=1140&&s.minute<1260&&true
},
{
  "id": "family-oldFoxFamilyHome",
  "place": "oldFoxFamilyHome",
  "ids": [
    "31",
    "20",
    "45"
  ],
  "title": "赤尾坡屋的日常",
  "lines": [
    {
      "who": "Dante",
      "text": "我赌今晚会下雨。"
    },
    {
      "who": "Mia",
      "text": "你能不能有一次不赌？"
    },
    {
      "who": "Old Fox",
      "text": "可以。他小时候赌输了以后有三天没敢再提。"
    }
  ]
,
ready:(s:ValleyState)=>s.minute>=1140&&s.minute<1260&&true
},
{
  "id": "family-noraFamilyHome",
  "place": "noraFamilyHome",
  "ids": [
    "3",
    "34"
  ],
  "title": "常青门宅的日常",
  "lines": [
    {
      "who": "Jack",
      "text": "我就说Sam肯定干了什么。"
    },
    {
      "who": "Nora",
      "text": "你有证据吗？"
    },
    {
      "who": "Jack",
      "text": "……现在还没有。"
    }
  ]
,
ready:(s:ValleyState)=>s.minute>=1140&&s.minute<1260&&true
},
{
  "id": "family-victorFamilyHome",
  "place": "victorFamilyHome",
  "ids": [
    "2",
    "29"
  ],
  "title": "金狮宅的日常",
  "lines": [
    {
      "who": "Momo",
      "text": "Rose说森林那边晚上有人叫名字。"
    },
    {
      "who": "Victor",
      "text": "Rose从谁那里听来的？"
    },
    {
      "who": "Momo",
      "text": "我没问……她说的时候听起来很真的。"
    }
  ]
,
ready:(s:ValleyState)=>s.minute>=1140&&s.minute<1260&&true
},
{
  "id": "family-peterHome",
  "place": "peterHome",
  "ids": [
    "12",
    "20"
  ],
  "title": "水杉小屋的日常",
  "lines": [
    {
      "who": "Mia",
      "text": "你不用今天就回那个入口。"
    },
    {
      "who": "Peter",
      "text": "我知道。"
    },
    {
      "who": "Peter",
      "text": "可如果我永远都说改天，那就永远不会去了。"
    }
  ]
,
ready:(s:ValleyState)=>s.minute>=1140&&s.minute<1260&&s.flags.includes('peterPast')
},
{
  "id": "family-widowHome",
  "place": "widowHome",
  "ids": [
    "38",
    "43"
  ],
  "title": "暮藤屋的日常",
  "lines": [
    {
      "who": "Widow",
      "text": "他年轻的时候也总把维修记录折成这样吗？"
    },
    {
      "who": "Ghost",
      "text": "嗯。Frank骂过很多次。"
    },
    {
      "who": "Widow",
      "text": "那看来有些毛病死了也改不了。"
    }
  ]
,
ready:(s:ValleyState)=>s.minute>=1140&&s.minute<1260&&s.flags.includes('widow')
},
{
  "id": "family-ghostHome",
  "place": "ghostHome",
  "ids": [
    "43",
    "8"
  ],
  "title": "铃影小屋的日常",
  "lines": [
    {
      "who": "Sam",
      "text": "你既不睡觉，为什么还需要一间房？"
    },
    {
      "who": "Ghost",
      "text": "你也不是每时每刻都在睡。"
    },
    {
      "who": "Ghost",
      "text": "有个地方能回来，和需不需要床是两回事。"
    }
  ]
,
ready:(s:ValleyState)=>s.minute>=1140&&s.minute<1260&&(s.friendship['43']??0)>=20
},
{
  "id": "family-godEyeHome",
  "place": "godEyeHome",
  "ids": [
    "48"
  ],
  "title": "全景屋的日常",
  "lines": [
    {
      "who": "God Eye",
      "text": "我把最近所有人的行动路线重新连了一遍。"
    },
    {
      "who": "你",
      "text": "你自己呢？"
    },
    {
      "who": "God Eye",
      "text": "……以前的图里，我没有把自己算进去。"
    }
  ]
,
ready:(s:ValleyState)=>s.minute>=1140&&s.minute<1260&&(s.bonds?.['48']?.stage??0)>=2
},
{
  "id": "family-tomBrothersHome",
  "place": "tomBrothersHome",
  "ids": [
    "10",
    "21",
    "8"
  ],
  "title": "三橡树屋的日常",
  "lines": [
    {
      "who": "Tom",
      "text": "谁把我的杯子拿走了？"
    },
    {
      "who": "Sam",
      "text": "首先，我们应该定义一下什么叫你的。"
    },
    {
      "who": "Leo",
      "text": "Sam，把杯子放回去。"
    }
  ]
,
ready:(s:ValleyState)=>s.minute>=1140&&s.minute<1260&&true
}
];
export const LIFE_SCENES:LifeScene[]=[
 ...FAMILY_SCENES,
 {id:'reflectionVisit',place:'justiceFamilyHome',ids:['4','20','43'],title:'不是 Peter',ready:s=>s.flags.includes('peterRiver')&&s.minute>=1140,lines:[{who:'Lily',text:'我刚才又看见 Peter 从河边过去了。'},{who:'Mia',text:'Peter 说今晚会待在自己家里。先问问他本人吧。'},{who:'Ghost',text:'那今晚别独自去河边。'}]},
 {id:'sharedRecords',place:'square',ids:['9','32','22'],title:'一起核对记录',ready:s=>s.flags.includes('canalMap'),lines:[{who:'Alice',text:'我把过去二十七份维修记录全部抄了一遍。'},{who:'Rita',text:'其中三份日期矛盾。'},{who:'Ivy',text:'不是三份——第四份的签字笔迹也不一样。'}]},
 {id:'ghostKey',place:'ghostHome',ids:['11','43','38'],title:'Ghost 的钥匙',ready:s=>(s.friendship['43']??0)>=20,lines:[{who:'Luna',text:'Ghost，你明明可以穿墙，为什么还拿钥匙？'},{who:'Ghost',text:'这是我家的钥匙。'},{who:'Widow',text:'那就别再忘在桥边。'}]},
 {id:'noOneToBlame',place:'frankFamilyHome',ids:['5','15','19'],title:'没人故意做错',ready:s=>s.flags.includes('noVillain'),lines:[{who:'Ben',text:'所以真的没有人在搞破坏？'},{who:'Devin',text:'没有。每一步单独看都合理。'},{who:'Gary',text:'那就别找人怪了。去把它修好。'}]},
];
// A resident can attend only one gathering. Rotate priorities by day so guest visits
// do not depend on the player having watched every earlier household vignette.
export function activeLifeScenes(s:ValleyState){
 if(s.minute<1140||s.minute>=1260)return [];
 const ready=LIFE_SCENES.filter(e=>(!e.ids.includes('43')||s.flags.includes('ghost'))&&e.ready(s)&&!s.lifeSeen?.includes(e.id));
 const booked=new Set<string>(),selected:LifeScene[]=[];
 for(let i=0;i<ready.length;i++){
  const e=ready[(i+s.day)%ready.length];
  if(e.ids.some(id=>booked.has(id)))continue;
  selected.push(e);e.ids.forEach(id=>booked.add(id));
 }
 return selected;
}
export function lifeAt(s:ValleyState,present:string[]){return activeLifeScenes(s).find(e=>e.place===s.place&&e.ids.every(id=>present.includes(id)));}

