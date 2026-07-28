/**
 * Persona-driven night target selection.
 *
 * Replaces blind `pickRandom(pool)` choices inside `GameRoomScreen.finalize*` with
 * picks that read the AI's per-seat suspicion (already maintained by `speechPrep` /
 * `suspicionEngine`) and weights them by the seat's `AIBehaviorProfile`.
 *
 * Design constraints (Phase 1, intentionally minimal):
 * - Pure function. No state writes. No LLM. No prompt change.
 * - Reads only what the seat is LEGALLY allowed to know:
 *     - per-seat suspicion scores (private to that AI)
 *     - public roster (alive, sheriff flag)
 *     - own wolf-pack ids (wolves only)
 *   It does NOT read other seats' suspicion, ground-truth roles of non-wolves,
 *   or hidden ballot data.
 * - Safe fallback: if no profile / no brain / empty pool, returns null and the
 *   caller is expected to keep the existing random fallback.
 */
import type { AIBehaviorProfile } from '../data/aiBehaviorProfiles';
import type { AiSpeechSeatBrain } from './speechPrep';

export type PoolPlayer = {
  id: string;
  role: string;
  isAlive: boolean;
};

/**
 * Derived per-decision weights, all in [0, 1].
 * Built from `AIBehaviorProfile` so each call site can read a stable knob set
 * without re-doing the trait math.
 */
export type DecisionWeights = {
  riskAppetite: number;
  carefulness: number;
  deceptionDrive: number;
  loudness: number;
  groupConformity: number;
  revengeDrive: number;
  survivalDrive: number;
  randomKick: number;
};

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

export function deriveDecisionWeights(p: AIBehaviorProfile): DecisionWeights {
  return {
    // brave x confident x not-cautious
    riskAppetite: clamp01(((p.aggression / 100) * (p.confidence / 100) * (1 - p.caution / 100)) * 1.2),
    carefulness: clamp01((p.caution / 100) * (0.5 + (p.logic / 200))),
    // deception trait combined with willingness to actually bluff
    deceptionDrive: clamp01((p.deception / 100) * (0.4 + p.bluffChance * 0.8)),
    loudness: clamp01(((p.aggression / 100) + (p.sociability / 100) + (p.confidence / 100)) / 3),
    groupConformity: clamp01((p.followMajorityChance / 100) * (1 - p.leadership / 100)),
    revengeDrive: clamp01((p.revengeBias / 100) * (0.5 + p.emotionality / 200)),
    survivalDrive: clamp01(p.survivalInstinct / 100),
    randomKick: clamp01(p.randomness / 100),
  };
}

/**
 * Stable, low-quality PRNG. We don't need cryptographic randomness here.
 * Using Math.random keeps this module side-effect-free except for that one read.
 */
const rng = (): number => Math.random();

/**
 * Softmax pick over `pool` using `scoreOf`.
 * Lower `temperature` -> sharper (more deterministic) preference.
 * `temperature` is derived from the seat's `randomKick`.
 */
function softmaxPick<T>(pool: readonly T[], scoreOf: (t: T) => number, temperature: number): T {
  if (pool.length === 1) return pool[0]!;
  const temp = Math.max(0.25, temperature);
  const scores = pool.map(scoreOf);
  const maxS = Math.max(...scores);
  const exps = scores.map((s) => Math.exp((s - maxS) / (temp * 30)));
  const sum = exps.reduce((a, b) => a + b, 0);
  if (sum <= 0 || !Number.isFinite(sum)) {
    return pool[Math.floor(rng() * pool.length)]!;
  }
  let r = rng() * sum;
  for (let i = 0; i < pool.length; i++) {
    r -= exps[i]!;
    if (r <= 0) return pool[i]!;
  }
  return pool[pool.length - 1]!;
}

function suspicionOf(brain: AiSpeechSeatBrain | null, id: string): number {
  if (!brain) return 0;
  return brain.suspicion.scores[id] ?? 0;
}

function isSheriff(p: PoolPlayer, sheriffId: string | null): boolean {
  return !!sheriffId && p.id === sheriffId;
}

// ---------------------------------------------------------------------------
// Wolf kill: choose a victim among non-wolf alive players.
// ---------------------------------------------------------------------------
export type WolfKillInput = {
  /** The wolf seat that is picking (one wolf -> one vote in pack tally). */
  wolfId: string;
  brain: AiSpeechSeatBrain | null;
  profile: AIBehaviorProfile;
  /** Candidates allowed to be knifed (already filtered to non-wolves, alive, not self). */
  pool: readonly PoolPlayer[];
  sheriffId: string | null;
  isFirstNight: boolean;
};

export function pickWolfKillTarget(input: WolfKillInput): string | null {
  if (input.pool.length === 0) return null;
  const w = deriveDecisionWeights(input.profile);

  const scoreOf = (c: PoolPlayer): number => {
    const susp = suspicionOf(input.brain, c.id);
    // Risky wolves love knifing visible threats: sheriff, high-suspicion (= visible/loud)
    const visibleThreatBonus = (isSheriff(c, input.sheriffId) ? 28 : 0) + susp * 0.6 * w.riskAppetite;
    // Cunning wolves prefer cold knife: pick low-suspicion player to disguise
    const stealthBias = (40 - susp) * w.deceptionDrive * 0.5;
    // First night: cautious wolves often go low-info -> mild penalty on sheriff
    const firstNightCaution = input.isFirstNight ? -w.carefulness * (isSheriff(c, input.sheriffId) ? 18 : 0) : 0;
    return visibleThreatBonus + stealthBias + firstNightCaution;
  };

  const temp = 1.4 + w.randomKick * 2.4;
  return softmaxPick(input.pool, scoreOf, temp).id;
}

// ---------------------------------------------------------------------------
// Seer check: verify the most informative target.
// ---------------------------------------------------------------------------
export type SeerCheckInput = {
  seerId: string;
  brain: AiSpeechSeatBrain | null;
  profile: AIBehaviorProfile;
  pool: readonly PoolPlayer[];
  sheriffId: string | null;
};

export function pickSeerCheckTarget(input: SeerCheckInput): string | null {
  if (input.pool.length === 0) return null;
  const w = deriveDecisionWeights(input.profile);

  const scoreOf = (c: PoolPlayer): number => {
    const susp = suspicionOf(input.brain, c.id);
    // Cautious seer: verify highest suspicion (close a read).
    // Aggressive seer: also weights mid-band (people they want to expose loudly tomorrow).
    const verifySuspicious = susp * (0.6 + w.carefulness * 0.8);
    // Aggressive seer leans into the louder players a hair more (already captured via susp here).
    const aggressiveBoost = w.riskAppetite * susp * 0.3;
    // Sheriff: usually NOT worth checking (publicly important; expected to be town anchor).
    const sheriffPenalty = isSheriff(c, input.sheriffId) ? -12 : 0;
    return verifySuspicious + aggressiveBoost + sheriffPenalty;
  };

  const temp = 1.1 + w.randomKick * 1.8;
  return softmaxPick(input.pool, scoreOf, temp).id;
}

// ---------------------------------------------------------------------------
// Guard protect: shield the most important / most threatened town piece.
// ---------------------------------------------------------------------------
export type GuardProtectInput = {
  guardId: string;
  brain: AiSpeechSeatBrain | null;
  profile: AIBehaviorProfile;
  pool: readonly PoolPlayer[];
  sheriffId: string | null;
  /** Last night's guard target, if any — Guard rule typically forbids guarding same seat twice. */
  previousTargetId?: string | null;
};

export function pickGuardTarget(input: GuardProtectInput): string | null {
  const pool = input.previousTargetId
    ? input.pool.filter((p) => p.id !== input.previousTargetId)
    : input.pool;
  if (pool.length === 0) return null;
  const w = deriveDecisionWeights(input.profile);

  const scoreOf = (c: PoolPlayer): number => {
    const susp = suspicionOf(input.brain, c.id);
    // Protect likely-town: low suspicion = trusted.
    const trustWeight = (60 - susp) * (0.5 + w.carefulness * 0.8);
    // Cautious guards prioritize the sheriff (visible knife target).
    const sheriffBias = isSheriff(c, input.sheriffId) ? 22 + w.carefulness * 18 : 0;
    // Self-preservation: cautious / low-confidence guards may keep themselves alive.
    const selfBias = c.id === input.guardId ? w.survivalDrive * 12 - w.loudness * 8 : 0;
    return trustWeight + sheriffBias + selfBias;
  };

  const temp = 1.2 + w.randomKick * 1.6;
  return softmaxPick(pool, scoreOf, temp).id;
}

// ---------------------------------------------------------------------------
// Witch: a pair of independent decisions, both probabilistic.
// ---------------------------------------------------------------------------
export type WitchDecisionInput = {
  witchId: string;
  brain: AiSpeechSeatBrain | null;
  profile: AIBehaviorProfile;
  /** Tonight's wolf knife victim id (null if none / not yet decided). */
  knifeVictimId: string | null;
  /** Alive seats other than the witch herself (used as poison candidate pool). */
  poisonPool: readonly PoolPlayer[];
  hasAntidote: boolean;
  hasPoison: boolean;
  isFirstNight: boolean;
  /** Public sheriff id, for save-priority bias. */
  sheriffId: string | null;
};

export type WitchDecision = {
  save: boolean;
  poisonTargetId: string | null;
};

export function decideWitchActions(input: WitchDecisionInput): WitchDecision {
  const w = deriveDecisionWeights(input.profile);
  let save = false;

  if (input.hasAntidote && input.knifeVictimId) {
    const victimIsSelf = input.knifeVictimId === input.witchId;
    const victimSusp = suspicionOf(input.brain, input.knifeVictimId);
    // Higher suspicion of victim -> they LOOK like a wolf -> less likely to save.
    // Witches are conservative on n1 by tradition; we add a carefulness boost.
    let saveProb = 0;
    if (victimIsSelf) {
      // Self-save: only on first night (n1) per common Werewolf rules; afterwards expose-yourself risk.
      if (input.isFirstNight) saveProb = 0.7 + w.survivalDrive * 0.25;
      else saveProb = 0.15 + w.survivalDrive * 0.3;
    } else {
      // Save trust: trust low-suspicion victims.
      const trust = (60 - victimSusp) / 60; // ~1 when low susp, ~0 when high
      const sheriffBias = input.knifeVictimId === input.sheriffId ? 0.2 : 0;
      const firstNightLean = input.isFirstNight ? 0.65 : 0.25;
      saveProb = firstNightLean * trust + sheriffBias + w.carefulness * 0.15 - w.riskAppetite * 0.1;
    }
    if (rng() < clamp01(saveProb)) save = true;
  }

  let poisonTargetId: string | null = null;
  if (input.hasPoison && !save && input.poisonPool.length > 0) {
    // Poison risk: aggressive / confident witches throw the bottle, cautious witches hoard it.
    const baseChance = input.isFirstNight ? 0.05 : 0.18;
    const aggressiveBoost = w.riskAppetite * 0.25;
    const cautionPenalty = w.carefulness * 0.18;
    const chance = clamp01(baseChance + aggressiveBoost - cautionPenalty);
    if (rng() < chance) {
      const scoreOf = (c: PoolPlayer): number => {
        const susp = suspicionOf(input.brain, c.id);
        // Poison highest-suspicion seat; risky witches may also splash mid-band.
        return susp * (1 + w.riskAppetite * 0.4) - w.carefulness * 4;
      };
      const temp = 1.1 + w.randomKick * 1.6;
      poisonTargetId = softmaxPick(input.poisonPool, scoreOf, temp).id;
    }
  }

  return { save, poisonTargetId };
}
