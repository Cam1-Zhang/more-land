/**
 * Small social “noise” clauses: challenge, confusion, note-taking, sarcasm-lite.
 * Deterministic from seed — not game logic.
 */
import type { AppLanguage } from '../i18n/appStrings';

function pick<T>(arr: readonly T[], seed: number, salt: number): T {
  return arr[(seed + salt) % arr.length]!;
}

export function microChallengeZh(seed: number): string {
  return pick(['你这话听着就有点怪。', '这句我不太舒服。', '别跟我打太极。', '你绕我？'], seed, 1);
}

export function microChallengeEn(seed: number): string {
  return pick(['That line felt off.', 'Do not dodge me.', 'That sounded slick, not clear.'], seed, 2);
}

export function confusionTickZh(seed: number): string {
  return pick(['等下我有点没听懂。', '我脑子卡了一下。', '谁帮我捋一句？', '这里我有点断片。'], seed, 3);
}

export function confusionTickEn(seed: number): string {
  return pick(['Wait I lost the thread.', 'I blanked for a second.', 'Someone rewind that beat.'], seed, 4);
}

export function noteTakingZh(seed: number): string {
  return pick(['我先记一下这个点。', '这条我先摁住。', '我小本本先写上。'], seed, 5);
}

export function noteTakingEn(seed: number): string {
  return pick(['I am pocketing that point.', 'I am writing that down mentally.', 'Pinning that.'], seed, 6);
}

export function frustrationBlipZh(seed: number): string {
  return pick(['我有点烦。', '别逼我急。', '我真不想吵。', '气氛别搞这么硬。'], seed, 7);
}

export function frustrationBlipEn(seed: number): string {
  return pick(['I am getting heated.', 'Do not squeeze me.', 'I hate this vibe.'], seed, 8);
}

export function sarcasmSoftZh(seed: number): string {
  return pick(['行吧，你开心就好。', '嗯嗯你继续。', '可以，很秀。'], seed, 9);
}

export function sarcasmSoftEn(seed: number): string {
  return pick(['Sure, sure, go on.', 'Cute story.', 'Okay champion.'], seed, 10);
}

/** Optional mid-line social insert (low probability caller). */
export function randomSocialInsert(lang: AppLanguage, seed: number): string {
  const r = seed % 100;
  if (r < 12) return lang === 'zh' ? confusionTickZh(seed) : confusionTickEn(seed);
  if (r < 22) return lang === 'zh' ? noteTakingZh(seed) : noteTakingEn(seed);
  if (r < 30) return lang === 'zh' ? microChallengeZh(seed) : microChallengeEn(seed);
  if (r < 36) return lang === 'zh' ? frustrationBlipZh(seed) : frustrationBlipEn(seed);
  if (r < 40) return lang === 'zh' ? sarcasmSoftZh(seed) : sarcasmSoftEn(seed);
  return '';
}
