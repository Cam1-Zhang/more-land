import type { TutorialGuideStep } from './tutorialGuideTypes';

/** 预女 6 人局 — 新手向精简教程 */
export const TUTORIAL_GUIDE_STEPS_SEER_WITCH_6: readonly TutorialGuideStep[] = [
  {
    id: 'goal',
    step: 1,
    titleZh: '游戏目标',
    titleEn: 'Game goals',
    bodyZh:
      '6 人预女局：好人要把 2 名狼人票出局；狼人隐藏身份，夜晚刀人、白天误导好人。胜利条件与 12 人标准局相同（好人屠狼 / 狼人屠边）。',
    bodyEn:
      '6-player Seer–Witch: town eliminates 2 wolves; wolves hide, kill at night, mislead by day. Win conditions match standard town/wolf side rules.',
    bulletsZh: ['好人：放逐或淘汰所有狼人即胜。', '狼人：杀光神职或杀光平民即胜（屠边）。'],
    bulletsEn: ['Good: eliminate all wolves.', 'Wolves: kill all gods OR all villagers.'],
    showVillageScene: true,
  },
  {
    id: 'roles',
    step: 2,
    titleZh: '角色与配置',
    titleEn: 'Roles & setup',
    bodyZh: '本板 1 人类 + 5 AI，共 6 人：狼人 ×2、预言家、女巫、平民 ×2。',
    bodyEn: 'Six players (you + 5 AI): 2 werewolves, Seer, Witch, 2 villagers.',
    bulletsZh: [
      '狼人 ×2：每晚统一刀杀 1 人。',
      '预言家：每晚查验 1 人，法官告知「好人 / 狼人」。',
      '女巫：1 解药 + 1 毒药，每晚最多用 1 瓶；首夜可自救，之后不可；毒药不能毒自己。',
      '平民 ×2：无技能，靠发言与投票。',
    ],
    bulletsEn: [
      'Werewolves ×2: one agreed kill per night.',
      'Seer: one check per night — told good or wolf.',
      'Witch: one save + one poison per game, max one potion per night; first night self-save only; cannot poison yourself.',
      'Villagers ×2: speech and votes only.',
    ],
    roleArts: ['Werewolf', 'Seer', 'Witch', 'Villager'],
  },
  {
    id: 'flow',
    step: 3,
    titleZh: '流程',
    titleEn: 'Flow',
    bodyZh: '夜晚顺序：狼人 → 预言家 → 女巫 → 天亮公布出局 → 白天发言 → 放逐投票 → 再入夜。',
    bodyEn: 'Night: wolves → seer → witch → dawn deaths → day speech → exile vote → next night.',
    bulletsZh: [
      '本 App 天亮只公布出局名单，不公布死因。',
      '白天放逐、警长投票均为暗票：看不到谁投给了谁，仅公布结果。',
      '首夜常有警长竞选（与 12 人练习局相同）。',
    ],
    bulletsEn: [
      'This app announces who died, not how.',
      'Day exile and sheriff votes are secret—you only see the outcome, not individual ballots.',
      'Sheriff election on night 1 works like the 12-player tutorial.',
    ],
  },
  {
    id: 'night',
    step: 4,
    titleZh: '夜晚要点',
    titleEn: 'Night tips',
    bodyZh: '女巫每夜三选一：仅救人 / 仅毒人 / 都不用；不可同夜又救又毒。',
    bodyEn: 'Witch each night: save only, poison only, or neither — not both potions same night.',
    bulletsZh: [
      '解药只能救本夜狼刀目标；首夜女巫中刀可自救。',
      '解药用尽后不再告知刀口，仅能选择是否开毒。',
      '两瓶药都用完时仍会「睁眼/闭眼」，但无需操作。',
      '毒药带走一名玩家；不能对自己使用毒药。',
    ],
    bulletsEn: [
      'Antidote only on tonight’s wolf target; witch may self-save on night 1 only.',
      'After antidote is used, you no longer learn the kill target—poison only.',
      'When both potions are spent, the witch phase still runs but you take no action.',
      'Poison eliminates one player; cannot target yourself.',
    ],
  },
  {
    id: 'day',
    step: 5,
    titleZh: '白天',
    titleEn: 'Day',
    bodyZh:
      '白天依次发言后投票放逐（暗票）；得票最高者出局（平票则无人出局）。仅狼人夜间刀口对狼队可见。',
    bodyEn:
      'Day: speeches, then secret exile vote; highest votes leave (tie = no exile). Only wolf kill ballots are visible to wolves at night.',
    bulletsZh: ['放逐暗票：无法查看各玩家投给谁。', '出局玩家通常可发表遗言（若本局规则允许）。'],
    bulletsEn: [
      'Exile is secret—you cannot see who voted for whom.',
      'Eliminated players may give last words when the rules allow.',
    ],
  },
];

export const tutorialGuideUiSeerWitch6 = {
  zh: { headerTitle: '预女 6 人局 · 规则讲解' },
  en: { headerTitle: 'Seer–Witch 6P · Rules' },
} as const;
