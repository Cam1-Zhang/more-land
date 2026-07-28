import type { ImageSourcePropType } from 'react-native';
import { CHARACTERS } from '../data/mockData';
import { getAiCharacterAvatarById, getChibiAvatarByIndex } from './characterAvatarImages';

/**
 * 全身立绘与 `CHARACTERS` 顺序一一对应。
 *
 * - **优先**：`assets/characters/body/named/{角色 name}.png`（与 `mockData` 里 `name` 完全一致）。
 *   须为 **带 Alpha 的最终 PNG**（勿对成品再跑仓库色键）。从 Cursor 批量拷贝：`RESTORE_SRC=… npm run fix:named-alpha`（默认只拷贝、不抠图）。改图后界面无变化可 `npx expo start -c`。
 * - **回退**：`assets/characters/body/{下标+1}.png`（与 CHARACTERS 顺序对应；无 named 的角色用此）。
 *
 * **透明策略**：全身立绘须为 RGBA PNG；界面不对其叠白/黑/羊皮衬色。真人座位等仍可能用 chibi（独立资源，非透明 PNG）。
 */
const BODY_NUMERED_FALLBACK: ImageSourcePropType[] = [
  require('../../assets/characters/body/1.png'), // 01 Toby
  require('../../assets/characters/body/2.png'), // 02 Momo
  require('../../assets/characters/body/3.png'), // 03 Jack
  require('../../assets/characters/body/4.png'), // 04 Lily
  require('../../assets/characters/body/5.png'), // 05 Ben
  require('../../assets/characters/body/6.png'), // 06 Frank
  require('../../assets/characters/body/7.png'), // 07 Daisy
  require('../../assets/characters/body/8.png'), // 08 Sam
  require('../../assets/characters/body/9.png'), // 09 Alice
  require('../../assets/characters/body/10.png'), // 10 Tom
  require('../../assets/characters/body/11.png'), // 11 Luna
  require('../../assets/characters/body/12.png'), // 12 Peter
  require('../../assets/characters/body/13.png'), // 13 Zack
  require('../../assets/characters/body/14.png'), // 14 Rose
  require('../../assets/characters/body/15.png'), // 15 Devin
  require('../../assets/characters/body/16.png'), // 16 Sarah
  require('../../assets/characters/body/17.png'), // 17 Mike
  require('../../assets/characters/body/18.png'), // 18 Chloe
  require('../../assets/characters/body/19.png'), // 19 Gary
  require('../../assets/characters/body/20.png'), // 20 Mia
  require('../../assets/characters/body/21.png'), // 21 Leo
  require('../../assets/characters/body/22.png'), // 22 Ivy
  require('../../assets/characters/body/23.png'), // 23 Hank
  require('../../assets/characters/body/24.png'), // 24 Jill
  require('../../assets/characters/body/25.png'), // 25 Frost
  require('../../assets/characters/body/26.png'), // 26 Oscar
  require('../../assets/characters/body/27.png'), // 27 Elena
  require('../../assets/characters/body/28.png'), // 28 Mage
  require('../../assets/characters/body/29.png'), // 29 Victor
  require('../../assets/characters/body/30.png'), // 30 Sofia
  require('../../assets/characters/body/31.png'), // 31 Dante
  require('../../assets/characters/body/32.png'), // 32 Rita
  require('../../assets/characters/body/33.png'), // 33 Xander
  require('../../assets/characters/body/34.png'), // 34 Nora
  require('../../assets/characters/body/35.png'), // 35 Julian
  require('../../assets/characters/body/36.png'), // 36 Clara
  require('../../assets/characters/body/37.png'), // 37 Prof. Mori
  require('../../assets/characters/body/38.png'), // 38 Widow
  require('../../assets/characters/body/39.png'), // 39 Kaspar
  require('../../assets/characters/body/40.png'), // 40 Vesper
  require('../../assets/characters/body/41.png'), // 41 Socrates
  require('../../assets/characters/body/42.png'), // 42 Ada
  require('../../assets/characters/body/43.png'), // 43 Ghost
  require('../../assets/characters/body/44.png'), // 44 Kaiser
  require('../../assets/characters/body/45.png'), // 45 Old Fox
  require('../../assets/characters/body/46.png'), // 46 Ambassador
  require('../../assets/characters/body/47.png'), // 47 Justice
  require('../../assets/characters/body/48.png'), // 48 God Eye
];

/** 有 named 文件时按角色 id 覆盖（与 CHARACTERS[].name 对应文件名） */
const NAMED_BODY_BY_ID: Partial<Record<string, ImageSourcePropType>> = {
  '1': require('../../assets/characters/body/named/Toby.png'),
  '2': require('../../assets/characters/body/named/Momo.png'),
  '3': require('../../assets/characters/body/named/Jack.png'),
  '4': require('../../assets/characters/body/named/Lily.png'),
  '5': require('../../assets/characters/body/named/Ben.png'),
  '6': require('../../assets/characters/body/named/Frank.png'),
  '7': require('../../assets/characters/body/named/Daisy.png'),
  '8': require('../../assets/characters/body/named/Sam.png'),
  '9': require('../../assets/characters/body/named/Alice.png'),
  '10': require('../../assets/characters/body/named/Tom.png'),
  '11': require('../../assets/characters/body/named/Luna.png'),
  '12': require('../../assets/characters/body/named/Peter.png'),
  '13': require('../../assets/characters/body/named/Zack.png'),
  '14': require('../../assets/characters/body/named/Rose.png'),
  '15': require('../../assets/characters/body/named/Devin.png'),
  '16': require('../../assets/characters/body/named/Sarah.png'),
  '17': require('../../assets/characters/body/named/Mike.png'),
  '18': require('../../assets/characters/body/named/Chloe.png'),
  '19': require('../../assets/characters/body/named/Gary.png'),
  '20': require('../../assets/characters/body/named/Mia.png'),
  '21': require('../../assets/characters/body/named/Leo.png'),
  '22': require('../../assets/characters/body/named/Ivy.png'),
  '23': require('../../assets/characters/body/named/Hank.png'),
  '24': require('../../assets/characters/body/named/Jill.png'),
  '25': require('../../assets/characters/body/named/Frost.png'),
  '26': require('../../assets/characters/body/named/Oscar.png'),
  '27': require('../../assets/characters/body/named/Elena.png'),
  '28': require('../../assets/characters/body/named/Mage.png'),
  '29': require('../../assets/characters/body/named/Victor.png'),
  '30': require('../../assets/characters/body/named/Sofia.png'),
  '31': require('../../assets/characters/body/named/Dante.png'),
  '32': require('../../assets/characters/body/named/Rita.png'),
  '33': require('../../assets/characters/body/named/Xander.png'),
  '34': require('../../assets/characters/body/named/Nora.png'),
  '35': require('../../assets/characters/body/named/Julian.png'),
  '36': require('../../assets/characters/body/named/Clara.png'),
  '37': require('../../assets/characters/body/named/Prof. Mori.png'),
  '38': require('../../assets/characters/body/named/Widow.png'),
  '39': require('../../assets/characters/body/named/Kaspar.png'),
  '40': require('../../assets/characters/body/named/Vesper.png'),
  '41': require('../../assets/characters/body/named/Socrates.png'),
  '42': require('../../assets/characters/body/named/Ada.png'),
  '43': require('../../assets/characters/body/named/Ghost.png'),
  '44': require('../../assets/characters/body/named/Kaiser.png'),
  '45': require('../../assets/characters/body/named/Old Fox.png'),
  '46': require('../../assets/characters/body/named/Ambassador.png'),
  '47': require('../../assets/characters/body/named/Justice.png'),
  '48': require('../../assets/characters/body/named/God Eye.png'),
};

if (__DEV__) {
  if (CHARACTERS.length !== BODY_NUMERED_FALLBACK.length) {
    throw new Error(
      `characterBodyImages: CHARACTERS.length (${CHARACTERS.length}) must equal body pack (${BODY_NUMERED_FALLBACK.length})`
    );
  }
}

/** id → 立绘：named 优先，否则编号回退 */
const BODY_IMAGES: Partial<Record<string, ImageSourcePropType>> = Object.fromEntries(
  CHARACTERS.map((char, index) => [
    char.id,
    NAMED_BODY_BY_ID[char.id] ?? BODY_NUMERED_FALLBACK[index]!,
  ])
);

export function getCharacterBodyImageById(characterId: string): ImageSourcePropType | undefined {
  return BODY_IMAGES[characterId];
}

/** 图鉴 / 选人 / 局内 AI 座位：直接用 `body/named` 透明 PNG，不再走离线生成的 chibi */
export function getCharacterPickerPortraitById(characterId: string): ImageSourcePropType {
  return getCharacterBodyImageById(characterId) ?? getAiCharacterAvatarById(characterId);
}

/** 局内圆座：离线半身头像（尺寸/构图已裁好）→ chibi；人类座位用 chibi */
export function getPlayerGridAvatar(
  playerId: string,
  humanChibiIndex?: number
): ImageSourcePropType {
  if (playerId === 'me') {
    if (typeof humanChibiIndex === 'number') return getChibiAvatarByIndex(humanChibiIndex);
    return getChibiAvatarByIndex(3);
  }
  return getAiCharacterAvatarById(playerId);
}
