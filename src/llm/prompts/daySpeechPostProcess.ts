import type { AppLanguage } from '../../i18n/appStrings';
import { sanitizeDialogueLine } from '../../utils/reasoningHumanizer';
import { scrubHiddenDaytimeBallotLine } from '../../utils/hiddenDayVoteSpeechGuard';
import {
  fixSelfThirdPersonSpeech,
  isSelfThirdPersonSpeech,
} from '../../utils/dayDiscussionSpeech';
import {
  looksLikeWerewolfReasoningDump,
  stripSpeakerNamePrefix,
} from '../../utils/werewolfSpeechGuard';
import { flattenJsonSpeechBubbles, looksLikeJsonStringArray, parseJsonArraySpeech } from '../speechParse';
import type { AISpeechCharacter, SpeechContext } from '../types';

/** 「4号Luna」「我是6号Frank」→ first person / drop seat+name self echo. */
function scrubSelfSeatIdentityEcho(text: string, selfName: string, lang: AppLanguage): string {
  const name = selfName.trim();
  if (!name) return text;
  const n = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (lang === 'zh') {
    let s = text;
    s = s.replace(new RegExp(`我是\\d+号\\s*${n}(?:，|,|。|！|？)?`, 'g'), '我');
    s = s.replace(new RegExp(`\\d+号\\s*${n}`, 'g'), '我');
    s = s.replace(/，{2,}/g, '，').replace(/^，+|，+$/g, '').replace(/\s{2,}/g, ' ');
    return s.trim();
  }
  let s = text;
  s = s.replace(new RegExp(`I am\\s+(?:No\\.?\\s*)?\\d+\\s+${n}`, 'gi'), 'I');
  s = s.replace(new RegExp(`(?:No\\.?\\s*)?\\d+\\s+${n}`, 'gi'), 'I');
  return s.trim();
}

function scrubSpeechBubble(
  bubble: string,
  character: AISpeechCharacter,
  lang: AppLanguage,
  ctx: SpeechContext,
  pd: SpeechContext['preparedDialogue']
): string {
  const focusName = (pd?.thought?.target ?? character.name ?? '').trim() || character.name || 'Player';
  let out = stripSpeakerNamePrefix(bubble, character.name);
  out = scrubSelfSeatIdentityEcho(out, character.name, lang);
  if (looksLikeWerewolfReasoningDump(out, lang)) return '';
  out = sanitizeDialogueLine(out, lang, focusName, out.length + (pd?.thought?.confidence ?? 0));
  const fixedSelf = fixSelfThirdPersonSpeech(out, character.name, lang);
  if (fixedSelf) {
    out = fixedSelf;
  } else if (isSelfThirdPersonSpeech(out, character.name, lang)) {
    return '';
  }
  if (looksLikeWerewolfReasoningDump(out, lang)) return '';
  if (ctx.dayExileVotesPublic === false) {
    out = scrubHiddenDaytimeBallotLine(out, lang, focusName, out.length + 91);
  }
  return out.trim();
}

function scrubBubbles(
  parts: string[],
  character: AISpeechCharacter,
  lang: AppLanguage,
  ctx: SpeechContext,
  pd: SpeechContext['preparedDialogue']
): string[] {
  const out: string[] = [];
  for (const b of parts) {
    const t = scrubSpeechBubble(b, character, lang, ctx, pd);
    if (t) out.push(t);
  }
  // Real table turns are usually one or two messages. Keep a third only as a safety valve
  // for last words / counter-claims, and never let a model dump a long analysis sequence.
  return out.slice(0, 3);
}

/** One chat bubble per JSON array element (wolfcha display layer). */
export function postProcessDaySpeechBubbles(
  rawLlmText: string,
  character: AISpeechCharacter,
  _role: string,
  lang: AppLanguage,
  ctx: SpeechContext
): string[] {
  const rawTrim = rawLlmText.trim();
  if (!rawTrim) return [];
  if (looksLikeWerewolfReasoningDump(rawTrim, lang) && !looksLikeJsonStringArray(rawTrim)) {
    if (__DEV__) console.warn('[postProcessDaySpeechBubbles] rejected reasoning dump');
    return [];
  }
  const pd = ctx.preparedDialogue;

  try {
    const parsed = flattenJsonSpeechBubbles(parseJsonArraySpeech(rawLlmText));
    const out = scrubBubbles(parsed, character, lang, ctx, pd);
    if (out.length > 0) return out;
    if (looksLikeJsonStringArray(rawTrim) || (rawTrim.startsWith('[') && rawTrim.includes('"'))) {
      const rescued = scrubBubbles(
        flattenJsonSpeechBubbles(parseJsonArraySpeech(rawTrim)),
        character,
        lang,
        ctx,
        pd
      );
      if (rescued.length > 0) return rescued;
      if (__DEV__) console.warn('[postProcessDaySpeechBubbles] JSON array parse failed');
      return [];
    }
    // Plain prose: only accept short table lines — never long analysis essays
    if (looksLikeWerewolfReasoningDump(rawTrim, lang) || rawTrim.length > 220) {
      if (__DEV__) console.warn('[postProcessDaySpeechBubbles] rejected plain analysis prose');
      return [];
    }
    const single = scrubSpeechBubble(rawTrim, character, lang, ctx, pd);
    if (single && !looksLikeJsonStringArray(single)) return [single];
    return [];
  } catch (e) {
    if (__DEV__) console.warn('[postProcessDaySpeechBubbles]', e);
    return scrubBubbles(
      flattenJsonSpeechBubbles(parseJsonArraySpeech(rawTrim)),
      character,
      lang,
      ctx,
      pd
    );
  }
}

/** Legacy: all bubbles joined with newlines (single log line). */
export function postProcessDaySpeechRaw(
  rawLlmText: string,
  character: AISpeechCharacter,
  role: string,
  lang: AppLanguage,
  ctx: SpeechContext
): string {
  const bubbles = postProcessDaySpeechBubbles(rawLlmText, character, role, lang, ctx);
  if (bubbles.length > 0) return bubbles.join('\n');
  return '';
}
