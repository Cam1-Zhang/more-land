import type { AppLanguage } from '../i18n/appStrings';
import { roleIdentityBadgeName } from '../i18n/roleCardCopy';
import type { AISpeechCharacter } from './types';

export function roleLabel(role: string, lang: AppLanguage): string {
  return roleIdentityBadgeName[lang][role] ?? role;
}

export function buildPersonaSection(
  character: AISpeechCharacter,
  lang: AppLanguage,
  preparedBlocks?: string[]
): string {
  const tag = character.personality?.trim();
  const desc = character.personalityDescription?.trim();
  const parts: string[] = [];
  if (tag) parts.push(lang === 'zh' ? `【性格标签】${tag}` : `[Persona tag] ${tag}`);
  if (desc) parts.push(lang === 'zh' ? `【性格说明】${desc}` : `[Persona note] ${desc}`);
  for (const b of preparedBlocks ?? []) {
    if (typeof b !== 'string') continue;
    const t = b.trim();
    if (t) parts.push(t);
  }
  return parts.join('\n');
}

export function filterTodayLogs(history: string[], lang: AppLanguage): string[] {
  return history.filter((l) => {
    const s = l.trim();
    if (!s || s.startsWith('---')) return false;
    if (lang === 'zh' && (s.startsWith('系统：') || s.startsWith('系统:'))) return false;
    if (lang !== 'zh' && s.startsWith('System:')) return false;
    return true;
  });
}

export function formatCandidateOptions(candidates: { name: string }[], lang: AppLanguage): string {
  return candidates
    .map((c, i) => (lang === 'zh' ? `${i + 1}号(${c.name})` : `#${i + 1} (${c.name})`))
    .join(lang === 'zh' ? '、' : ', ');
}
