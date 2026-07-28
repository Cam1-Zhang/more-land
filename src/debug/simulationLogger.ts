/**
 * Structured logs + heuristics for AI simulation runs (no GPT).
 */
import type { DifficultyType } from '../types';
import type { AppLanguage } from '../i18n/appStrings';
import { analyzeSpeechUncertaintyLine } from '../utils/uncertaintyCommitment';
import { isRedirectOrSoftPressureIntent, type StrategicVoteIntent } from '../utils/votingEngine';

export type SimulationLogEntry =
  | {
      t: 'match_meta';
      phase: 0;
      seed: number;
      rosterMode: 'random' | 'custom';
      roleMode: 'random' | 'manual';
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
    }
  | {
      t: 'suspicion';
      phase: number;
      observerId: string;
      observerName: string;
      deltas: Record<string, number>;
      reason: string;
    }
  | {
      t: 'thought';
      phase: number;
      observerId: string;
      observerName: string;
      target: string;
      targetId: string;
      confidence: number;
      emotion: string;
      reasons: readonly string[];
    }
  | {
      t: 'emotion';
      phase: number;
      observerId: string;
      observerName: string;
      dominant: string;
      stress: number;
      vector: Record<string, number>;
    }
  | {
      t: 'vote';
      phase: number;
      voterId: string;
      voterName: string;
      targetId: string;
      targetName: string;
      intent: string;
      confidence: number;
      reasons: readonly string[];
    }
  | {
      t: 'alliance';
      phase: number;
      observerId: string;
      observerName: string;
      assumedAllies: readonly string[];
      note: string;
    }
  | {
      t: 'memory';
      phase: number;
      observerId: string;
      observerName: string;
      kind: string;
      detail: string;
    }
  | {
      t: 'speech';
      phase: number;
      speakerId: string;
      speakerName: string;
      line: string;
    }
  | {
      t: 'strategic';
      phase: number;
      actorId: string;
      actorName: string;
      tag: string;
      detail: string;
    }
  | {
      t: 'betrayal';
      phase: number;
      subjectId: string;
      subjectName: string;
      victimId: string;
      victimName: string;
      detail: string;
    }
  | {
      t: 'elimination';
      phase: number;
      eliminatedId: string;
      eliminatedName: string;
      voteTally: Record<string, number>;
    };

export type RepetitionReport = {
  kind: 'repetitive_vote' | 'repetitive_speech' | 'none';
  playerId?: string;
  detail: string;
  severity: 'low' | 'med' | 'high';
};

export type IrrationalReport = {
  kind: 'vote_self' | 'vote_dead' | 'impossible_suspicion' | 'none';
  detail: string;
  phase?: number;
};

export type StuckLoopReport = {
  stuck: boolean;
  fingerprint: string;
  repeatCount: number;
};

export type PersonalityConsistencyReport = {
  playerId: string;
  name: string;
  difficulty: DifficultyType;
  checks: { label: string; ok: boolean; detail: string }[];
};

export type MatchSummary = {
  mostManipulative: { playerId: string; name: string; score: number }[];
  longestSurvivors: { playerId: string; name: string; survivedPhases: number }[];
  allianceEdges: { a: string; b: string; weight: number }[];
  suspicionVsTruth: {
    playerId: string;
    name: string;
    wasWolf: boolean;
    avgRankedSuspicion: number;
    calibrationScore: number;
  }[];
  betrayals: { phase: number; line: string }[];
  repetition: RepetitionReport[];
  irrational: IrrationalReport[];
  stuck: StuckLoopReport;
  personality: PersonalityConsistencyReport[];
};

export class SimulationLogger {
  readonly entries: SimulationLogEntry[] = [];

  push(e: SimulationLogEntry): void {
    this.entries.push(e);
  }

  clear(): void {
    this.entries.length = 0;
  }

  exportJsonLines(): string {
    return this.entries.map((e) => JSON.stringify(e)).join('\n');
  }
}

function hashFingerprint(obj: unknown): string {
  const s = JSON.stringify(obj);
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export function detectRepetitiveBehavior(entries: readonly SimulationLogEntry[]): RepetitionReport[] {
  const out: RepetitionReport[] = [];
  const votesByVoter: Record<string, string[]> = {};
  for (const e of entries) {
    if (e.t !== 'vote') continue;
    if (!votesByVoter[e.voterId]) votesByVoter[e.voterId] = [];
    votesByVoter[e.voterId]!.push(e.targetId);
  }
  for (const [pid, chain] of Object.entries(votesByVoter)) {
    let run = 1;
    let last = '';
    for (const t of chain) {
      if (t === last) run += 1;
      else {
        run = 1;
        last = t;
      }
      if (run >= 4) {
        out.push({
          kind: 'repetitive_vote',
          playerId: pid,
          detail: `same_target_${run}_times`,
          severity: run >= 6 ? 'high' : 'med',
        });
        break;
      }
    }
  }
  const speechBy: Record<string, string[]> = {};
  for (const e of entries) {
    if (e.t !== 'speech') continue;
    if (!speechBy[e.speakerId]) speechBy[e.speakerId] = [];
    speechBy[e.speakerId]!.push(e.line);
  }
  for (const [pid, lines] of Object.entries(speechBy)) {
    if (lines.length < 4) continue;
    const tail = lines.slice(-4);
    const norm = tail.map((l) => l.slice(0, 18));
    if (norm.every((x) => x === norm[0])) {
      out.push({
        kind: 'repetitive_speech',
        playerId: pid,
        detail: 'near_identical_lines',
        severity: 'high',
      });
    }
  }
  if (out.length === 0) out.push({ kind: 'none', detail: 'ok', severity: 'low' });
  return out;
}

export function detectIrrationalBehavior(
  entries: readonly SimulationLogEntry[],
  aliveByPhase: Map<number, Set<string>>
): IrrationalReport[] {
  const out: IrrationalReport[] = [];
  for (const e of entries) {
    if (e.t !== 'vote') continue;
    const alive = aliveByPhase.get(e.phase);
    if (alive && !alive.has(e.targetId)) {
      out.push({
        kind: 'vote_dead',
        detail: `${e.voterName} voted eliminated ${e.targetName}`,
        phase: e.phase,
      });
    }
    if (e.voterId === e.targetId) {
      out.push({ kind: 'vote_self', detail: `${e.voterName} self_vote`, phase: e.phase });
    }
  }
  if (out.length === 0) out.push({ kind: 'none', detail: 'ok' });
  return out;
}

export function detectStuckLoops(entries: readonly SimulationLogEntry[], window = 5): StuckLoopReport {
  const fingerprints: string[] = [];
  for (let i = 0; i <= entries.length - window; i += 1) {
    const slice = entries.slice(i, i + window);
    const fp = hashFingerprint(slice.map((e) => ({ t: e.t, phase: 'phase' in e ? e.phase : 0 })));
    fingerprints.push(fp);
  }
  let bestFp = '';
  let bestC = 0;
  const counts: Record<string, number> = {};
  for (const f of fingerprints) {
    counts[f] = (counts[f] ?? 0) + 1;
    if (counts[f]! > bestC) {
      bestC = counts[f]!;
      bestFp = f;
    }
  }
  return { stuck: bestC >= 4, fingerprint: bestFp, repeatCount: bestC };
}

export type ProfileLite = {
  id: string;
  name: string;
  difficulty: DifficultyType;
  aggression: number;
  caution: number;
  deception: number;
  emotionality: number;
  logic: number;
  voteChangeResistance: number;
  sociability: number;
  leadership: number;
};

const STRONG_AGGRESSION_INTENTS = new Set([
  'split_vote',
  'bandwagon_control',
  'soft_pressure',
  'social_redirect',
  'hidden_push',
  'chaotic_flip',
]);

const MANIPULATOR_MASK_INTENTS = new Set([
  'fake_support',
  'split_vote',
  'soft_pressure',
  'social_redirect',
  'preserve_cover',
  'false_uncertainty',
  'neutral_surface',
  'indirect_pressure',
  'hidden_push',
  'shield_teammate_softly',
  'chaotic_flip',
  'bandwagon_control',
  'soft_focus_shift',
  'pressure_seed',
  'redirect_attention',
  'social_momentum_nudge',
  'indirect_alignment',
  'topic_reframe',
  'low_commitment_pressure',
  'delayed_pressure_stack',
  'passive_doubt_injection',
]);

const INDIRECT_OR_UNCERTAIN = new Set([
  'false_uncertainty',
  'indirect_pressure',
  'neutral_surface',
  'delayed_commit',
  'passive_doubt_injection',
  'low_commitment_pressure',
]);

function speechSuggestsRedirectSoftPressure(line: string, lang: AppLanguage): boolean {
  if (lang === 'zh') {
    return /重点听|怎么接|别放太好|没完全放下|分压力|先别急着|继续观察|记一笔|盯着听|轻轻|对齐|话圆|这轮先|挂着观察/.test(
      line
    );
  }
  return /\bone more pass\b|\bwatch-?slot\b|\bheat\b.*\boff\b|\broom thread\b|\bnot ready to hammer\b/i.test(line);
}

function speechSuggestsCharismaticSteer(line: string, lang: AppLanguage): boolean {
  if (lang === 'zh') {
    return /先听.*把话说满|别急着把|放得太干净|气氛收一收|更像.*压力|翻成定锤|分担火力|节奏推|先把线对齐|蛮好奇是谁|抢拍子|对齐|推力很大/.test(
      line
    );
  }
  return /\bhear\b.*\b(out|fully)\b|\bdon't rush\b|\bclearing\b|\bease the room\b|\bpushed today\b|\bpressure\b.*\bnot\b.*\bclosed\b|\btaking heat off\b/i.test(
    line
  );
}

export function verifyPersonalityConsistency(
  entries: readonly SimulationLogEntry[],
  profiles: readonly ProfileLite[]
): PersonalityConsistencyReport[] {
  const simLang: AppLanguage = 'zh';
  const voteChains: Record<string, string[]> = {};
  const intents: Record<string, string[]> = {};
  for (const e of entries) {
    if (e.t !== 'vote') continue;
    if (!voteChains[e.voterId]) voteChains[e.voterId] = [];
    voteChains[e.voterId]!.push(e.targetId);
    if (!intents[e.voterId]) intents[e.voterId] = [];
    intents[e.voterId]!.push(e.intent);
  }

  const speechUncertaintyByPlayer: Record<
    string,
    { uncertainty: number; delayed: number; hard: number; amb: number; n: number }
  > = {};
  const redirectSpeechByPlayer: Record<string, number> = {};
  const charmSpeechByPlayer: Record<string, number> = {};
  for (const e of entries) {
    if (e.t !== 'speech') continue;
    const bag = speechUncertaintyByPlayer[e.speakerId] ?? { uncertainty: 0, delayed: 0, hard: 0, amb: 0, n: 0 };
    const a = analyzeSpeechUncertaintyLine(e.line, simLang);
    bag.n += 1;
    if (a.hardCommit) bag.hard += 1;
    if (a.ambiguityMarker) bag.amb += 1;
    if (a.delayedCommitFraming) bag.delayed += 1;
    if (a.uncertaintySoft || a.delayedCommitFraming) bag.uncertainty += 1;
    speechUncertaintyByPlayer[e.speakerId] = bag;
    if (speechSuggestsRedirectSoftPressure(e.line, simLang)) {
      redirectSpeechByPlayer[e.speakerId] = (redirectSpeechByPlayer[e.speakerId] ?? 0) + 1;
    }
    if (speechSuggestsCharismaticSteer(e.line, simLang)) {
      charmSpeechByPlayer[e.speakerId] = (charmSpeechByPlayer[e.speakerId] ?? 0) + 1;
    }
  }

  return profiles.map((p) => {
    const checks: PersonalityConsistencyReport['checks'] = [];
    const chain = voteChains[p.id] ?? [];
    const unique = new Set(chain).size;
    const speechM = speechUncertaintyByPlayer[p.id] ?? { uncertainty: 0, delayed: 0, hard: 0, amb: 0, n: 0 };
    const hardCommitRate = speechM.n > 0 ? speechM.hard / speechM.n : 0;
    const redirectSpeech = redirectSpeechByPlayer[p.id] ?? 0;
    const charmSpeech = charmSpeechByPlayer[p.id] ?? 0;
    if (p.aggression > 82) {
      const manip = (intents[p.id] ?? []).filter((x) => STRONG_AGGRESSION_INTENTS.has(x)).length;
      checks.push({
        label: 'aggressive_takes_strong_intents',
        ok: manip >= 1 || unique <= Math.max(1, Math.ceil(chain.length / 3)),
        detail: `unique_targets=${unique}, strong_intents=${manip}`,
      });
    }
    if (p.caution > 82) {
      const flips = chain.filter((v, i) => i > 0 && v !== chain[i - 1]).length;
      checks.push({
        label: 'cautious_rarely_pivots',
        ok: flips <= Math.ceil(chain.length * 0.45),
        detail: `pivots=${flips}/${chain.length}`,
      });
    }
    if (p.deception > 78) {
      const maskHits = (intents[p.id] ?? []).filter((x) => MANIPULATOR_MASK_INTENTS.has(x)).length;
      checks.push({
        label: 'manipulator_uses_mask_intents',
        ok: maskHits >= 1 || chain.length < 4,
        detail: `mask_hits=${maskHits}/${chain.length}`,
      });
    }
    if (p.deception > 72) {
      const indirect = (intents[p.id] ?? []).filter((x) => INDIRECT_OR_UNCERTAIN.has(x)).length;
      const redirect = (intents[p.id] ?? []).filter((x) =>
        isRedirectOrSoftPressureIntent(x as StrategicVoteIntent)
      ).length;
      checks.push({
        label: 'deceptive_indirect_or_uncertain',
        ok:
          indirect >= 1 ||
          speechM.uncertainty >= 1 ||
          speechM.delayed >= 1 ||
          speechM.amb >= 2 ||
          chain.length < 4,
        detail: `vote_indirect=${indirect}, speech_uncertainty=${speechM.uncertainty}, speech_delayed=${speechM.delayed}, amb=${speechM.amb}`,
      });
      checks.push({
        label: 'deceptive_redirect_or_soft_pressure',
        ok: redirect >= 1 || redirectSpeech >= 1 || chain.length < 5,
        detail: `vote_redirect_soft=${redirect}, speech_redirect_soft=${redirectSpeech}`,
      });
      if (p.deception > 78 && speechM.n >= 4) {
        checks.push({
          label: 'manipulator_avoids_excessive_speech_certainty',
          ok: hardCommitRate <= 0.42,
          detail: `hard_commit_rate=${hardCommitRate.toFixed(2)} (${speechM.hard}/${speechM.n})`,
        });
      }
      if (p.sociability < 46) {
        const shyMask = (intents[p.id] ?? []).filter((x) =>
          [
            'indirect_pressure',
            'false_uncertainty',
            'preserve_cover',
            'redirect_attention',
            'passive_doubt_injection',
            'soft_focus_shift',
          ].includes(x)
        ).length;
        checks.push({
          label: 'shy_manipulator_avoids_blunt_exposure',
          ok: shyMask >= 1 || chain.length < 4,
          detail: `shy_mask=${shyMask}`,
        });
      }
      if (p.sociability > 76 && p.leadership > 65) {
        const charm = (intents[p.id] ?? []).filter((x) =>
          [
            'social_redirect',
            'neutral_surface',
            'bandwagon_control',
            'social_momentum_nudge',
            'indirect_alignment',
          ].includes(x)
        ).length;
        checks.push({
          label: 'charismatic_manipulator_social_steers',
          ok: charm >= 1 || charmSpeech >= 1 || chain.length < 4,
          detail: `social_steers_vote=${charm}, social_steers_speech=${charmSpeech}`,
        });
      }
    }
    if (p.emotionality > 82) {
      const emo = entries.filter((e) => e.t === 'emotion' && e.observerId === p.id && e.stress > 45).length;
      checks.push({
        label: 'emotional_stress_spikes',
        ok: emo >= Math.max(1, Math.floor(chain.length * 0.2)),
        detail: `high_stress_ticks=${emo}`,
      });
    }
    return { playerId: p.id, name: p.name, difficulty: p.difficulty, checks };
  });
}

export function generateMatchSummary(params: {
  entries: readonly SimulationLogEntry[];
  profiles: readonly ProfileLite[];
  wolfIds: Set<string>;
  survivalPhases: Record<string, number>;
  manipulationCounts: Record<string, number>;
  allianceEdges: { a: string; b: string; weight: number }[];
  betrayals: { phase: number; line: string }[];
  aliveByPhase: Map<number, Set<string>>;
}): MatchSummary {
  const { entries, profiles, wolfIds, survivalPhases, manipulationCounts, allianceEdges, betrayals, aliveByPhase } =
    params;

  const mostManipulative = Object.entries(manipulationCounts)
    .map(([id, score]) => ({
      playerId: id,
      name: profiles.find((p) => p.id === id)?.name ?? id,
      score,
    }))
    .sort((a, b) => b.score - a.score || a.playerId.localeCompare(b.playerId))
    .slice(0, 5);

  const longestSurvivors = Object.entries(survivalPhases)
    .map(([playerId, survivedPhases]) => ({
      playerId,
      name: profiles.find((p) => p.id === playerId)?.name ?? playerId,
      survivedPhases,
    }))
    .sort((a, b) => b.survivedPhases - a.survivedPhases || a.playerId.localeCompare(b.playerId));

  const thoughtBy: Record<string, { sum: number; n: number }> = {};
  for (const e of entries) {
    if (e.t !== 'thought') continue;
    for (const p of profiles) {
      if (p.id === e.targetId) {
        thoughtBy[p.id] ??= { sum: 0, n: 0 };
        thoughtBy[p.id]!.sum += e.confidence;
        thoughtBy[p.id]!.n += 1;
      }
    }
  }

  const suspicionVsTruth = profiles.map((p) => {
    const wasWolf = wolfIds.has(p.id);
    const tb = thoughtBy[p.id];
    const avgRankedSuspicion = tb && tb.n > 0 ? tb.sum / tb.n : 0;
    const calibrationScore = wasWolf ? avgRankedSuspicion : 100 - avgRankedSuspicion;
    return { playerId: p.id, name: p.name, wasWolf, avgRankedSuspicion, calibrationScore };
  });

  return {
    mostManipulative,
    longestSurvivors,
    allianceEdges,
    suspicionVsTruth,
    betrayals,
    repetition: detectRepetitiveBehavior(entries),
    irrational: detectIrrationalBehavior(entries, aliveByPhase),
    stuck: detectStuckLoops(entries),
    personality: verifyPersonalityConsistency(entries, profiles),
  };
}
