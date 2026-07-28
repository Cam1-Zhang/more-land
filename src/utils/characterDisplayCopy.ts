import type { AppLanguage } from '../i18n/appStrings';
import { GALLERY_SPECIALTY_BY_ID } from '../i18n/characterGallerySpecialty';
import { CHARACTER_PERSONA_ZH } from '../i18n/characterPersonaZh';
import { constellationLabel } from '../i18n/constellationStrings';
import type { AICharacter } from '../types';

export function characterConstellationForUi(char: AICharacter, lang: AppLanguage): string {
  return constellationLabel(lang, char.constellation);
}

export function characterPersonalityForUi(char: AICharacter, lang: AppLanguage): string {
  if (lang !== 'zh') return char.personality;
  return CHARACTER_PERSONA_ZH[char.id]?.personality ?? char.personality;
}

export function characterDescriptionForUi(char: AICharacter, lang: AppLanguage): string {
  if (lang !== 'zh') return char.description;
  return CHARACTER_PERSONA_ZH[char.id]?.description ?? char.description;
}

/** 图鉴卡：从性格文案拆两条短标签（示意排版，非新增数据字段） */
export function characterGalleryTraitPair(char: AICharacter, lang: AppLanguage): [string, string] {
  const full = characterPersonalityForUi(char, lang).trim();
  const parts = full
    .split(/\s*[,，、]\s*|\s*&\s*|\s+and\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]!.length > 8 ? parts[0]!.slice(0, 8) + '…' : parts[0]!;
    const b = parts[1]!.length > 8 ? parts[1]!.slice(0, 8) + '…' : parts[1]!;
    return [a, b];
  }
  if (parts.length === 1) {
    const p = parts[0]!;
    if (p.length <= 4) return [p, p];
    const mid = Math.ceil(p.length / 2);
    return [p.slice(0, mid).trim(), p.slice(mid).trim() || '…'];
  }
  return [full.slice(0, 6), full.slice(6, 12) || '…'];
}

/** 图鉴卡「擅长：」后一词（与 `mockData` 人设对应的静态表，见 `characterGallerySpecialty.ts`） */
export function characterGallerySpecialtyWord(char: AICharacter, lang: AppLanguage): string {
  const row = GALLERY_SPECIALTY_BY_ID[char.id];
  if (!row) return lang === 'zh' ? '综合' : 'Mixed';
  return lang === 'zh' ? row.zh : row.en;
}

/** 图鉴卡「擅长」行：取设定首句/首段，避免与上方性格标签完全重复 */
export function characterGallerySpecialtyShort(char: AICharacter, lang: AppLanguage): string {
  const desc = characterDescriptionForUi(char, lang).trim();
  const first = desc.split(/[。．.!?？\n]/)[0]?.trim() ?? desc;
  const max = lang === 'zh' ? 14 : 22;
  if (first.length <= max) return first;
  return first.slice(0, max - 1) + '…';
}
