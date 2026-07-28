import type { AppLanguage } from './appStrings';
import type { GameBoard } from '../types/game';
import type { RoleCardImageKey } from '../constants/roleCardImages';
import { roleIdentityBodies } from './roleCardCopy';

const R = roleIdentityBodies;

export type TutorialStepI18n = {
  contentZh: string;
  contentEn: string;
  highlightZh?: string;
  highlightEn?: string;
  /** 身份介绍配图（与对局身份卡同一套素材） */
  roleArt?: RoleCardImageKey;
};

export const tutorialUi = {
  zh: {
    tap: '点击继续…',
    keyLabel: '关键概念',
    pickTitle: '先选本局玩法板子',
    pickSubtitle: '教学与后面的练习局会按你的选择讲解与发牌。',
    pickStandardTitle: '预女猎白',
    pickStandardDesc: '12 人图文教程：目标、角色、流程、术语与板子配置',
    pickBeautyTitle: '狼美人·骑士',
    pickBeautyDesc: '12 人图文教程：魅惑殉情、守卫、骑士决斗与板子配置',
    pickBannerLine: '选择你想学习的内容，开始你的狼人之旅吧！',
    skipToCharacterSelect: '跳过讲解 · 去选角',
    pickRoleKicker: '新手教学 · 练习局',
    pickRoleTitle: '选择你本局的身份',
    pickRolePreview: '横向滑动可浏览全部身份；点选一张作为你本局练习身份。',
    pickRoleConfirm: '确认',
  },
  en: {
    tap: 'Tap to continue…',
    keyLabel: 'Key idea',
    pickTitle: 'Choose your board first',
    pickSubtitle: 'The tutorial and your practice match will follow this setup.',
    pickStandardTitle: 'Standard 12',
    pickStandardDesc: '12p guide: goals, roles, flow, terms & setup',
    pickBeautyTitle: 'Wolf Beauty · Guard · Knight',
    pickBeautyDesc: '12p guide: charm, guard, knight duel & setup',
    pickBannerLine: 'Choose what to learn and start your Werewolf journey!',
    skipToCharacterSelect: 'Skip · pick characters',
    pickRoleKicker: 'Tutorial · practice match',
    pickRoleTitle: 'Choose your role this game',
    pickRolePreview: 'Scroll to browse. Tap one role to practice this game.',
    pickRoleConfirm: 'OK',
  },
} as const;

/** 预女猎白板教程 */
export const TUTORIAL_STEPS_STANDARD: TutorialStepI18n[] = [
  {
    contentZh:
      '嗨，我是 Toby。狼人杀本质是「有限信息下的推理 + 说服」：好人要把狼票出去，狼人要屠边（杀光所有神职或所有平民）。',
    contentEn:
      "Hi, I'm Toby. Werewolf is reasoning plus persuasion under limited info: town exiles wolves; wolves win by killing all gods OR all villagers (side-win).",
  },
  {
    contentZh:
      '你选的是【预女猎白】：4 狼、4 神（预言家、女巫、猎人、白痴）、4 平民。下面按这个板子介绍每个身份。',
    contentEn:
      'You picked Standard 12: 4 wolves, 4 gods (Seer, Witch, Hunter, Idiot), 4 villagers. Next we explain each role for this board.',
    highlightZh: '预女猎白',
    highlightEn: 'Standard 12',
  },
  {
    contentZh: R.zh.Werewolf,
    contentEn: R.en.Werewolf,
    highlightZh: '狼人',
    highlightEn: 'Werewolf',
    roleArt: 'Werewolf',
  },
  {
    contentZh: R.zh.Seer,
    contentEn: R.en.Seer,
    highlightZh: '预言家',
    highlightEn: 'Seer',
    roleArt: 'Seer',
  },
  {
    contentZh: R.zh.Witch,
    contentEn: R.en.Witch,
    highlightZh: '女巫',
    highlightEn: 'Witch',
    roleArt: 'Witch',
  },
  {
    contentZh: R.zh.Hunter,
    contentEn: R.en.Hunter,
    highlightZh: '猎人',
    highlightEn: 'Hunter',
    roleArt: 'Hunter',
  },
  {
    contentZh: R.zh.Idiot,
    contentEn: R.en.Idiot,
    highlightZh: '白痴',
    highlightEn: 'Idiot',
    roleArt: 'Idiot',
  },
  {
    contentZh: R.zh.Villager,
    contentEn: R.en.Villager,
    highlightZh: '平民',
    highlightEn: 'Villager',
    roleArt: 'Villager',
  },
  {
    contentZh:
      '术语①：金水＝预言家验到的好人；查杀＝验到的狼；悍跳＝狼人冒充神职起跳；表水＝说明自己是好人、降低嫌疑。',
    contentEn:
      'Terms ①: “Clear/gold water” = good check; “Hit wolf” = wolf check; “Fake-claim” = wolf pretends a power role; “Table talk” = explain you are good.',
    highlightZh: '金水 · 查杀 · 悍跳 · 表水',
    highlightEn: 'Checks & claims',
  },
  {
    contentZh:
      '术语②：归票＝总结大家投谁；自爆＝狼人认狼跳过白天；平安夜＝无人死亡；屠边＝狼杀光神或杀光民即胜。',
    contentEn:
      'Terms ②: “Hard push vote” = summarize who to exile; “Self-destruct” = wolf admits and skips day; “Peaceful night” = no deaths; “Side win” = all gods or all villagers dead.',
    highlightZh: '归票 · 自爆 · 平安夜 · 屠边',
    highlightEn: 'Votes & win',
  },
  {
    contentZh:
      '流程速记：发牌 →（警上竞选，略）→ 天黑（狼→预→女…）→ 天亮公布死讯 → 白天发言 → 放逐投票 → 再入夜循环，直到胜负。',
    contentEn:
      'Flow: deal → (sheriff election, skipped here) → night actions → dawn deaths → speeches → exile vote → repeat until a side wins.',
    highlightZh: '昼夜循环',
    highlightEn: 'Day/Night loop',
  },
  {
    contentZh:
      '接下来请选满 11 位 AI 对手，再在配置里确认板子（已锁定为你选的预女猎白），然后开始练习局。',
    contentEn:
      'Next, pick 11 AI opponents, confirm the board on the config screen (locked to Standard 12), then start your practice match.',
  },
];

/** 狼美人 + 守卫板教程 */
export const TUTORIAL_STEPS_WOLF_BEAUTY: TutorialStepI18n[] = [
  {
    contentZh:
      '嗨，我是 Toby。狼人杀本质是「有限信息下的推理 + 说服」：好人要把狼票出去，狼人要屠边（杀光所有神职或所有平民）。',
    contentEn:
      "Hi, I'm Toby. Werewolf is reasoning plus persuasion under limited info: town exiles wolves; wolves win by killing all gods OR all villagers (side-win).",
  },
  {
    contentZh:
      '你选的是【狼美人】板：狼队为 3 名普狼 + 1 名狼美人；好人神为预言家、女巫、猎人、守卫；另有 4 名平民。与「预女猎白」相比，神位用守卫替换白痴，并加入狼美人技能。',
    contentEn:
      'You picked Wolf Beauty: 3 werewolves + Wolf Beauty; gods are Seer, Witch, Hunter, Guard; 4 villagers. Versus Standard 12, Idiot is replaced by Guard and Wolf Beauty is added.',
    highlightZh: '狼美人板',
    highlightEn: 'Wolf Beauty board',
  },
  {
    contentZh: R.zh.Werewolf,
    contentEn: R.en.Werewolf,
    highlightZh: '狼人',
    highlightEn: 'Werewolf',
    roleArt: 'Werewolf',
  },
  {
    contentZh: R.zh.Seer,
    contentEn: R.en.Seer,
    highlightZh: '预言家',
    highlightEn: 'Seer',
    roleArt: 'Seer',
  },
  {
    contentZh: R.zh.Witch,
    contentEn: R.en.Witch,
    highlightZh: '女巫',
    highlightEn: 'Witch',
    roleArt: 'Witch',
  },
  {
    contentZh: R.zh.Hunter,
    contentEn: R.en.Hunter,
    highlightZh: '猎人',
    highlightEn: 'Hunter',
    roleArt: 'Hunter',
  },
  {
    contentZh: R.zh.Guard,
    contentEn: R.en.Guard,
    highlightZh: '守卫',
    highlightEn: 'Guard',
    roleArt: 'Guard',
  },
  {
    contentZh: R.zh.Villager,
    contentEn: R.en.Villager,
    highlightZh: '平民',
    highlightEn: 'Villager',
    roleArt: 'Villager',
  },
  {
    contentZh: R.zh.WolfBeauty,
    contentEn: R.en.WolfBeauty,
    highlightZh: '狼美人',
    highlightEn: 'Wolf Beauty',
    roleArt: 'WolfBeauty',
  },
  {
    contentZh:
      '术语①：金水／查杀／悍跳／表水——与标准板相同，按预言家查验与狼人悍跳去理解即可。',
    contentEn:
      'Terms ①: Same “clear / wolf check / fake-claim / table talk” ideas as Standard 12.',
    highlightZh: '金水 · 查杀 · 悍跳 · 表水',
    highlightEn: 'Checks & claims',
  },
  {
    contentZh:
      '术语②：屠边、平安夜、归票等与标准板一致；狼美人局若启用魅惑链，记清法官当轮公布的结算结果。',
    contentEn:
      'Terms ②: Side-win, peaceful night, vote pushes—same as standard; if charm chains exist, follow the moderator each round.',
    highlightZh: '屠边 · 平安夜',
    highlightEn: 'Win & peace',
  },
  {
    contentZh:
      '流程速记：与标准板同样是昼夜循环；差别在身份与部分技能结算，对局内以你选的板子为准。',
    contentEn:
      'Flow: same day/night loop as standard; differences are roles and some resolutions—follow the board you selected.',
    highlightZh: '昼夜循环',
    highlightEn: 'Day/Night loop',
  },
  {
    contentZh:
      '接下来请选满 11 位 AI 对手，再在配置里确认板子（已锁定为你选的狼美人板），然后开始练习局。',
    contentEn:
      'Next, pick 11 AI opponents, confirm the board (locked to Wolf Beauty), then start your practice match.',
  },
];

export function getTutorialSteps(board: GameBoard): TutorialStepI18n[] {
  return board === 'WolfBeauty' ? TUTORIAL_STEPS_WOLF_BEAUTY : TUTORIAL_STEPS_STANDARD;
}

export function getTutorialSpeaker(_lang: AppLanguage): string {
  return 'Toby';
}
