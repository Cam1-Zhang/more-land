/**
 * UI copy for character gallery / picker when app language is 中文.
 * English source of truth remains in `mockData.ts` (also used for AI prompts & avatar hash).
 * Keys are `CHARACTERS[].id`; copy aligns 1:1 with current mock roster + body art ids.
 */
export const CHARACTER_PERSONA_ZH: Record<
  string,
  { personality: string; description: string }
> = {
  '1': {
    personality: '情绪化、结巴',
    description:
      '很容易紧张。被点到就只会说「我不是狼」，然后掉眼泪。',
  },
  '2': {
    personality: '天真、轻信',
    description: '谁先说话就信谁，完全没有防守逻辑。',
  },
  '3': {
    personality: '冲动、嗓门大',
    description: '凭心情投票：「你太吵了，肯定是狼！」',
  },
  '4': {
    personality: '迷糊、没主见',
    description: '总说「不知道」，然后跟着多数票走。',
  },
  '5': {
    personality: '固执、一根筋',
    description: '一旦怀疑谁，就再也不改口，不管逻辑怎么说。',
  },
  '6': {
    personality: '不会撒谎',
    description: '老派风格，想装身份时声音会发抖。',
  },
  '7': {
    personality: '走神、话痨',
    description: '聊天气比聊局还多，完全不管场上信息。',
  },
  '8': {
    personality: '爱讲段子',
    description: '什么都当笑话，还会投自己一票寻开心。',
  },
  '9': {
    personality: '记太多、结论空',
    description: '笔记写满几页却推不出结论，被自己绕晕。',
  },
  '10': {
    personality: '自我中心',
    description: '只关心自己死活，不管团队策略。',
  },
  '11': {
    personality: '没逻辑、很跳脱',
    description: '凭「气场」或头像来投票。',
  },
  '12': {
    personality: '胆小、沉默',
    description: '怕到不敢说话，沉默反而成靶子。',
  },
  '13': {
    personality: '进攻型找狼',
    description: '基础「猎狼」型：会抓可疑发言，但容易被钓。',
  },
  '14': {
    personality: '直觉猜票',
    description: '靠感觉，偶尔猜对，但说不清为什么。',
  },
  '15': {
    personality: '按部就班',
    description: '按发言顺序列清单，擅长抓明显矛盾。',
  },
  '16': {
    personality: '死守规则',
    description: '完全按教科书打，套路很好猜。',
  },
  '17': {
    personality: '爱带票',
    description: '喜欢组织归票，但逻辑常常太简单。',
  },
  '18': {
    personality: '爱问查验',
    description: '总问「你验了谁」，却不核对答案真假。',
  },
  '19': {
    personality: '稳重、老实',
    description: '好人面几乎不说谎，当狼也装不像。',
  },
  '20': {
    personality: '护犊子',
    description: '谁被集火就护谁，不管对方身份。',
  },
  '21': {
    personality: '和事佬',
    description: '讨厌「硬点」，总想多留几轮人。',
  },
  '22': {
    personality: '细节控',
    description: '记得谁投谁，却常漏掉「为什么」。',
  },
  '23': {
    personality: '社交型玩家',
    description: '爱聊以前的局，有趣但容易分心。',
  },
  '24': {
    personality: '爱试偏门打法',
    description: '喜欢奇怪战术，多数时候翻车。',
  },
  '25': {
    personality: '算计、冷感',
    description: '没证据不轻易开口，情绪很难读。',
  },
  '26': {
    personality: '嘴炮演员',
    description: '假跳预言家能比真预还像，悍跳老手。',
  },
  '27': {
    personality: '话术操控',
    description: '用漂亮话把薄弱逻辑包装得很可信；偶尔才轻带桌感，不当主持人。',
  },
  '28': {
    personality: '搅局小丑',
    description: '故意把水搅浑，好藏住自己的身份。',
  },
  '29': {
    personality: '魅力独裁',
    description: '强行把节奏往自己身上带，胜率往往不低。',
  },
  '30': {
    personality: '冷面侧写',
    description: '不只听字句，更盯语气和「怕不怕」。',
  },
  '31': {
    personality: '赌徒',
    description: '爱玩高风险高收益的局，难以预测。',
  },
  '32': {
    personality: '审计式分析',
    description: '专找狼故事里最小裂缝，然后撕开。',
  },
  '33': {
    personality: '进攻型策略',
    description: '节奏极快，用压迫感逼对手失误。',
  },
  '34': {
    personality: '铁壁',
    description: '极难点出局，对每个身份都有成套辩解。',
  },
  '35': {
    personality: '社交变色龙',
    description: '让每个人都觉得「他是我这边的」。',
  },
  '36': {
    personality: '模式识别',
    description: '靠成千上万局经验认常见狼套路。',
  },
  '37': {
    personality: '幕后黑手',
    description: '逻辑链提前五步布局，用你自己的话把你套住。',
  },
  '38': {
    personality: '致命诱惑',
    description: '让你心甘情愿信她；等你起疑，局已经结束了。',
  },
  '39': {
    personality: '国象大师',
    description: '把全场当数学题，每一步都算清胜率。',
  },
  '40': {
    personality: '绝对指挥',
    description: '控制信息流，你只能看到她想让你看到的。',
  },
  '41': {
    personality: '审问者',
    description: '用问题拆穿你的身份叙事，让你开始怀疑自己。',
  },
  '42': {
    personality: '算法人格',
    description: '追踪每一票、每一句细微差别，找狼准得吓人。',
  },
  '43': {
    personality: '无迹可寻',
    description: '决赛日前几乎没存在感，却总能活到最后。',
  },
  '44': {
    personality: '碾压式统治',
    description: '压下一切反对声，压迫感极强。',
  },
  '45': {
    personality: '老狐狸',
    description: '狼面是传说级，深水狼能潜好几天。',
  },
  '46': {
    personality: '完美外交官',
    description: '用无懈可击的话术化解所有攻击。',
  },
  '47': {
    personality: '真相之墙',
    description: '很难对她撒谎；她嗅到欺骗就像闻到血腥味。',
  },
  '48': {
    personality: '全知视角',
    description: '终极 AI：综合 11 人的微表情与发言细节。',
  },
};
