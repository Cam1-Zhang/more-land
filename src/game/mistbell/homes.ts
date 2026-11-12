import type {HomePlace,Place} from './types';
export type HomeLayout='generations'|'three'|'two'|'couple'|'solo'|'ghost';
export type Home={name:string;district:Place;residents:string[];residentNames:string[];kind:'family'|'solo';relations:string;description:string;interior:string;doorLabel:string;door:{x:number;y:number};layout:HomeLayout};
// Kinship is new Mistbell game canon, reviewed against the original ages and story.
export const HOMES:Record<HomePlace,Home>={
  "frankFamilyHome": {
    "name": "榛木老宅",
    "district": "farmRoad",
    "residents": [
      "6",
      "19",
      "30",
      "7"
    ],
    "kind": "family",
    "relations": "Frank是Gary的父亲、Daisy的祖父；Gary与Sofia是夫妻；Daisy是Gary与Sofia的女儿。",
    "description": "Frank年纪渐长后与儿子一家同住。Gary负责大部分重活，Sofia管理日常起居，Daisy仍在家中生活。这里是自然的三代家庭住宅。",
    "interior": "三代老宅：北侧三间卧室，西侧长厨房，东侧宽客厅，中间过厅连接南门。",
    "doorLabel": "Frank & Gary家",
    "door": {
      "x": 160,
      "y": 146
    },
    "layout": "generations",
    "residentNames": [
      "Frank",
      "Gary",
      "Sofia",
      "Daisy"
    ]
  },
  "hankFamilyHome": {
    "name": "风车檐屋",
    "district": "neighborhood",
    "residents": [
      "23",
      "18",
      "1"
    ],
    "kind": "family",
    "relations": "Hank是Chloe和Toby的父亲；Chloe是Toby的姐姐。",
    "description": "两个成年子女仍和父亲住在祖宅。Chloe经济和生活都已经独立，只是没有特别理由搬走；Toby年纪更小，也更依赖熟悉的家庭环境。",
    "interior": "折角家庭住宅：两间卧室在北侧，第三间在西侧；厨房朝北，横向客厅连接南侧门厅。",
    "doorLabel": "Hank家",
    "door": {
      "x": 252,
      "y": 160
    },
    "layout": "three",
    "residentNames": [
      "Hank",
      "Chloe",
      "Toby"
    ]
  },
  "moriFamilyHome": {
    "name": "北坡观星宅",
    "district": "highlands",
    "residents": [
      "37",
      "42",
      "11"
    ],
    "kind": "family",
    "relations": "Prof. Mori是Ada和Luna的父亲；Ada是Luna的姐姐。",
    "description": "Mori原本就住在靠近旧天文台的位置。Ada成年后仍把这里作为长期住所，Luna也尚未离家，三人各有自己的空间。",
    "interior": "带观测书房的翼宅：西北为大书房，卧室分布在北侧与西翼，厨房在东翼，南侧是独立起居室。",
    "doorLabel": "Mori家",
    "door": {
      "x": 314,
      "y": 174
    },
    "layout": "three",
    "residentNames": [
      "Prof. Mori",
      "Ada",
      "Luna"
    ]
  },
  "kasparFamilyHome": {
    "name": "棋盘石屋",
    "district": "forestRoad",
    "residents": [
      "39",
      "13",
      "14"
    ],
    "kind": "family",
    "relations": "Kaspar是Zack和Rose的父亲；Zack是Rose的哥哥。",
    "description": "兄妹都已经成年，但这里一直是他们的家庭住宅。Zack经常在外活动，Rose更喜欢附近的林缘环境，两人都没有急着搬离。",
    "interior": "棋室位于北侧中央，两侧和东翼为三间卧室；中央长廊连接西南厨房和南侧书房。",
    "doorLabel": "Kaspar家",
    "door": {
      "x": 187,
      "y": 123
    },
    "layout": "three",
    "residentNames": [
      "Kaspar",
      "Zack",
      "Rose"
    ]
  },
  "socratesFamilyHome": {
    "name": "白石问答屋",
    "district": "westLane",
    "residents": [
      "41"
    ],
    "kind": "solo",
    "relations": "Socrates独居，没有设定任何亲属。",
    "description": "Socrates独自生活在白石问答屋，喜欢安静地阅读和思考。他与村民是邻居或朋友，没有亲属关系。",
    "interior": "紧凑的独居折角小宅：北端书房，中部一间单人卧室与小客厅，南端厨房和门厅；没有家人房间。",
    "doorLabel": "Socrates家",
    "door": {
      "x": 566,
      "y": 157
    },
    "layout": "solo",
    "residentNames": [
      "Socrates"
    ]
  },
  "justiceFamilyHome": {
    "name": "蓝窗宅",
    "district": "neighborhood",
    "residents": [
      "47",
      "9",
      "4"
    ],
    "kind": "family",
    "relations": "Justice是Alice和Lily的母亲；Alice是Lily的姐姐。",
    "description": "Alice和Lily仍住在母亲的房子里。Alice觉得搬家会打乱自己全部记录系统，Lily则一直没有真正决定过要不要搬。",
    "interior": "北侧两间卧室与档案书房，东侧第三间卧室；客厅横向展开，厨房位于东南角。",
    "doorLabel": "Justice家",
    "door": {
      "x": 607,
      "y": 166
    },
    "layout": "three",
    "residentNames": [
      "Justice",
      "Alice",
      "Lily"
    ]
  },
  "oldFoxFamilyHome": {
    "name": "赤尾坡屋",
    "district": "riverside",
    "residents": [
      "45",
      "31",
      "20"
    ],
    "kind": "family",
    "relations": "Old Fox是Dante和Mia的父亲；Dante是Mia的哥哥。",
    "description": "兄妹都保留这里作为正式住所。Dante经常晚归，Mia更常在家。Old Fox并不干涉两个成年子女的生活，因此家庭关系相对松散。",
    "interior": "围绕中央过厅的错层平面：西侧两间卧室、东北卧室，北客厅、西北厨房、东侧书房。",
    "doorLabel": "Old Fox家",
    "door": {
      "x": 188,
      "y": 160
    },
    "layout": "three",
    "residentNames": [
      "Old Fox",
      "Dante",
      "Mia"
    ]
  },
  "noraFamilyHome": {
    "name": "常青门宅",
    "district": "southRoad",
    "residents": [
      "34",
      "3"
    ],
    "kind": "family",
    "relations": "Nora是Jack的母亲。",
    "description": "Jack虽然成年，但一直住在家里。Nora完全能压住他的脾气，因此他们的家庭互动会很有辨识度。",
    "interior": "西侧两间卧室上下分布，北端厨房，中部客厅向东延伸，南侧为门厅。",
    "doorLabel": "Nora & Jack家",
    "door": {
      "x": 194,
      "y": 145
    },
    "layout": "two",
    "residentNames": [
      "Nora",
      "Jack"
    ]
  },
  "victorFamilyHome": {
    "name": "金狮宅",
    "district": "marketRoad",
    "residents": [
      "29",
      "2"
    ],
    "kind": "family",
    "relations": "Victor是Momo的父亲。",
    "description": "Momo仍和父亲生活。Victor性格强势，但在家庭生活中习惯替Momo处理很多事情，这也部分解释了Momo为什么对别人较容易信任。",
    "interior": "横向宽厨房夹在两间卧室之间，南侧整片家庭客厅，下接紧凑门厅。",
    "doorLabel": "Victor家",
    "door": {
      "x": 170,
      "y": 140
    },
    "layout": "two",
    "residentNames": [
      "Victor",
      "Momo"
    ]
  },
  "peterHome": {
    "name": "水杉小屋",
    "district": "forestRoad",
    "residents": [
      "12"
    ],
    "kind": "solo",
    "relations": "Peter独居。Peter的父亲属于上一代守谷会成员，但不是本户现居角色。",
    "description": "Peter45岁，有能力独立生活，也更喜欢安静。他的房子靠近森林，却刻意与旧水渠入口保持一定距离。",
    "interior": "紧凑的四室折角小屋：西北卧室、东北工作书房，西南厨房连着南侧起居室。",
    "doorLabel": "Peter",
    "door": {
      "x": 590,
      "y": 123
    },
    "layout": "solo",
    "residentNames": [
      "Peter"
    ]
  },
  "widowHome": {
    "name": "暮藤屋",
    "district": "riverside",
    "residents": [
      "38"
    ],
    "kind": "solo",
    "relations": "Widow独居；她已故的丈夫曾是守谷会成员。",
    "description": "这里一直是她自己的家。丈夫去世后，她选择继续生活在原住宅，并保留部分丈夫留下的物品，不需要给她安排新的伴侣。",
    "interior": "北端独立卧室，中央客厅，南侧厨房与旧物书房并排。",
    "doorLabel": "Widow",
    "door": {
      "x": 552,
      "y": 171
    },
    "layout": "solo",
    "residentNames": [
      "Widow"
    ]
  },
  "ghostHome": {
    "name": "铃影小屋",
    "district": "riverRoad",
    "residents": [
      "43"
    ],
    "kind": "solo",
    "relations": "Ghost独自拥有这处归所，没有现任伴侣。",
    "description": "Ghost不需要睡眠和饮食，但社区仍承认TA是居民，因此TA拥有一个正式地址。这里是TA主动选择使用的空间，不代表TA需要像活人一样生活。",
    "interior": "无卧室和厨房的归所：北侧大书房，东侧旧物陈列室，西侧访客客厅，南侧门厅。",
    "doorLabel": "Ghost",
    "door": {
      "x": 623,
      "y": 164
    },
    "layout": "ghost",
    "residentNames": [
      "Ghost"
    ]
  },
  "godEyeHome": {
    "name": "全景屋",
    "district": "highlands",
    "residents": [
      "48"
    ],
    "kind": "solo",
    "relations": "God Eye独居，没有现任伴侣。",
    "description": "God Eye喜欢拥有可以独立观察、整理信息而不受打扰的空间，因此成年后选择独居。",
    "interior": "北侧宽观测书房，中部单人卧室与厨房，南侧横向起居室。",
    "doorLabel": "God Eye",
    "door": {
      "x": 501,
      "y": 180
    },
    "layout": "solo",
    "residentNames": [
      "God Eye"
    ]
  },
  "devinIvyHome": {
    "name": "榆叶兄妹宅",
    "district": "westLane",
    "residents": [
      "15",
      "22"
    ],
    "kind": "family",
    "relations": "Devin是Ivy的哥哥。",
    "description": "兄妹共同继承并继续住在原来的家庭住宅。两人工作方式都偏细致，因此共同生活没有太大冲突。",
    "interior": "北侧两间卧室之间是工作书房；西侧厨房、东侧客厅，下接南门厅。",
    "doorLabel": "Devin & Ivy",
    "door": {
      "x": 205,
      "y": 157
    },
    "layout": "two",
    "residentNames": [
      "Devin",
      "Ivy"
    ]
  },
  "sarahJulianHome": {
    "name": "冬青宅",
    "district": "southRoad",
    "residents": [
      "16",
      "35"
    ],
    "kind": "family",
    "relations": "Sarah与Julian是夫妻。",
    "description": "两人性格互补：Sarah重规则，Julian擅长处理人际关系。婚姻并不改变各自核心性格，也不会让他们在游戏里总成对出现。",
    "interior": "西北宽主卧，西侧独立书房，中央起居室，南侧厨房和门厅。",
    "doorLabel": "Sarah & Julian",
    "door": {
      "x": 575,
      "y": 145
    },
    "layout": "couple",
    "residentNames": [
      "Sarah",
      "Julian"
    ]
  },
  "mikeClaraHome": {
    "name": "榆灯宅",
    "district": "square",
    "residents": [
      "17",
      "36"
    ],
    "kind": "family",
    "relations": "Mike与Clara是夫妻。",
    "description": "Mike爱组织别人，Clara善于看模式，两人在日常生活中经常对同一件事得出不同判断，但并非严重冲突。",
    "interior": "横向楼上住宅：厨房、客厅与双人主卧由西向东排列，西南有种子记录书房。",
    "doorLabel": "Mike & Clara",
    "door": {
      "x": 175,
      "y": 182
    },
    "layout": "couple",
    "residentNames": [
      "Mike",
      "Clara"
    ]
  },
  "oscarJillHome": {
    "name": "红檐屋",
    "district": "tavern",
    "residents": [
      "26",
      "24"
    ],
    "kind": "family",
    "relations": "Oscar与Jill是夫妻。",
    "description": "两个人都喜欢把普通日子弄得更有趣。Jill经常提出奇怪方案，Oscar负责把方案说得听起来像真的可行。",
    "interior": "窄长住宅：北侧主卧与厨房，中部客厅，南侧书房和门厅。",
    "doorLabel": "Oscar & Jill",
    "door": {
      "x": 663,
      "y": 162
    },
    "layout": "couple",
    "residentNames": [
      "Oscar",
      "Jill"
    ]
  },
  "mageElenaHome": {
    "name": "紫藤门宅",
    "district": "hillRoad",
    "residents": [
      "28",
      "27"
    ],
    "kind": "family",
    "relations": "Mage与Elena是夫妻。",
    "description": "Mage喜欢故弄玄虚，Elena非常清楚语言怎样影响别人，因此她通常知道Mage什么时候是在认真、什么时候只是在胡说。",
    "interior": "西北主卧和书房，西侧草药厨房，横向客厅通向东南收藏室。",
    "doorLabel": "Mage & Elena",
    "door": {
      "x": 174,
      "y": 130
    },
    "layout": "couple",
    "residentNames": [
      "Mage",
      "Elena"
    ]
  },
  "vesperXanderHome": {
    "name": "黑栎兄妹宅",
    "district": "bridgeRoad",
    "residents": [
      "40",
      "33"
    ],
    "kind": "family",
    "relations": "Vesper是Xander的姐姐。",
    "description": "两人都是行动力很强的人，成年后仍共同保留一处家庭住宅，但日程独立，很少整天待在一起。",
    "interior": "横向船屋住宅：两端各有一间卧室，中间客厅，南侧分布厨房、门厅和航行书房。",
    "doorLabel": "Vesper & Xander",
    "door": {
      "x": 156,
      "y": 137
    },
    "layout": "two",
    "residentNames": [
      "Vesper",
      "Xander"
    ]
  },
  "tomBrothersHome": {
    "name": "三橡树屋",
    "district": "riverRoad",
    "residents": [
      "10",
      "21",
      "8"
    ],
    "kind": "family",
    "relations": "Tom、Leo、Sam是三兄弟，年龄顺序为Tom、Leo、Sam。",
    "description": "三兄弟都已成年，但保留共同的家庭住宅。Tom最在意自己的位置，Leo经常调停，Sam则不断制造新的麻烦，因此家庭互动非常自然。",
    "interior": "三间卧室沿西侧分布，北侧厨房，中央横向客厅，东南书房。",
    "doorLabel": "Tom / Leo / Sam",
    "door": {
      "x": 398,
      "y": 164
    },
    "layout": "three",
    "residentNames": [
      "Tom",
      "Leo",
      "Sam"
    ]
  },
  "frostHome": {
    "name": "霜石屋",
    "district": "hillRoad",
    "residents": [
      "25"
    ],
    "kind": "solo",
    "relations": "Frost独居。",
    "description": "Frost需要安静和高度私人空间，独居最符合他的生活方式，不需要额外制造家庭悲剧解释。",
    "interior": "最紧凑的四室小宅：北侧单人卧室和书房，南侧小客厅与厨房。",
    "doorLabel": "Frost",
    "door": {
      "x": 625,
      "y": 130
    },
    "layout": "solo",
    "residentNames": [
      "Frost"
    ]
  },
  "kaiserHome": {
    "name": "铁门宅",
    "district": "riverRoad",
    "residents": [
      "44"
    ],
    "kind": "solo",
    "relations": "Kaiser独居。",
    "description": "Kaiser45岁且性格极强势，自己拥有住宅比强行安排室友或家庭成员更自然。",
    "interior": "阶梯形独居住宅：东北单人卧室，中部书房与厨房，南侧横向起居室。",
    "doorLabel": "Kaiser",
    "door": {
      "x": 165,
      "y": 164
    },
    "layout": "solo",
    "residentNames": [
      "Kaiser"
    ]
  },
  "ambassadorHome": {
    "name": "白栏宅",
    "district": "marketRoad",
    "residents": [
      "46"
    ],
    "kind": "solo",
    "relations": "Ambassador独居。",
    "description": "Ambassador40岁，有成熟独立的生活方式。房子离广场近，方便居民遇到矛盾时来找他。",
    "interior": "西北单人卧室与书房相邻，西侧厨房，宽客厅朝东延伸，南侧访客门厅。",
    "doorLabel": "Ambassador",
    "door": {
      "x": 573,
      "y": 139
    },
    "layout": "solo",
    "residentNames": [
      "Ambassador"
    ]
  },
  "ritaBenHome": {
    "name": "芦苇书匠屋",
    "district": "canalRoad",
    "residents": [
      "32",
      "5"
    ],
    "residentNames": [
      "Rita",
      "Ben"
    ],
    "kind": "family",
    "relations": "Rita是Ben的姐姐；两人与Socrates没有亲属关系。",
    "description": "Rita与Ben在芦苇河岸的家中同住。姐姐整理记录，弟弟修理日常用品；两人各有卧室，也各有自己的生活。",
    "interior": "分翼姐弟住宅：Rita卧室和书房在西侧，Ben卧室位于东翼；中间共用客厅，南侧厨房和门厅。",
    "doorLabel": "Rita & Ben家",
    "door": {
      "x": 215,
      "y": 176
    },
    "layout": "two"
  }
};
export const HOME_IDS=Object.keys(HOMES) as HomePlace[];
export const HOME_OF:Record<string,HomePlace>=Object.fromEntries(HOME_IDS.flatMap(place=>HOMES[place].residents.map(id=>[id,place])));
export function isHome(place:Place):place is HomePlace{return Object.prototype.hasOwnProperty.call(HOMES,place);}
export const LEGACY_HOME_PLACES:Record<string,Place>={
  "elmHome": "neighborhood",
  "youthHome": "riverside",
  "pagesHome": "westLane",
  "wheatHome": "westLane",
  "stepsHome": "neighborhood",
  "innHome": "tavern",
  "starsHome": "highlands",
  "keepersHome": "highlands",
  "laurelHome": "riverside"
};
