/**
 * Deterministic “imperfect speech” bits: hesitation, self-repair, trails, fragments.
 * No RNG device — seed-driven only.
 */
import type { AppLanguage } from '../i18n/appStrings';

export type SpeechRhythm = 'fragments' | 'ramble' | 'tight' | 'repeaty';

function pick<T>(arr: readonly T[], seed: number, salt: number): T {
  return arr[(seed + salt) % arr.length]!;
}

export function pickSpeechRhythm(seed: number, opts: { shy: boolean; emotional: boolean; logical: boolean }): SpeechRhythm {
  const r = (seed + (opts.shy ? 11 : 0) + (opts.emotional ? 23 : 0)) % 100;
  if (opts.shy) {
    if (r < 55) return 'fragments';
    if (r < 82) return 'tight';
    return 'repeaty';
  }
  if (opts.emotional) {
    if (r < 40) return 'repeaty';
    if (r < 78) return 'ramble';
    return 'fragments';
  }
  if (opts.logical) {
    if (r < 65) return 'tight';
    if (r < 88) return 'fragments';
    return 'ramble';
  }
  if (r < 35) return 'tight';
  if (r < 70) return 'fragments';
  return 'ramble';
}

/** Short opener: hesitation / thinking aloud (ZH). */
export function hesitationPrefixZh(seed: number): string {
  return pick(
    ['呃，', '那个…', '我我直说啊，', '嗯…', '慢着我想一下，', '说实话我有点乱，', '等下，', '不是，', '诶，'],
    seed,
    1
  );
}

export function hesitationPrefixEn(seed: number): string {
  return pick(['Uh, ', 'Okay so—', 'Wait—', 'Hmm… ', 'Look—', 'Real talk, ', 'I mean… ', 'Sorry, '], seed, 2);
}

/** Self-repair bridge (can be inserted after first clause). */
export function selfInterruptZh(seed: number): string {
  return pick(['不是，我意思是—', '不对，我换个说法—', '等等我补一句—', '我可能表达歪了—'], seed, 3);
}

export function selfInterruptEn(seed: number): string {
  return pick(['no wait—', 'okay scratch that—', 'let me rephrase—', 'actually—'], seed, 4);
}

export function trailingSoftenerZh(seed: number): string {
  return pick(['…我可能想多了。', '…先说到这吧。', '…你们品品。', '…反正我就这感觉。', '…算了当我嘴碎。'], seed, 5);
}

export function trailingSoftenerEn(seed: number): string {
  return pick([
    '…maybe I am overthinking.',
    '…that is all I got for now.',
    '…tell me if that sounds crazy.',
    '…I will stop talking.',
  ], seed, 6);
}

/** Split long Chinese on commas / semicolons; keep first 1–2 chunks for fragment rhythm. */
export function fragmentizeZh(line: string, seed: number): string {
  const parts = line.split(/[，,；;]/).map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return line;
  const take = 1 + ((seed >> 3) % 2);
  const head = parts.slice(0, take).join('，');
  return `${head}…${pick(['后面我再听', '别的我接不住', '剩下的你们聊'], seed, 7)}。`;
}

export function fragmentizeEn(line: string, seed: number): string {
  const parts = line.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return line;
  const take = 1 + ((seed >> 3) % 2);
  const head = parts.slice(0, take).join(', ');
  return `${head}…${pick(['I stop there.', 'rest later.', 'that is the sharp bit.'], seed, 8)}`;
}

/** Light emotional emphasis — expresses strong feeling WITHOUT doubling the phrase. */
export function emotionalRepeatZh(core: string, seed: number): string {
  const bit = core.slice(0, Math.min(18, core.length));
  if (bit.length < 4) return core;
  return pick([`${bit}，我说真的。`, `${bit}…就是这感觉。`, `${bit}，我就卡在这了。`], seed, 9);
}

export function emotionalRepeatEn(core: string, seed: number): string {
  const bit = core.slice(0, Math.min(24, core.length));
  if (bit.length < 6) return core;
  return pick([`${bit}—I mean it.`, `${bit}. That is the whole itch.`], seed, 10);
}

export function applyRhythmToLine(
  lang: AppLanguage,
  line: string,
  rhythm: SpeechRhythm,
  seed: number
): string {
  if (lang === 'zh') {
    if (rhythm === 'fragments' && line.length > 42) return fragmentizeZh(line, seed);
    if (rhythm === 'ramble' && line.length > 28 && !line.includes('…')) {
      return `${line.slice(0, Math.min(48, line.length))}…${pick(['我嘴有点碎', '想到哪说到哪'], seed, 11)}。`;
    }
    if (rhythm === 'repeaty' && line.length > 20) {
      const cut = line.slice(0, Math.min(22, line.length));
      return emotionalRepeatZh(cut, seed);
    }
    return line;
  }
  if (rhythm === 'fragments' && line.length > 55) return fragmentizeEn(line, seed);
  if (rhythm === 'ramble' && line.length > 45 && !line.includes('…')) {
    return `${line.slice(0, 72)}…${pick(['I ramble.', 'brain dump over.'], seed, 12)}`;
  }
  if (rhythm === 'repeaty' && line.length > 28) return emotionalRepeatEn(line.slice(0, 28), seed);
  return line;
}
