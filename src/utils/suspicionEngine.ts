/**
 * Deterministic, state-driven suspicion model for AI werewolf.
 * No GPT / LLM — pure numeric game logic for future voting, narration, and alliances.
 */
import type { AICharacter } from '../types';
import type { AIBehaviorProfile } from '../data/aiBehaviorProfiles';
import { getAIBehaviorProfile } from '../data/aiBehaviorProfiles';
import { shouldAugmentStructuralReasoning } from './personaDifficultyPriority';

/** Suspicion toward a seat / player id. Always clipped to 0–100 after operations. */
export type SuspicionScores = Record<string, number>;

export type SuspicionEventType =
  | 'vote_changed'
  | 'contradiction'
  | 'defended_suspicious_player'
  | 'attacked_observer'
  | 'followed_majority_blindly'
  | 'emotional_outburst'
  | 'overexplaining'
  | 'refused_to_speak'
  | 'random_voting'
  | 'aggressive_leadership'
  /** Hard-only analytics: full exile ballot for one phase (voterId -> votedPlayerId). */
  | 'vote_phase_ballot';

export type SuspicionEvent = {
  type: SuspicionEventType;
  /** Player who triggered the signal (subject of suspicion update). */
  subjectId: string;
  /** Optional second seat (e.g. defended player). */
  relatedPlayerId?: string;
  /** Optional 0–1 scalar from caller (default 1). */
  magnitude?: number;
  /** Monotonic phase index (day vote, revote, etc.). */
  phaseIndex?: number;
  /** For `vote_phase_ballot` only: all votes this phase. */
  voteByVoter?: Record<string, string>;
};

/** Mutable-friendly snapshot; callers may clone between ticks. */
export type SuspicionState = {
  scores: SuspicionScores;
  /** Hard: count of phases where a and b voted the same exile target (undirected stored twice). */
  coVoteSameTarget: Record<string, Record<string, number>>;
  /** Hard: times subject defended relatedPlayer in logged events. */
  defendTally: Record<string, Record<string, number>>;
  /** Hard: times subject shifted primary accusation target between phases. */
  accusationFlipCount: Record<string, number>;
  /** Hard: blind follow events logged per subject. */
  blindFollowCount: Record<string, number>;
  /** Highest suspicion seen for relatedPlayer when defended (to weight "defended suspicious"). */
  peakSuspicionWhenDefended: Record<string, Record<string, number>>;
  lastPhaseProcessed: number;
};

export type SuspicionObserverContext = {
  /** The AI seat whose lens we use (same as keys in scores). */
  observerId: string;
  observerCharacter: AICharacter;
  profile: AIBehaviorProfile;
  /** Seats still alive (including observer). */
  alivePlayerIds: readonly string[];
  /** Optional: current majority exile target share 0–1 for blind-follow detection. */
  majorityTargetShare?: number;
  /** Optional: mean suspicion among others toward `related` in defended_suspicious_player. */
  crowdSuspicionOfRelated?: number;
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function cloneState(s: SuspicionState): SuspicionState {
  const deepCopy2 = (x: Record<string, Record<string, number>>) => {
    const o: Record<string, Record<string, number>> = {};
    for (const [a, row] of Object.entries(x)) {
      o[a] = { ...row };
    }
    return o;
  };
  return {
    scores: { ...s.scores },
    coVoteSameTarget: deepCopy2(s.coVoteSameTarget),
    defendTally: deepCopy2(s.defendTally),
    accusationFlipCount: { ...s.accusationFlipCount },
    blindFollowCount: { ...s.blindFollowCount },
    peakSuspicionWhenDefended: deepCopy2(s.peakSuspicionWhenDefended),
    lastPhaseProcessed: s.lastPhaseProcessed,
  };
}

function ensurePlayerMaps(state: SuspicionState, id: string) {
  if (!state.coVoteSameTarget[id]) state.coVoteSameTarget[id] = {};
  if (!state.defendTally[id]) state.defendTally[id] = {};
  if (!state.peakSuspicionWhenDefended[id]) state.peakSuspicionWhenDefended[id] = {};
}

/** Initialise suspicion state for all known seats (typically all players at table start). */
export function createEmptySuspicionState(playerIds: readonly string[]): SuspicionState {
  const scores: SuspicionScores = {};
  for (const id of playerIds) scores[id] = 0;
  return {
    scores,
    coVoteSameTarget: {},
    defendTally: {},
    accusationFlipCount: {},
    blindFollowCount: {},
    peakSuspicionWhenDefended: {},
    lastPhaseProcessed: -1,
  };
}

/** How strongly the observer's personality scales a raw suspicion delta (multiplier, ~0.35–2+). */
export function personalitySuspicionMultiplier(
  profile: AIBehaviorProfile,
  eventType: SuspicionEventType
): number {
  let m = 1;
  // Emotional observers escalate faster on social / chaotic signals.
  if (
    eventType === 'emotional_outburst' ||
    eventType === 'random_voting' ||
    eventType === 'aggressive_leadership' ||
    eventType === 'vote_changed'
  ) {
    m *= 1 + profile.emotionality / 200;
  }
  // Logic-heavy observers weight inconsistencies more.
  if (
    eventType === 'contradiction' ||
    eventType === 'overexplaining' ||
    eventType === 'random_voting'
  ) {
    m *= 1 + profile.logic / 150;
  }
  // Caution dampens all updates (floor so Novice still moves a little).
  m *= clamp(1 - profile.caution / 220, 0.4, 1);
  // Cautious seats under-react to volatile social noise (loud lines / wagons / pressure spikes).
  if (
    profile.caution >= 70 &&
    (eventType === 'emotional_outburst' ||
      eventType === 'random_voting' ||
      eventType === 'aggressive_leadership')
  ) {
    m *= clamp(1 - (profile.caution - 70) / 130, 0.45, 1);
  }
  // Anchor inconsistent narratives a bit longer for cautious observers.
  if (profile.caution >= 74 && eventType === 'contradiction') {
    m *= 1 + (profile.caution - 74) / 200;
  }
  // Deception-aware: slightly stronger reaction to manipulation-shaped tags.
  if (
    eventType === 'contradiction' ||
    eventType === 'overexplaining' ||
    eventType === 'random_voting'
  ) {
    m *= 1 + profile.deception / 400;
  }
  // Detect-lie prior boosts contradiction / overexplain signals.
  if (eventType === 'contradiction' || eventType === 'overexplaining') {
    m *= 1 + profile.detectLieChance;
  }
  // Leadership-oriented observers distrust passivity / free-riding.
  if (eventType === 'refused_to_speak' || eventType === 'followed_majority_blindly') {
    m *= 1 + profile.leadership / 180;
  }
  return m;
}

/** Extra multiplier when the subject attacked this observer (revenge bias). */
export function revengeMultiplier(profile: AIBehaviorProfile, eventType: SuspicionEventType): number {
  if (eventType !== 'attacked_observer') return 1;
  return 1 + profile.revengeBias / 120;
}

const BASE_DELTA: Record<Exclude<SuspicionEventType, 'vote_phase_ballot'>, number> = {
  vote_changed: 8,
  contradiction: 14,
  defended_suspicious_player: 9,
  attacked_observer: 11,
  followed_majority_blindly: 7,
  emotional_outburst: 6,
  overexplaining: 5,
  refused_to_speak: 8,
  random_voting: 10,
  aggressive_leadership: 9,
};

function applyHardVoteBallot(
  state: SuspicionState,
  voteByVoter: Record<string, string>,
  ctx: SuspicionObserverContext
): void {
  if (!shouldAugmentStructuralReasoning(ctx.profile, ctx.observerCharacter.difficulty)) return;

  const voters = Object.keys(voteByVoter);
  for (const id of voters) {
    if (state.scores[id] === undefined) state.scores[id] = 0;
  }
  for (let i = 0; i < voters.length; i += 1) {
    const a = voters[i]!;
    const ta = voteByVoter[a];
    ensurePlayerMaps(state, a);
    for (let j = i + 1; j < voters.length; j += 1) {
      const b = voters[j]!;
      const tb = voteByVoter[b];
      if (ta !== tb) continue;
      ensurePlayerMaps(state, b);
      state.coVoteSameTarget[a]![b] = (state.coVoteSameTarget[a]![b] ?? 0) + 1;
      state.coVoteSameTarget[b]![a] = (state.coVoteSameTarget[b]![a] ?? 0) + 1;
    }
  }

  // Alliance / manipulation pressure: if two non-observer seats always vote together and one is already hot, nudge the partner.
  for (let i = 0; i < voters.length; i += 1) {
    const a = voters[i]!;
    if (a === ctx.observerId) continue;
    for (let j = i + 1; j < voters.length; j += 1) {
      const b = voters[j]!;
      if (b === ctx.observerId) continue;
      if (voteByVoter[a] !== voteByVoter[b]) continue;
      const sync = state.coVoteSameTarget[a]?.[b] ?? 0;
      if (sync < 2) continue;
      const sa = state.scores[a] ?? 0;
      const sb = state.scores[b] ?? 0;
      const high = Math.max(sa, sb);
      const lowId = sa >= sb ? b : a;
      if (high >= 55) {
        const bonus = clamp(4 + sync * 2, 4, 14);
        state.scores[lowId] = clamp((state.scores[lowId] ?? 0) + bonus, 0, 100);
      }
    }
  }
}

function hardSocialPressureBonus(state: SuspicionState, subjectId: string): number {
  let maxCo = 0;
  const row = state.coVoteSameTarget[subjectId];
  if (row) {
    for (const v of Object.values(row)) maxCo = Math.max(maxCo, v);
  }
  const flips = state.accusationFlipCount[subjectId] ?? 0;
  const blinds = state.blindFollowCount[subjectId] ?? 0;
  return clamp(maxCo * 3 + flips * 4 + blinds * 2, 0, 28);
}

/**
 * Apply a raw suspicion delta to one seat, with personality + survival dampening / sharpening.
 */
export function applySuspicionChange(
  state: SuspicionState,
  targetId: string,
  rawDelta: number,
  profile: AIBehaviorProfile,
  opts?: { respectVoteChangeResistance?: boolean; eventType?: SuspicionEventType }
): SuspicionState {
  const next = cloneState(state);
  let d = rawDelta;
  // Observers who strongly resist changing their own vote tend to penalize flip-flopping others more.
  if (opts?.respectVoteChangeResistance && d > 0 && opts.eventType === 'vote_changed') {
    d *= 1 + profile.voteChangeResistance / 220;
  }
  // Survival instinct slightly resists raising suspicion when delta positive huge noise? (soft cap)
  if (d > 0) {
    d *= clamp(1.15 - profile.survivalInstinct / 400, 0.75, 1.05);
  }
  next.scores[targetId] = clamp((next.scores[targetId] ?? 0) + d, 0, 100);
  return next;
}

/**
 * Feed structured table events into suspicion + Hard structural memory.
 */
export function updateSuspicionFromEvent(
  state: SuspicionState,
  event: SuspicionEvent,
  ctx: SuspicionObserverContext
): SuspicionState {
  const next = cloneState(state);
  const mag = clamp(event.magnitude ?? 1, 0, 2);
  const profile = ctx.profile;
  const diff = ctx.observerCharacter.difficulty;

  if (event.type === 'vote_phase_ballot' && event.voteByVoter) {
    const phase = event.phaseIndex ?? next.lastPhaseProcessed + 1;
    if (phase !== next.lastPhaseProcessed) {
      applyHardVoteBallot(next, event.voteByVoter, ctx);
      next.lastPhaseProcessed = phase;
    }
    return next;
  }

  if (event.type === 'defended_suspicious_player' && event.relatedPlayerId) {
    const rel = event.relatedPlayerId;
    ensurePlayerMaps(next, event.subjectId);
    next.defendTally[event.subjectId]![rel] = (next.defendTally[event.subjectId]![rel] ?? 0) + 1;
    const prevPeak = next.peakSuspicionWhenDefended[event.subjectId]![rel] ?? 0;
    const relSusp = ctx.crowdSuspicionOfRelated ?? next.scores[rel] ?? 0;
    next.peakSuspicionWhenDefended[event.subjectId]![rel] = Math.max(prevPeak, relSusp);
  }

  if (event.type === 'vote_changed') {
    next.accusationFlipCount[event.subjectId] = (next.accusationFlipCount[event.subjectId] ?? 0) + 1;
  }

  if (event.type === 'followed_majority_blindly') {
    next.blindFollowCount[event.subjectId] = (next.blindFollowCount[event.subjectId] ?? 0) + 1;
  }

  let base = BASE_DELTA[event.type as Exclude<SuspicionEventType, 'vote_phase_ballot'>] ?? 0;
  if (event.type === 'defended_suspicious_player' && event.relatedPlayerId) {
    const relScore = ctx.crowdSuspicionOfRelated ?? next.scores[event.relatedPlayerId] ?? 0;
    base *= clamp(0.45 + relScore / 90, 0.45, 1.6);
    const repeats = next.defendTally[event.subjectId]?.[event.relatedPlayerId] ?? 1;
    if (shouldAugmentStructuralReasoning(profile, diff) && repeats >= 2) base += 5 + repeats * 2;
  }

  if (event.type === 'followed_majority_blindly' && ctx.majorityTargetShare != null) {
    base *= clamp(0.6 + ctx.majorityTargetShare * 0.8, 0.5, 1.5);
  }
  if (event.type === 'followed_majority_blindly') {
    base *= clamp(1 - profile.followMajorityChance / 260, 0.45, 1);
  }

  let mult =
    personalitySuspicionMultiplier(profile, event.type) * revengeMultiplier(profile, event.type) * mag;

  if (shouldAugmentStructuralReasoning(profile, diff)) {
    mult *= 1 + profile.reasoningDepth / 80;
    mult *= 1 + Math.min(profile.memoryDepth, 20) / 120;
    base += hardSocialPressureBonus(next, event.subjectId) / 25;
  }

  const delta = base * mult;
  return applySuspicionChange(next, event.subjectId, delta, profile, {
    respectVoteChangeResistance: true,
    eventType: event.type,
  });
}

/**
 * Aggregate "threat" score 0–100 toward the observer (exile / night danger heuristic).
 * Combines suspicion with Hard structural signals (not GPT).
 */
export function calculateThreatLevel(
  subjectId: string,
  state: SuspicionState,
  ctx: SuspicionObserverContext
): number {
  if (subjectId === ctx.observerId) return 0;
  const s = state.scores[subjectId] ?? 0;
  let t = s * 0.72;
  if (shouldAugmentStructuralReasoning(ctx.profile, ctx.observerCharacter.difficulty)) {
    t += hardSocialPressureBonus(state, subjectId) * 0.9;
    const defends = state.defendTally[subjectId];
    if (defends) {
      const n = Object.values(defends).reduce((a, b) => a + b, 0);
      t += clamp(n * 2.5, 0, 18);
    }
  }
  t += (state.scores[subjectId] ?? 0) * (ctx.profile.aggression / 500);
  return clamp(Math.round(t), 0, 100);
}

/**
 * Renormalize alive players' scores to spread 0–100 (relative ranking preserved).
 * Does not touch dead keys unless listed in alivePlayerIds filter.
 */
export function normalizeSuspicionScores(
  state: SuspicionState,
  alivePlayerIds: readonly string[]
): SuspicionState {
  const next = cloneState(state);
  const vals = alivePlayerIds.map((id) => next.scores[id] ?? 0);
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals, 1);
  const span = max - min || 1;
  for (const id of alivePlayerIds) {
    const v = next.scores[id] ?? 0;
    next.scores[id] = clamp(Math.round(((v - min) / span) * 100), 0, 100);
  }
  return next;
}

/**
 * Pick the most suspicious alive seat (excluding observer and optional bans).
 */
export function getMostSuspiciousTarget(
  state: SuspicionState,
  alivePlayerIds: readonly string[],
  selfId: string,
  excludeIds: readonly string[] = []
): string | null {
  const ex = new Set([selfId, ...excludeIds]);
  let best: string | null = null;
  let bestScore = -1;
  const sorted = [...alivePlayerIds].filter((id) => !ex.has(id)).sort();
  for (const id of sorted) {
    const sc = state.scores[id] ?? 0;
    if (sc > bestScore) {
      bestScore = sc;
      best = id;
    }
  }
  return best;
}

/** Convenience: build context from character + observer id. */
export function buildSuspicionContext(
  observerId: string,
  observerCharacter: AICharacter,
  alivePlayerIds: readonly string[]
): SuspicionObserverContext {
  return {
    observerId,
    observerCharacter,
    profile: getAIBehaviorProfile(observerCharacter),
    alivePlayerIds,
  };
}
