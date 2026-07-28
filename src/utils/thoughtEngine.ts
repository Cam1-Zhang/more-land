/**
 * Internal AI thought layer: runs before speech / dialogue.
 * Deterministic, state-driven, personality-aware — no GPT.
 */
import type { AICharacter } from '../types';
import type { AIBehaviorProfile } from '../data/aiBehaviorProfiles';
import { getAIBehaviorProfile } from '../data/aiBehaviorProfiles';
import { shouldAugmentStructuralReasoning } from './personaDifficultyPriority';
import {
  type SuspicionState,
  type SuspicionObserverContext,
  buildSuspicionContext,
  calculateThreatLevel,
  getMostSuspiciousTarget,
} from './suspicionEngine';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Stable 0..1 noise from strings (break ties for chaotic personas without RNG). */
export function deterministicJitter(parts: readonly string[]): number {
  const s = parts.join('|');
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 2 ** 32;
}

export type ThoughtEmotion =
  | 'calm'
  | 'focused'
  | 'angry'
  | 'anxious'
  | 'cold'
  | 'restless'
  | 'dominant'
  | 'suspicious';

export type VotePrediction = {
  /** Who currently collects the most suspicion-driven “votes” in the toy model. */
  leadingTargetId: string | null;
  /** Simulated tally: voterId -> voteTargetId (each alive voter picks worst-looking other). */
  ballot: Record<string, string>;
  /** 0–100 confidence in `leadingTargetId` winning a plurality this phase. */
  confidence: number;
  /** Hard-only: one-line forward simulation notes (deterministic). */
  forwardNotes: string[];
};

export type InternalThoughtSnapshot = {
  target: string;
  targetId: string;
  confidence: number;
  emotion: ThoughtEmotion;
  reasons: string[];
  predictedAllies: string[];
  dangerLevel: number;
  survivalPriority: number;
  allianceRisk: number;
  socialPressure: number;
  manipulationAwareness: string[];
  votePrediction: VotePrediction;
  /** Hard: extra multi-step lines (still non-dialogue). */
  reasoningChainDetailed: string[];
  /** Heuristic tags from public signals only (no oracle roles). */
  roleHeuristicByPlayerId: Record<string, 'unknown' | 'lean_town' | 'lean_wolf'>;
};

export type ThoughtEnginePlayer = {
  id: string;
  name: string;
};

export type ThoughtEngineContext = {
  observerId: string;
  observerCharacter: AICharacter;
  alivePlayers: readonly ThoughtEnginePlayer[];
  suspicionState: SuspicionState;
  /** Monotonic counter so chaotic jitter can shift without RNG device. */
  thoughtTick: number;
  /**
   * When false, speech/thought must not treat per-seat daytime exile ballots as table-known
   * (no co-vote ally hints, etc.). Night wolf knife coordination is unchanged elsewhere.
   */
  dayExileVotesPublic?: boolean;
  /** Optional: who each alive player voted for last phase (for pressure / pivot notes). */
  lastVoteByVoter?: Record<string, string>;
  /** Last tick's primary read target id (same observer) — cautious pivot resistance. */
  priorThoughtPrimaryId?: string | null;
  /** Consecutive ticks the observer kept the same primary read (commitment inertia). */
  readCommitmentTicks?: number;
};

function playerMap(ctx: ThoughtEngineContext): Map<string, ThoughtEnginePlayer> {
  return new Map(ctx.alivePlayers.map((p) => [p.id, p]));
}

/** When daytime exile ballots are secret, alliance pressure must not read co-vote matrix fed by hidden ballots. */
function thoughtCtxForPublicAllianceReads(ctx: ThoughtEngineContext): ThoughtEngineContext {
  if (ctx.dayExileVotesPublic !== false) return ctx;
  return {
    ...ctx,
    suspicionState: {
      ...ctx.suspicionState,
      coVoteSameTarget: {},
    },
  };
}

function displayName(ctx: ThoughtEngineContext, id: string): string {
  return playerMap(ctx).get(id)?.name ?? id;
}

/** Per-seat snapshot for internal ranking (not spoken aloud). */
export type PlayerThoughtEvaluation = {
  playerId: string;
  displayName: string;
  suspicion: number;
  threatToObserver: number;
  weightedPrimaryScore: number;
  allianceRelevant: boolean;
  notes: string[];
};

/**
 * Score every alive player (except optional exclusions) for dashboards / debugging.
 */
export function evaluatePlayers(
  ctx: ThoughtEngineContext,
  suspicionCtx: SuspicionObserverContext,
  opts?: { excludeIds?: readonly string[] }
): PlayerThoughtEvaluation[] {
  const ex = new Set(opts?.excludeIds ?? []);
  const profile = suspicionCtx.profile;
  const state = ctx.suspicionState;
  const out: PlayerThoughtEvaluation[] = [];

  for (const p of ctx.alivePlayers) {
    if (p.id === ctx.observerId || ex.has(p.id)) continue;
    const suspicion = state.scores[p.id] ?? 0;
    const threatToObserver = calculateThreatLevel(p.id, state, suspicionCtx);
    const flips = state.accusationFlipCount[p.id] ?? 0;
    const blinds = state.blindFollowCount[p.id] ?? 0;
    const defends = state.defendTally[p.id];
    const defendTotal = defends ? Object.values(defends).reduce((a, b) => a + b, 0) : 0;

    let w =
      suspicion * (0.85 + profile.logic / 400) +
      threatToObserver * (profile.aggression / 220) +
      flips * (2 + profile.logic / 50) +
      blinds * (1.2 + profile.leadership / 120) +
      defendTotal * (profile.deception / 200);

    if (profile.randomness > 70) {
      w += deterministicJitter([ctx.observerId, p.id, String(ctx.thoughtTick), 'w']) * profile.randomness * 0.08;
    }

    const notes: string[] = [];
    if (flips >= 2) notes.push('vote_or_accusation_shifts');
    if (blinds >= 2) notes.push('bandwagon_pattern');
    if (defendTotal >= 2) notes.push('repeated_defense_links');

    let allianceRelevant = false;
    const row = state.coVoteSameTarget[p.id];
    if (row) {
      for (const [other, c] of Object.entries(row)) {
        if (c >= 2 && other !== ctx.observerId) {
          allianceRelevant = true;
          notes.push(`co_vote_block:${other}`);
          break;
        }
      }
    }

    out.push({
      playerId: p.id,
      displayName: p.name,
      suspicion,
      threatToObserver,
      weightedPrimaryScore: w,
      allianceRelevant,
      notes,
    });
  }

  out.sort((a, b) => b.weightedPrimaryScore - a.weightedPrimaryScore || a.playerId.localeCompare(b.playerId));
  return out;
}

/**
 * Pick who this AI “primary pushes” this tick — personality-weighted, not raw argmax suspicion.
 * Cautious seats: inertia on prior primary + hard pivot threshold (soft drift / commitment).
 */
export function choosePrimarySuspect(
  ctx: ThoughtEngineContext,
  suspicionCtx: SuspicionObserverContext
): string | null {
  const evals = evaluatePlayers(ctx, suspicionCtx);
  if (evals.length === 0) return null;

  const profile = suspicionCtx.profile;
  const state = ctx.suspicionState;
  const priorId = ctx.priorThoughtPrimaryId ?? null;
  const commitTicks = Math.max(0, ctx.readCommitmentTicks ?? 0);

  type Row = PlayerThoughtEvaluation & { eff: number };
  const rows: Row[] = evals.map((e) => ({ ...e, eff: e.weightedPrimaryScore }));

  if (priorId && profile.caution >= 55) {
    const inertia =
      (profile.caution / 100) * (11 + profile.voteChangeResistance * 0.11) + Math.min(18, commitTicks * 0.82);
    for (const r of rows) {
      if (r.playerId === priorId) r.eff += inertia;
    }
  }

  rows.sort((a, b) => b.eff - a.eff || a.playerId.localeCompare(b.playerId));
  const top = rows[0]!;

  const alive = new Set(ctx.alivePlayers.map((p) => p.id));
  let chosenId = top.playerId;

  if (priorId && profile.caution >= 55 && alive.has(priorId) && top.playerId !== priorId) {
    const priorRow = rows.find((r) => r.playerId === priorId);
    if (priorRow) {
      const gapNeed =
        5.2 +
        profile.caution * 0.1 +
        profile.voteChangeResistance * 0.068 +
        Math.min(17, commitTicks * 0.62);
      const flipHot =
        (state.accusationFlipCount[top.playerId] ?? 0) >= 3 ||
        (state.accusationFlipCount[priorId] ?? 0) >= 4;
      const heatHot = top.suspicion >= 76;
      if (top.eff - priorRow.eff < gapNeed && !flipHot && !heatHot) {
        chosenId = priorId;
      }
    }
  }

  // Fearful / survival-heavy personas may pivot to #2 if top is extremely threatening (avoid poking bear).
  if (profile.survivalInstinct > 82 && profile.aggression < 35 && evals.length >= 2) {
    const fearTop = evals[0]!;
    const fearSecond = evals[1]!;
    if (
      chosenId === fearTop.playerId &&
      fearTop.threatToObserver >= 88 &&
      fearSecond.threatToObserver + 15 < fearTop.threatToObserver
    ) {
      return fearSecond.playerId;
    }
  }

  return chosenId;
}

/**
 * Human-readable reasoning lines (still internal; caller may filter for prompts).
 */
export function generateReasoningChain(
  primaryId: string,
  ctx: ThoughtEngineContext,
  suspicionCtx: SuspicionObserverContext
): string[] {
  const state = ctx.suspicionState;
  const profile = suspicionCtx.profile;
  const ballotPublic = ctx.dayExileVotesPublic !== false;
  const reasons: string[] = [];
  const s = state.scores[primaryId] ?? 0;
  if (s >= 70) reasons.push('very_high_suspicion_score');
  else if (s >= 45) reasons.push('elevated_suspicion_score');
  else if (s > 0) reasons.push('nonzero_suspicion_signal');

  const flips = state.accusationFlipCount[primaryId] ?? 0;
  if (ballotPublic && flips >= 1) reasons.push('changed_vote_or_accusation_line');
  const blinds = state.blindFollowCount[primaryId] ?? 0;
  if (ballotPublic && blinds >= 1) reasons.push('followed_majority_blindly');
  const defRow = state.defendTally[primaryId];
  if (defRow && Object.keys(defRow).length > 0) reasons.push('defended_others_linked_to_hot_seats');

  if (ballotPublic && profile.logic > 70 && (flips >= 2 || blinds >= 2)) reasons.push('logic_weighted_inconsistency_pattern');
  if (ballotPublic && profile.leadership > 75 && blinds >= 2) reasons.push('leadership_weighted_passive_bandwagon');
  if (profile.deception > 75 && defRow) reasons.push('manipulation_read_defense_network');

  return reasons.length > 0 ? reasons : ['insufficient_structural_signals'];
}

/** 0–100: how dangerous coordinated voting around the primary suspect feels. */
export function estimateAllianceRisk(
  primaryId: string,
  ctx: ThoughtEngineContext,
  suspicionCtx: SuspicionObserverContext
): number {
  const state = ctx.suspicionState;
  const row = state.coVoteSameTarget[primaryId];
  if (!row) return 0;
  let maxSync = 0;
  let weighted = 0;
  for (const [other, c] of Object.entries(row)) {
    if (other === ctx.observerId) continue;
    maxSync = Math.max(maxSync, c);
    const so = state.scores[other] ?? 0;
    weighted += c * (10 + so / 10);
  }
  let risk = clamp(maxSync * 14 + weighted * 0.35, 0, 100);
  if (shouldAugmentStructuralReasoning(suspicionCtx.profile, suspicionCtx.observerCharacter.difficulty)) {
    risk = clamp(risk * (1 + suspicionCtx.profile.reasoningDepth / 80), 0, 100);
  }
  return Math.round(risk);
}

/**
 * Toy plurality: each voter (except observer) picks highest-suspicion other alive seat.
 * Hard: second-round note if top two are within margin (social collapse / pivot).
 */
export function predictVoteOutcome(
  ctx: ThoughtEngineContext,
  suspicionCtx: SuspicionObserverContext,
  primarySuspectId: string | null
): VotePrediction {
  const state = ctx.suspicionState;
  const ballot: Record<string, string> = {};
  const tally: Record<string, number> = {};

  const voters = ctx.alivePlayers.filter((p) => p.id !== ctx.observerId);
  for (const v of voters) {
    let best: string | null = null;
    let bestSc = -1;
    const others = ctx.alivePlayers.filter((p) => p.id !== v.id);
    for (const o of others) {
      const sc = state.scores[o.id] ?? 0;
      const jitter =
        suspicionCtx.profile.randomness > 60
          ? deterministicJitter([v.id, o.id, String(ctx.thoughtTick), 'vote']) *
            suspicionCtx.profile.randomness *
            0.06
          : 0;
      const adj = sc + jitter;
      if (adj > bestSc || (adj === bestSc && (best === null || o.id.localeCompare(best) < 0))) {
        bestSc = adj;
        best = o.id;
      }
    }
    if (best) {
      ballot[v.id] = best;
      tally[best] = (tally[best] ?? 0) + 1;
    }
  }

  let leading: string | null = null;
  let leadVotes = -1;
  for (const [id, c] of Object.entries(tally)) {
    if (c > leadVotes || (c === leadVotes && (leading === null || id.localeCompare(leading) < 0))) {
      leadVotes = c;
      leading = id;
    }
  }

  const secondEntry = Object.entries(tally).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const second = secondEntry.length >= 2 ? secondEntry[1]![0] : null;
  const margin = second && leadVotes >= 0 ? leadVotes - (tally[second] ?? 0) : leadVotes;

  let confidence = clamp(Math.round((leadVotes / Math.max(1, voters.length)) * 100 + margin * 8), 0, 100);
  if (primarySuspectId && leading === primarySuspectId) confidence = clamp(confidence + 12, 0, 100);

  const forwardNotes: string[] = [];
  if (shouldAugmentStructuralReasoning(suspicionCtx.profile, suspicionCtx.observerCharacter.difficulty)) {
    if (second && margin <= 1) forwardNotes.push('pivot_risk:top_two_nearly_tied_next_phase');
    if (suspicionCtx.profile.reasoningDepth >= 6) {
      forwardNotes.push('simulated_plurality_one_step:no_night_kills_in_model');
    }
    if (suspicionCtx.profile.memoryDepth >= 15) {
      forwardNotes.push('group_psychology:bandwagon_amplifies_if_lead_speaks_first');
    }
  }

  return {
    leadingTargetId: leading,
    ballot,
    confidence,
    forwardNotes,
  };
}

/** 0–100: how hard this AI prioritizes staying alive / avoiding exile this turn. */
export function calculateSelfPreservationPriority(
  ctx: ThoughtEngineContext,
  suspicionCtx: SuspicionObserverContext
): number {
  const profile = suspicionCtx.profile;
  const state = ctx.suspicionState;
  let maxThreat = 0;
  for (const p of ctx.alivePlayers) {
    if (p.id === ctx.observerId) continue;
    maxThreat = Math.max(maxThreat, calculateThreatLevel(p.id, state, suspicionCtx));
  }
  const selfSuspicion = state.scores[ctx.observerId] ?? 0;
  const base =
    profile.survivalInstinct * 0.42 +
    profile.caution * 0.28 +
    maxThreat * 0.22 +
    selfSuspicion * 0.18;
  if (profile.emotionality > 80) {
    return clamp(Math.round(base * 1.05), 0, 100);
  }
  return clamp(Math.round(base), 0, 100);
}

function inferEmotion(profile: AIBehaviorProfile, danger: number, allianceRisk: number): ThoughtEmotion {
  if (profile.randomness > 85) return 'restless';
  if (profile.aggression > 80 && danger > 55) return 'angry';
  if (profile.caution > 80 && danger > 50) return 'anxious';
  if (profile.logic > 80) return 'cold';
  if (profile.leadership > 85) return 'dominant';
  if (profile.deception > 80 && allianceRisk > 45) return 'suspicious';
  if (danger > 72) return 'anxious';
  if (profile.emotionality > 75) return 'focused';
  return 'calm';
}

function roleHeuristic(
  id: string,
  score: number,
  profile: AIBehaviorProfile
): 'unknown' | 'lean_town' | 'lean_wolf' {
  const t = profile.logic > 70 ? 38 : 45;
  const w = profile.logic > 70 ? 62 : 58;
  if (score >= w) return 'lean_wolf';
  if (score <= t) return 'lean_town';
  return 'unknown';
}

function manipulationAwarenessLines(
  primaryId: string,
  ctx: ThoughtEngineContext,
  suspicionCtx: SuspicionObserverContext
): string[] {
  const state = ctx.suspicionState;
  const p = suspicionCtx.profile;
  const lines: string[] = [];
  const blinds = state.blindFollowCount[primaryId] ?? 0;
  if (blinds >= 2 && p.deception >= 50) lines.push('possible_social_pressure_bandwagon');
  const flips = state.accusationFlipCount[primaryId] ?? 0;
  if (flips >= 2 && p.detectLieChance >= 0.4) lines.push('possible_narrative_flip_manipulation');
  if (p.leadership > 75) lines.push('monitor_agenda_control_and_pile_on');
  if (shouldAugmentStructuralReasoning(suspicionCtx.profile, suspicionCtx.observerCharacter.difficulty) && p.reasoningDepth >= 6) {
    lines.push('watch_for_coordinated_false_consensus');
  }
  return lines;
}

function socialPressureScore(ctx: ThoughtEngineContext, primaryId: string | null): number {
  if (!primaryId) return 0;
  const scores = ctx.alivePlayers
    .filter((p) => p.id !== primaryId)
    .map((p) => ctx.suspicionState.scores[p.id] ?? 0);
  if (scores.length === 0) return 0;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const varc =
    scores.reduce((a, v) => a + (v - mean) * (v - mean), 0) / Math.max(1, scores.length);
  const std = Math.sqrt(varc);
  let v = clamp(Math.round(mean * 0.45 + std * 0.85), 0, 100);
  const p = getAIBehaviorProfile(ctx.observerCharacter);
  if (p.caution >= 72) {
    v = Math.round(v * clamp(1 - (p.caution - 72) / 200, 0.52, 1));
  }
  return v;
}

function detailedChainHard(
  primaryId: string,
  ctx: ThoughtEngineContext,
  suspicionCtx: SuspicionObserverContext,
  votePred: VotePrediction,
  ballotPublic: boolean
): string[] {
  if (!shouldAugmentStructuralReasoning(suspicionCtx.profile, suspicionCtx.observerCharacter.difficulty)) return [];
  const out: string[] = [];
  const second = chooseSecondHot(ctx, primaryId);
  if (second) {
    out.push(`contingency_pivot:${displayName(ctx, second)}`);
  }
  if (votePred.forwardNotes.length) out.push(...votePred.forwardNotes);
  if (ballotPublic) {
    const allies = topCoVotePartners(primaryId, ctx, 2);
    if (allies.length) {
      out.push(`hidden_alliance_hypothesis:${allies.map((id) => displayName(ctx, id)).join(',')}`);
    }
  }
  if (suspicionCtx.profile.reasoningDepth >= 8) {
    out.push('simulate_social_collapse_if_leader_exiled:confidence_low_without_role_oracle');
  }
  return out;
}

function chooseSecondHot(ctx: ThoughtEngineContext, excludeId: string): string | null {
  const ids = ctx.alivePlayers
    .map((p) => p.id)
    .filter((id) => id !== ctx.observerId && id !== excludeId);
  let best: string | null = null;
  let bestS = -1;
  for (const id of ids.sort()) {
    const s = ctx.suspicionState.scores[id] ?? 0;
    if (s > bestS) {
      bestS = s;
      best = id;
    }
  }
  return best;
}

function topCoVotePartners(primaryId: string, ctx: ThoughtEngineContext, k: number): string[] {
  const row = ctx.suspicionState.coVoteSameTarget[primaryId];
  if (!row) return [];
  return Object.entries(row)
    .filter(([o]) => o !== ctx.observerId)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, k)
    .filter(([, c]) => c >= 1)
    .map(([id]) => id);
}

/**
 * Full internal thought snapshot for one tick (before any dialogue generation).
 */
export function generateThoughts(ctx: ThoughtEngineContext): InternalThoughtSnapshot {
  const suspicionCtx = buildSuspicionContext(
    ctx.observerId,
    ctx.observerCharacter,
    ctx.alivePlayers.map((p) => p.id)
  );

  const primaryId = choosePrimarySuspect(ctx, suspicionCtx);
  const fallbackMostSuspicious = getMostSuspiciousTarget(
    ctx.suspicionState,
    ctx.alivePlayers.map((p) => p.id),
    ctx.observerId,
    []
  );
  const targetId =
    primaryId ??
    fallbackMostSuspicious ??
    ctx.alivePlayers.find((p) => p.id !== ctx.observerId)?.id ??
    ctx.observerId;
  const targetName = displayName(ctx, targetId);

  const allianceKey = primaryId ?? targetId;
  const ballotPublic = ctx.dayExileVotesPublic !== false;
  const reasons = generateReasoningChain(targetId, ctx, suspicionCtx);
  const allianceRisk = estimateAllianceRisk(allianceKey, thoughtCtxForPublicAllianceReads(ctx), suspicionCtx);
  const votePrediction = predictVoteOutcome(ctx, suspicionCtx, primaryId);

  let danger = 0;
  for (const p of ctx.alivePlayers) {
    if (p.id === ctx.observerId) continue;
    danger = Math.max(danger, calculateThreatLevel(p.id, ctx.suspicionState, suspicionCtx));
  }

  const survivalPriority = calculateSelfPreservationPriority(ctx, suspicionCtx);
  const emotion = inferEmotion(suspicionCtx.profile, danger, allianceRisk);

  const suspicionScore = ctx.suspicionState.scores[targetId] ?? 0;
  let confidence = clamp(
    Math.round(
      suspicionScore * (0.55 + suspicionCtx.profile.confidence / 250) +
        (primaryId ? 8 : 0) +
        (votePrediction.leadingTargetId === targetId ? 10 : 0)
    ),
    0,
    100
  );
  if (suspicionCtx.profile.randomness > 75) {
    confidence = clamp(
      Math.round(
        confidence +
          (deterministicJitter([ctx.observerId, targetId, String(ctx.thoughtTick), 'c']) - 0.5) *
            suspicionCtx.profile.randomness *
            0.2
      ),
      0,
      100
    );
  }

  const predictedAllies = ballotPublic
    ? topCoVotePartners(allianceKey, ctx, 4).map((id) => displayName(ctx, id))
    : [];

  const roleHeuristicByPlayerId: Record<string, 'unknown' | 'lean_town' | 'lean_wolf'> = {};
  for (const p of ctx.alivePlayers) {
    if (p.id === ctx.observerId) continue;
    roleHeuristicByPlayerId[p.id] = roleHeuristic(
      p.id,
      ctx.suspicionState.scores[p.id] ?? 0,
      suspicionCtx.profile
    );
  }

  const manipulationAwareness = manipulationAwarenessLines(targetId, ctx, suspicionCtx);
  const socialPressure = socialPressureScore(ctx, allianceKey);
  const reasoningChainDetailed = detailedChainHard(allianceKey, ctx, suspicionCtx, votePrediction, ballotPublic);

  return {
    target: targetName,
    targetId,
    confidence,
    emotion,
    reasons,
    predictedAllies,
    dangerLevel: danger,
    survivalPriority,
    allianceRisk,
    socialPressure,
    manipulationAwareness,
    votePrediction,
    reasoningChainDetailed,
    roleHeuristicByPlayerId,
  };
}
