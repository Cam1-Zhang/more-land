import type { StandardNightOutcome } from '../../utils/nightResolver';
import type {
  NightDeathCause,
  PlayerOutReason,
  RoomPlayer,
} from '../../utils/nightResolver';

export type DawnMergeResult = {
  players: RoomPlayer[];
  diedTonight: RoomPlayer[];
  outcome: StandardNightOutcome;
};

/** Merge resolver output with preserved player metadata (Resolve step). */
export function mergeStandardNightOutcome(
  prevPlayers: readonly RoomPlayer[],
  outcome: StandardNightOutcome
): DawnMergeResult {
  const prevSnap = prevPlayers.map((p) => ({ ...p }));

  const merged = outcome.players.map((p) => {
    const prev = prevPlayers.find((x) => x.id === p.id);
    let outReason: PlayerOutReason | undefined = prev?.outReason;
    if (prev?.isAlive && !p.isAlive) {
      const d = outcome.deathDetails.find((x) => x.id === p.id);
      outReason = nightDeathCauseToOutReason(d?.cause);
    }
    return {
      ...p,
      idiotFlipUsed: prev?.idiotFlipUsed,
      canVote: prev ? prev.canVote !== false : true,
      cannotUseHunterGun: prev?.cannotUseHunterGun === true,
      charmedByWolfBeautyId: p.isAlive
        ? (p.charmedByWolfBeautyId ?? prev?.charmedByWolfBeautyId)
        : undefined,
      outReason,
    };
  });

  const diedTonight = merged.filter((p) => {
    const was = prevSnap.find((x) => x.id === p.id);
    return was?.isAlive && !p.isAlive;
  });

  return { players: merged, diedTonight, outcome };
}

function nightDeathCauseToOutReason(cause: NightDeathCause | undefined): PlayerOutReason | undefined {
  if (cause === 'wolf') return 'wolf_night';
  if (cause === 'poison') return 'poison_night';
  if (cause === 'both') return 'both_night';
  return undefined;
}

/** First-night wolf-only deaths eligible for last words (before hunter branch). */
export function firstNightWolfLastWordCandidates(
  diedTonight: readonly RoomPlayer[],
  deathDetails: StandardNightOutcome['deathDetails'],
  nightNumber: number
): RoomPlayer[] {
  return diedTonight.filter((p) => {
    const d = deathDetails.find((x) => x.id === p.id)?.cause;
    if (d === 'poison' || d === 'both') return false;
    if (d !== 'wolf') return false;
    if (nightNumber !== 1) return false;
    if (p.role === 'Hunter') return false;
    return true;
  });
}

/** Hunter killed by wolf only at night (may shoot). */
export function hunterKilledByWolfTonight(
  diedTonight: readonly RoomPlayer[],
  deathDetails: StandardNightOutcome['deathDetails']
): RoomPlayer | undefined {
  return diedTonight.find(
    (p) =>
      p.role === 'Hunter' &&
      deathDetails.some((d) => d.id === p.id && d.cause === 'wolf') &&
      !p.cannotUseHunterGun
  );
}
