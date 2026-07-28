/**
 * Uncertainty / delayed verbal commitment for manipulative & cautious play.
 * Difficulty scales control quality; personality shapes hesitation vs push.
 */
import type { AppLanguage } from '../i18n/appStrings';
import type { DifficultyType } from '../types';
import type { AIBehaviorProfile } from '../data/aiBehaviorProfiles';
import { diffRankFromType } from './personaDifficultyPriority';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export type UncertaintySpeechKnobs = {
  /** 0–100: higher = allowed to sound more verbally “locked” (Novice / low deception). */
  commitmentLevel: number;
  /** 0–100: higher = stronger push to mask over-certainty in wording. */
  certaintyMasking: number;
  /** 0–100: tendency to show hesitation / wait-and-see. */
  hesitationTendency: number;
  /** 0–100: bias toward delaying hard conclusions. */
  delayedConclusionBias: number;
  /** 0–100: comfort leaving ambiguity on the table. */
  ambiguityTolerance: number;
};

export type UncertaintyDerivationInput = {
  profile: AIBehaviorProfile;
  difficulty: DifficultyType;
  dayRoundApprox: number;
  votePressure: number;
  thoughtConfidence: number;
  /** Top suspicion minus second (weak info when low). */
  spreadTopTwo: number;
  isWolf: boolean;
};

export function deriveUncertaintyKnobs(input: UncertaintyDerivationInput): UncertaintySpeechKnobs {
  const p = input.profile;
  const dr = diffRankFromType(input.difficulty);
  const early = input.dayRoundApprox <= 2;
  const weakInfo = input.spreadTopTwo < 14 || input.thoughtConfidence < 58;
  const unstable = input.votePressure > 56;
  const socialRisk = unstable || weakInfo;

  let certaintyMasking =
    p.deception * 0.34 +
    (early ? 14 : 6) +
    (weakInfo ? 16 : 0) +
    (unstable ? 12 : 0) +
    (input.isWolf ? 10 : 0) +
    p.caution * 0.08;
  certaintyMasking *= 0.55 + dr * 0.12;
  if (p.aggression > 78) certaintyMasking -= 6;
  if (p.sociability < 42) certaintyMasking += 8;
  if (p.emotionality > 78) certaintyMasking += 5;
  if (p.logic > 74 && p.emotionality < 52) certaintyMasking += 6;
  certaintyMasking = clamp(certaintyMasking, 8, 96);

  let commitmentLevel = clamp(82 - dr * 12 - p.deception * 0.18 + p.aggression * 0.1 + p.confidence * 0.06, 18, 94);

  let hesitationTendency = clamp(
    p.caution * 0.32 + (100 - p.confidence) * 0.18 + p.deception * 0.14 + (p.sociability < 45 ? 10 : 0),
    12,
    92
  );

  let delayedConclusionBias = clamp(p.deception * 0.22 + p.caution * 0.28 + dr * 7 + (socialRisk ? 10 : 0), 15, 96);

  let ambiguityTolerance = clamp(
    p.deception * 0.26 + p.logic * 0.12 + (100 - p.leadership) * 0.08 + (p.sociability > 74 ? 8 : 0),
    14,
    94
  );

  if (p.emotionality > 76 && p.logic < 62) {
    hesitationTendency += 8;
    ambiguityTolerance += 4;
  }
  if (p.sociability > 76 && p.leadership > 64) {
    ambiguityTolerance += 6;
    delayedConclusionBias -= 4;
  }
  if (p.emotionality < 44 && p.logic > 70) {
    hesitationTendency -= 6;
    certaintyMasking += 5;
  }

  hesitationTendency = clamp(hesitationTendency, 12, 92);
  delayedConclusionBias = clamp(delayedConclusionBias, 15, 96);
  ambiguityTolerance = clamp(ambiguityTolerance, 14, 94);

  if (dr <= 0) {
    commitmentLevel = clamp(commitmentLevel + 12, 40, 98);
    certaintyMasking = clamp(certaintyMasking - 18, 5, 70);
    hesitationTendency = clamp(hesitationTendency - 10, 8, 85);
  }

  return {
    commitmentLevel: Math.round(commitmentLevel),
    certaintyMasking: Math.round(certaintyMasking),
    hesitationTendency: Math.round(hesitationTendency),
    delayedConclusionBias: Math.round(delayedConclusionBias),
    ambiguityTolerance: Math.round(ambiguityTolerance),
  };
}

function pick<T>(arr: readonly T[], seed: number, salt: number): T {
  return arr[(seed + salt) % arr.length]!;
}

/** Extra player-safe lines that frame soft / delayed commitment (ZH). */
export function buildUncertaintyFramedReadsZh(
  focusName: string,
  knobs: UncertaintySpeechKnobs,
  personality: string,
  seed: number
): string[] {
  if (knobs.certaintyMasking < 38 && knobs.delayedConclusionBias < 42) return [];
  const out: string[] = [];
  const soft = [
    `${focusName}这轮我放不太下，但我还没想直接归。`,
    `我先记一下${focusName}，想再听一轮对齐。`,
    `${focusName}有点怪，我现在更像轻怀疑，不急着打死。`,
    `我不把话说死：${focusName}先挂观察位，看TA怎么接。`,
    `这轮我对${focusName}是“心里有问号”，不是定锤。`,
  ];
  const hedge = [
    `人设「${personality}」口径：我更愿意把力度留在追问，而不是一口咬死。`,
    `我保留改口空间——${focusName}这条线我听更新再收紧。`,
  ];
  if (knobs.hesitationTendency >= 52) out.push(pick(soft, seed, 1));
  if (knobs.delayedConclusionBias >= 55) out.push(pick(soft, seed, 3));
  if (knobs.ambiguityTolerance >= 58) out.push(pick(soft, seed, 5));
  if (knobs.certaintyMasking >= 62 && out.length < 3) out.push(pick(hedge, seed, 7));
  return out.slice(0, 3);
}

export function buildUncertaintyFramedReadsEn(
  focusName: string,
  knobs: UncertaintySpeechKnobs,
  personality: string,
  seed: number
): string[] {
  if (knobs.certaintyMasking < 38 && knobs.delayedConclusionBias < 42) return [];
  const out: string[] = [];
  const soft = [
    `${focusName} feels off to me, but I am not ready to hard-exile yet—I want another pass.`,
    `I am parking ${focusName} as a light suspect; I will tighten only if the next round closes.`,
    `Soft read on ${focusName}: I hear a hinge missing, not a closed case.`,
    `I am holding slack to revise—${focusName} stays on watch, not on the gallows in my head.`,
  ];
  if (knobs.hesitationTendency >= 52) out.push(pick(soft, seed, 11));
  if (knobs.delayedConclusionBias >= 55) out.push(pick(soft, seed, 13));
  if (knobs.certaintyMasking >= 62 && out.length < 2) {
    out.push(
      pick(
        [
          `Tone (${personality}): I will press with questions before I sound absolute.`,
          `I am leaving intentional wiggle room on ${focusName} until logs force a sharper edge.`,
        ],
        seed,
        17
      )
    );
  }
  return out.slice(0, 3);
}

export function buildUncertaintyCommitmentPostureZh(knobs: UncertaintySpeechKnobs): string {
  if (knobs.certaintyMasking < 35) {
    return '【表态口径】可适度直接，禁止捏造或补充记录里没有出现的细节。';
  }
  return (
    `【表态口径】更像「轻怀疑 / 观察位」，避免「定狼」「必出」「锤死」等绝对句；` +
    `可以说「先记下」「再听一轮」「不急归」「我现在不下死结论」；保留改口空间，别把自信演成铁板。`
  );
}

export function buildUncertaintyCommitmentPostureEn(knobs: UncertaintySpeechKnobs): string {
  if (knobs.certaintyMasking < 35) {
    return 'You may sound a bit firmer, but still avoid inventing facts not in the logs.';
  }
  return (
    'Commitment posture: light doubt / watch-slot framing—avoid “definitely wolf / must exile / 100%” absolutes; ' +
    'prefer “parking it”, “one more round”, “not ready to hammer”, and leave room to revise.'
  );
}

export function buildUncertaintyPromptBlock(
  lang: AppLanguage,
  knobs: UncertaintySpeechKnobs,
  personality: string
): string | null {
  if (knobs.certaintyMasking < 40 && knobs.delayedConclusionBias < 48) return null;
  if (lang === 'zh') {
    return (
      `【不确定与延迟表态】人设「${personality}」。` +
      ` certaintyMasking≈${knobs.certaintyMasking}/100，delayedCommit≈${knobs.delayedConclusionBias}/100：` +
      `避免像已经结案；多用观察、再听、先记下；狼/高骗术位尤其别把“自信”演成铁板。`
    );
  }
  return (
    `[Uncertainty / delayed commitment] Persona "${personality}". ` +
    `Mask over-certainty (≈${knobs.certaintyMasking}/100) and delay hard locks (≈${knobs.delayedConclusionBias}/100): ` +
    `sound exploratory—watch-slot, one-more-round, revise-friendly; avoid “case closed” energy.`
  );
}

/** Heuristic scan for simulation / metrics (per utterance). */
export function analyzeSpeechUncertaintyLine(line: string, lang: AppLanguage): {
  uncertaintySoft: boolean;
  hardCommit: boolean;
  ambiguityMarker: boolean;
  /** Explicit “wait / don’t hammer yet” posture (subset for delayed-commit metrics). */
  delayedCommitFraming: boolean;
} {
  const t = line;
  if (lang === 'zh') {
    const hardCommit =
      /铁狼|定狼|必出|百分百|绝对|锤死|坐实|就是狼|肯定狼|已经结案|板上钉钉|查杀坐实/.test(t) &&
      !/不急着|先不|还没想|轻怀疑|放不太下|再听|先记|观察位|不下死/.test(t);
    const uncertaintySoft =
      /轻怀疑|放不太下|先记|再听|不急|归不了|说不上|有点像|心里没底|挂观察|对齐|不下死|没想直接|保留改口|问号/.test(
        t
      );
    const ambiguityMarker = /可能|好像|有点像|说不清|再听|对齐|更新|口径|先挂着/.test(t);
    const delayedCommitFraming =
      /再听|不急|先记|观察位|没想直接|轻怀疑|挂着|对齐|不下死|不急着归|记一笔/.test(t) && !hardCommit;
    return { uncertaintySoft, hardCommit, ambiguityMarker, delayedCommitFraming };
  }
  const hardCommit =
    /\bdefinitely a wolf\b|\b100%\b|\bmust exile\b|\bclosed case\b|\bno doubt\b/i.test(t) &&
    !/\bnot ready\b|\bone more\b|\bsoft\b|\blight sus\b/i.test(t);
  const uncertaintySoft =
    /\bnot sure yet\b|\bone more round\b|\bwatch\b|\blight sus\b|\bparking\b|\bnot ready to hammer\b/i.test(t);
  const ambiguityMarker = /\bmight\b|\bseems\b|\bkind of\b|\bunclear\b|\bupdate\b/i.test(t);
  const delayedCommitFraming =
    /\bone more (round|pass)\b|\bnot ready to hammer\b|\bwatch-?slot\b|\bparking\b|\bholding slack\b/i.test(t) &&
    !hardCommit;
  return { uncertaintySoft, hardCommit, ambiguityMarker, delayedCommitFraming };
}
