import type { TutorialGuideStep } from './tutorialGuideTypes';

/** 狼美人·骑士（预女守卫骑士）— 9 步分页教程 */
export const TUTORIAL_GUIDE_STEPS_WOLF_BEAUTY: readonly TutorialGuideStep[] = [
  {
    id: 'goal',
    step: 1,
    titleZh: '游戏目标',
    titleEn: 'Game goals',
    bodyZh:
      '狼人杀是「有限信息 + 发言说服」的阵营对抗。好人要把狼人票出局；狼人要隐藏身份，用夜晚刀人与白天话术拖垮好人。',
    bodyEn:
      'Werewolf is a hidden-role team game built on limited info and persuasion. Town exiles wolves; wolves hide, kill at night, and mislead by day.',
    bulletsZh: [
      '好人阵营：放逐或淘汰所有狼人即胜利。',
      '狼人阵营：屠边——杀光所有神职，或杀光所有平民，即胜利。',
    ],
    bulletsEn: [
      'Good faction: win by eliminating all werewolves.',
      'Wolf faction: side-win — kill all gods OR all villagers.',
    ],
    showVillageScene: true,
  },
  {
    id: 'roles',
    step: 2,
    titleZh: '角色介绍',
    titleEn: 'Roles',
    bodyZh:
      '【狼美人·骑士】12 人：3 普狼 + 狼美人、预言家 / 女巫 / 守卫 / 骑士、4 平民（无猎人、无白痴）。',
    bodyEn:
      'Wolf Beauty · Knight: 12 players — 3 wolves + Wolf Beauty, Seer / Witch / Guard / Knight, 4 villagers (no Hunter or Idiot).',
    bulletsZh: [
      '普狼 ×3：每晚与狼队统一刀口；白天隐藏身份。',
      '狼美人 ×1：除刀人外，每夜可魅惑一名好人；因放逐、骑士决斗或毒杀出局时，最后被魅惑者殉情（狼刀出局通常不触发）。不可魅惑狼人。',
      '预言家：每晚查验一人善恶（仅自己知晓）。',
      '女巫：解药、毒药各一瓶，每晚三选一（详见「夜晚阶段」）。',
      '守卫：每夜守护一人挡狼刀；不可连续两晚守同一人；与女巫同夜同救会「守救冲突」。',
      '骑士：白天投票前可决斗一人（整局一次）；对方是狼则狼出局，是好人则骑士出局。',
      '平民 ×4：无夜间技能，靠发言与投票帮助好人。',
    ],
    bulletsEn: [
      'Werewolves ×3: pack kill each night; hide by day.',
      'Wolf Beauty ×1: charm one good player nightly; martyr on exile, duel, or poison (not usual wolf kill); cannot charm wolves.',
      'Seer: nightly check (private result).',
      'Witch: one antidote & one poison; one choice per night — see Night phase.',
      'Guard: block wolf kill; no same target two nights in a row; guard + witch save = conflict.',
      'Knight: duel once before exile vote; wolf dies if wolf, knight dies if good.',
      'Villagers ×4: no night power; win through speech and votes.',
    ],
    roleArts: ['Werewolf', 'WolfBeauty', 'Seer', 'Witch', 'Guard', 'Knight', 'Villager'],
  },
  {
    id: 'flow',
    step: 3,
    titleZh: '游戏流程概览',
    titleEn: 'Flow overview',
    bodyZh: '本板一局循环如下（首夜含警长竞选，练习局已包含）：',
    bodyEn: 'Typical loop for this board (sheriff election on night 1 included in practice):',
    bulletsZh: [
      '① 夜晚：狼人刀人 → 守卫守护 → 预言家验人 → 女巫用药（狼美人魅惑无语音播报）',
      '② 天亮：公布昨夜出局名单（本 App 不公布死因）',
      '③ 白天：发言讨论 → 骑士决斗（可跳过）→ 放逐投票',
      '④ 再入夜，重复直至一方胜利',
    ],
    bulletsEn: [
      '① Night: wolves → guard → seer → witch (Wolf Beauty charm has no voice cue)',
      '② Dawn: deaths announced (causes hidden in this app)',
      '③ Day: speeches → knight duel (skippable) → exile vote',
      '④ Next night; repeat until a side wins',
    ],
  },
  {
    id: 'night',
    step: 4,
    titleZh: '夜晚阶段详解',
    titleEn: 'Night phase',
    bodyZh: '闭眼玩家不得偷看。按法官播报依次睁眼（狼美人魅惑在流程中执行但通常无单独播报）：',
    bodyEn: 'Eyes closed for others. Roles wake in judge order (Wolf Beauty charm runs without a separate voice cue):',
    bulletsZh: [
      '狼人：与队友统一刀口，击杀一名好人阵营玩家。',
      '狼美人：在狼队行动后魅惑一名存活好人（不可魅惑狼人；魅惑结果仅狼队可见）。',
      '守卫：选择守护一名玩家；守中可挡狼刀；不可连续两晚守同一人。',
      '预言家：查验一名玩家是好人面还是狼人面。',
      '女巫：知晓本夜刀口后，三选一——仅解药 / 仅毒药 / 都不用；不可同夜又救又毒。',
    ],
    bulletsEn: [
      'Wolves: agree on one good-side kill.',
      'Wolf Beauty: charm one living good player after the pack kill (wolves only see the mark).',
      'Guard: guard one player; blocks wolf kill; not the same seat two nights in a row.',
      'Seer: check one player.',
      'Witch: see wolf target; antidote only, poison only, or neither — not both.',
    ],
    noteZh:
      '若同夜某人既被守卫守护又被女巫解药所救，会形成守救冲突，该玩家仍可能出局。平安夜只表示无人死亡，不说明是守中还是女巫救。',
    noteEn:
      'Guard + witch antidote on the same target the same night = conflict—that player may still die. A peaceful night only means no deaths.',
    roleArts: ['Werewolf', 'WolfBeauty', 'Guard', 'Seer', 'Witch'],
  },
  {
    id: 'day',
    step: 5,
    titleZh: '白天阶段详解',
    titleEn: 'Day phase',
    bodyZh: '天亮后进入白天。本板白天在放逐投票前多了骑士决斗环节。',
    bodyEn: 'After dawn comes the day. This board adds a knight duel before the exile vote.',
    bulletsZh: [
      '遗言（若规则允许）：出局玩家最后一次公开发言。',
      '自由讨论：存活玩家依次发言、质疑、归票。',
      '骑士决斗：讨论结束后、投票前，骑士可指定一人决斗（整局一次，练习局可跳过）；狼出局或骑士出局。',
      '放逐投票：票高者出局；出局后仅可观战，不能再投票（警长规则见练习局提示）。',
    ],
    bulletsEn: [
      'Last words (if allowed): one final public speech.',
      'Discussion: alive players speak in turn.',
      'Knight duel: once per game before exile vote (skippable in practice); wolf or knight dies.',
      'Exile vote: highest votes leave; eliminated players spectate only.',
    ],
    roleArts: ['Knight'],
  },
  {
    id: 'win',
    step: 6,
    titleZh: '胜利条件',
    titleEn: 'Victory',
    bodyZh: '随时检查场上存活阵营人数是否满足下列条件：',
    bodyEn: 'Check whether either side has met its win condition:',
    bulletsZh: [
      '好人胜：所有狼人出局。',
      '狼人胜：所有神职死亡，或所有平民死亡（屠边）。',
    ],
    bulletsEn: [
      'Town wins: all werewolves eliminated.',
      'Wolves win: all gods dead OR all villagers dead.',
    ],
    roleArts: ['Villager', 'Werewolf'],
  },
  {
    id: 'tips',
    step: 7,
    titleZh: '新手技巧',
    titleEn: 'Newbie tips',
    bodyZh: '本板信息量比预女猎白更大，更要注意「谁该知道什么」。',
    bodyEn: 'This board has more hidden info than Standard 12—track who should know what.',
    bulletsZh: [
      '狼美人魅惑是隐性信息：好人侧通常只能从发言与票型反推，别在公开区乱猜夜间行动。',
      '守卫不要连续守同一人；女巫用药前想想是否与守卫撞车造成守救冲突。',
      '骑士决斗整局只有一次，宜在信息较足时使用，别首日出刀。',
      '你只会看到自己身份该知道的信息——守卫不知刀口，女巫才知刀口；狼队可见队友与魅惑。',
    ],
    bulletsEn: [
      'Charm is hidden to town—infer from speeches and votes, not public night guesses.',
      'Guard: rotate targets; witch should consider guard-save conflicts.',
      'Knight: one duel per game—use when you have real reads.',
      'You only see what your role should—guard lacks wolf target; witch has it; wolves see charm.',
    ],
  },
  {
    id: 'setup',
    step: 8,
    titleZh: '板子配置',
    titleEn: 'Board setup',
    bodyZh: '【狼美人·骑士】标准 12 人（练习局已锁定此板）：',
    bodyEn: 'Wolf Beauty · Knight — standard 12 (locked in practice):',
    bulletsZh: [
      '狼人 ×3 · 狼美人 ×1',
      '预言家 ×1 · 女巫 ×1 · 守卫 ×1 · 骑士 ×1',
      '平民 ×4',
    ],
    bulletsEn: [
      'Werewolves ×3 · Wolf Beauty ×1',
      'Seer ×1 · Witch ×1 · Guard ×1 · Knight ×1',
      'Villagers ×4',
    ],
  },
  {
    id: 'terms',
    step: 9,
    titleZh: '常见术语',
    titleEn: 'Common terms',
    bodyZh: '通用简称 + 本板专有名词：',
    bodyEn: 'Common slang plus terms for this board:',
    bulletsZh: [
      '金水 / 查杀 / 悍跳 / 表水 / 归票 / 平安夜：与标准板相同。',
      '魅惑：狼美人每夜标记的一名好人（狼队可见）。',
      '殉情：狼美人因放逐、决斗或毒杀出局时，最后被魅惑者一同出局。',
      '守中：守卫挡下狼刀；守救冲突：同夜同人被守又被救，可能仍出局。',
    ],
    bulletsEn: [
      'Clear, wolf check, fake-claim, table talk, hard push, peaceful night — same as Standard 12.',
      'Charm: good player marked by Wolf Beauty each night (wolves see it).',
      'Martyr: last charm target dies when Wolf Beauty dies by exile, duel, or poison.',
      'Guard block; guard-save clash: guarded + antidote same night may still die.',
    ],
  },
];

export const tutorialGuideUiWolfBeauty = {
  zh: { headerTitle: '新手教程 · 狼美人·骑士' },
  en: { headerTitle: 'Tutorial · Wolf Beauty · Knight' },
} as const;
