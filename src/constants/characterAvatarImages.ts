import type { ImageSourcePropType } from 'react-native';
import type { AICharacter } from '../types';
import { CHARACTERS } from '../data/mockData';
import { GENERATED_AI_AVATARS } from './characterAvatarGeneratedMap';

/**
 * 玩家设置头像：原创像素风，按「男生 3 张 / 女生 3 张」排列。
 * AI 局内头像优先使用 `assets/avatars/generated/{id}.png`，缺失时回退到同一套玩家头像。
 */
const CHIBI_AVATARS: ImageSourcePropType[] = [
  require('../../assets/avatars/player/player01.png'),
  require('../../assets/avatars/player/player02.png'),
  require('../../assets/avatars/player/player03.png'),
  require('../../assets/avatars/player/player04.png'),
  require('../../assets/avatars/player/player05.png'),
  require('../../assets/avatars/player/player06.png'),
];

export const HUMAN_CHIBI_COUNT = CHIBI_AVATARS.length;

/** Neutral default for the human seat when no profile index is stored. */
const HUMAN_GRID_AVATAR = CHIBI_AVATARS[3]!;

export function getChibiAvatarByIndex(index: number): ImageSourcePropType {
  const n = Math.floor(index);
  if (!Number.isFinite(n) || n < 0) return HUMAN_GRID_AVATAR;
  return CHIBI_AVATARS[n % CHIBI_AVATARS.length]!;
}

const AGE_YOUNG_LT = 28;
const AGE_MID_LT = 45;

function chibiIndexFromAgeGender(char: AICharacter): number {
  const tier = char.age < AGE_YOUNG_LT ? 0 : char.age < AGE_MID_LT ? 1 : 2;
  const genderOffset = char.gender === 'Female' ? 3 : 0;
  return genderOffset + tier;
}

export function getAiCharacterAvatarById(characterId: string): ImageSourcePropType {
  const generated = GENERATED_AI_AVATARS[characterId];
  if (generated) return generated;

  const char = CHARACTERS.find((c) => c.id === characterId);
  if (char) {
    return CHIBI_AVATARS[chibiIndexFromAgeGender(char)]!;
  }
  const n = parseInt(characterId, 10);
  if (!Number.isFinite(n) || n < 1) {
    return CHIBI_AVATARS[0]!;
  }
  return CHIBI_AVATARS[(n - 1) % CHIBI_AVATARS.length]!;
}
