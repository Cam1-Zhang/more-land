import type { AppLanguage } from '../i18n/appStrings';

/** Private / analysis dumps that must never be typed as public day speech. */
export function looksLikeWerewolfReasoningDump(text: string, lang: AppLanguage): boolean {
  const t = text.trim();
  if (!t) return false;

  if (
    /狼队友|<狼队私有>|我们作为狼|狼队可见|狼队投票|狼美人本夜|队友是|teammates are|wolf pack|secret teammates/i.test(
      t
    )
  ) {
    return true;
  }

  if (
    /内部思考|公开发言|我们来看一下目前的局面|我们分析一下当前局面|我们开始分析当前局面|让我分析一下|综上所述|Return JSON|字符串数组|不要 markdown|prompt text|Private briefing/i.test(
      t
    )
  ) {
    return true;
  }

  // "I am seat N Name, <role>" style identity recap monologues
  if (
    /我是\d+号/.test(t) &&
    /(平民|狼人|女巫|预言家|猎人|守卫|白痴|狼美人|村民)/.test(t)
  ) {
    return true;
  }
  if (
    /I am (?:No\.?\s*)?\d+/i.test(t) &&
    /\b(villager|werewolf|witch|seer|hunter|guard|idiot|wolf beauty)\b/i.test(t)
  ) {
    return true;
  }

  // Long analysis essays (typical CoT leaked as speech)
  if (
    t.length > 160 &&
    /(首先|然后|因此|所以|我需要|策略上|发言应该|局面|分析一下|我们来看|我们分析)/.test(t) &&
    /(平民|狼人|女巫|预言家|猎人|警长|刀口|上警|发言)/.test(t)
  ) {
    return true;
  }
  if (
    lang === 'en' &&
    t.length > 180 &&
    /(first|then|therefore|so I|I need to|strategy|analyze|current situation)/i.test(t) &&
    /(villager|werewolf|witch|seer|sheriff|speech)/i.test(t)
  ) {
    return true;
  }

  return false;
}

/** Drop "Name:" / "Name：" echo prefixes the model sometimes prepends. */
export function stripSpeakerNamePrefix(text: string, selfName: string): string {
  const name = selfName.trim();
  if (!name) return text.trim();
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`^\\s*${escaped}\\s*[：:]\\s*`), '').trim();
}
