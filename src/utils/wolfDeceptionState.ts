/**
 * Werewolf-only: separate hidden truth (pack + real reads) from public table stance (acted suspicion).
 * Difficulty scales acting quality — wolves never "forget" teammates in the truth layer.
 */
import type { AppLanguage } from '../i18n/appStrings';
import type { DifficultyType } from '../types';
import type { AIBehaviorProfile } from '../data/aiBehaviorProfiles';
import { diffRankFromType } from './personaDifficultyPriority';
import type { SuspicionScores } from './suspicionEngine';

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function hashSeed(parts: readonly string[]): number {
  const s = parts.join('|');
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng01(seed: number, salt: number): number {
  return ((hashSeed([String(seed), String(salt), 'wld']) >>> 0) % 10000) / 10000;
}

export function isWolfDeceptionRole(role: string): boolean {
  return role === 'Werewolf' || role === 'WolfBeauty';
}

/** Hidden lens: packmates are never treated as primary wolf reads internally. */
export function buildWolfHiddenTruthScores(
  tableScores: SuspicionScores,
  observerId: string,
  packMemberIds: readonly string[] | null | undefined,
  aliveIds: readonly string[]
): SuspicionScores {
  if (!packMemberIds?.length) return { ...tableScores };
  const pack = new Set(packMemberIds);
  const out: SuspicionScores = { ...tableScores };
  for (const id of aliveIds) {
    if (id === observerId) {
      out[id] = 0;
      continue;
    }
    if (pack.has(id)) {
      const raw = out[id] ?? 0;
      out[id] = clampScore(Math.min(raw * 0.22 + 6, 15));
    }
  }
  return out;
}

function exilePluralityLeader(lastBallot: Record<string, string> | null | undefined): string | null {
  if (!lastBallot || Object.keys(lastBallot).length === 0) return null;
  const tally = new Map<string, number>();
  for (const tid of Object.values(lastBallot)) {
    tally.set(tid, (tally.get(tid) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestC = 0;
  for (const [tid, c] of tally) {
    if (c > bestC) {
      bestC = c;
      best = tid;
    }
  }
  return best;
}

function wolfPersonaManipulationAppend(
  lang: AppLanguage,
  personality: string,
  profile: AIBehaviorProfile
): string {
  const bits: string[] = [];
  if (lang === 'zh') {
    bits.push(`【同难度·不同人设】「${personality}」决定你怎么演，不是难度决定统一声线。`);
    if (profile.logic >= 70 && profile.emotionality < 58) {
      bits.push('偏逻辑：用可核对的小点、前后句对照压人，少靠喊麦情绪。');
    } else if (profile.emotionality >= 68 && profile.logic < 65) {
      bits.push('偏情绪：用听感、节奏、哪里「不顺」来表达怀疑，少用术语链条硬扣。');
    }
    if (profile.sociability < 45) {
      bits.push('社交能耗低：少大包大揽；压迫短、准、随即收回。');
    } else if (profile.sociability >= 76) {
      bits.push('社交能高：可接话、递话、带气氛，但骗术完成度仍受难度上限约束。');
    }
    if (profile.caution >= 76) {
      bits.push('偏谨慎：少一次锁满狼坑，多留半拍、先听更新再收紧。');
    }
    if (profile.aggression >= 76) {
      bits.push('偏冲：可抢节奏施压；高难度才压得稳，低难度别演成套法官话术。');
    }
    if (profile.leadership >= 72 && profile.sociability >= 58) {
      bits.push('带队欲强：可以有归票口吻，但必须像「这个人」会说的那样说。');
    }
    if (profile.fakeRoleProbability >= 0.5) {
      bits.push('敢悍跳神：被逼问或需要抢位时可以声称预言家/女巫等神职，但要与难度约束和人设一致。');
    } else if (profile.fakeRoleProbability <= 0.08) {
      bits.push('不轻易跳神：不要主动声称预言家/女巫等神职，坚守平民视角或保持沉默。');
    }
    if (profile.bluffChance >= 0.7) {
      bits.push('胆子大：可以主动反击、编细节、反打质疑，骗术完成度仍受难度约束。');
    } else if (profile.bluffChance <= 0.12) {
      bits.push('不敢扯谎：被质疑时多用沉默或回避，越描越黑不如少说。');
    }
  } else {
    bits.push(`[Same difficulty, different persona] "${personality}" decides HOW you manipulate—not a shared voice.`);
    if (profile.logic >= 70 && profile.emotionality < 58) {
      bits.push('Logic-leaning: small checkable hinges, cross-lines—avoid melodrama.');
    } else if (profile.emotionality >= 68 && profile.logic < 65) {
      bits.push('Emotion-leaning: gut rhythm, “feels off”—avoid spreadsheet accusations.');
    }
    if (profile.sociability < 45) {
      bits.push('Low social energy: short, precise pokes—no long speeches.');
    } else if (profile.sociability >= 76) {
      bits.push('High social energy: banter and threading OK—skill cap still set by difficulty.');
    }
    if (profile.caution >= 76) {
      bits.push('Cautious: avoid hard-locking a full wolf pool in one breath.');
    }
    if (profile.aggression >= 76) {
      bits.push('Aggressive: seize tempo when it fits you—only high difficulty stays airtight.');
    }
    if (profile.leadership >= 72 && profile.sociability >= 58) {
      bits.push('Leader vibe: you may steer votes—but it must sound like THIS character.');
    }
    if (profile.fakeRoleProbability >= 0.5) {
      bits.push('Bold fake-claimer: you may claim Seer/Witch/etc. under pressure if difficulty allows.');
    } else if (profile.fakeRoleProbability <= 0.08) {
      bits.push('Avoid fake-claiming god roles: stay civilian or silent rather than inventing a god identity.');
    }
    if (profile.bluffChance >= 0.7) {
      bits.push('Brave bluffer: dare to counter-press and spin details when threatened—within difficulty cap.');
    } else if (profile.bluffChance <= 0.12) {
      bits.push('Bluff-shy: when pressed, go quiet or deflect rather than actively lying back.');
    }
  }
  return bits.join(' ');
}

/**
 * Public stance scores for thoughtEngine / prompts: novice = noisy + bandwagon errors + ally leaks;
 * Hard = tracks truth with light noise + staged mild doubt on pack.
 */
export function buildWolfPublicStanceScores(params: {
  truthScores: SuspicionScores;
  difficulty: DifficultyType;
  profile: AIBehaviorProfile;
  observerId: string;
  packMemberIds: readonly string[];
  aliveIds: readonly string[];
  lastExileBallot: Record<string, string> | null | undefined;
  tickSeed: number;
}): SuspicionScores {
  const { truthScores, difficulty, profile, observerId, packMemberIds, aliveIds, lastExileBallot, tickSeed } = params;
  const tier = diffRankFromType(difficulty);
  const packExSelf = new Set(packMemberIds.filter((x) => x !== observerId));
  const out: SuspicionScores = { ...truthScores };

  for (const id of aliveIds) {
    if (id === observerId) {
      out[id] = 0;
      continue;
    }
    const base = out[id] ?? 0;
    const r0 = rng01(tickSeed, id * 9973);
    const r1 = rng01(tickSeed, id * 131 + 17);

    if (!packExSelf.has(id)) {
      let noise = 0;
      if (tier <= 0) noise = (r0 - 0.5) * 38;
      else if (tier === 1) noise = (r0 - 0.5) * 24;
      else if (tier === 2) noise = (r0 - 0.5) * 14;
      else noise = (r0 - 0.5) * 8;
      // Persona shapes *how* noisy the public mask is; difficulty tier sets baseline above.
      const socialAmp = 0.72 + profile.sociability / 350;
      const aggAmp = 1 + (profile.aggression - 50) / 500;
      const logicDamp = 1 - (profile.logic - 50) / 520;
      const emoAmp = 1 + (profile.emotionality - 50) / 480;
      noise *= socialAmp * aggAmp * logicDamp * (tier <= 0 ? emoAmp : 0.92 + emoAmp * 0.08);
      noise *= 1 - profile.caution / 320;
      out[id] = clampScore(base + noise);
    } else {
      if (tier >= 3) {
        let floor = 16 + r1 * 24;
        if (profile.caution >= 72) floor -= (profile.caution - 72) * 0.35;
        if (profile.sociability < 44) floor -= 4 + r1 * 6;
        if (profile.aggression >= 78) floor += 2 + r1 * 5;
        out[id] = clampScore(Math.max(base, floor));
      } else if (tier === 2) {
        out[id] = clampScore(base + 5 + r1 * 12);
      } else if (tier <= 0) {
        if (r0 < 0.4) {
          out[id] = clampScore(base - (8 + r1 * 20));
        } else if (r0 < 0.68) {
          out[id] = clampScore(base + (10 + r1 * 22));
        }
      }
    }
  }

  if (tier <= 0 && rng01(tickSeed, 404) < Math.min(0.76, 0.46 + profile.leadership / 420)) {
    const leader = exilePluralityLeader(lastExileBallot);
    if (leader) {
      const pool = aliveIds.filter((x) => x !== observerId && x !== leader && !packExSelf.has(x));
      if (pool.length > 0) {
        const wrong = pool[Math.floor(rng01(tickSeed, 405) * pool.length)]!;
        const L = out[leader] ?? 0;
        const w0 = out[wrong] ?? 0;
        out[wrong] = clampScore(w0 * 0.52 + L * 0.4 + 8 + rng01(tickSeed, 406) * 12);
      }
    }
  }

  return out;
}

export function buildWolfDeceptionPromptBlock(
  lang: AppLanguage,
  difficulty: DifficultyType,
  actingCeiling: number,
  personality: string,
  profile: AIBehaviorProfile
): string {
  let core: string;
  if (lang === 'zh') {
    switch (difficulty) {
      case 'Novice':
        core =
          `【狼人桌面演技（难度：新手）】你心里完全清楚谁是狼队友、谁是好刀口/神危险位；**禁止**在发言里承认狼队或“我在演”。` +
          `但你的**桌面表演要拙**：容易紧张、先拼命洗自己、少用复杂悍跳/狼踩狼/深水编织；` +
          `跟票可以显得怂、别演成老骗子；假怀疑要碎、别像教练盘逻辑。演技上限≈${actingCeiling}/3。`;
        break;
      case 'Easy':
        core =
          `【狼人桌面演技（难度：简单）】内心目标清晰；嘴上可以跟大部但仍会露怯，少用高阶控场骗术。` +
          `假怀疑要短、别堆多层叙事；演技上限≈${actingCeiling}/3。`;
        break;
      case 'Medium':
        core =
          `【狼人桌面演技（难度：中等）】可适度悍跳/带节奏，但要与人设一致；` +
          `别把票型、验人流说成“报表”；狼队友表面上要像普通好人互有问号。演技上限≈${actingCeiling}/3。`;
        break;
      case 'Hard':
      default:
        core =
          `【狼人桌面演技（难度：高）】可接近老手：假怀疑可与票型/前置发言对齐，但仍禁元词汇与场外。` +
          `狼队友之间可演“轻互踩”做身份，别写成狼在开会。演技上限≈${actingCeiling}/3。`;
        break;
    }
  } else {
    switch (difficulty) {
      case 'Novice':
        core =
          `[WOLF TABLE ACTING — Novice] You fully know packmates and town threats; never admit wolf or “I am acting”. ` +
          `But your **public performance is clumsy**: nervous self-clear, shallow fake reads, avoid advanced bus/fake-god layering. ` +
          `Bandwagon awkwardly; do not sound like a veteran manipulator. Acting ceiling ≈ ${actingCeiling}/3.`;
        break;
      case 'Easy':
        core =
          `[WOLF TABLE ACTING — Easy] Clear inner targets; speech may follow town but stays brittle—avoid multi-layer scams. ` +
          `Acting ceiling ≈ ${actingCeiling}/3.`;
        break;
      case 'Medium':
        core =
          `[WOLF TABLE ACTING — Medium] You may fake-claim or steer sometimes—stay in persona; teammates should look like normal town cross-talk. ` +
          `Acting ceiling ≈ ${actingCeiling}/3.`;
        break;
      case 'Hard':
      default:
        core =
          `[WOLF TABLE ACTING — Hard] Stronger masking: align fake pressure with logs/votes; still no meta/out-of-game words. ` +
          `Light staged doubt on packmates is OK. Acting ceiling ≈ ${actingCeiling}/3.`;
        break;
    }
  }
  return `${core}\n${wolfPersonaManipulationAppend(lang, personality, profile)}`;
}
