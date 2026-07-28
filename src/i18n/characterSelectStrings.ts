import type { AppLanguage } from './appStrings';
import type { DifficultyType } from '../types';
import { playerCountForBoard } from '../constants/boardSetup';
import type { GameBoard } from '../types/game';

export const characterSelectCopy = {
  zh: {
    title: '选择 AI 陪练',
    /** 单人对局页顶栏副标题（参考图） */
    soloScreenSubtitle: '每一位 AI 都有自己的性格，去找到最合适的同伴吧',
    /** 底栏左侧：{count} 已选人数，{max} 目标人数，{left} 剩余要选 */
    footerLine: '{count}/{max} · 还需选择 {left} 人',
    startMatch: '开始对局',
    pickerFooterTip:
      '小贴士：不同的 AI 性格会带来不同的游戏体验，尝试多种组合，让每一局都充满新鲜感！',
    needAll: '须选满 {max} 人',
    randomA11y: '随机选满 {max} 人',
    novOnlyBanner: '教学练习：仅可选「新手」难度角色',
    boardLockedStandard: '板子：预女猎白（已锁定）',
    boardLockedBeauty: '板子：狼美人·骑士（已锁定）',
    /** 与创建房间「本局设置」侧栏一致 */
    settingsSection: '本局设置',
    difficultyHeading: 'AI 难度',
    difficultySub: '选择 AI 的思考水平和发言风格',
    difficultyNoNovice: '房间内不可选择新手难度。',
    boardHeading: '玩法板型',
    boardStandard: '预女猎白',
    boardWolfBeauty: '狼美人·骑士',
    boardSeerWitch6: '预女局',
    boardAvalon10: '阿瓦隆·王者之剑',
    boardLockedSeerWitch6: '板子：预女 6 人（已锁定）',
    boardLockedAvalon10: '板子：阿瓦隆·王者之剑（已锁定）',
    createRoomPickBanner: '创建房间：难度与板型已在房主页确定，此处仅选该难度下的 AI。',
    galleryTitleScreen: '角色图鉴',
    galleryHint: '浏览全部登场的 AI 角色，点击卡片查看角色详细信息。',
    galleryFilterLabel: '难度筛选',
    galleryFilterAll: '全部',
    gallerySpecializesPrefix: '擅长：',
    galleryFooterTip:
      '小贴士：不同角色拥有不同的性格与擅长领域，合理利用他们的特点将帮助你赢得更多胜利。',
    galleryClose: '关闭',
    galleryDifficulty: '难度',
    joinBanner: '已从房间号加入',
  },
  en: {
    title: 'Select AI players',
    soloScreenSubtitle: 'Every AI has a personality—find the crew that fits you.',
    footerLine: '{count}/{max} · {left} pick(s) left',
    startMatch: 'Start match',
    pickerFooterTip:
      'Tip: Different AI personalities change how each match feels—mix and match for a fresh table every time.',
    needAll: 'Pick all {max}',
    randomA11y: 'Random fill {max} players',
    novOnlyBanner: 'Tutorial: Novice difficulty only',
    boardLockedStandard: 'Board: Standard 12 (locked)',
    boardLockedBeauty: 'Board: Wolf Beauty · Guard · Knight (locked)',
    settingsSection: 'Round settings',
    difficultyHeading: 'AI difficulty',
    difficultySub: 'How sharp and chatty the AI plays.',
    difficultyNoNovice: 'Novice difficulty is not available in room games.',
    boardHeading: 'Board',
    boardStandard: 'Standard 12 · prophet / witch / hunter / fool',
    boardWolfBeauty: 'Wolf Beauty · Knight',
    boardSeerWitch6: 'Seer–Witch',
    boardAvalon10: 'Avalon',
    boardLockedSeerWitch6: 'Board: Seer–Witch 6P (locked)',
    boardLockedAvalon10: 'Board: Avalon (locked)',
    createRoomPickBanner:
      'Create room: difficulty and board were set by the host—pick AI from that difficulty pool.',
    galleryTitleScreen: 'Character gallery',
    galleryHint: 'Browse every AI character. Tap a card for full details.',
    galleryFilterLabel: 'Difficulty',
    galleryFilterAll: 'All',
    gallerySpecializesPrefix: 'Specialty: ',
    galleryFooterTip:
      'Tip: Each character has a different personality and strengths—use them wisely to win more often.',
    galleryClose: 'Close',
    galleryDifficulty: 'Difficulty',
    joinBanner: 'Joined with code',
  },
} as const;

const DIFF_LABEL: Record<AppLanguage, Record<DifficultyType, string>> = {
  zh: {
    Novice: '新手',
    Easy: '简单',
    Medium: '中等',
    Hard: '困难',
  },
  en: {
    Novice: 'Novice',
    Easy: 'Easy',
    Medium: 'Medium',
    Hard: 'Hard',
  },
};

export function difficultyTabLabel(lang: AppLanguage, diff: DifficultyType): string {
  return DIFF_LABEL[lang][diff];
}

const BOARD_LABEL_KEY: Record<
  GameBoard,
  'boardStandard' | 'boardWolfBeauty' | 'boardSeerWitch6' | 'boardAvalon10'
> = {
  Standard12: 'boardStandard',
  WolfBeauty: 'boardWolfBeauty',
  SeerWitch6: 'boardSeerWitch6',
  Avalon10: 'boardAvalon10',
};

/** 选人页玩法选项：名称 + 括号内人数 */
export function characterSelectBoardLabel(board: GameBoard, lang: AppLanguage): string {
  const name = characterSelectCopy[lang][BOARD_LABEL_KEY[board]];
  const n = playerCountForBoard(board);
  return lang === 'zh' ? `${name}（${n}人）` : `${name} (${n})`;
}
