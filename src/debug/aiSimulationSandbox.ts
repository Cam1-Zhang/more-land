/**
 * AI-only match simulator for validating engines (no GPT, no network).
 */
import { CHARACTERS } from '../data/mockData';
import type { AICharacter, DifficultyType } from '../types';
import { getAIBehaviorProfile } from '../data/aiBehaviorProfiles';
import { createEmptySuspicionState, updateSuspicionFromEvent, buildSuspicionContext, type SuspicionState } from '../utils/suspicionEngine';
import { generateThoughts, type ThoughtEngineContext, type InternalThoughtSnapshot } from '../utils/thoughtEngine';
import {
  createEmptyMemoryStore,
  rememberEvent,
  forgetOldEvents,
  summarizePlayerHistory,
  type MemoryStore,
} from '../utils/memoryEngine';
import { createInitialEmotionState, updateEmotionState, getDominantEmotion, type EmotionState } from '../utils/emotionEngine';
import { reconsiderVote, isManipulationVoteIntent, isStrategicMaskIntent, isRedirectOrSoftPressureIntent, type VotingEngineContext, type VoteDecision, type StrategicVoteIntent } from '../utils/votingEngine';
import { analyzeSpeechUncertaintyLine } from '../utils/uncertaintyCommitment';
import type { AppLanguage } from '../i18n/appStrings';
import {
  SimulationLogger,
  type SimulationLogEntry,
  type ProfileLite,
  generateMatchSummary,
} from './simulationLogger';

import {
  resolveSandboxRoster,
  assignSandboxWolfIds,
  buildDifficultyMix,
  type SandboxRosterMode,
  type SandboxRoleMode,
  type StressProfileTargets,
} from './sandboxRosterToolkit';

export type { SandboxRosterMode, SandboxRoleMode, StressProfileTargets };

export type SandboxMatchMeta = {
  seed: number;
  rosterMode: SandboxRosterMode;
  roleMode: SandboxRoleMode;
  roster: readonly { id: string; name: string; difficulty: DifficultyType }[];
  roleById: Record<string, 'wolf' | 'town'>;
  difficultyMix: Record<DifficultyType, number>;
  tags: readonly string[];
  orderPreserved: boolean;
  unresolvedRosterTokens: readonly string[];
  wolfCount: number;
  playerCount: number;
  usedManualRoles: boolean;
  stressApplied: boolean;
  roleFallbackReason?: string;
  roleRerollOffset?: number;
};

export type SandboxConfig = {
  playerCount: number;
  /** Deterministic PRNG seed. */
  seed: number;
  /** Delay ms between phases (0 = fastest). */
  speedMs: number;
  /** No human seat — all actors are simulated AIs. */
  observeMode: true;
  maxPhases: number;
  rosterMode?: SandboxRosterMode;
  /** Ids or names, in seat order when `preserveCustomOrder` is true. */
  customRosterOrder?: readonly string[];
  preserveCustomOrder?: boolean;
  roleMode?: SandboxRoleMode;
  manualRolesByIdOrName?: Readonly<Record<string, 'wolf' | 'town'>>;
  stressProfileTargets?: StressProfileTargets;
  matchTags?: readonly string[];
  /** Bump to reshuffle wolf seats without changing roster RNG (default 0). */
  roleRerollOffset?: number;
};

export type MaskVoteLedger = {
  maskIntentCount: number;
  fakeSupportCount: number;
  redirectCount: number;
  /** Vote intent `delayed_commit` hits. */
  delayedCommitCount: number;
  /** Speech lines with soft uncertainty / delayed-commit posture. */
  uncertaintyLines: number;
  speechHardCommits: number;
  ambiguityUsage: number;
  speechLineCount: number;
  delayedCommitSpeechCount: number;
  /** Any vote intent in `REDIRECT_OR_SOFT_PRESSURE_INTENTS`. */
  redirectSoftCount: number;
  pressureSeedCount: number;
  focusShiftCount: number;
  narrativeRedirectCount: number;
  socialMomentumActions: number;
};

function bumpRedirectSoftPressureBreakdown(ledger: MaskVoteLedger, intent: StrategicVoteIntent): void {
  if (!isRedirectOrSoftPressureIntent(intent)) return;
  ledger.redirectSoftCount += 1;
  switch (intent) {
    case 'pressure_seed':
    case 'low_commitment_pressure':
    case 'delayed_pressure_stack':
    case 'passive_doubt_injection':
    case 'soft_pressure':
    case 'indirect_pressure':
      ledger.pressureSeedCount += 1;
      break;
    case 'soft_focus_shift':
    case 'redirect_attention':
      ledger.focusShiftCount += 1;
      break;
    case 'topic_reframe':
    case 'indirect_alignment':
    case 'social_redirect':
    case 'preserve_cover':
      ledger.narrativeRedirectCount += 1;
      break;
    case 'social_momentum_nudge':
    case 'hidden_push':
      ledger.socialMomentumActions += 1;
      break;
    default:
      break;
  }
}

function bumpMaskVoteLedgerFromSpeech(ledger: MaskVoteLedger, line: string, lang: AppLanguage): void {
  const a = analyzeSpeechUncertaintyLine(line, lang);
  ledger.speechLineCount += 1;
  if (a.hardCommit) ledger.speechHardCommits += 1;
  if (a.ambiguityMarker) ledger.ambiguityUsage += 1;
  if (a.uncertaintySoft || a.delayedCommitFraming) ledger.uncertaintyLines += 1;
  if (a.delayedCommitFraming) ledger.delayedCommitSpeechCount += 1;
}

function bumpMaskVoteLedger(ledger: MaskVoteLedger, vote: VoteDecision): void {
  if (isStrategicMaskIntent(vote.strategicIntent)) ledger.maskIntentCount += 1;
  if (vote.strategicIntent === 'fake_support') ledger.fakeSupportCount += 1;
  if (vote.strategicIntent === 'social_redirect' || vote.strategicIntent === 'preserve_cover') {
    ledger.redirectCount += 1;
  }
  if (vote.strategicIntent === 'delayed_commit') ledger.delayedCommitCount += 1;
  bumpRedirectSoftPressureBreakdown(ledger, vote.strategicIntent);
}

export type SimBrainSnapshot = {
  character: AICharacter;
  suspicion: SuspicionState;
  memory: MemoryStore;
  emotion: EmotionState;
  lastThought: InternalThoughtSnapshot | null;
  lastVote: VoteDecision | null;
  /** Cumulative mask-behavior counters (simulation / debug). */
  maskVoteLedger: MaskVoteLedger;
  assumedAllies: string[];
  alive: boolean;
  role: 'wolf' | 'town';
};

export type SandboxSnapshot = {
  phase: number;
  seed: number;
  players: SimBrainSnapshot[];
  log: SimulationLogEntry[];
  wolfIds: string[];
  manipulationCounts: Record<string, number>;
  allianceEdges: { a: string; b: string; weight: number }[];
  betrayals: { phase: number; line: string }[];
  voteHistory: { phase: number; voterId: string; targetId: string }[];
  matchMeta: SandboxMatchMeta;
};

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function recomputeAllies(
  voteHistory: { phase: number; voterId: string; targetId: string }[],
  observerId: string,
  names: Map<string, string>
): string[] {
  const scores: Record<string, number> = {};
  const byPhase = new Map<number, { voterId: string; targetId: string }[]>();
  for (const v of voteHistory) {
    if (!byPhase.has(v.phase)) byPhase.set(v.phase, []);
    byPhase.get(v.phase)!.push(v);
  }
  for (const [, ballots] of byPhase) {
    const mine = ballots.find((b) => b.voterId === observerId);
    if (!mine) continue;
    for (const b of ballots) {
      if (b.voterId === observerId) continue;
      if (b.targetId === mine.targetId) scores[b.voterId] = (scores[b.voterId] ?? 0) + 1;
    }
  }
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 2)
    .map(([id]) => names.get(id) ?? id);
}

function syntheticSpeechLine(
  thought: InternalThoughtSnapshot,
  lang: 'zh' | 'en',
  profile: ReturnType<typeof getAIBehaviorProfile>
): string {
  const charmLead =
    profile.sociability > 76 && profile.leadership > 65 && profile.confidence >= 68;
  if (lang === 'zh') {
    if (charmLead) {
      const t = thought.target;
      return `【${thought.emotion}】这轮我想先听${t}把话说满，也想看看大家怎么对齐——不急着把谁一票钉死；${thought.reasons[0] ?? '我感觉场上推力有点强，更像压力线还没翻成定锤'}。`;
    }
    if (profile.deception >= 68) {
      return `【${thought.emotion}】${thought.target}这轮我会重点听TA怎么接：${thought.reasons[0] ?? '语感有点飘'}，不急着归，想再听一轮对齐。`;
    }
    if (profile.deception >= 46) {
      return `【${thought.emotion}】${thought.target}我放不太下，但现在更像轻怀疑——${thought.reasons[0] ?? '细节还得圆'}。`;
    }
    return `【${thought.emotion}】我在听${thought.target}：${thought.reasons[0] ?? '信号不太对'}，先不下死结论。`;
  }
  if (charmLead) {
    const t = thought.target;
    return `[${thought.emotion}] I'd rather hear ${t} out fully and let the table align—no rush to hard-exile; ${thought.reasons[0] ?? 'the room feels pushed, still pressure not a closed case'}.`;
  }
  if (profile.deception >= 68) {
    return `[${thought.emotion}] Parking ${thought.target} as a watch read—${thought.reasons[0] ?? 'thin hinge'}—not ready to hammer yet; one more pass.`;
  }
  if (profile.deception >= 46) {
    return `[${thought.emotion}] Light sus on ${thought.target}: ${thought.reasons[0] ?? 'something wobbles'}—I want the next round to tighten it.`;
  }
  return `[${thought.emotion}] Listening to ${thought.target}: ${thought.reasons[0] ?? 'signals off'}—holding slack to revise.`;
}

function profileLite(c: AICharacter): ProfileLite {
  const p = getAIBehaviorProfile(c);
  return {
    id: c.id,
    name: c.name,
    difficulty: c.difficulty,
    aggression: p.aggression,
    caution: p.caution,
    deception: p.deception,
    emotionality: p.emotionality,
    logic: p.logic,
    voteChangeResistance: p.voteChangeResistance,
    sociability: p.sociability,
    leadership: p.leadership,
  };
}

function logConsole(e: SimulationLogEntry): void {
  if (typeof __DEV__ !== 'undefined' && !__DEV__) return;
  // eslint-disable-next-line no-console
  console.log(`[sim] ${e.t}`, e);
}

export async function runAiSimulationSandbox(
  config: SandboxConfig,
  hooks?: { onSnapshot?: (s: SandboxSnapshot) => void; onLog?: (e: SimulationLogEntry) => void }
): Promise<{ snapshot: SandboxSnapshot; summary: ReturnType<typeof generateMatchSummary> }> {
  const rng = mulberry32(config.seed);
  const resolved = resolveSandboxRoster(CHARACTERS, rng, {
    playerCount: config.playerCount,
    rosterMode: config.rosterMode,
    customRosterOrder: config.customRosterOrder,
    preserveCustomOrder: config.preserveCustomOrder,
    stressProfileTargets: config.stressProfileTargets,
  });
  const roster = resolved.roster;
  const n = roster.length;
  const ids = roster.map((c) => c.id);
  const nameById = new Map(roster.map((c) => [c.id, c.name]));

  const roleRng = mulberry32(config.seed + Math.floor(config.roleRerollOffset ?? 0) * 918273);
  const roleAs = assignSandboxWolfIds(roster, roleRng, config.roleMode, config.manualRolesByIdOrName);
  const wolves = roleAs.wolfIds;

  const mix = buildDifficultyMix(roster);
  const roleById: Record<string, 'wolf' | 'town'> = {};
  for (const c of roster) {
    roleById[c.id] = wolves.has(c.id) ? 'wolf' : 'town';
  }

  const tags: string[] = [
    ...(config.matchTags ?? []),
    `roster:${resolved.rosterMode}`,
    `roles:${config.roleMode ?? 'random'}`,
    `seed:${config.seed}`,
    `difficultyMix:Novice=${mix.Novice},Easy=${mix.Easy},Medium=${mix.Medium},Hard=${mix.Hard}`,
    `playerCount:${n}`,
    `wolfCount:${wolves.size}`,
  ];
  if (resolved.stressApplied) tags.push('stress:profile');
  if (resolved.unresolvedTokens.length) tags.push(`unresolved:${resolved.unresolvedTokens.join('|')}`);
  if ((config.roleRerollOffset ?? 0) > 0) tags.push(`roleReroll:${config.roleRerollOffset}`);

  const matchMeta: SandboxMatchMeta = {
    seed: config.seed,
    rosterMode: resolved.rosterMode,
    roleMode: config.roleMode ?? 'random',
    roster: roster.map((c) => ({ id: c.id, name: c.name, difficulty: c.difficulty })),
    roleById,
    difficultyMix: mix,
    tags,
    orderPreserved: resolved.orderPreserved,
    unresolvedRosterTokens: resolved.unresolvedTokens,
    wolfCount: wolves.size,
    playerCount: n,
    usedManualRoles: roleAs.usedManual,
    stressApplied: resolved.stressApplied,
    roleFallbackReason: roleAs.fallbackReason,
    roleRerollOffset: config.roleRerollOffset,
  };

  const logger = new SimulationLogger();
  const voteHistory: { phase: number; voterId: string; targetId: string }[] = [];
  const manipulationCounts: Record<string, number> = {};
  const betrayals: { phase: number; line: string }[] = [];
  const allianceEdges: { a: string; b: string; weight: number }[] = [];
  const aliveByPhase = new Map<number, Set<string>>();
  const survivalPhases: Record<string, number> = {};
  for (const c of roster) survivalPhases[c.id] = 0;

  type Brain = {
    character: AICharacter;
    suspicion: SuspicionState;
    memory: MemoryStore;
    emotion: EmotionState;
    lastThought: InternalThoughtSnapshot | null;
    lastVote: VoteDecision | null;
    alive: boolean;
    role: 'wolf' | 'town';
    lastThoughtPrimaryId: string | null;
    consecutivePrimaryThoughtTicks: number;
    maskVoteLedger: MaskVoteLedger;
  };

  const brains: Brain[] = roster.map((c) => ({
    character: c,
    suspicion: createEmptySuspicionState(ids),
    memory: createEmptyMemoryStore(
      c.difficulty === 'Hard'
        ? { shortTermRoundHorizon: 6, shortTermMax: 100, longTermPerSubjectCap: 28 }
        : undefined
    ),
    emotion: createInitialEmotionState(),
    lastThought: null,
    lastVote: null,
    alive: true,
    role: wolves.has(c.id) ? 'wolf' : 'town',
    lastThoughtPrimaryId: null,
    consecutivePrimaryThoughtTicks: 0,
    maskVoteLedger: {
      maskIntentCount: 0,
      fakeSupportCount: 0,
      redirectCount: 0,
      delayedCommitCount: 0,
      uncertaintyLines: 0,
      speechHardCommits: 0,
      ambiguityUsage: 0,
      speechLineCount: 0,
      delayedCommitSpeechCount: 0,
      redirectSoftCount: 0,
      pressureSeedCount: 0,
      focusShiftCount: 0,
      narrativeRedirectCount: 0,
      socialMomentumActions: 0,
    },
  }));

  let phase = 0;
  const push = (e: SimulationLogEntry) => {
    logger.push(e);
    hooks?.onLog?.(e);
    logConsole(e);
  };

  push({
    t: 'match_meta',
    phase: 0,
    seed: matchMeta.seed,
    rosterMode: matchMeta.rosterMode,
    roleMode: matchMeta.roleMode,
    roster: matchMeta.roster,
    roleById: matchMeta.roleById,
    difficultyMix: matchMeta.difficultyMix,
    tags: matchMeta.tags,
    orderPreserved: matchMeta.orderPreserved,
    unresolvedRosterTokens: matchMeta.unresolvedRosterTokens,
    wolfCount: matchMeta.wolfCount,
    playerCount: matchMeta.playerCount,
    usedManualRoles: matchMeta.usedManualRoles,
    stressApplied: matchMeta.stressApplied,
    roleFallbackReason: matchMeta.roleFallbackReason,
    roleRerollOffset: matchMeta.roleRerollOffset,
  });

  while (phase < config.maxPhases) {
    phase += 1;
    const aliveList = brains.filter((b) => b.alive);
    if (aliveList.length <= 2) break;

    const aliveSet = new Set(aliveList.map((b) => b.character.id));
    aliveByPhase.set(phase, new Set(aliveSet));
    for (const b of aliveList) survivalPhases[b.character.id] = phase;

    const alivePlayers = aliveList.map((b) => ({ id: b.character.id, name: b.character.name }));

    // --- Discussion: thoughts, emotions, synthetic speech, suspicion/memory ---
    for (const b of aliveList) {
      const thoughtCtx: ThoughtEngineContext = {
        observerId: b.character.id,
        observerCharacter: b.character,
        alivePlayers,
        suspicionState: b.suspicion,
        thoughtTick: phase * 100 + aliveList.indexOf(b),
        priorThoughtPrimaryId: b.lastThoughtPrimaryId,
        readCommitmentTicks: b.consecutivePrimaryThoughtTicks,
      };
      const thought = generateThoughts(thoughtCtx);
      b.lastThought = thought;
      const tid = thought.targetId;
      if (b.lastThoughtPrimaryId === tid) {
        b.consecutivePrimaryThoughtTicks = Math.min(220, b.consecutivePrimaryThoughtTicks + 1);
      } else {
        b.consecutivePrimaryThoughtTicks = 1;
      }
      b.lastThoughtPrimaryId = tid;

      const emoIn = {
        accusedThisRound: rng() < 0.12 + getAIBehaviorProfile(b.character).emotionality / 400,
        survivalOdds: clamp(35 + rng() * 50 - (wolves.has(b.character.id) ? 15 : 0), 0, 100),
        alliesDeadCount: roster.filter(
          (x) => wolves.has(x.id) === wolves.has(b.character.id) && !brains.find((br) => br.character.id === x.id)?.alive
        ).length,
        aliveAllyCount: aliveList.filter((x) => wolves.has(x.character.id) === wolves.has(b.character.id)).length,
        pressure: rng() * 100,
        isolation: rng() * 80,
        voteTargeting: thought.dangerLevel,
        profile: getAIBehaviorProfile(b.character),
      };
      b.emotion = updateEmotionState(b.emotion, emoIn);

      push({
        t: 'thought',
        phase,
        observerId: b.character.id,
        observerName: b.character.name,
        target: thought.target,
        targetId: thought.targetId,
        confidence: thought.confidence,
        emotion: thought.emotion,
        reasons: thought.reasons,
      });
      const dom = getDominantEmotion(b.emotion);
      push({
        t: 'emotion',
        phase,
        observerId: b.character.id,
        observerName: b.character.name,
        dominant: dom,
        stress: b.emotion.stress,
        vector: { ...b.emotion.vector },
      });

      const line = syntheticSpeechLine(thought, 'zh', getAIBehaviorProfile(b.character));
      push({ t: 'speech', phase, speakerId: b.character.id, speakerName: b.character.name, line });
      bumpMaskVoteLedgerFromSpeech(b.maskVoteLedger, line, 'zh');

      // Synthetic events toward thought target (deterministic variety)
      const targetId = thought.targetId;
      if (targetId && targetId !== b.character.id) {
        const types = ['contradiction', 'vote_changed', 'followed_majority_blindly'] as const;
        const evKind = types[Math.floor(rng() * types.length)]!;
        b.suspicion = updateSuspicionFromEvent(
          b.suspicion,
          { type: evKind, subjectId: targetId, magnitude: 0.7 + rng() * 0.5 },
          buildSuspicionContext(b.character.id, b.character, aliveList.map((x) => x.character.id))
        );
        push({
          t: 'suspicion',
          phase,
          observerId: b.character.id,
          observerName: b.character.name,
          deltas: { [targetId]: 4 },
          reason: evKind,
        });
        const mem = rememberEvent(b.memory, {
          round: phase,
          phaseIndex: 0,
          kind: evKind === 'contradiction' ? 'suspicious_behavior' : 'vote',
          subjectId: targetId,
          intensity: 40 + rng() * 40,
          tags: evKind === 'vote_changed' ? ['vote_changed'] : ['pile_on'],
        });
        b.memory = mem;
        push({
          t: 'memory',
          phase,
          observerId: b.character.id,
          observerName: b.character.name,
          kind: 'event',
          detail: `${evKind}->${targetId}`,
        });
      }

      if (config.speedMs > 0) await sleep(config.speedMs);
    }

    // --- Voting ---
    const tally: Record<string, number> = {};
    const partial: Record<string, string> = {};
    for (const b of aliveList) {
      const assumed = recomputeAllies(voteHistory, b.character.id, nameById);
      push({
        t: 'alliance',
        phase,
        observerId: b.character.id,
        observerName: b.character.name,
        assumedAllies: assumed,
        note: 'co_vote_heuristic',
      });

      const wolfPack = aliveList.filter((x) => wolves.has(x.character.id)).map((x) => x.character.id);
      const sac = wolves.has(b.character.id) ? wolfPack.filter((id) => id !== b.character.id) : [];

      const vctx: VotingEngineContext = {
        observerId: b.character.id,
        observerCharacter: b.character,
        alivePlayers,
        suspicionState: b.suspicion,
        thoughtTick: phase * 1000 + 1,
        phaseIndex: phase,
        currentBallot: { ...partial },
        hiddenAllyIds: wolves.has(b.character.id) ? wolfPack : [],
        sacrificeCandidateIds: sac,
      };
      const voteResult = reconsiderVote(vctx, b.lastVote?.targetId ?? null);
      const vote = voteResult.decision;
      b.lastVote = vote;
      partial[b.character.id] = vote.targetId;
      tally[vote.targetId] = (tally[vote.targetId] ?? 0) + 1;
      voteHistory.push({ phase, voterId: b.character.id, targetId: vote.targetId });

      if (isManipulationVoteIntent(vote.strategicIntent)) {
        manipulationCounts[b.character.id] = (manipulationCounts[b.character.id] ?? 0) + 1;
      }

      bumpMaskVoteLedger(b.maskVoteLedger, vote);

      push({
        t: 'vote',
        phase,
        voterId: b.character.id,
        voterName: b.character.name,
        targetId: vote.targetId,
        targetName: nameById.get(vote.targetId) ?? vote.targetId,
        intent: vote.strategicIntent,
        confidence: vote.confidence,
        reasons: vote.reason,
      });

      if (vote.strategicIntent === 'sacrifice_teammate') {
        betrayals.push({
          phase,
          line: `${b.character.name} sac_vote->${vote.target}`,
        });
        push({
          t: 'betrayal',
          phase,
          subjectId: b.character.id,
          subjectName: b.character.name,
          victimId: vote.targetId,
          victimName: vote.target,
          detail: 'strategic_sacrifice_intent',
        });
      }

      if (config.speedMs > 0) await sleep(Math.max(0, Math.floor(config.speedMs / 3)));
    }

    // Alliance edge weights from this phase ballot
    const targets = Object.entries(partial);
    for (let i = 0; i < targets.length; i += 1) {
      for (let j = i + 1; j < targets.length; j += 1) {
        const [a, ta] = targets[i]!;
        const [b, tb] = targets[j]!;
        if (ta !== tb) continue;
        const found = allianceEdges.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
        if (found) found.weight += 1;
        else allianceEdges.push({ a, b, weight: 1 });
      }
    }

    // Eliminate top tally
    let elim: string | null = null;
    let best = -1;
    for (const [tid, c] of Object.entries(tally)) {
      if (c > best) {
        best = c;
        elim = tid;
      }
    }
    if (elim) {
      const victim = brains.find((x) => x.character.id === elim);
      if (victim) victim.alive = false;
      push({
        t: 'elimination',
        phase,
        eliminatedId: elim,
        eliminatedName: nameById.get(elim) ?? elim,
        voteTally: tally,
      });
    }

    // Memory prune + strategic log
    for (const b of brains) {
      b.memory = forgetOldEvents(b.memory, phase);
      push({
        t: 'strategic',
        phase,
        actorId: b.character.id,
        actorName: b.character.name,
        tag: 'memory_prune',
        detail: `round=${phase}`,
      });
    }

    const snap: SandboxSnapshot = {
      phase,
      seed: config.seed,
      players: brains.map((b) => ({
        character: b.character,
        suspicion: b.suspicion,
        memory: b.memory,
        emotion: b.emotion,
        lastThought: b.lastThought,
        lastVote: b.lastVote,
        maskVoteLedger: { ...b.maskVoteLedger },
        assumedAllies: recomputeAllies(voteHistory, b.character.id, nameById),
        alive: b.alive,
        role: b.role,
      })),
      log: [...logger.entries],
      wolfIds: [...wolves],
      manipulationCounts: { ...manipulationCounts },
      allianceEdges: [...allianceEdges],
      betrayals: [...betrayals],
      voteHistory: [...voteHistory],
      matchMeta,
    };
    hooks?.onSnapshot?.(snap);
  }

  const profiles = roster.map(profileLite);
  const summary = generateMatchSummary({
    entries: logger.entries,
    profiles,
    wolfIds: wolves,
    survivalPhases,
    manipulationCounts,
    allianceEdges,
    betrayals,
    aliveByPhase,
  });

  const snapshot: SandboxSnapshot = {
    phase,
    seed: config.seed,
    players: brains.map((b) => ({
      character: b.character,
      suspicion: b.suspicion,
      memory: b.memory,
      emotion: b.emotion,
      lastThought: b.lastThought,
      lastVote: b.lastVote,
      maskVoteLedger: { ...b.maskVoteLedger },
      assumedAllies: recomputeAllies(voteHistory, b.character.id, nameById),
      alive: b.alive,
      role: b.role,
    })),
    log: [...logger.entries],
    wolfIds: [...wolves],
    manipulationCounts: { ...manipulationCounts },
    allianceEdges: [...allianceEdges],
    betrayals: [...betrayals],
    voteHistory: [...voteHistory],
    matchMeta,
  };

  return { snapshot, summary };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function runAiSimulationSandboxSync(config: SandboxConfig): ReturnType<typeof runAiSimulationSandbox> {
  return runAiSimulationSandbox({ ...config, speedMs: 0 });
}
