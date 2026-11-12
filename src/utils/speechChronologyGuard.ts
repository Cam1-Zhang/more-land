import type { AppLanguage } from '../i18n/appStrings';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitSentences(text: string): string[] {
  return text.match(/[^\n。！？；.!?;]+[\n。！？；.!?;]?/g)?.map((part) => part.trim()).filter(Boolean) ?? [text];
}

function statesExplicitCheck(sentence: string, lang: AppLanguage): boolean {
  return lang === 'zh'
    ? /查杀|金水|昨[夜晚]验|我验了|查验结果/.test(sentence)
    : /seer\s+check|checked\s+.+\s+(?:wolf|innocent)|(?:wolf|innocent)\s+result/i.test(sentence);
}

function isPrematureRead(sentence: string, lang: AppLanguage): boolean {
  return lang === 'zh'
    ? /盯|留个?心眼|留心|怀疑|可疑|偏狼|像狼|不像好人|挂(?:个)?问号|观察位|不对劲|心虚|做作|划水|逻辑|听感|语气|态度|节奏|带偏|跑偏|带跑|站边|表水|踩|锤/.test(sentence)
    : /keep an eye on|watching|suspicious|wolfy|not town|red flag|question mark|off|shady|tone|attitude|logic|rhythm|steer|coast|tunnel|pressure/i.test(sentence);
}

/**
 * Day-one players cannot evaluate a current-phase speech that has not happened.
 * Keep neutral "I'll listen later" lines, but drop unsupported reads and labels.
 */
export function scrubPrematurePlayerReads(
  text: string,
  notYetSpokenNames: readonly string[],
  lang: AppLanguage
): string {
  const names = notYetSpokenNames.map((name) => name.trim()).filter(Boolean);
  if (names.length === 0) return text.trim();
  const futureName = new RegExp(names.map(escapeRegExp).join('|'), 'i');
  return splitSentences(text)
    .filter((sentence) => {
      if (!futureName.test(sentence)) return true;
      if (statesExplicitCheck(sentence, lang)) return true;
      return !isPrematureRead(sentence, lang);
    })
    .join(lang === 'zh' ? '' : ' ')
    .trim();
}
