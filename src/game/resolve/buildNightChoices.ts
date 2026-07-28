import type { NightPlayerChoices } from '../../utils/nightResolver';
import { isWolfTeam, type RoomPlayer } from '../../utils/nightResolver';
import type { PendingNightRecord } from '../state/pendingNight';

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** Normalize pending night buffer → resolver input (Resolve step input). */
export function buildNightChoicesFromPending(
  players: readonly RoomPlayer[],
  pending: PendingNightRecord
): NightPlayerChoices {
  const alive = players.filter((p) => p.isAlive);
  const goodAlive = alive.filter((p) => !isWolfTeam(p.role));
  const wolfFallback =
    goodAlive.length > 0 ? pickRandom(goodAlive).id : alive[0]?.id ?? 'me';
  const wolfKillTargetId =
    pending.wolfKillTargetId && goodAlive.some((g) => g.id === pending.wolfKillTargetId)
      ? pending.wolfKillTargetId
      : wolfFallback;
  const seerPick =
    pending.seerInspectTargetId && alive.some((a) => a.id === pending.seerInspectTargetId)
      ? pending.seerInspectTargetId
      : alive.length > 0
        ? pickRandom(alive).id
        : null;

  return {
    wolfKillTargetId,
    witchUsesAntidote: pending.witchUsesAntidote,
    witchPoisonTargetId: pending.witchPoisonTargetId,
    seerInspectTargetId: seerPick,
    guardTargetId: pending.guardTargetId,
  };
}
