/**
 * Deterministic AI voting: exile targets, pivots, bandwagons, splits, sacrifices.
 * No GPT — pure game logic (suspicion + personality + optional ally metadata).
 */
import type { AICharacter, DifficultyType } from '../types';
import type { AIBehaviorProfile } from '../data/aiBehaviorProfiles';
import { getAIBehaviorProfile } from '../data/aiBehaviorProfiles';
import {
  type SuspicionState,
  type SuspicionObserverContext,
  buildSuspicionContext,
  calculateThreatLevel,
  getMostSuspiciousTarget,
} from './suspicionEngine';
import {
  type ThoughtEngineContext,
  type ThoughtEnginePlayer,
  choosePrimarySuspect,
  deterministicJitter,
} from './thoughtEngine';
import { diffRankFromType, shouldAugmentStructuralReasoning } from './personaDifficultyPriority';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function isHard(d: DifficultyType): boolean {
  return d === 'Hard';
}

export type StrategicVoteIntent =
  | 'sincere_exile_push'
  | 'bandwagon_control'
  | 'split_vote'
  | 'delayed_commit'
  | 'protect_ally'
  | 'sacrifice_teammate'
  | 'fake_support'
  | 'revenge_pivot'
  | 'chaotic_flip'
  | 'majority_follow'
  /** Social masking / soft manipulation (vote is still an exile pick). */
  | 'soft_pressure'
  | 'neutral_surface'
  | 'social_redirect'
  | 'preserve_cover'
  | 'hidden_push'
  | 'shield_teammate_softly'
  | 'indirect_pressure'
  | 'false_uncertainty'
  /** Soft table steering: redirect focus / seed doubt / nudge momentum without hard accusation. */
  | 'soft_focus_shift'
  | 'pressure_seed'
  | 'redirect_attention'
  | 'social_momentum_nudge'
  | 'indirect_alignment'
  | 'topic_reframe'
  | 'low_commitment_pressure'
  | 'delayed_pressure_stack'
  | 'passive_doubt_injection';

/** Vote intents that shape discussion pressure or redirect attention (match / metrics). */
export const REDIRECT_OR_SOFT_PRESSURE_INTENTS: readonly StrategicVoteIntent[] = [
  'social_redirect',
  'preserve_cover',
  'hidden_push',
  'soft_pressure',
  'indirect_pressure',
  'soft_focus_shift',
  'pressure_seed',
  'redirect_attention',
  'social_momentum_nudge',
  'indirect_alignment',
  'topic_reframe',
  'low_commitment_pressure',
  'delayed_pressure_stack',
  'passive_doubt_injection',
];

export function isRedirectOrSoftPressureIntent(intent: StrategicVoteIntent): boolean {
  return (REDIRECT_OR_SOFT_PRESSURE_INTENTS as readonly string[]).includes(intent);
}

/** Intents counted as “social mask”plays for simulation / debug (excludes blunt bandwagon / revenge). */
export const STRATEGIC_MASK_INTENTS: readonly StrategicVoteIntent[] = [
  'fake_support',
  'soft_pressure',
  'delayed_commit',
  'neutral_surface',
  'social_redirect',
  'preserve_cover',
  'hidden_push',
  'shield_teammate_softly',
  'indirect_pressure',
  'false_uncertainty',
  'split_vote',
  'chaotic_flip',
  'soft_focus_shift',
  'pressure_seed',
  'redirect_attention',
  'social_momentum_nudge',
  'indirect_alignment',
  'topic_reframe',
  'low_commitment_pressure',
  'delayed_pressure_stack',
  'passive_doubt_injection',
];

export function isStrategicMaskIntent(intent: StrategicVoteIntent): boolean {
  return (STRATEGIC_MASK_INTENTS as readonly string[]).includes(intent);
}

export function isManipulationVoteIntent(intent: StrategicVoteIntent): boolean {
  return (
    intent === 'split_vote' ||
    intent === 'fake_support' ||
    intent === 'bandwagon_control' ||
    intent === 'chaotic_flip' ||
    intent === 'soft_pressure' ||
    intent === 'social_redirect' ||
    intent === 'preserve_cover' ||
    intent === 'hidden_push' ||
    intent === 'shield_teammate_softly' ||
    intent === 'indirect_pressure' ||
    intent === 'false_uncertainty' ||
    intent === 'neutral_surface' ||
    intent === 'soft_focus_shift' ||
    intent === 'pressure_seed' ||
    intent === 'redirect_attention' ||
    intent === 'social_momentum_nudge' ||
    intent === 'indirect_alignment' ||
    intent === 'topic_reframe' ||
    intent === 'low_commitment_pressure' ||
    intent === 'delayed_pressure_stack' ||
    intent === 'passive_doubt_injection'
  );
}

export type VoteDecision = {
  targetId: string;
  /** Display name for UI / logs (not spoken dialogue). */
  target: string;
  confidence: number;
  strategicIntent: StrategicVoteIntent;
  reason: string[];
};

export type VotingEnginePlayer = ThoughtEnginePlayer;

export type VotingEngineContext = {
  observerId: string;
  observerCharacter: AICharacter;
  alivePlayers: readonly VotingEnginePlayer[];
  suspicionState: SuspicionState;
  /** Monotonic tick (chaos / tie-break). */
  thoughtTick: number;
  phaseIndex: number;
  /** Partial or full current-phase public ballot (voterId -> voteTargetId). */
  currentBallot?: Record<string, string>;
  /** Same-team seats the observer must not expose (skip voting them unless sac). */
  hiddenAllyIds?: readonly string[];
  /** Wolf-side seats that may be bussed (game layer only). */
  sacrificeCandidateIds?: readonly string[];
  /** Last completed phase votes (momentum / “stubborn” continuity). */
  lastPhaseVoteByVoter?: Record<string, string>;
};

function toThoughtCtx(v: VotingEngineContext): ThoughtEngineContext {
  return {
    observerId: v.observerId,
    observerCharacter: v.observerCharacter,
    alivePlayers: v.alivePlayers,
    suspicionState: v.suspicionState,
    thoughtTick: v.thoughtTick,
    lastVoteByVoter: v.lastPhaseVoteByVoter,
  };
}

function nameOf(ctx: VotingEngineContext, id: string): string {
  return ctx.alivePlayers.find((p) => p.id === id)?.name ?? id;
}

function aliveIds(ctx: VotingEngineContext): string[] {
  return ctx.alivePlayers.map((p) => p.id);
}

function tallyBallot(ctx: VotingEngineContext): Record<string, number> {
  const t: Record<string, number> = {};
  for (const v of Object.values(ctx.currentBallot ?? {})) {
    if (!v) continue;
    t[v] = (t[v] ?? 0) + 1;
  }
  return t;
}

/** 0–100: how concentrated the current public ballot is (social pressure). */
export function evaluateVotePressure(ctx: VotingEngineContext): number {
  const t = tallyBallot(ctx);
  const counts = Object.values(t);
  if (counts.length === 0) return 0;
  const total = counts.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  const maxc = Math.max(...counts);
  const share = maxc / total;
  let hhi = 0;
  for (const c of counts) {
    const p = c / total;
    hhi += p * p;
  }
  return clamp(Math.round(share * 72 + hhi * 48), 0, 100);
}

/** 0–100: how fast the leading wagon is pulling away from second place. */
export function estimateBandwagonMomentum(ctx: VotingEngineContext): number {
  const t = tallyBallot(ctx);
  const sorted = Object.entries(t).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (sorted.length === 0) return 0;
  const lead = sorted[0]![1];
  const second = sorted.length >= 2 ? sorted[1]![1] : 0;
  const total = Object.values(t).reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  const gap = (lead - second) / total;
  return clamp(Math.round(lead * 18 + gap * 110), 0, 100);
}

export type SplitVoteOpportunity = {
  opportunity: boolean;
  /** Secondary exile candidate when top-two suspicions are tight. */
  alternateTargetId: string | null;
  topSuspectId: string | null;
  margin: number;
};

/**
 * Detect when a engineered split is plausible (tight read, two viable wagons).
 */
export function detectSplitVoteOpportunity(
  ctx: VotingEngineContext,
  suspicionCtx: SuspicionObserverContext
): SplitVoteOpportunity {
  const ids = aliveIds(ctx).filter((id) => id !== ctx.observerId);
  const scored = ids
    .map((id) => ({ id, s: ctx.suspicionState.scores[id] ?? 0 }))
    .sort((a, b) => b.s - a.s || a.id.localeCompare(b.id));
  if (scored.length < 2) {
    return { opportunity: false, alternateTargetId: null, topSuspectId: scored[0]?.id ?? null, margin: 0 };
  }
  const top = scored[0]!;
  const second = scored[1]!;
  const margin = top.s - second.s;
  const allySet = new Set(ctx.hiddenAllyIds ?? []);
  const topBlocked = allySet.has(top.id);
  const tight = margin <= 10 + suspicionCtx.profile.logic / 25;
  const opp =
    tight &&
    (isHard(ctx.observerCharacter.difficulty) ||
      suspicionCtx.profile.randomness > 78 ||
      suspicionCtx.profile.deception >= 68) &&
    (suspicionCtx.profile.deception > 48 || suspicionCtx.profile.randomness > 85);
  let alt: string | null = second.id;
  if (topBlocked && !allySet.has(second.id)) alt = second.id;
  else if (topBlocked && allySet.has(second.id)) {
    const third = scored[2];
    alt = third && !allySet.has(third.id) ? third.id : null;
  }
  return {
    opportunity: opp && alt != null,
    alternateTargetId: opp ? alt : null,
    topSuspectId: top.id,
    margin,
  };
}

export type StrategicSacrificeResult = {
  shouldSacrifice: boolean;
  targetId: string | null;
  reasons: string[];
};

/**
 * Wolf-side (or similar) bus deterministic rule: sacrifice highest-exposure teammate when survival demands.
 */
export function decideStrategicSacrifice(
  ctx: VotingEngineContext,
  suspicionCtx: SuspicionObserverContext
): StrategicSacrificeResult {
  const cands = ctx.sacrificeCandidateIds ?? [];
  if (cands.length === 0) {
    return { shouldSacrifice: false, targetId: null, reasons: [] };
  }
  const p = suspicionCtx.profile;
  const reasons: string[] = [];
  const scored = [...cands].sort((a, b) => {
    const sa = ctx.suspicionState.scores[a] ?? 0;
    const sb = ctx.suspicionState.scores[b] ?? 0;
    return sb - sa || a.localeCompare(b);
  });
  const topSac = scored[0]!;
  const topSusp = ctx.suspicionState.scores[topSac] ?? 0;
  const wagon = tallyBallot(ctx);
  const onChoppingBlock = (wagon[topSac] ?? 0) >= 2;

  let should =
    topSusp >= 58 &&
    p.survivalInstinct >= 72 &&
    (isHard(ctx.observerCharacter.difficulty) || p.deception >= 65) &&
    (onChoppingBlock || topSusp >= 72);

  if (
    (isHard(ctx.observerCharacter.difficulty) || p.deception >= 72) &&
    p.deception > 68 &&
    topSusp >= 52 &&
    p.survivalInstinct > 68
  ) {
    should = true;
    reasons.push('hard_hide_pack_by_controlled_bus');
  }
  if (should) {
    reasons.push('teammate_publicly_hot');
    if (onChoppingBlock) reasons.push('wagon_already_formed_on_teammate');
    return { shouldSacrifice: true, targetId: topSac, reasons };
  }
  return { shouldSacrifice: false, targetId: null, reasons };
}

/** 0–100 confidence in casting this vote for `targetId`. */
export function calculateVoteConfidence(
  ctx: VotingEngineContext,
  suspicionCtx: SuspicionObserverContext,
  targetId: string,
  intent: StrategicVoteIntent
): number {
  const s = ctx.suspicionState.scores[targetId] ?? 0;
  const p = suspicionCtx.profile;
  const pressure = evaluateVotePressure(ctx);
  const momentum = estimateBandwagonMomentum(ctx);
  const leader = getBallotLeader(ctx);
  let c = s * (0.35 + p.confidence / 220) + p.confidence * 0.22;
  if (leader === targetId) c += momentum * 0.18 + pressure * 0.12;
  if (intent === 'majority_follow' || intent === 'bandwagon_control') c += pressure * 0.2;
  if (intent === 'split_vote' || intent === 'chaotic_flip') c -= 8;
  if (intent === 'protect_ally' || intent === 'fake_support' || intent === 'shield_teammate_softly') {
    c += p.deception * 0.12;
  }
  if (intent === 'false_uncertainty' || intent === 'neutral_surface') c -= 5 + p.caution * 0.04;
  if (
    intent === 'soft_pressure' ||
    intent === 'indirect_pressure' ||
    intent === 'pressure_seed' ||
    intent === 'low_commitment_pressure' ||
    intent === 'delayed_pressure_stack' ||
    intent === 'passive_doubt_injection'
  ) {
    c += 4 + p.aggression * 0.05;
  }
  if (
    intent === 'social_redirect' ||
    intent === 'preserve_cover' ||
    intent === 'hidden_push' ||
    intent === 'redirect_attention' ||
    intent === 'indirect_alignment' ||
    intent === 'topic_reframe'
  ) {
    c += p.deception * 0.09;
  }
  if (intent === 'soft_focus_shift') c += p.deception * 0.08 + p.sociability * 0.04;
  if (intent === 'social_momentum_nudge') c += p.deception * 0.1 + p.leadership * 0.05;
  if (intent === 'delayed_commit') c += p.caution * 0.08;
  if (intent === 'sacrifice_teammate') c += p.survivalInstinct * 0.08;
  if (intent === 'revenge_pivot') c += p.revengeBias * 0.1;
  if (
    isHard(ctx.observerCharacter.difficulty) ||
    shouldAugmentStructuralReasoning(p, ctx.observerCharacter.difficulty) ||
    p.reasoningDepth >= 7
  ) {
    c += (calculateThreatLevel(targetId, ctx.suspicionState, suspicionCtx) * p.reasoningDepth) / 200;
  }
  if (p.randomness > 75) {
    c += (deterministicJitter([ctx.observerId, targetId, String(ctx.thoughtTick), 'vc']) - 0.5) * 14;
  }
  return clamp(Math.round(c), 0, 100);
}

function getBallotLeader(ctx: VotingEngineContext): string | null {
  const t = tallyBallot(ctx);
  let best: string | null = null;
  let bestc = -1;
  for (const id of Object.keys(t).sort()) {
    const c = t[id] ?? 0;
    if (c > bestc) {
      bestc = c;
      best = id;
    }
  }
  return best;
}

function pickNextSuspectExcluding(
  ctx: VotingEngineContext,
  suspicionCtx: SuspicionObserverContext,
  exclude: Set<string>
): string | null {
  const ids = aliveIds(ctx).filter((id) => id !== ctx.observerId && !exclude.has(id));
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

function argmaxThreat(
  ctx: VotingEngineContext,
  suspicionCtx: SuspicionObserverContext,
  exclude: Set<string>
): string | null {
  let best: string | null = null;
  let bestT = -1;
  for (const p of ctx.alivePlayers) {
    if (p.id === ctx.observerId || exclude.has(p.id)) continue;
    const t = calculateThreatLevel(p.id, ctx.suspicionState, suspicionCtx);
    if (t > bestT || (t === bestT && best != null && p.id.localeCompare(best) < 0)) {
      bestT = t;
      best = p.id;
    }
  }
  return best;
}

function maskJitter(ctx: VotingEngineContext, salt: string): number {
  return deterministicJitter([ctx.observerId, String(ctx.phaseIndex), String(ctx.thoughtTick), salt]);
}

function rankedNonAllyExcludingObserver(ctx: VotingEngineContext, allySet: Set<string>) {
  return aliveIds(ctx)
    .filter((id) => id !== ctx.observerId && !allySet.has(id))
    .map((id) => ({ id, s: ctx.suspicionState.scores[id] ?? 0 }))
    .sort((a, b) => b.s - a.s || a.id.localeCompare(b.id));
}

/**
 * Extra social-masking exile intents for wolves (always eligible) and high-deception town (Medium+).
 * Difficulty caps frequency/quality; personality biases which mask fires.
 */
function trySocialMaskVote(
  ctx: VotingEngineContext,
  suspicionCtx: SuspicionObserverContext,
  profile: AIBehaviorProfile,
  primary: string | null,
  leader: string | null,
  pressure: number,
  momentum: number,
  split: SplitVoteOpportunity
): VoteDecision | null {
  const allySet = new Set(ctx.hiddenAllyIds ?? []);
  const isWolf = allySet.size > 0;
  const dr = diffRankFromType(ctx.observerCharacter.difficulty);
  /** Town: allow soft steering earlier so sim + live matches see redirect_soft pressure. */
  if (!isWolf && (profile.deception < 55 || dr < 2)) return null;

  const ranked = rankedNonAllyExcludingObserver(ctx, allySet);
  if (ranked.length === 0) return null;

  const top = ranked[0]!.id;
  const second = ranked[1]?.id ?? top;
  const third = ranked[2]?.id ?? second;
  const midIdx = Math.max(0, Math.floor((ranked.length - 1) * 0.45));
  const mid = ranked[midIdx]!.id;

  const shy = profile.sociability < 44;
  const loud = profile.sociability > 76;
  const agg = profile.aggression > 74;
  const cautious = profile.caution > 74;
  const logical = profile.logic > 72;
  const emo = profile.emotionality > 74;
  const charm = profile.sociability > 72 && profile.leadership > 62;
  /** High charisma + leadership + confidence: subtle table steering (not hard shot-calling). */
  const charmLead =
    profile.sociability > 76 && profile.leadership > 65 && profile.confidence >= 68;
  const cold = profile.emotionality < 42 && profile.logic > 68;

  const cap = isWolf
    ? dr <= 0
      ? 0.28
      : dr === 1
        ? 0.46
        : dr === 2
          ? 0.68 + (charmLead ? 0.06 : 0)
          : 0.86 + (charmLead ? 0.04 : 0)
    : Math.min(0.66, (dr >= 3 ? 0.55 : 0.38) + (charmLead ? 0.14 : 0));
  const roll = maskJitter(ctx, 'mask_gate');
  if (roll > cap) return null;

  const pick = (salt: string, p: number) => maskJitter(ctx, salt) < p;

  if (isWolf) {
    if (dr <= 0) {
      if (pressure > 52 && pick('n0', 0.12 + (emo ? 0.07 : 0) + (shy ? 0.05 : 0))) {
        return buildDecision(ctx, suspicionCtx, mid, 'false_uncertainty', [
          'novice_wolf_panic_float',
          'avoid_hard_lock',
        ]);
      }
      if (leader && !allySet.has(leader) && pressure > 42 && pick('n1', 0.1 + (loud ? 0.08 : 0))) {
        return buildDecision(ctx, suspicionCtx, leader, 'neutral_surface', ['blend_into_wagon_noise']);
      }
      if (agg && pick('n2', 0.16)) {
        return buildDecision(ctx, suspicionCtx, second, 'pressure_seed', ['clumsy_forward_push']);
      }
      if (pick('n3', 0.14)) {
        return buildDecision(ctx, suspicionCtx, second, 'passive_doubt_injection', ['keep_name_in_play']);
      }
      return null;
    }
    if (dr === 1) {
      if (shy && split.alternateTargetId && pick('e0', 0.24)) {
        return buildDecision(ctx, suspicionCtx, split.alternateTargetId, 'redirect_attention', [
          'soft_angle_off_primary',
        ]);
      }
      if (split.alternateTargetId && pick('e0b', 0.18)) {
        return buildDecision(ctx, suspicionCtx, split.alternateTargetId, 'soft_focus_shift', [
          'listen_next_before_lock',
        ]);
      }
      if (pick('e1', 0.2)) {
        return buildDecision(ctx, suspicionCtx, third !== top ? third : mid, 'false_uncertainty', [
          'surface_uncertainty',
        ]);
      }
      if (leader && !allySet.has(leader) && pick('e2', 0.2)) {
        return buildDecision(ctx, suspicionCtx, leader, 'indirect_alignment', ['simple_alignment_cover']);
      }
      if (pick('e3', 0.16)) {
        return buildDecision(ctx, suspicionCtx, second, 'low_commitment_pressure', ['nudge_without_hammer']);
      }
      return null;
    }
    if (dr === 2) {
      if (charmLead && split.alternateTargetId && pick('mcl0', 0.28)) {
        return buildDecision(ctx, suspicionCtx, split.alternateTargetId, 'social_redirect', [
          'wolf_charm_second_listen_lane',
        ]);
      }
      if (charmLead && leader && !allySet.has(leader) && pick('mcl1', 0.24)) {
        return buildDecision(ctx, suspicionCtx, leader, 'social_momentum_nudge', [
          'wolf_soft_room_pace',
        ]);
      }
      if (charmLead && second !== top && pick('mcl2', 0.2)) {
        return buildDecision(ctx, suspicionCtx, second, 'indirect_alignment', [
          'wolf_pair_listen_agenda',
        ]);
      }
      if (split.opportunity && split.alternateTargetId && pick('m0', 0.28 + (logical ? 0.06 : 0))) {
        return buildDecision(ctx, suspicionCtx, split.alternateTargetId, 'topic_reframe', [
          'split_pressure_without_hard_split',
        ]);
      }
      if (split.alternateTargetId && pick('m0b', 0.2)) {
        return buildDecision(ctx, suspicionCtx, split.alternateTargetId, 'redirect_attention', [
          'shift_table_eyeball',
        ]);
      }
      if (cautious && primary && pick('m1', 0.22)) {
        return buildDecision(ctx, suspicionCtx, primary, 'preserve_cover', ['delay_full_exposure']);
      }
      if (primary && leader && primary !== leader && momentum > 48 && pick('m2', 0.22 + (agg ? 0.08 : 0))) {
        return buildDecision(ctx, suspicionCtx, primary, 'social_momentum_nudge', ['shadow_push_non_leader']);
      }
      if (pick('m3', 0.18 + (emo ? 0.06 : 0))) {
        return buildDecision(ctx, suspicionCtx, mid, 'passive_doubt_injection', ['maintain_plausible_doubt']);
      }
      if (pick('m4', 0.18)) {
        return buildDecision(ctx, suspicionCtx, second, 'delayed_pressure_stack', ['layered_soft_strike']);
      }
      if (pick('m5', 0.15)) {
        return buildDecision(ctx, suspicionCtx, mid, 'pressure_seed', ['seed_thread_next_round']);
      }
      return null;
    }
    if (charm && leader && !allySet.has(leader) && pressure > 38 && pick('h0', 0.22 + (charmLead ? 0.12 : 0))) {
      return buildDecision(ctx, suspicionCtx, leader, 'social_momentum_nudge', ['trust_farming_alignment']);
    }
    if (charmLead && leader && !allySet.has(leader) && pick('h0b', 0.2)) {
      return buildDecision(ctx, suspicionCtx, leader, 'neutral_surface', ['charisma_social_glue']);
    }
    if (charmLead && split.alternateTargetId && pick('h0c', 0.22)) {
      return buildDecision(ctx, suspicionCtx, split.alternateTargetId, 'social_redirect', [
        'hard_charm_split_lane',
      ]);
    }
    if (cold && split.alternateTargetId && pick('h1', 0.24)) {
      return buildDecision(ctx, suspicionCtx, split.alternateTargetId, 'topic_reframe', ['detached_steering']);
    }
    if (split.opportunity && split.alternateTargetId && pick('h2', 0.3)) {
      return buildDecision(ctx, suspicionCtx, split.alternateTargetId, 'redirect_attention', [
        'controlled_table_redirect',
      ]);
    }
    if (cautious && primary && pick('h3', 0.2)) {
      return buildDecision(ctx, suspicionCtx, primary, 'preserve_cover', ['strategic_cover_hold']);
    }
    if (primary && leader && primary !== leader && pick('h4', 0.26)) {
      return buildDecision(ctx, suspicionCtx, primary, 'hidden_push', ['momentum_from_shadow']);
    }
    if (pick('h5', 0.2)) {
      return buildDecision(ctx, suspicionCtx, mid, 'false_uncertainty', ['engineered_ambiguity']);
    }
    if (pick('h6', 0.2)) {
      return buildDecision(ctx, suspicionCtx, second, 'indirect_alignment', ['indirect_heat_transfer']);
    }
    if (pick('h7', 0.18)) {
      return buildDecision(ctx, suspicionCtx, top, 'soft_focus_shift', ['keep_primary_under_listen']);
    }
    return null;
  }

  if (!isWolf && charmLead && dr >= 2 && profile.deception >= 52) {
    if (split.alternateTargetId && pick('tcl0', 0.3)) {
      return buildDecision(ctx, suspicionCtx, split.alternateTargetId, 'social_redirect', [
        'charisma_second_listen_lane',
      ]);
    }
    if (leader && pick('tcl1', 0.26)) {
      return buildDecision(ctx, suspicionCtx, leader, 'social_momentum_nudge', ['soft_room_pace']);
    }
    if (second !== top && pick('tcl2', 0.22)) {
      return buildDecision(ctx, suspicionCtx, second, 'indirect_alignment', ['pair_compare_listen']);
    }
    if (leader && pressure > 26 && pick('tcl3', 0.2)) {
      return buildDecision(ctx, suspicionCtx, leader, 'neutral_surface', ['glue_without_command']);
    }
    if (leader && momentum > 46 && pick('tcl4', 0.18)) {
      return buildDecision(ctx, suspicionCtx, leader, 'bandwagon_control', ['indirect_momentum_shape']);
    }
  }

  if (dr >= 2 && profile.deception >= 58 && split.alternateTargetId && pick('t0a', 0.24)) {
    return buildDecision(ctx, suspicionCtx, split.alternateTargetId, 'soft_focus_shift', [
      'town_listen_lane_open',
    ]);
  }
  if (dr >= 3 && profile.deception >= 62 && split.alternateTargetId && pick('t0', 0.28)) {
    return buildDecision(ctx, suspicionCtx, split.alternateTargetId, 'redirect_attention', [
      'town_mask_redirect',
    ]);
  }
  if (dr >= 2 && profile.deception >= 60 && leader && pick('t0b', 0.2)) {
    return buildDecision(ctx, suspicionCtx, leader, 'indirect_alignment', ['room_weight_soft']);
  }
  if (dr >= 2 && profile.deception >= 58 && pick('t0c', 0.2)) {
    return buildDecision(ctx, suspicionCtx, second, 'pressure_seed', ['town_thread_seed']);
  }
  if (dr >= 2 && profile.deception >= 62 && pick('t1', 0.22)) {
    return buildDecision(ctx, suspicionCtx, mid, 'passive_doubt_injection', ['town_soft_float']);
  }
  if (dr >= 3 && cautious && primary && pick('t2', 0.2)) {
    return buildDecision(ctx, suspicionCtx, primary, 'preserve_cover', ['town_delay_commit']);
  }
  if (dr >= 3 && profile.deception >= 60 && primary && leader && primary !== leader && pick('t3', 0.18)) {
    return buildDecision(ctx, suspicionCtx, primary, 'social_momentum_nudge', ['non_leader_momentum']);
  }
  if (dr >= 2 && emo && pick('t4', 0.16)) {
    return buildDecision(ctx, suspicionCtx, second, 'low_commitment_pressure', ['emotional_concern_nudge']);
  }
  return null;
}

function buildDecision(
  ctx: VotingEngineContext,
  suspicionCtx: SuspicionObserverContext,
  targetId: string | null,
  intent: StrategicVoteIntent,
  reason: string[]
): VoteDecision {
  const tid =
    targetId ??
    getMostSuspiciousTarget(ctx.suspicionState, aliveIds(ctx), ctx.observerId, []) ??
    ctx.alivePlayers.find((p) => p.id !== ctx.observerId)?.id ??
    ctx.observerId;
  const confidence = calculateVoteConfidence(ctx, suspicionCtx, tid, intent);
  return {
    targetId: tid,
    target: nameOf(ctx, tid),
    confidence,
    strategicIntent: intent,
    reason: reason.length ? reason : ['default_suspicion_tally'],
  };
}

/**
 * Initial vote choice for this observer this phase.
 */
export function decideVote(ctx: VotingEngineContext): VoteDecision {
  const profile = getAIBehaviorProfile(ctx.observerCharacter);
  const thoughtCtx = toThoughtCtx(ctx);
  const suspicionCtx = buildSuspicionContext(
    ctx.observerId,
    ctx.observerCharacter,
    aliveIds(ctx)
  );

  const pressure = evaluateVotePressure(ctx);
  const momentum = estimateBandwagonMomentum(ctx);
  const split = detectSplitVoteOpportunity(ctx, suspicionCtx);
  const sac = decideStrategicSacrifice(ctx, suspicionCtx);

  if (sac.shouldSacrifice && sac.targetId) {
    return buildDecision(ctx, suspicionCtx, sac.targetId, 'sacrifice_teammate', [
      ...sac.reasons,
      'survival_instinct_over_pack_loyalty',
    ]);
  }

  const primary = choosePrimarySuspect(thoughtCtx, suspicionCtx);
  const allySet = new Set(ctx.hiddenAllyIds ?? []);

  if (primary && allySet.has(primary)) {
    const alt = pickNextSuspectExcluding(ctx, suspicionCtx, new Set([primary, ...allySet]));
    if (alt) {
      const d = ctx.observerCharacter.difficulty;
      const canSophisticatedMask =
        (d === 'Hard' && profile.deception >= 36) ||
        (d === 'Medium' && profile.deception >= 44) ||
        (d === 'Easy' && profile.deception >= 58);
      if (canSophisticatedMask) {
        const softBus = profile.caution >= 74 && maskJitter(ctx, 'wolf_bus') < 0.52;
        return buildDecision(
          ctx,
          suspicionCtx,
          alt,
          profile.deception >= 72 ? (softBus ? 'shield_teammate_softly' : 'fake_support') : 'protect_ally',
          ['primary_read_points_at_hidden_ally', 'pivot_to_next_hot_seat']
        );
      }
      return buildDecision(ctx, suspicionCtx, alt, 'sincere_exile_push', [
        'wolf_avoid_voting_packmate',
        'surface_push_next_hot',
      ]);
    }
  }

  if (
    split.opportunity &&
    split.alternateTargetId &&
    (ctx.observerCharacter.difficulty === 'Medium' || ctx.observerCharacter.difficulty === 'Hard') &&
    shouldAugmentStructuralReasoning(profile, ctx.observerCharacter.difficulty) &&
    profile.deception > 52 &&
    profile.randomness < 92
  ) {
    return buildDecision(ctx, suspicionCtx, split.alternateTargetId, 'split_vote', [
      'tight_suspicion_margin',
      'engineer_counter_wagon',
      'hide_true_network',
    ]);
  }

  if (
    split.opportunity &&
    split.alternateTargetId &&
    profile.randomness > 88 &&
    ctx.observerCharacter.difficulty !== 'Novice' &&
    ctx.observerCharacter.difficulty !== 'Easy' &&
    profile.caution < 72
  ) {
    return buildDecision(ctx, suspicionCtx, split.alternateTargetId, 'chaotic_flip', [
      'intentional_split_for_entropy',
    ]);
  }

  const leader = getBallotLeader(ctx);
  const maskTry = trySocialMaskVote(ctx, suspicionCtx, profile, primary, leader, pressure, momentum, split);
  if (maskTry) return maskTry;

  if (leader && profile.leadership > 72 && momentum > 55 && pressure > 40 && profile.followMajorityChance < 50) {
    if (!allySet.has(leader) || ctx.sacrificeCandidateIds?.includes(leader)) {
      return buildDecision(ctx, suspicionCtx, leader, 'bandwagon_control', [
        'organize_majority_momentum',
        'social_thread_consolidation',
      ]);
    }
  }

  if (profile.caution > 78 && pressure < 28 && primary) {
    return buildDecision(ctx, suspicionCtx, primary, 'delayed_commit', [
      'low_public_pressure',
      'hold_read_until_commit_visible',
    ]);
  }

  if (profile.followMajorityChance > 68 && leader && pressure > 52) {
    if (!allySet.has(leader)) {
      return buildDecision(ctx, suspicionCtx, leader, 'majority_follow', [
        'bandwagon_reduces_exile_risk',
        'social_pressure_rising',
      ]);
    }
  }

  if (profile.emotionality > 80 && profile.revengeBias > 65) {
    const rev = argmaxThreat(ctx, suspicionCtx, allySet);
    if (rev && rev !== primary) {
      return buildDecision(ctx, suspicionCtx, rev, 'revenge_pivot', [
        'threat_maximization_emotional',
        'revenge_bias_weighting',
      ]);
    }
  }

  const fallback =
    primary ??
    getMostSuspiciousTarget(ctx.suspicionState, aliveIds(ctx), ctx.observerId, [...allySet]);
  return buildDecision(ctx, suspicionCtx, fallback, 'sincere_exile_push', [
    'suspicion_primary',
    'no_strategic_override',
  ]);
}

export type ReconsiderVoteResult = {
  changed: boolean;
  decision: VoteDecision;
};

/**
 * Decide whether to keep `previousTargetId` or adopt a fresh `decideVote()` outcome.
 * Stubborn profiles require a larger suspicion gap to pivot.
 */
export function reconsiderVote(
  ctx: VotingEngineContext,
  previousTargetId: string | null
): ReconsiderVoteResult {
  const fresh = decideVote(ctx);
  const suspicionCtx = buildSuspicionContext(
    ctx.observerId,
    ctx.observerCharacter,
    aliveIds(ctx)
  );
  const profile = suspicionCtx.profile;

  if (!previousTargetId || previousTargetId === fresh.targetId) {
    return { changed: false, decision: fresh };
  }

  const mustPivot =
    fresh.strategicIntent === 'sacrifice_teammate' ||
    fresh.strategicIntent === 'protect_ally' ||
    fresh.strategicIntent === 'fake_support' ||
    fresh.strategicIntent === 'shield_teammate_softly' ||
    (fresh.strategicIntent === 'split_vote' &&
      (isHard(ctx.observerCharacter.difficulty) ||
        shouldAugmentStructuralReasoning(profile, ctx.observerCharacter.difficulty) ||
        profile.deception >= 75));

  if (mustPivot) {
    return { changed: true, decision: fresh };
  }

  const prevS = ctx.suspicionState.scores[previousTargetId] ?? 0;
  const newS = ctx.suspicionState.scores[fresh.targetId] ?? 0;
  const gap = newS - prevS;
  let threshold = 10 + profile.voteChangeResistance * 0.38 - profile.randomness * 0.06;
  if (profile.caution >= 70) {
    threshold += (profile.caution - 70) * 0.45;
  }

  if (gap < threshold) {
    const holdIntent: StrategicVoteIntent =
      profile.deception > 58 && profile.caution > 72 ? 'preserve_cover' : 'sincere_exile_push';
    return {
      changed: false,
      decision: buildDecision(ctx, suspicionCtx, previousTargetId, holdIntent, [
        'stubborn_vote_hold',
        `gap_${gap.toFixed(0)}_below_threshold_${threshold.toFixed(0)}`,
      ]),
    };
  }

  return { changed: true, decision: fresh };
}
