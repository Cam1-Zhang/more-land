/**
 * Deterministic emotion simulation for AI seats (internal state + gameplay hooks).
 * No GPT — numeric vector + stress, personality-weighted updates.
 */
import type { AIBehaviorProfile } from '../data/aiBehaviorProfiles';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export type EmotionLabel = 'calm' | 'nervous' | 'angry' | 'confident' | 'scared' | 'desperate' | 'suspicious';

const ALL_EMOTIONS: readonly EmotionLabel[] = [
  'calm',
  'nervous',
  'angry',
  'confident',
  'scared',
  'desperate',
  'suspicious',
] as const;

export type EmotionVector = Record<EmotionLabel, number>;

export type EmotionState = {
  /** 0–100 per label; dominant = argmax after tie-break. */
  vector: EmotionVector;
  /** Cached stress 0–100 from last `updateEmotionState`. */
  stress: number;
  /** Monotonic tick for deterministic ordering. */
  tick: number;
};

export type EmotionSignalInput = {
  /** Observer was directly accused this phase. */
  accusedThisRound: boolean;
  /** 0 = doomed, 100 = very safe (inverse drives fear/desperation). */
  survivalOdds: number;
  /** Allies eliminated this game (same-side). */
  alliesDeadCount: number;
  /** Living allies (same-side), including self if applicable. */
  aliveAllyCount: number;
  /** Social / vote pressure 0–100 (e.g. from votingEngine.evaluateVotePressure). */
  pressure: number;
  /** Isolation 0–100 (few allies speaking, cold-shoulder). */
  isolation: number;
  /** Vote / nomination heat on observer 0–100. */
  voteTargeting: number;
  profile: AIBehaviorProfile;
};

function zeroVector(): EmotionVector {
  const v = {} as EmotionVector;
  for (const k of ALL_EMOTIONS) v[k] = 0;
  return v;
}

function baselineVector(): EmotionVector {
  const v = zeroVector();
  v.calm = 52;
  v.confident = 18;
  v.suspicious = 12;
  v.nervous = 10;
  v.angry = 4;
  v.scared = 3;
  v.desperate = 1;
  return v;
}

export function createInitialEmotionState(): EmotionState {
  return { vector: baselineVector(), stress: 12, tick: 0 };
}

/**
 * Aggregate physiological / social stress 0–100 from current signals + personality.
 */
export function calculateStressLevel(input: EmotionSignalInput, prevStress?: number): number {
  const p = input.profile;
  let s = 0;
  if (input.accusedThisRound) s += 38;
  s += clamp(100 - input.survivalOdds, 0, 100) * (0.35 + p.survivalInstinct / 350);
  s += clamp(input.alliesDeadCount, 0, 8) * (9 + p.sociability / 25);
  s += input.pressure * (0.28 + p.caution / 400);
  s += input.isolation * (0.32 + (100 - p.sociability) / 350);
  s += input.voteTargeting * (0.4 + p.leadership / 500);
  if (input.aliveAllyCount <= 1 && input.alliesDeadCount > 0) s += 14;

  s *= 0.85 + p.emotionality / 650;
  s *= clamp(1.12 - p.logic / 500, 0.72, 1.08);
  if (p.deception > 72) s *= 0.92;

  let out = clamp(Math.round(s), 0, 100);
  if (prevStress != null) {
    out = clamp(Math.round(out * 0.55 + prevStress * 0.45), 0, 100);
  }
  return out;
}

function decayTowardBaseline(v: EmotionVector, factor: number): EmotionVector {
  const base = baselineVector();
  const out = zeroVector();
  for (const k of ALL_EMOTIONS) {
    out[k] = clamp(v[k] * factor + base[k] * (1 - factor), 0, 100);
  }
  return out;
}

function addImpulse(v: EmotionVector, label: EmotionLabel, amount: number): void {
  v[label] = clamp(v[label] + amount, 0, 100);
}

/**
 * Step emotion vector from previous state + table signals (personality-aware).
 */
export function updateEmotionState(prev: EmotionState, input: EmotionSignalInput): EmotionState {
  const p = input.profile;
  const stress = calculateStressLevel(input, prev.stress);
  const decay = clamp(0.58 - p.emotionality / 500 + p.logic / 450, 0.42, 0.82);
  let v = decayTowardBaseline(prev.vector, decay);

  const emo = p.emotionality / 100;
  const log = p.logic / 100;
  const cau = p.caution / 100;
  const dec = p.deception / 100;

  if (input.accusedThisRound) {
    addImpulse(v, 'angry', 22 * emo + 8 * (p.revengeBias / 100));
    addImpulse(v, 'nervous', 14 * cau + 10);
    addImpulse(v, 'suspicious', 6 + 10 * log);
    addImpulse(v, 'calm', -18 * emo - 6);
  }

  const peril = clamp(100 - input.survivalOdds, 0, 100);
  if (peril > 35) {
    addImpulse(v, 'scared', peril * 0.22 * (1 + cau * 0.6));
    addImpulse(v, 'desperate', peril * 0.16 * (p.survivalInstinct / 100));
    addImpulse(v, 'nervous', peril * 0.12);
    addImpulse(v, 'confident', -peril * 0.08 * (1 - p.confidence / 150));
  }

  if (input.alliesDeadCount > 0) {
    addImpulse(v, 'scared', 6 + input.alliesDeadCount * 5);
    addImpulse(v, 'desperate', 4 + input.alliesDeadCount * 4);
    addImpulse(v, 'suspicious', 5 + input.alliesDeadCount * 2);
    addImpulse(v, 'calm', -4 - input.alliesDeadCount * 3);
  }

  if (input.pressure > 40) {
    addImpulse(v, 'nervous', (input.pressure - 40) * 0.35);
    addImpulse(v, 'angry', (input.pressure - 55) * 0.22 * emo);
  }

  if (input.isolation > 35) {
    addImpulse(v, 'nervous', (input.isolation - 35) * 0.28);
    addImpulse(v, 'scared', (input.isolation - 50) * 0.2 * (1 + (100 - p.sociability) / 120));
  }

  if (input.voteTargeting > 30) {
    addImpulse(v, 'desperate', (input.voteTargeting - 30) * 0.25 * (p.survivalInstinct / 100));
    addImpulse(v, 'angry', (input.voteTargeting - 45) * 0.3 * (p.aggression / 100));
    addImpulse(v, 'suspicious', (input.voteTargeting - 35) * 0.15);
  }

  if (stress > 55) {
    addImpulse(v, 'nervous', (stress - 55) * 0.25);
  }
  if (stress > 75) {
    addImpulse(v, 'desperate', (stress - 75) * 0.45);
  }

  // High confidence / leadership resists spiral.
  addImpulse(v, 'confident', (p.confidence / 100) * 6 + (p.leadership / 100) * 4 - stress * 0.04);
  addImpulse(v, 'calm', log * 8 - emo * 3);

  // Manipulative: internal vector still moves but less extreme on outward-facing calm/confident.
  if (dec > 0.7) {
    addImpulse(v, 'calm', 6);
    addImpulse(v, 'angry', -5);
    addImpulse(v, 'scared', -4);
  }

  // Renormalize softly so one label can dominate without all hitting 100.
  const sum = ALL_EMOTIONS.reduce((a, k) => a + v[k], 0) || 1;
  if (sum > 380) {
    for (const k of ALL_EMOTIONS) v[k] = clamp((v[k] / sum) * 360, 0, 100);
  }

  return { vector: v, stress, tick: prev.tick + 1 };
}

/**
 * True dominant emotion from internal vector (simulation ground truth).
 */
export function getDominantEmotion(state: EmotionState): EmotionLabel {
  let best: EmotionLabel = 'calm';
  let bestV = -1;
  for (const k of [...ALL_EMOTIONS].sort()) {
    const val = state.vector[k];
    if (val > bestV) {
      bestV = val;
      best = k;
    }
  }
  return best;
}

/**
 * Outward emotion for speech UI / prompts — manipulative personas flatten spikes toward calm/confident.
 */
export function getSpeechFacingEmotion(state: EmotionState, profile: AIBehaviorProfile): EmotionLabel {
  const hide = profile.deception / 100;
  if (hide < 0.55) return getDominantEmotion(state);
  const v = { ...state.vector };
  const pull = hide * 0.35;
  for (const k of ALL_EMOTIONS) {
    if (k === 'calm' || k === 'confident') v[k] = clamp(v[k] + pull * 12, 0, 100);
    if (k === 'angry' || k === 'scared' || k === 'desperate') v[k] = clamp(v[k] - pull * 10, 0, 100);
  }
  let best: EmotionLabel = 'calm';
  let bestV = -1;
  for (const k of [...ALL_EMOTIONS].sort()) {
    if (v[k] > bestV) {
      bestV = v[k];
      best = k;
    }
  }
  return best;
}

export type EmotionGameplayModifiers = {
  /** Additive to aggression-style scores roughly in [-18, 18]. */
  aggressionDelta: number;
  /** Risk appetite multiplier 0.75–1.25. */
  riskTakingMultiplier: number;
  /** 0–100 extra willingness to flip vote under pressure (feeds voting reconsider). */
  voteVolatility: number;
  /** Tags for speech style / TTS / prompt selection (not dialogue lines). */
  speechToneTags: string[];
};

/**
 * Hooks for speech tone, voting volatility, aggression, risk-taking (req. 5).
 */
export function getEmotionGameplayModifiers(
  state: EmotionState,
  profile: AIBehaviorProfile
): EmotionGameplayModifiers {
  const dom = getDominantEmotion(state);
  const v = state.vector;
  let aggressionDelta = 0;
  let risk = 1;
  let voteVol = 20 + profile.randomness * 0.15;
  const tags: string[] = [`dominant_emotion:${dom}`, `stress:${state.stress}`];

  switch (dom) {
    case 'angry':
      aggressionDelta = 14 + v.angry * 0.08;
      risk = 1.08 + profile.aggression / 500;
      voteVol += 22 + profile.revengeBias * 0.12;
      tags.push('tone:sharp', 'vote:confrontational');
      break;
    case 'nervous':
      aggressionDelta = -6;
      risk = 0.82 - profile.caution / 400;
      voteVol += 18 + profile.followMajorityChance * 0.2;
      tags.push('tone:hesitant', 'vote:bandwagon_prone');
      break;
    case 'scared':
    case 'desperate':
      aggressionDelta = -10 + (dom === 'desperate' ? 4 : 0);
      risk = 0.75 + profile.survivalInstinct / 500;
      voteVol += 28 + profile.survivalInstinct * 0.15;
      tags.push('tone:pleading', 'vote:self_preservation');
      break;
    case 'confident':
      aggressionDelta = 6 + profile.leadership * 0.06;
      risk = 1.05 + profile.confidence / 450;
      voteVol -= 8;
      tags.push('tone:assertive', 'vote:agenda_setting');
      break;
    case 'suspicious':
      aggressionDelta = 4 + profile.detectLieChance * 10;
      risk = 0.95;
      voteVol += 10;
      tags.push('tone:probing', 'vote:defensive_reads');
      break;
    default:
      tags.push('tone:measured', 'vote:baseline');
  }

  if (profile.emotionality > 80) {
    aggressionDelta += 4;
    voteVol += 10;
  }
  if (profile.logic > 80) {
    voteVol -= 12;
    risk = clamp(risk - 0.06, 0.7, 1.2);
  }
  if (profile.deception > 75) {
    tags.push('tone:controlled_mask');
    aggressionDelta *= 0.88;
  }

  return {
    aggressionDelta: clamp(aggressionDelta, -22, 22),
    riskTakingMultiplier: clamp(risk, 0.72, 1.28),
    voteVolatility: clamp(Math.round(voteVol), 0, 100),
    speechToneTags: tags,
  };
}
