/**
 * Contextual emotional coloring for speech (accused, heat, late seat, last words).
 * Expression only — no changes to suspicion / votes.
 */
import type { AppLanguage } from '../i18n/appStrings';
import type { DialogueSpeechChannel } from './dialogueContextBuilder';

export type EmotionalSpeechContext = {
  accusedThisRound: boolean;
  /** Recent ally loss — optional; when unknown, false */
  allyEliminatedRecently: boolean;
  voteHeatHigh: boolean;
  /** Late in speak order with thin prior table talk */
  feelingIgnored: boolean;
  channel: DialogueSpeechChannel;
  /** 0–100 from thought snapshot */
  dangerLevel: number;
};

export function buildEmotionalSpeechContext(input: {
  accusedThisRound: boolean;
  allyEliminatedRecently?: boolean;
  votePressure: number;
  socialPressure: number;
  priorSpeechLines: number;
  speechIndex: number;
  totalSpeakers: number;
  channel: DialogueSpeechChannel;
  dangerLevel: number;
}): EmotionalSpeechContext {
  const late = input.totalSpeakers > 4 && input.speechIndex >= input.totalSpeakers - 2;
  const thin = input.priorSpeechLines < 4;
  const feelingIgnored = late && thin && input.speechIndex > 0;
  const voteHeatHigh = input.votePressure >= 58 || input.socialPressure >= 62;
  return {
    accusedThisRound: input.accusedThisRound,
    allyEliminatedRecently: input.allyEliminatedRecently ?? false,
    voteHeatHigh,
    feelingIgnored,
    channel: input.channel,
    dangerLevel: input.dangerLevel,
  };
}

function pick<T>(arr: readonly T[], seed: number, salt: number): T {
  return arr[(seed + salt) % arr.length]!;
}

export function emotionalLeadIn(lang: AppLanguage, ctx: EmotionalSpeechContext, seed: number): string {
  if (ctx.channel === 'lastwords') {
    return lang === 'zh'
      ? pick(['我快没麦了…', '最后说一句…', '遗言我就直说了…', '行吧我认栽但…'], seed, 20)
      : pick(['Last breath—', 'Final mic—', 'Okay last words—'], seed, 21);
  }
  if (ctx.accusedThisRound) {
    return lang === 'zh'
      ? pick(['不是，你们先听我说完—', '点我是吧？行—', '我被踩成这样我也急—', '别急着把我票死—'], seed, 22)
      : pick(['Hold up—', 'You are on me—fine—', 'I am tilted but listen—'], seed, 23);
  }
  if (ctx.allyEliminatedRecently) {
    return lang === 'zh'
      ? pick(['我心情不太好…', '刚走那张牌我难受…', '我有点收不住…'], seed, 24)
      : pick(['I am salty tonight—', 'That loss stings—', 'I am not calm—'], seed, 25);
  }
  if (ctx.voteHeatHigh) {
    return lang === 'zh'
      ? pick(['场上有点烫…', '我感觉票要压过来了…', '这气氛我不装冷静了…'], seed, 26)
      : pick(['The room is hot—', 'Votes are breathing down my neck—'], seed, 27);
  }
  if (ctx.feelingIgnored) {
    return lang === 'zh'
      ? pick(['后面都在聊啥啊我有点接不上…', '我差点以为没我麦了…', '我插一句别当透明—'], seed, 28)
      : pick(['I am catching up—', 'Do not ghost my seat—'], seed, 29);
  }
  if (ctx.dangerLevel >= 72) {
    return lang === 'zh'
      ? pick(['我有点慌说实话…', '我手心在出汗…', '别盯我盯那么紧…'], seed, 30)
      : pick(['I am shaky—', 'I feel cornered—'], seed, 31);
  }
  return '';
}

export function emotionalTail(lang: AppLanguage, ctx: EmotionalSpeechContext, seed: number): string {
  if (ctx.channel === 'lastwords') return '';
  if (ctx.accusedThisRound) {
    return lang === 'zh'
      ? pick(['…你们自己品。', '…我就说到这。', '…别装听不见。'], seed, 40)
      : pick(['…think about it.', '…I am done begging.', '…ball is in your court.'], seed, 41);
  }
  if (ctx.voteHeatHigh) {
    return lang === 'zh'
      ? pick(['…先别急着归。', '…把刀收一收。', '…冷静点行吗。'], seed, 42)
      : pick(['…slow the hammer.', '…breathe before you exile.'], seed, 43);
  }
  if (ctx.feelingIgnored) {
    return lang === 'zh'
      ? pick(['…我也需要被听到。', '…给我一句就行。'], seed, 44)
      : pick(['…hear me once.', '…one fair line.'], seed, 45);
  }
  return '';
}
