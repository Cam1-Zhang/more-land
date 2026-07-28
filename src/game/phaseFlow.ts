import type { GameBoardKind } from './phaseConfig';
import { nextNightSegment, nightSegmentAnnounceKey, nightSegmentCloseKey } from './phaseConfig';
import type { AppLanguage } from '../i18n/appStrings';
import { gameCopy } from '../i18n/appStrings';
import type { NarratorKind, NarratorLine, NarratorVisibility } from './info/narrator';
import type { NightActionsRecord, NightSegmentId, WolfchaGameState } from './types';
import { createInitialWolfchaGameState, nightActionsFromPending } from './types';

export type { NightSegmentId, GameBoardKind };
export { nextNightSegment, nightSegmentAnnounceKey, nightSegmentsForBoard, firstNightSegmentForBoard, nightSegmentHasOpenCloseBroadcast, PHASE_CONFIG } from './phaseConfig';
export {
  createInitialWolfchaGameState,
  nightActionsFromPending,
  pendingFromNightActions,
  type WolfchaGameState,
  type NightActionsRecord,
} from './types';

/** Announcement log line when transitioning into `segment`. */
export function announceNightSegment(segment: NightSegmentId, lang: AppLanguage, firstNight = false): string {
  const g = gameCopy[lang];
  if (segment === 'wolves' && firstNight) return g.nightPhaseWolvesFirst;
  const key = nightSegmentAnnounceKey(segment);
  return g[key];
}

/** Announcement when leaving `segment` after decisions are locked in. */
export function announceNightSegmentClose(segment: NightSegmentId, lang: AppLanguage): string {
  const g = gameCopy[lang];
  return g[nightSegmentCloseKey(segment)];
}

export function nightSegmentVisibility(segment: NightSegmentId): NarratorVisibility {
  switch (segment) {
    case 'guard':
      return 'guard';
    case 'wolves':
    case 'wolf_beauty':
      return 'wolf_team';
    case 'witch':
      return 'witch';
    case 'seer':
      return 'seer';
    default:
      return 'public';
  }
}

function nightSegmentNarratorKind(segment: NightSegmentId): NarratorKind {
  switch (segment) {
    case 'guard':
      return 'NIGHT_GUARD_ACTION';
    case 'wolves':
      return 'NIGHT_WOLF_ACTION';
    case 'wolf_beauty':
      return 'NIGHT_WOLF_BEAUTY_CHARM';
    case 'witch':
      return 'NIGHT_WITCH_ACTION';
    case 'seer':
      return 'NIGHT_SEER_ACTION';
    default:
      return 'NIGHT_START';
  }
}

/** 带可见性分级的夜段旁白（人类 UI 与 AI 共用）。 */
export function announceNightSegmentLine(
  segment: NightSegmentId,
  firstNight = false
): NarratorLine {
  const visibility = nightSegmentVisibility(segment);
  const kind = nightSegmentNarratorKind(segment);
  const zh = announceNightSegment(segment, 'zh', firstNight);
  const en = announceNightSegment(segment, 'en', firstNight);
  return { zh, en, visibility, kind };
}

/** 夜段决策完成后的「请闭眼」旁白。 */
export function announceNightSegmentCloseLine(segment: NightSegmentId): NarratorLine {
  const visibility = nightSegmentVisibility(segment);
  const kind = nightSegmentNarratorKind(segment);
  const zh = announceNightSegmentClose(segment, 'zh');
  const en = announceNightSegmentClose(segment, 'en');
  return { zh, en, visibility, kind };
}

/** After completing `current` segment, which segment comes next (null = resolve night). */
export function advanceNightSegmentPlan(
  current: NightSegmentId,
  board: GameBoardKind,
  opts?: { skipSegments?: ReadonlySet<NightSegmentId> }
): { next: NightSegmentId | null; resolveNight: boolean } {
  const next = nextNightSegment(current, board, opts);
  if (next) return { next, resolveNight: false };
  return { next: null, resolveNight: true };
}

/** Patch wolfcha state nightActions from GameRoom pending-night snapshot. */
export function syncNightActions(
  state: WolfchaGameState,
  pending: Parameters<typeof nightActionsFromPending>[0]
): WolfchaGameState {
  return {
    ...state,
    nightActions: nightActionsFromPending(pending),
  };
}

export function createFreshWolfchaState(): WolfchaGameState {
  return createInitialWolfchaGameState();
}
