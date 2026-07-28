import type { AppLanguage } from './appStrings';
import type { RoleCardImageKey } from '../constants/roleCardImages';

export const gameEpilogueCardUi = {
  zh: {
    title: '本局结算',
    bannerGood: '好人阵营获胜',
    bannerWolf: '狼人阵营获胜',
    outcomeWin: '胜利',
    outcomeLose: '失败',
    continue: '知道了',
  },
  en: {
    title: 'Match result',
    bannerGood: 'The good team wins',
    bannerWolf: 'The werewolf team wins',
    outcomeWin: 'Victory',
    outcomeLose: 'Defeat',
    continue: 'OK',
  },
} as const;

function wolfFaction(role: string): boolean {
  return role === 'Werewolf' || role === 'WolfBeauty';
}

/** 是否与当前全局胜负结果同属「获胜方」 */
export function playerSideWon(winner: 'good' | 'wolf', role: string): boolean {
  if (winner === 'wolf') return wolfFaction(role);
  return !wolfFaction(role);
}

const LINES_ZH: Record<RoleCardImageKey, { win: string; lose: string }> = {
  Seer: {
    win: '真相大白，黑暗无处遁形',
    lose: '长夜漫漫，未能守护白昼',
  },
  Witch: {
    win: '药剂已定，守护世间安宁',
    lose: '药石难救，黎明终究缺席',
  },
  Hunter: {
    win: '胆敢冒犯，必付代价',
    lose: '无力挽局，遗憾落幕',
  },
  Idiot: {
    win: '糊涂一世，反倒保全大局',
    lose: '世事混沌，终难逃过黑夜',
  },
  Guard: {
    win: '坚守防线，护住人间光明',
    lose: '彻夜守护，仍难抵挡黑暗',
  },
  Villager: {
    win: '齐心协力，终迎曙光',
    lose: '人心涣散，沦陷于黑夜',
  },
  Knight: {
    win: '长剑所指，谎言退散',
    lose: '荣光陨落，未能守到天明',
  },
  Werewolf: {
    win: '夜幕降临，统治全场',
    lose: '阴谋败露，坠入深渊',
  },
  WolfBeauty: {
    win: '魅惑众生，无人能逃',
    lose: '情深缘浅，终被破晓终结',
  },
  Merlin: { win: '智慧守住了最后的王国', lose: '真名暴露，王国陷入阴影' },
  Percival: { win: '忠诚辨清了真正的先知', lose: '迷雾遮蔽了圣杯之路' },
  LoyalServant: { win: '无名忠诚铸成了王国胜利', lose: '圆桌失守，誓言未竟' },
  Assassin: { win: '最后一击改写了王国命运', lose: '刀锋落空，黎明已至' },
  Morgana: { win: '幻象骗过了整张圆桌', lose: '伪装终于被忠诚识破' },
  Mordred: { win: '阴影吞没了亚瑟的王座', lose: '野心止步于王者之剑' },
  Oberon: { win: '孤影也让王国走向覆灭', lose: '迷雾散尽，孤王退场' },
};

const LINES_EN: Record<RoleCardImageKey, { win: string; lose: string }> = {
  Seer: {
    win: 'Truth prevails—nowhere left for darkness to hide.',
    lose: 'The long night won—you could not guard the day.',
  },
  Witch: {
    win: 'Potions settled—peace holds steady.',
    lose: 'No draught could save the dawn from staying away.',
  },
  Hunter: {
    win: 'Cross us and pay the price.',
    lose: 'No shot could turn the tide—only regret remains.',
  },
  Idiot: {
    win: 'Fool all along—yet the town still stands.',
    lose: 'Chaos wins—the night took everything.',
  },
  Guard: {
    win: 'The line held—light stays on watch.',
    lose: 'You guarded all night—darkness still broke through.',
  },
  Villager: {
    win: 'Together you walked into daylight.',
    lose: 'Trust fractured—the town fell to the night.',
  },
  Knight: {
    win: 'Steel points the way—lies scatter before you.',
    lose: 'The blade could not hold—dawn stayed out of reach.',
  },
  Werewolf: {
    win: 'Night falls—you rule the table.',
    lose: 'The pack is undone—you vanish into dawn.',
  },
  WolfBeauty: {
    win: 'No heart escapes your charm.',
    lose: 'The spell is broken with the sunrise.',
  },
  Merlin: { win: 'Wisdom kept the kingdom standing.', lose: 'Your true name fell into shadow.' },
  Percival: { win: 'Loyalty found the true seer.', lose: 'The Grail path vanished in the mist.' },
  LoyalServant: { win: 'Quiet loyalty carried the kingdom.', lose: 'The Round Table fell before the oath was fulfilled.' },
  Assassin: { win: 'One final strike rewrote the kingdom.', lose: 'The blade missed and dawn arrived.' },
  Morgana: { win: 'Your illusion fooled the Round Table.', lose: 'Loyal eyes finally broke the disguise.' },
  Mordred: { win: 'Shadow swallowed Arthur\'s throne.', lose: 'Ambition broke against the king\'s sword.' },
  Oberon: { win: 'Even alone, you brought the kingdom down.', lose: 'The mist cleared and the lone king withdrew.' },
};

const ROLE_KEYS: RoleCardImageKey[] = [
  'Werewolf',
  'Seer',
  'Witch',
  'Guard',
  'Hunter',
  'Villager',
  'Knight',
  'Idiot',
  'WolfBeauty',
];

export function normalizeEpilogueRole(role: string): RoleCardImageKey {
  if (ROLE_KEYS.includes(role as RoleCardImageKey)) return role as RoleCardImageKey;
  return 'Villager';
}

export function epilogueQuoteForRole(
  lang: AppLanguage,
  roleKey: RoleCardImageKey,
  didWin: boolean
): string {
  const pack = (lang === 'zh' ? LINES_ZH : LINES_EN)[roleKey];
  return didWin ? pack.win : pack.lose;
}
