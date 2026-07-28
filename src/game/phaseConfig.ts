/**
 * Phase configuration table — wolfcha-style metadata + night segment order.
 */
import type { AppLanguage } from '../i18n/appStrings';
import type { NightSegmentId, PhaseActionType } from './types';

export type GameBoardKind = 'Standard12' | 'WolfBeauty' | 'SeerWitch6';

export type PhaseConfigEntry = {
  id: string;
  description: { zh: string; en: string };
  actionType: PhaseActionType;
  nightSegment?: NightSegmentId;
  requiresHumanInput?: boolean;
};

export const PHASE_CONFIG: Record<string, PhaseConfigEntry> = {
  NIGHT_GUARD_ACTION: {
    id: 'NIGHT_GUARD_ACTION',
    description: { zh: '守卫行动阶段', en: 'Guard protect phase' },
    actionType: 'night_action',
    nightSegment: 'guard',
    requiresHumanInput: true,
  },
  NIGHT_WOLF_ACTION: {
    id: 'NIGHT_WOLF_ACTION',
    description: { zh: '狼人行动阶段', en: 'Wolf pack kill phase' },
    actionType: 'night_action',
    nightSegment: 'wolves',
    requiresHumanInput: true,
  },
  NIGHT_WOLF_BEAUTY_CHARM: {
    id: 'NIGHT_WOLF_BEAUTY_CHARM',
    description: { zh: '狼美人魅惑阶段', en: 'Wolf Beauty charm phase' },
    actionType: 'night_action',
    nightSegment: 'wolf_beauty',
    requiresHumanInput: true,
  },
  NIGHT_WITCH_ACTION: {
    id: 'NIGHT_WITCH_ACTION',
    description: { zh: '女巫行动阶段', en: 'Witch potion phase' },
    actionType: 'special',
    nightSegment: 'witch',
    requiresHumanInput: true,
  },
  NIGHT_SEER_ACTION: {
    id: 'NIGHT_SEER_ACTION',
    description: { zh: '预言家查验阶段', en: 'Seer check phase' },
    actionType: 'night_action',
    nightSegment: 'seer',
    requiresHumanInput: true,
  },
  DAY_SPEECH: {
    id: 'DAY_SPEECH',
    description: { zh: '白天发言阶段', en: 'Day discussion' },
    actionType: 'speech',
  },
  KNIGHT_DUEL: {
    id: 'KNIGHT_DUEL',
    description: { zh: '骑士决斗阶段', en: 'Knight duel phase' },
    actionType: 'special',
  },
  DAY_VOTE: {
    id: 'DAY_VOTE',
    description: { zh: '白天投票阶段', en: 'Day exile vote' },
    actionType: 'vote',
  },
  HUNTER_SHOOT: {
    id: 'HUNTER_SHOOT',
    description: { zh: '猎人开枪', en: 'Hunter shot' },
    actionType: 'special',
  },
  IDIOT_REVEAL: {
    id: 'IDIOT_REVEAL',
    description: { zh: '白痴翻牌', en: 'Idiot reveal' },
    actionType: 'special',
  },
};

/** 统一夜段顺序：狼 →（狼美人·无语音）→ 守卫 → 预言家 → 女巫 */
export const CANONICAL_NIGHT_SEGMENTS: readonly NightSegmentId[] = [
  'wolves',
  'wolf_beauty',
  'guard',
  'seer',
  'witch',
];

/** @deprecated 与 CANONICAL_NIGHT_SEGMENTS 相同，保留别名 */
export const STANDARD_NIGHT_SEGMENTS = CANONICAL_NIGHT_SEGMENTS;

/** @deprecated 与 CANONICAL_NIGHT_SEGMENTS 相同，保留别名 */
export const WOLF_BEAUTY_NIGHT_SEGMENTS = CANONICAL_NIGHT_SEGMENTS;

export function firstNightSegmentForBoard(_board: GameBoardKind): NightSegmentId {
  return 'wolves';
}

export function nightSegmentsForBoard(board: GameBoardKind): readonly NightSegmentId[] {
  if (board === 'SeerWitch6') {
    return ['wolves', 'seer', 'witch'];
  }
  return CANONICAL_NIGHT_SEGMENTS;
}

/** 是否播报「请睁眼 / 请闭眼」（狼美人语音待补） */
export function nightSegmentHasOpenCloseBroadcast(seg: NightSegmentId): boolean {
  return seg !== 'wolf_beauty';
}

export function nextNightSegment(
  current: NightSegmentId,
  board: GameBoardKind,
  opts?: { skipSegments?: ReadonlySet<NightSegmentId> }
): NightSegmentId | null {
  const order = nightSegmentsForBoard(board);
  const idx = order.indexOf(current);
  if (idx < 0) return null;
  for (let i = idx + 1; i < order.length; i++) {
    const seg = order[i]!;
    if (opts?.skipSegments?.has(seg)) continue;
    return seg;
  }
  return null;
}

export function nightSegmentAnnounceKey(
  seg: NightSegmentId
): keyof typeof import('../i18n/appStrings').gameCopy.zh {
  switch (seg) {
    case 'guard':
      return 'nightPhaseGuard';
    case 'wolves':
      return 'nightPhaseWolvesLater';
    case 'wolf_beauty':
      return 'nightPhaseWolfBeautyCharm';
    case 'witch':
      return 'nightPhaseWitch';
    case 'seer':
      return 'nightPhaseSeer';
    default:
      return 'nightPhaseWolvesLater';
  }
}

export function nightSegmentCloseKey(
  seg: NightSegmentId
): keyof typeof import('../i18n/appStrings').gameCopy.zh {
  switch (seg) {
    case 'guard':
      return 'nightPhaseGuardClose';
    case 'wolves':
      return 'nightPhaseWolvesClose';
    case 'wolf_beauty':
      return 'nightPhaseWolfBeautyClose';
    case 'witch':
      return 'nightPhaseWitchClose';
    case 'seer':
      return 'nightPhaseSeerClose';
    default:
      return 'nightPhaseWolvesClose';
  }
}

export function phaseDescription(entryId: keyof typeof PHASE_CONFIG, lang: AppLanguage): string {
  const e = PHASE_CONFIG[entryId];
  return lang === 'zh' ? e.description.zh : e.description.en;
}
