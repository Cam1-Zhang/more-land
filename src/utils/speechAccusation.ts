import type { AppLanguage } from '../i18n/appStrings';

export type ParsedPublicSpeechLine = {
  speakerName: string;
  body: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parsePublicSpeechLine(line: string): ParsedPublicSpeechLine | null {
  const match = line.match(/^([^:：\n]{1,24})[:：]\s*(.+)$/);
  if (!match) return null;
  const speakerName = match[1]!.trim();
  const body = match[2]!.trim();
  if (!speakerName || !body || /^(?:系统|法官|System|Moderator|Host)$/i.test(speakerName)) {
    return null;
  }
  return { speakerName, body };
}

function targetClauses(body: string, targetName: string): string[] {
  return body
    .split(/[，,。！!？?;；\n]+/)
    .map((part) => part.trim())
    .filter((part) => part.includes(targetName));
}

/** True only for wording that directly protects/clears the named target. */
export function bodyDirectlyDefendsTarget(
  body: string,
  targetName: string,
  lang: AppLanguage
): boolean {
  if (!targetName || !body.includes(targetName)) return false;
  const name = escapeRegExp(targetName);
  return targetClauses(body, targetName).some((clause) => {
    if (lang === 'zh') {
      return (
        new RegExp(`(?:不觉得|不认为|没觉得|没认为|我保|我信|相信|别票|别出|先不票|先不出)\\s*${name}`).test(clause) ||
        new RegExp(`${name}[^\u3002！？]{0,8}(?:不是狼|不像狼|偏好|是好人|是金水|可以保|我能保|先放一放|别票|别出)`).test(clause)
      );
    }
    return (
      new RegExp(`\\b(?:do not|don't|dont|wouldn't|would not)\\s+(?:think|believe)\\s+${name}\\s+(?:is|looks?)\\s+(?:a\\s+)?wolf\\b`, 'i').test(clause) ||
      new RegExp(`\\b${name}\\s+(?:isn't|is not|doesn't look|does not look)\\s+(?:like\\s+)?(?:a\\s+)?wolf\\b`, 'i').test(clause) ||
      new RegExp(`\\b(?:trust|clear|protect|defend|do not vote|don't vote|do not exile|don't exile)\\s+${name}\\b`, 'i').test(clause)
    );
  });
}

/**
 * Directional accusation check. Name + a wolf word somewhere in the sentence is not enough:
 * the target must be attached to an accusing verb or predicate, and negated/quoted claims are ignored.
 */
export function bodyDirectlyAccusesTarget(
  body: string,
  targetName: string,
  lang: AppLanguage
): boolean {
  if (!targetName || !body.includes(targetName)) return false;
  if (bodyDirectlyDefendsTarget(body, targetName, lang)) return false;
  const name = escapeRegExp(targetName);

  return targetClauses(body, targetName).some((clause) => {
    if (lang === 'zh') {
      // “Luna 说 Toby 是狼”是转述，不是对 Luna 的攻击。
      if (new RegExp(`${name}\\s*(?:说|表示|觉得|认为|怀疑|提到|问)`).test(clause)) {
        return false;
      }
      const beforeTarget = clause.slice(0, clause.indexOf(targetName));
      const looksLikeSomeoneElsesClaim = /(?:说|表示|觉得|认为|怀疑|提到)\s*$/.test(beforeTarget);
      const isOwnRead = /(?:^|[^\p{L}\p{N}])我\s*(?:就|还是|真的)?\s*(?:觉得|认为|怀疑)\s*$/u.test(beforeTarget);
      if (looksLikeSomeoneElsesClaim && !isOwnRead) return false;
      return (
        new RegExp(`(?:查杀|怀疑|不信|锁|踩|打|票|出|归|抗推|点)\\s*(?:一下|掉|走)?\\s*${name}`).test(clause) ||
        new RegExp(`${name}[^\u3002！？]{0,10}(?:是|像|偏像|更像|大概率是|可能是|我打成|我认为是)[^\u3002！？]{0,6}(?:狼|狼人|狼美人|铁狼|匪|悍跳)`).test(clause) ||
        new RegExp(`${name}[^\u3002！？]{0,8}(?:可疑|有问题|不做好|身份差|发言爆炸|聊得差|想票|想出|不可信)`).test(clause) ||
        new RegExp(`(?:我觉得|我认为|我看|我感觉)\\s*${name}[^\u3002！？]{0,8}(?:狼|可疑|有问题|不做好)`).test(clause)
      );
    }

    if (new RegExp(`\\b${name}\\s+(?:said|says|thinks?|believes?|asked|mentioned)\\b`, 'i').test(clause)) {
      return false;
    }
    const beforeTarget = clause.slice(0, clause.toLowerCase().indexOf(targetName.toLowerCase()));
    const looksLikeSomeoneElsesClaim = /\b(?:said|says|thinks?|believes?|suspects?|mentioned)\s*$/i.test(beforeTarget);
    const isOwnRead = /\bI\s+(?:really\s+|still\s+)?(?:think|believe|suspect)\s*$/i.test(beforeTarget);
    if (looksLikeSomeoneElsesClaim && !isOwnRead) return false;
    return (
      new RegExp(`\\b(?:suspect|distrust|vote|exile|push|pressure|accuse)\\s+${name}\\b`, 'i').test(clause) ||
      new RegExp(`\\b${name}\\s+(?:is|looks?|feels?|reads?)\\s+(?:like\\s+)?(?:a\\s+)?(?:wolf|werewolf|fake|suspicious|wolfy)\\b`, 'i').test(clause) ||
      new RegExp(`\\b${name}[^.!?]{0,10}\\b(?:is sus|is suspicious|is fake|has to go|should go|should be voted|should be exiled)\\b`, 'i').test(clause)
    );
  });
}

export function lineDirectlyAccusesTarget(
  line: string,
  targetName: string,
  lang: AppLanguage
): boolean {
  const parsed = parsePublicSpeechLine(line);
  if (!parsed || parsed.speakerName === targetName) return false;
  return bodyDirectlyAccusesTarget(parsed.body, targetName, lang);
}
