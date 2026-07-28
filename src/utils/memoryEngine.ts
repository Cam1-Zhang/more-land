/**
 * Deterministic AI memory: accusations, votes, alliances, speech signals, emotions.
 * No GPT — structured events + numeric aggregates for suspicion / trust / voting hooks.
 */
import type { AppLanguage } from '../i18n/appStrings';
import type { DifficultyType } from '../types';
import type { AIBehaviorProfile } from '../data/aiBehaviorProfiles';
import { shouldAugmentStructuralReasoning } from './personaDifficultyPriority';
import { buildDiscussionFocusSnapshot } from './focusTracker';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export type MemoryKind =
  | 'accusation'
  | 'vote'
  | 'alliance_hint'
  | 'betrayal'
  | 'speech_pattern'
  | 'suspicious_behavior'
  | 'emotional_conflict';

export type MemoryLayer = 'short' | 'long' | 'emotional';

export type MemoryEvent = {
  /** Stable id for dedupe / tests. */
  id: string;
  round: number;
  phaseIndex: number;
  kind: MemoryKind;
  /** Who initiated / is tagged as source of the memory. */
  subjectId: string;
  /** Primary other seat (accused, vote target, betrayed party, etc.). */
  targetId?: string;
  relatedIds?: readonly string[];
  /** 0–100 salience. */
  intensity: number;
  tags: readonly string[];
  layer: MemoryLayer;
  /** Optional structured hints (e.g. vote_target, flip_count). */
  payload?: Readonly<Record<string, string | number | boolean>>;
};

/** Remove structured daytime exile ballot rows (voter→target) from shared AI memory. */
export function stripDaytimeExileBallotVoteEvents(store: MemoryStore): MemoryStore {
  const next: MemoryEvent[] = [];
  for (const e of store.events) {
    if (e.kind === 'vote' && e.tags.includes('exile_ballot')) continue;
    next.push(e);
  }
  return { ...store, events: next };
}

export type MemoryStoreConfig = {
  /** Max short-term events kept globally (FIFO by insertion). */
  shortTermMax: number;
  /** Long-term: max events retained per `subjectId`. */
  longTermPerSubjectCap: number;
  /** Drop short-term events strictly older than this many rounds (Hard may extend). */
  shortTermRoundHorizon: number;
  /** Emotional charge decay factor per round when `forgetOldEvents` runs. */
  emotionalDecayPerRound: number;
};

const DEFAULT_CONFIG: MemoryStoreConfig = {
  shortTermMax: 80,
  longTermPerSubjectCap: 24,
  shortTermRoundHorizon: 3,
  emotionalDecayPerRound: 0.88,
};

export type MemoryStore = {
  events: MemoryEvent[];
  /**
   * Emotional friction: `emotionalCharge[aggressorId][victimId]` in 0–100.
   * Used for revenge-weighted suspicion without scanning full history each tick.
   */
  emotionalCharge: Record<string, Record<string, number>>;
  /** Monotonic game round counter last seen (for decay / pruning). */
  lastPrunedRound: number;
  config: MemoryStoreConfig;
};

export type RememberEventInput = Omit<MemoryEvent, 'id' | 'layer'> & {
  id?: string;
  layer?: MemoryLayer;
};

export type MemoryQuery = {
  playerId?: string;
  kinds?: readonly MemoryKind[];
  maxRoundsBack?: number;
  sinceRound?: number;
  /** If set, filters `round >= currentRound - maxRoundsBack`. */
  currentRound?: number;
  limit?: number;
  tagsAny?: readonly string[];
};

export type PlayerHistorySummary = {
  playerId: string;
  countsByKind: Partial<Record<MemoryKind, number>>;
  /** Deterministic one-liners (internal, not dialogue). */
  lines: string[];
  attackOnObserverCount: number;
  voteFlipCount: number;
  allianceHints: number;
  betrayalCount: number;
  emotionalConflictCount: number;
};

function stableEventId(e: RememberEventInput): string {
  if (e.id) return e.id;
  const base = `${e.round}|${e.phaseIndex}|${e.kind}|${e.subjectId}|${e.targetId ?? ''}|${(e.tags ?? []).join(',')}`;
  let h = 2166136261;
  for (let i = 0; i < base.length; i += 1) {
    h ^= base.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `mem_${(h >>> 0).toString(16)}`;
}

function assignDefaultLayer(e: RememberEventInput): MemoryLayer {
  if (e.layer) return e.layer;
  if (e.kind === 'emotional_conflict' || e.kind === 'betrayal' || e.kind === 'alliance_hint') {
    return e.intensity >= 55 ? 'long' : 'short';
  }
  if (e.kind === 'accusation' && e.intensity >= 60) return 'long';
  return 'short';
}

function bumpEmotionalCharge(
  charge: Record<string, Record<string, number>>,
  aggressorId: string,
  victimId: string,
  add: number
): void {
  if (!charge[aggressorId]) charge[aggressorId] = {};
  const row = charge[aggressorId]!;
  row[victimId] = clamp((row[victimId] ?? 0) + add, 0, 100);
}

/**
 * Append one memory; updates emotional aggregates for conflict / accusation vs observer.
 */
export function rememberEvent(store: MemoryStore, input: RememberEventInput): MemoryStore {
  const layer = assignDefaultLayer(input);
  const event: MemoryEvent = {
    ...input,
    id: stableEventId(input),
    tags: input.tags ?? [],
    layer,
  };

  const events = [...store.events, event];

  const emotionalCharge: MemoryStore['emotionalCharge'] = JSON.parse(
    JSON.stringify(store.emotionalCharge)
  ) as MemoryStore['emotionalCharge'];

  if (event.kind === 'emotional_conflict' && event.targetId) {
    bumpEmotionalCharge(emotionalCharge, event.subjectId, event.targetId, clamp(event.intensity * 0.35, 4, 28));
  }
  if (event.kind === 'accusation' && event.targetId && (event.tags.includes('against_observer') || event.tags.includes('public_speech'))) {
    bumpEmotionalCharge(emotionalCharge, event.subjectId, event.targetId, clamp(8 + event.intensity * 0.2, 8, 32));
  }

  return {
    ...store,
    events,
    emotionalCharge,
    lastPrunedRound: store.lastPrunedRound,
  };
}

function pruneShortTerm(events: MemoryEvent[], currentRound: number, cfg: MemoryStoreConfig): MemoryEvent[] {
  const floorRound = currentRound - cfg.shortTermRoundHorizon;
  const longOrEmo = events.filter((e) => e.layer === 'long' || e.layer === 'emotional');
  const short = events.filter((e) => e.layer === 'short');
  const keptShort = short.filter((e) => e.round >= floorRound);
  const tail = keptShort.slice(-cfg.shortTermMax);
  return [...longOrEmo, ...tail].sort((a, b) => a.round - b.round || a.phaseIndex - b.phaseIndex || a.id.localeCompare(b.id));
}

function pruneLongTermPerSubject(events: MemoryEvent[], cap: number): MemoryEvent[] {
  const bySubject: Record<string, MemoryEvent[]> = {};
  const rest: MemoryEvent[] = [];
  for (const e of events) {
    if (e.layer !== 'long') {
      rest.push(e);
      continue;
    }
    if (!bySubject[e.subjectId]) bySubject[e.subjectId] = [];
    bySubject[e.subjectId]!.push(e);
  }
  const trimmed: MemoryEvent[] = [];
  for (const arr of Object.values(bySubject)) {
    const sorted = [...arr].sort(
      (a, b) => b.round - a.round || b.intensity - a.intensity || a.id.localeCompare(b.id)
    );
    trimmed.push(...sorted.slice(0, cap));
  }
  return [...rest.filter((e) => e.layer !== 'long'), ...trimmed].sort(
    (a, b) => a.round - b.round || a.phaseIndex - b.phaseIndex || a.id.localeCompare(b.id)
  );
}

function decayEmotional(
  charge: MemoryStore['emotionalCharge'],
  roundsElapsed: number,
  factor: number
): MemoryStore['emotionalCharge'] {
  if (roundsElapsed <= 0) return charge;
  const mult = Math.pow(factor, roundsElapsed);
  const next: MemoryStore['emotionalCharge'] = {};
  for (const [a, row] of Object.entries(charge)) {
    next[a] = {};
    for (const [v, c] of Object.entries(row)) {
      const nv = c * mult;
      if (nv >= 0.5) next[a]![v] = nv;
    }
  }
  return next;
}

/**
 * Prune short-term horizon, cap long-term per subject, decay emotional charge.
 * Call once per new game day or when store grows too large.
 */
export function forgetOldEvents(
  store: MemoryStore,
  currentRound: number,
  overrides?: Partial<MemoryStoreConfig>
): MemoryStore {
  const cfg = { ...store.config, ...overrides };
  const roundsElapsed = Math.max(0, currentRound - store.lastPrunedRound);
  let events = pruneShortTerm(store.events, currentRound, cfg);
  events = pruneLongTermPerSubject(events, cfg.longTermPerSubjectCap);

  const emotionalCharge = decayEmotional(
    store.emotionalCharge,
    roundsElapsed,
    cfg.emotionalDecayPerRound
  );

  return {
    ...store,
    events,
    emotionalCharge,
    lastPrunedRound: currentRound,
    config: cfg,
  };
}

function playerTouchesEvent(e: MemoryEvent, playerId: string): boolean {
  if (e.subjectId === playerId) return true;
  if (e.targetId === playerId) return true;
  return (e.relatedIds ?? []).includes(playerId);
}

/**
 * Filter memories for suspicion / voting / thought retrieval (deterministic order).
 */
export function retrieveRelevantMemories(store: MemoryStore, query: MemoryQuery): MemoryEvent[] {
  const maxBack = query.maxRoundsBack ?? 999;
  const since = query.sinceRound ?? -1;
  const lim = query.limit ?? 40;
  const kinds = query.kinds ? new Set(query.kinds) : null;
  const tagNeed = query.tagsAny?.length ? new Set(query.tagsAny) : null;
  const roundFloor =
    query.currentRound != null && query.maxRoundsBack != null
      ? query.currentRound - query.maxRoundsBack
      : since;

  let list = store.events.filter((e) => e.round >= roundFloor && e.round >= since);
  if (query.playerId) {
    list = list.filter((e) => playerTouchesEvent(e, query.playerId!));
  }
  if (kinds) list = list.filter((e) => kinds.has(e.kind));
  if (tagNeed) {
    list = list.filter((e) => e.tags.some((t) => tagNeed.has(t)));
  }
  list = [...list].sort((a, b) => b.round - a.round || b.phaseIndex - a.phaseIndex || a.id.localeCompare(b.id));
  return list.slice(0, lim);
}

function countKind(events: MemoryEvent[], k: MemoryKind): number {
  return events.filter((e) => e.kind === k).length;
}

/**
 * Compact deterministic summary for one seat (for logs / internal prompts later).
 */
export function summarizePlayerHistory(
  store: MemoryStore,
  playerId: string,
  opts?: { ignoreDaytimeExileBallotVotes?: boolean }
): PlayerHistorySummary {
  let ev = store.events.filter((e) => playerTouchesEvent(e, playerId));
  if (opts?.ignoreDaytimeExileBallotVotes) {
    ev = ev.filter((e) => !(e.kind === 'vote' && e.tags.includes('exile_ballot')));
  }
  const countsByKind: PlayerHistorySummary['countsByKind'] = {};
  for (const k of [
    'accusation',
    'vote',
    'alliance_hint',
    'betrayal',
    'speech_pattern',
    'suspicious_behavior',
    'emotional_conflict',
  ] as MemoryKind[]) {
    const c = countKind(ev, k);
    if (c > 0) countsByKind[k] = c;
  }

  const attackOnObserverCount = ev.filter(
    (e) => e.kind === 'accusation' && e.tags.includes('against_observer') && e.subjectId === playerId
  ).length;

  const voteFlipCount = ev.filter(
    (e) => e.kind === 'vote' && e.tags.includes('vote_changed') && e.subjectId === playerId
  ).length;

  const allianceHints = ev.filter((e) => e.kind === 'alliance_hint' && e.subjectId === playerId).length;
  const betrayalCount = ev.filter((e) => e.kind === 'betrayal' && e.subjectId === playerId).length;
  const emotionalConflictCount = ev.filter(
    (e) => e.kind === 'emotional_conflict' && e.subjectId === playerId
  ).length;

  const lines: string[] = [];
  if (countsByKind.accusation) lines.push(`accusations_logged:${countsByKind.accusation}`);
  if (countsByKind.vote) lines.push(`votes_logged:${countsByKind.vote}`);
  if (countsByKind.alliance_hint) lines.push(`alliance_hints:${countsByKind.alliance_hint}`);
  if (countsByKind.betrayal) lines.push(`betrayals:${countsByKind.betrayal}`);
  if (countsByKind.speech_pattern) lines.push(`speech_markers:${countsByKind.speech_pattern}`);
  if (countsByKind.suspicious_behavior) lines.push(`suspicious_flags:${countsByKind.suspicious_behavior}`);
  if (countsByKind.emotional_conflict) lines.push(`emotional_clashes:${countsByKind.emotional_conflict}`);
  if (attackOnObserverCount) lines.push(`attacks_on_observer:${attackOnObserverCount}`);
  if (voteFlipCount) lines.push(`vote_reversals:${voteFlipCount}`);

  if (lines.length === 0) lines.push('no_structured_memory_for_player');

  return {
    playerId,
    countsByKind,
    lines,
    attackOnObserverCount,
    voteFlipCount,
    allianceHints,
    betrayalCount,
    emotionalConflictCount,
  };
}

/** How many times `subjectId` attacked `observerId` in stored accusations. */
export function countAttacksOnObserver(store: MemoryStore, subjectId: string, observerId: string): number {
  return store.events.filter(
    (e) =>
      e.kind === 'accusation' &&
      e.subjectId === subjectId &&
      e.targetId === observerId &&
      (e.tags.includes('against_observer') || e.tags.includes('public_speech'))
  ).length;
}

export type RepeatedBehaviorPattern = {
  subjectId: string;
  pattern: 'vote_flip' | 'pile_on' | 'defend_then_accuse' | 'manipulation_spike' | 'none';
  strength: number;
};

/**
 * Hard-only structural pattern scan (deterministic).
 */
export function detectManipulationPatterns(
  store: MemoryStore,
  subjectId: string,
  difficulty: DifficultyType,
  profile: AIBehaviorProfile,
  opts?: { ignoreDaytimeExileBallotVotes?: boolean }
): RepeatedBehaviorPattern {
  if (!shouldAugmentStructuralReasoning(profile, difficulty) && profile.deception < 76) {
    return { subjectId, pattern: 'none', strength: 0 };
  }
  const maxR = Math.max(...store.events.map((e) => e.round), 0);
  let ev = retrieveRelevantMemories(store, {
    playerId: subjectId,
    maxRoundsBack: 12,
    currentRound: maxR,
    limit: 120,
  });
  if (opts?.ignoreDaytimeExileBallotVotes) {
    ev = ev.filter((e) => !(e.kind === 'vote' && e.tags.includes('exile_ballot')));
  }
  const flips = ev.filter((e) => e.kind === 'vote' && e.tags.includes('vote_changed')).length;
  if (flips >= 3) return { subjectId, pattern: 'vote_flip', strength: clamp(40 + flips * 12, 0, 100) };

  const sus = ev.filter((e) => e.kind === 'suspicious_behavior' && e.tags.includes('pile_on')).length;
  if (sus >= 2) return { subjectId, pattern: 'pile_on', strength: clamp(35 + sus * 18, 0, 100) };

  const acc = ev.filter((e) => e.kind === 'accusation').length;
  const def = ev.filter((e) => e.tags.includes('defended_then_accused')).length;
  if (def >= 1 && acc >= 2) return { subjectId, pattern: 'defend_then_accuse', strength: 55 };

  const emo = ev.filter((e) => e.kind === 'emotional_conflict').length;
  if (emo >= 3) return { subjectId, pattern: 'manipulation_spike', strength: clamp(30 + emo * 15, 0, 100) };

  return { subjectId, pattern: 'none', strength: 0 };
}

export type MemoryInfluence = {
  /** Add to suspicion scores before clipping (per other player). */
  suspicionDeltaByPlayerId: Record<string, number>;
  /** 0–100 trust offset (higher = more trusted); subtract from 100 in callers if needed. */
  trustOffsetByPlayerId: Record<string, number>;
  /** 0–100 extra emotional reactivity this tick toward keyed players. */
  emotionalReactionByPlayerId: Record<string, number>;
  /** Tags for voting engine (e.g. memory_revenge_weight). */
  votingHints: readonly string[];
};

/**
 * Fold memory + emotional charge + `revengeBias` into numeric hints for suspicion / trust / voting.
 * Game layer merges `suspicionDelta` into `applySuspicionChange` or equivalent.
 */
export function getMemoryInfluenceOnBehavior(
  store: MemoryStore,
  observerId: string,
  profile: AIBehaviorProfile,
  difficulty: DifficultyType,
  aliveOtherIds: readonly string[],
  opts?: { daytimeExileBallotDetailPublic?: boolean }
): MemoryInfluence {
  const ballotPublic = opts?.daytimeExileBallotDetailPublic === true;
  const memOpts = { ignoreDaytimeExileBallotVotes: !ballotPublic };
  const suspicionDeltaByPlayerId: Record<string, number> = {};
  const trustOffsetByPlayerId: Record<string, number> = {};
  const emotionalReactionByPlayerId: Record<string, number> = {};
  const votingHints: string[] = [];

  for (const pid of aliveOtherIds) {
    if (pid === observerId) continue;
    suspicionDeltaByPlayerId[pid] = 0;
    trustOffsetByPlayerId[pid] = 0;
    emotionalReactionByPlayerId[pid] = 0;
  }

  for (const pid of aliveOtherIds) {
    if (pid === observerId) continue;
    const summary = summarizePlayerHistory(store, pid, memOpts);
    const attacks = countAttacksOnObserver(store, pid, observerId);
    const charge = store.emotionalCharge[pid]?.[observerId] ?? 0;

    // Revenge + repeated attacks on observer → sustained suspicion bias (req. #7).
    if (attacks > 0) {
      const revengeScale = (profile.revengeBias / 100) * (1 + 0.35 * Math.max(0, attacks - 1));
      const bump = clamp(6 * attacks * revengeScale + charge * 0.25 * (profile.emotionality / 100), 0, 42);
      suspicionDeltaByPlayerId[pid] = (suspicionDeltaByPlayerId[pid] ?? 0) + bump;
      emotionalReactionByPlayerId[pid] = clamp(attacks * 12 + charge * 0.4, 0, 100);
      votingHints.push(`memory_revenge_weight:${pid}:${attacks}`);
    }

    if (summary.betrayalCount > 0) {
      suspicionDeltaByPlayerId[pid]! += clamp(4 + summary.betrayalCount * 5, 0, 22);
      trustOffsetByPlayerId[pid]! -= clamp(6 + summary.betrayalCount * 8, 0, 40);
    }

    if (
      summary.allianceHints >= 2 &&
      (shouldAugmentStructuralReasoning(profile, difficulty) || profile.memoryDepth >= 10)
    ) {
      suspicionDeltaByPlayerId[pid]! += clamp(3 + summary.allianceHints * 3, 0, 18);
      votingHints.push(`memory_alliance_cluster:${pid}`);
    }

    if (summary.voteFlipCount >= 2) {
      suspicionDeltaByPlayerId[pid]! += clamp(summary.voteFlipCount * (profile.logic / 80), 0, 20);
    }

    const pat = detectManipulationPatterns(store, pid, difficulty, profile, memOpts);
    if (pat.pattern !== 'none') {
      suspicionDeltaByPlayerId[pid]! += pat.strength * 0.22;
      trustOffsetByPlayerId[pid]! -= pat.strength * 0.15;
      votingHints.push(`memory_pattern:${pid}:${pat.pattern}`);
    }

    // Speech / suspicion markers reduce trust slightly (town lie detector heuristic).
    const sp = (summary.countsByKind.speech_pattern ?? 0) + (summary.countsByKind.suspicious_behavior ?? 0);
    if (sp > 0) {
      trustOffsetByPlayerId[pid]! -= clamp(sp * 3, 0, 18);
      suspicionDeltaByPlayerId[pid]! += clamp(sp * 2.2, 0, 16);
    }

    if (summary.emotionalConflictCount > 0 && profile.emotionality > 65) {
      emotionalReactionByPlayerId[pid] = clamp(
        (emotionalReactionByPlayerId[pid] ?? 0) + summary.emotionalConflictCount * 6,
        0,
        100
      );
    }
  }

  return {
    suspicionDeltaByPlayerId,
    trustOffsetByPlayerId,
    emotionalReactionByPlayerId,
    votingHints,
  };
}

export function createEmptyMemoryStore(config?: Partial<MemoryStoreConfig>): MemoryStore {
  return {
    events: [],
    emotionalCharge: {},
    lastPrunedRound: 0,
    config: { ...DEFAULT_CONFIG, ...config },
  };
}

/** Merge memory suspicion deltas into a plain score map (caller clips 0–100). */
export function mergeSuspicionWithMemory(
  scores: Record<string, number>,
  deltas: Record<string, number>
): Record<string, number> {
  const out = { ...scores };
  for (const [id, d] of Object.entries(deltas)) {
    out[id] = clamp((out[id] ?? 0) + d, 0, 100);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Public-speech memory selectors (never read hidden ballot data)
// ---------------------------------------------------------------------------

function uniqueRecentSubjectIds(
  events: MemoryEvent[],
  opts?: { limit?: number }
): string[] {
  const lim = opts?.limit ?? 6;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of events) {
    if (seen.has(e.subjectId)) continue;
    seen.add(e.subjectId);
    out.push(e.subjectId);
    if (out.length >= lim) break;
  }
  return out;
}

/** Seats who publicly accused `observerId` in speech (not hidden votes). */
export function getPlayersWhoAccusedObserver(
  store: MemoryStore,
  observerId: string,
  opts?: { sinceRound?: number; limit?: number }
): string[] {
  const since = opts?.sinceRound ?? -1;
  const ev = store.events
    .filter(
      (e) =>
        e.kind === 'accusation' &&
        e.targetId === observerId &&
        e.subjectId !== observerId &&
        e.round >= since &&
        e.tags.includes('public_speech')
    )
    .sort((a, b) => b.round - a.round || b.phaseIndex - a.phaseIndex);
  return uniqueRecentSubjectIds(ev, { limit: opts?.limit ?? 6 });
}

/** Seats who publicly defended or aligned with `observerId` in speech. */
export function getPlayersWhoBackedObserver(
  store: MemoryStore,
  observerId: string,
  opts?: { sinceRound?: number; limit?: number }
): string[] {
  const since = opts?.sinceRound ?? -1;
  const ev = store.events
    .filter(
      (e) =>
        e.kind === 'alliance_hint' &&
        e.targetId === observerId &&
        e.subjectId !== observerId &&
        e.round >= since &&
        e.tags.includes('public_speech')
    )
    .sort((a, b) => b.round - a.round || b.phaseIndex - a.phaseIndex);
  return uniqueRecentSubjectIds(ev, { limit: opts?.limit ?? 6 });
}

/** Seats who publicly challenged a role claim by `observerId`. */
export function getPlayersWhoChallengedObserverClaim(
  store: MemoryStore,
  observerId: string,
  opts?: { sinceRound?: number; limit?: number }
): string[] {
  const since = opts?.sinceRound ?? -1;
  const ev = store.events
    .filter(
      (e) =>
        (e.kind === 'accusation' || e.kind === 'suspicious_behavior') &&
        e.targetId === observerId &&
        e.subjectId !== observerId &&
        e.round >= since &&
        e.tags.includes('role_challenge')
    )
    .sort((a, b) => b.round - a.round || b.phaseIndex - a.phaseIndex);
  return uniqueRecentSubjectIds(ev, { limit: opts?.limit ?? 4 });
}

/** Last publicly claimed role for a seat (from speech_pattern memory), if any. */
export function getLastClaimedRoleFromMemory(
  store: MemoryStore,
  subjectId: string
): string | null {
  const ev = store.events
    .filter((e) => e.kind === 'speech_pattern' && e.subjectId === subjectId && e.tags.includes('role_claim'))
    .sort((a, b) => b.round - a.round || b.phaseIndex - a.phaseIndex);
  const top = ev[0];
  if (!top?.payload?.role) return null;
  const r = top.payload.role;
  return typeof r === 'string' ? r : null;
}

function storeHasEventId(store: MemoryStore, id: string): boolean {
  return store.events.some((e) => e.id === id);
}

function nameToIdMap(players: readonly { id: string; name: string }[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const p of players) m.set(p.name, p.id);
  return m;
}

function isRoleChallengeBody(body: string, lang: AppLanguage): boolean {
  if (lang === 'zh') return /假预|不是真|悍跳|对跳|穿身份|冒充|假神/.test(body);
  return /\bfake seer\b|\bnot (the )?real\b|\brole claim\b|\bimpostor\b/i.test(body);
}

function detectRoleClaim(body: string, lang: AppLanguage): string | null {
  if (lang === 'zh') {
    if (/我是预言家|我(是|拿)预|真预|预言家查/.test(body)) return 'Seer';
    if (/我是女巫|我(是|拿)巫/.test(body)) return 'Witch';
    if (/我是猎人|我(是|拿)猎/.test(body)) return 'Hunter';
    if (/我是守卫|我(是|拿)守/.test(body)) return 'Guard';
    if (/我是白痴|我(是|拿)白/.test(body)) return 'Idiot';
  } else {
    if (/\bI('m| am) (the )?seer\b/i.test(body)) return 'Seer';
    if (/\bI('m| am) (the )?witch\b/i.test(body)) return 'Witch';
    if (/\bI('m| am) (the )?hunter\b/i.test(body)) return 'Hunter';
    if (/\bI('m| am) (the )?guard\b/i.test(body)) return 'Guard';
  }
  return null;
}

/**
 * Parse public chat lines into accusation / alliance / role-claim memories.
 * Idempotent per (round, phase, subject, target, kind) via stableEventId.
 */
export function ingestPublicSpeechMemories(
  store: MemoryStore,
  input: {
    logLines: readonly string[];
    alivePlayers: readonly { id: string; name: string }[];
    lang: AppLanguage;
    round: number;
    phaseIndex: number;
    tailLines?: number;
  }
): MemoryStore {
  const names = input.alivePlayers.map((p) => p.name);
  const focus = buildDiscussionFocusSnapshot(input.logLines, names, input.lang, {
    tailLines: input.tailLines ?? 40,
  });
  const nameToId = nameToIdMap(input.alivePlayers);
  let next = store;

  const append = (ev: RememberEventInput): void => {
    const id = stableEventId(ev);
    if (storeHasEventId(next, id)) return;
    next = rememberEvent(next, ev);
  };

  for (const edge of focus.accusationEdges) {
    const sid = nameToId.get(edge.accuserDisplay);
    const tid = nameToId.get(edge.targetDisplay);
    if (!sid || !tid || sid === tid) continue;
    append({
      round: input.round,
      phaseIndex: input.phaseIndex,
      kind: 'accusation',
      subjectId: sid,
      targetId: tid,
      intensity: 58,
      tags: ['public_speech'],
    });
  }

  for (const hint of focus.softDefenseHints) {
    const sid = nameToId.get(hint.defenderDisplay);
    const tid = nameToId.get(hint.protectedDisplay);
    if (!sid || !tid || sid === tid) continue;
    append({
      round: input.round,
      phaseIndex: input.phaseIndex,
      kind: 'alliance_hint',
      subjectId: sid,
      targetId: tid,
      intensity: 44,
      tags: ['public_speech', 'defense_hint'],
    });
  }

  const tail = input.logLines.slice(-(input.tailLines ?? 40));
  for (const ln of tail) {
    const m = ln.match(/^([^:：\n]{1,24})[:：]\s*(.+)$/);
    if (!m) continue;
    const speakerName = m[1]!.trim();
    const body = m[2]!.trim();
    if (['系统', '法官', 'System', 'Moderator'].some((x) => speakerName.startsWith(x))) continue;
    const sid = nameToId.get(speakerName);
    if (!sid) continue;

    const claimed = detectRoleClaim(body, input.lang);
    if (claimed) {
      append({
        round: input.round,
        phaseIndex: input.phaseIndex,
        kind: 'speech_pattern',
        subjectId: sid,
        intensity: 52,
        tags: ['public_speech', 'role_claim'],
        payload: { role: claimed },
      });
    }

    if (isRoleChallengeBody(body, input.lang)) {
      for (const p of input.alivePlayers) {
        if (p.id === sid) continue;
        if (!body.includes(p.name)) continue;
        append({
          round: input.round,
          phaseIndex: input.phaseIndex,
          kind: 'accusation',
          subjectId: sid,
          targetId: p.id,
          intensity: 50,
          tags: ['public_speech', 'role_challenge'],
        });
      }
    }
  }

  return next;
}
