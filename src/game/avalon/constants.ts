import type {
  AvalonQuestRule,
  AvalonRoleDefinition,
  AvalonRoleId,
} from './types';

export const AVALON_PLAYER_COUNT = 10;
export const AVALON_QUESTS_TO_WIN = 3;
export const AVALON_MAX_REJECTED_TEAMS = 5;

export const AVALON_10_PLAYER_ROLE_DECK: readonly AvalonRoleId[] = [
  'merlin',
  'percival',
  'loyal_servant',
  'loyal_servant',
  'loyal_servant',
  'loyal_servant',
  'assassin',
  'morgana',
  'mordred',
  'oberon',
];

export const AVALON_ROLE_DEFINITIONS: Readonly<Record<AvalonRoleId, AvalonRoleDefinition>> = {
  merlin: {
    id: 'merlin',
    faction: 'good',
    name: 'Merlin',
    nameZh: '梅林',
    summaryZh: '知道除莫德雷德外的邪恶阵营，但必须隐藏身份。',
    unique: true,
  },
  percival: {
    id: 'percival',
    faction: 'good',
    name: 'Percival',
    nameZh: '派西维尔',
    summaryZh: '看到梅林与莫甘娜，但无法分辨两人。',
    unique: true,
  },
  loyal_servant: {
    id: 'loyal_servant',
    faction: 'good',
    name: 'Loyal Servant of Arthur',
    nameZh: '亚瑟的忠臣',
    summaryZh: '没有额外初始信息，帮助好人完成任务。',
    unique: false,
  },
  assassin: {
    id: 'assassin',
    faction: 'evil',
    name: 'Assassin',
    nameZh: '刺客',
    summaryZh: '好人完成三个任务后，可刺杀梅林逆转胜负。',
    unique: true,
  },
  morgana: {
    id: 'morgana',
    faction: 'evil',
    name: 'Morgana',
    nameZh: '莫甘娜',
    summaryZh: '在派西维尔眼中伪装成梅林。',
    unique: true,
  },
  mordred: {
    id: 'mordred',
    faction: 'evil',
    name: 'Mordred',
    nameZh: '莫德雷德',
    summaryZh: '不会被梅林看到。',
    unique: true,
  },
  oberon: {
    id: 'oberon',
    faction: 'evil',
    name: 'Oberon',
    nameZh: '奥伯伦',
    summaryZh: '看不到其他邪恶角色，其他邪恶角色也看不到他。',
    unique: true,
  },
};

/** Standard 10-player Avalon team sizes and fail thresholds. */
export const AVALON_10_PLAYER_QUESTS: readonly AvalonQuestRule[] = [
  { questNumber: 1, teamSize: 3, failVotesRequired: 1 },
  { questNumber: 2, teamSize: 4, failVotesRequired: 1 },
  { questNumber: 3, teamSize: 4, failVotesRequired: 1 },
  { questNumber: 4, teamSize: 5, failVotesRequired: 2 },
  { questNumber: 5, teamSize: 5, failVotesRequired: 1 },
];

