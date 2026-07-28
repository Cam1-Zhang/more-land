import type { AppLanguage } from '../i18n/appStrings';
import {
  expandSpeechBubbleParts,
  flattenJsonSpeechBubbles,
  looksLikeJsonStringArray,
  parseJsonArraySpeech,
} from '../llm/speechParse';
import { postProcessDaySpeechBubbles } from '../llm/prompts/daySpeechPostProcess';
import type { AISpeechCharacter, SpeechContext } from '../llm/types';

/** Turn LLM day-speech output into 1..N chat bubbles (wolfcha-style). */
export function bubblesFromDaySpeechRaw(
  rawLlmText: string,
  character: AISpeechCharacter,
  role: string,
  lang: AppLanguage,
  ctx: SpeechContext
): string[] {
  const fromPost = postProcessDaySpeechBubbles(rawLlmText, character, role, lang, ctx);
  const bubbles = expandSpeechBubbleParts(fromPost);
  if (bubbles.length > 0) return bubbles;

  const fallback = rawLlmText.trim();
  if (!fallback) return [];
  const parsed = expandSpeechBubbleParts(parseJsonArraySpeech(fallback));
  if (parsed.length > 0) return parsed;
  if (looksLikeJsonStringArray(fallback) || (fallback.startsWith('[') && fallback.includes('"'))) {
    if (__DEV__) console.warn('[bubblesFromDaySpeechRaw] JSON parse failed — skip raw dump');
    return [];
  }
  return [fallback];
}
