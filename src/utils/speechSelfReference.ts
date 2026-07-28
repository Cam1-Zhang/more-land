import type { AppLanguage } from '../i18n/appStrings';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 自己发言却用第三人称描述自己（如「感觉 Alice 今天…」「Jack 你竞选时」） */
export function isSelfThirdPersonSpeech(text: string, selfName: string, lang: AppLanguage): boolean {
  const name = selfName.trim();
  if (!name || !text.includes(name)) return false;
  const n = escapeRegex(name);
  const compact = text.replace(/\s/g, '');

  if (lang === 'zh') {
    if (new RegExp(`我.{0,16}(?:觉得|认为|听|看).{0,24}${n}`).test(text) && !/我(?:自己|本人)/.test(text)) {
      return false;
    }
    if (new RegExp(`(?:提到|说起|说到).{0,10}${n}`).test(text) && /我/.test(text)) {
      return false;
    }

    const selfAsSubject = new RegExp(
      `(?:感觉|觉得|认为|看|听|说|是|像|好像|似乎|今天|刚才|竞选|上警|精神|状态|态度|表现|不对劲|不对头|有点|有些)` +
        `.{0,12}${n}|${n}.{0,20}(?:今天|刚才|似乎|好像|有点|有些|精神|状态|态度|表现|不对劲|不对头|竞选|上警|很|太)`
    );
    if (selfAsSubject.test(text)) return true;
    if (new RegExp(`${n}你`).test(compact)) return true;

    const nameHits = (text.match(new RegExp(n, 'g')) ?? []).length;
    if (nameHits >= 1 && !/我|咱|本人/.test(text)) return true;

    return false;
  }

  if (new RegExp(`\\b${n}\\b`, 'i').test(text)) {
    if (/\b(I|I'm|I am|my|me)\b/i.test(text) && !new RegExp(`(?:said|mentioned)\\s+${n}\\b`, 'i').test(text)) {
      return false;
    }
    if (new RegExp(`(?:feels?|seems?|looks?)\\s+like\\s+${n}\\b`, 'i').test(text)) return true;
    if (new RegExp(`\\b${n}\\b.{0,32}(?:today|seems|acting|off|nervous|weird)`, 'i').test(text)) return true;
    if (!/\b(I|I'm|my)\b/i.test(text)) return true;
  }
  return false;
}

/** 尽量把自指改写成第一人称，避免直接丢模板 */
export function fixSelfThirdPersonSpeech(
  text: string,
  selfName: string,
  lang: AppLanguage
): string | null {
  if (!isSelfThirdPersonSpeech(text, selfName, lang)) return null;
  const n = escapeRegex(selfName.trim());
  if (lang === 'zh') {
    let s = text;
    s = s.replace(new RegExp(`感觉${n}`, 'g'), '我感觉');
    s = s.replace(new RegExp(`觉得${n}`, 'g'), '我觉得');
    s = s.replace(new RegExp(`${n}今天`, 'g'), '我今天');
    s = s.replace(new RegExp(`${n}刚才`, 'g'), '我刚才');
    s = s.replace(new RegExp(`${n}你`, 'g'), '我');
    s = s.replace(new RegExp(`${n}似乎`, 'g'), '我似乎');
    s = s.replace(new RegExp(`${n}好像`, 'g'), '我好像');
    s = s.replace(new RegExp(`${n}有点`, 'g'), '我有点');
    s = s.replace(new RegExp(`${n}有些`, 'g'), '我有些');
    s = s.replace(new RegExp(`${n}的`, 'g'), '我的');
    if (!isSelfThirdPersonSpeech(s, selfName, lang)) return s.trim();
    return null;
  }
  let s = text.replace(new RegExp(`\\b${n}\\b`, 'gi'), 'I');
  if (!isSelfThirdPersonSpeech(s, selfName, lang)) return s.trim();
  return null;
}
