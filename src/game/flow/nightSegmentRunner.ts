import type { GameBoardKind } from '../phaseConfig';
import { advanceNightSegmentPlan } from '../phaseFlow';
import type { NightSegmentId } from '../types';
import { isWolfTeam, type RoomPlayer, type WitchNightState } from '../../utils/nightResolver';

export type NightSegmentAdvancePlan =
  | { kind: 'next'; segment: NightSegmentId }
  | { kind: 'resolve' };

/** Segments to skip when role is dead / absent (e.g. no living Wolf Beauty). */
export function buildNightSegmentSkips(
  board: GameBoardKind,
  players: readonly RoomPlayer[]
): ReadonlySet<NightSegmentId> {
  const skip = new Set<NightSegmentId>();
  const alive = players.filter((p) => p.isAlive);
  if (board === 'Standard12' || board === 'SeerWitch6') {
    skip.add('guard');
    skip.add('wolf_beauty');
  } else if (board === 'WolfBeauty') {
    if (!alive.some((p) => p.role === 'WolfBeauty')) {
      skip.add('wolf_beauty');
    }
    if (!alive.some((p) => p.role === 'Guard')) {
      skip.add('guard');
    }
  }
  return skip;
}

/** After segment actions are recorded, compute next segment or dawn resolve. */
export function planAfterNightSegment(
  current: NightSegmentId,
  board: GameBoardKind,
  players: readonly RoomPlayer[]
): NightSegmentAdvancePlan {
  const skipSegments = buildNightSegmentSkips(board, players);
  const plan = advanceNightSegmentPlan(
    current,
    board,
    skipSegments.size > 0 ? { skipSegments } : undefined
  );
  if (plan.next) return { kind: 'next', segment: plan.next };
  if (plan.resolveNight) return { kind: 'resolve' };
  return { kind: 'resolve' };
}

/** Which night segment handler to run (wolfcha Action step). */
export type NightSegmentHandlerId = NightSegmentId;

export function nightSegmentHandlerFor(seg: NightSegmentId): NightSegmentHandlerId {
  return seg;
}

/** 女巫本夜是否还有可执行操作（解药或毒药至少一瓶未用）。 */
export function witchNightHasAction(witchState: WitchNightState): boolean {
  return witchState.hasAntidote || witchState.hasPoison;
}

/** Whether the human player must confirm before auto-advancing this segment. */
export function nightSegmentNeedsHumanInput(
  seg: NightSegmentId,
  me: RoomPlayer | undefined,
  witchState?: WitchNightState | null
): boolean {
  if (!me?.isAlive) return false;
  switch (seg) {
    case 'guard':
      return me.role === 'Guard';
    case 'wolves':
      return isWolfTeam(me.role);
    case 'wolf_beauty':
      return me.role === 'WolfBeauty';
    case 'witch':
      if (me.role !== 'Witch') return false;
      return witchState ? witchNightHasAction(witchState) : true;
    case 'seer':
      return me.role === 'Seer';
    default:
      return false;
  }
}

/** Timer duration seconds per segment. */
export function nightSegmentTimerSec(seg: NightSegmentId, completedDawns: number): number {
  if (seg === 'wolves') return completedDawns <= 0 ? 60 : 25;
  if (seg === 'guard') return 20;
  return 20;
}
