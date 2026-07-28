import type { GameBoardKind } from '../phaseConfig';

/** Day loop after dawn resolve (wolfcha: DAY_SPEECH → [KNIGHT_DUEL] → DAY_VOTE). */
export type DayLoopStep = 'DISCUSSION' | 'KNIGHT_DUEL' | 'VOTING';

export function dayLoopAfterDawn(board: GameBoardKind): readonly DayLoopStep[] {
  if (board === 'WolfBeauty') {
    return ['DISCUSSION', 'KNIGHT_DUEL', 'VOTING'];
  }
  return ['DISCUSSION', 'VOTING'];
}

export function nextDayLoopStep(
  board: GameBoardKind,
  current: DayLoopStep
): DayLoopStep | null {
  const order = dayLoopAfterDawn(board);
  const idx = order.indexOf(current);
  if (idx < 0 || idx >= order.length - 1) return null;
  return order[idx + 1] ?? null;
}
