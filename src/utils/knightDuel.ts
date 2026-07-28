import type { AIBehaviorProfile } from '../data/aiBehaviorProfiles';
import type { AiSpeechSeatBrain } from './speechPrep';
import { isWolfTeam, type RoomPlayer } from './nightResolver';
import { deriveDecisionWeights } from './nightTargetStrategy';

export type KnightDuelDecision = {
  useSkill: boolean;
  targetId: string | null;
};

/** Fallback: bold knights duel highest-suspicion seat; cautious knights often pass. */
export function pickKnightDuelTarget(input: {
  knightId: string;
  profile: AIBehaviorProfile;
  brain: AiSpeechSeatBrain | null;
  pool: readonly RoomPlayer[];
  dayNumber: number;
}): KnightDuelDecision {
  const w = deriveDecisionWeights(input.profile);
  if (input.dayNumber <= 1 && w.carefulness > 0.45) {
    return { useSkill: false, targetId: null };
  }
  const passChance = w.carefulness * 0.55 + (1 - w.riskAppetite) * 0.25;
  if (Math.random() < passChance) {
    return { useSkill: false, targetId: null };
  }
  if (input.pool.length === 0) return { useSkill: false, targetId: null };

  const scoreOf = (p: RoomPlayer): number => {
    const susp = input.brain?.suspicion.scores[p.id] ?? 0;
    return susp * (0.7 + w.riskAppetite * 0.5) + w.loudness * 10;
  };

  const sorted = [...input.pool].sort((a, b) => scoreOf(b) - scoreOf(a));
  const top = sorted[0]!;
  return { useSkill: true, targetId: top.id };
}

export type KnightDuelOutcome = {
  players: RoomPlayer[];
  knightDied: boolean;
  targetDied: boolean;
  knightId: string;
  targetId: string;
};

/** Resolve duel: wolf target dies / good target survives and knight dies. */
export function resolveKnightDuel(
  players: readonly RoomPlayer[],
  knightId: string,
  targetId: string
): KnightDuelOutcome {
  const knight = players.find((p) => p.id === knightId);
  const target = players.find((p) => p.id === targetId);
  if (!knight || !target || !knight.isAlive || !target.isAlive) {
    return {
      players: [...players],
      knightDied: false,
      targetDied: false,
      knightId,
      targetId,
    };
  }

  const targetIsWolf = isWolfTeam(target.role);
  let next = players.map((p) => ({ ...p }));

  if (targetIsWolf) {
    next = next.map((p) =>
      p.id === targetId ? { ...p, isAlive: false, outReason: 'knight_duel' as const } : p
    );
    next = next.map((p) => (p.id === knightId ? { ...p, knightDuelUsed: true } : p));
    return { players: next, knightDied: false, targetDied: true, knightId, targetId };
  }

  next = next.map((p) =>
    p.id === knightId ? { ...p, isAlive: false, outReason: 'knight_duel' as const, knightDuelUsed: true } : p
  );
  return { players: next, knightDied: true, targetDied: false, knightId, targetId };
}
