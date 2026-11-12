import { PERSONAL_AVATARS, type PersonalAvatarId } from './personalAvatars';
import type { ImageSourcePropType } from 'react-native';

export const AVATAR_CANVAS = { width: 32, height: 48 } as const;

export type AvatarBodyType = 'male' | 'female';
export type AvatarSkinTone =
  | 'skin_01'
  | 'skin_02'
  | 'skin_03'
  | 'skin_04'
  | 'skin_05'
  | 'skin_06';
export type AvatarHairColor =
  | '#111111'
  | '#3A2418'
  | '#8B5A2B'
  | '#D8B45F'
  | '#9A342A'
  | '#C9C9C9'
  | '#D977A7'
  | '#3F6FB5'
  | '#4F8A45';
export type AvatarHairStyle =
  | 'male_hair_01'
  | 'male_hair_02'
  | 'male_hair_03'
  | 'male_hair_04'
  | 'male_hair_05'
  | 'male_hair_06'
  | 'male_hair_07'
  | 'male_hair_08'
  | 'female_hair_01'
  | 'female_hair_02'
  | 'female_hair_03'
  | 'female_hair_04'
  | 'female_hair_05'
  | 'female_hair_06'
  | 'female_hair_07'
  | 'female_hair_08';
export type AvatarTop =
  | 'male_top_01'
  | 'male_top_02'
  | 'male_top_03'
  | 'male_top_04'
  | 'male_top_05'
  | 'male_top_06'
  | 'male_top_07'
  | 'male_top_08'
  | 'female_top_01'
  | 'female_top_02'
  | 'female_top_03'
  | 'female_top_04'
  | 'female_top_05'
  | 'female_top_06'
  | 'female_top_07'
  | 'female_top_08';
export type AvatarBottom =
  | 'male_bottom_01'
  | 'male_bottom_02'
  | 'male_bottom_03'
  | 'male_bottom_04'
  | 'male_bottom_05'
  | 'male_bottom_06'
  | 'male_bottom_07'
  | 'male_bottom_08'
  | 'female_bottom_01'
  | 'female_bottom_02'
  | 'female_bottom_03'
  | 'female_bottom_04'
  | 'female_bottom_05'
  | 'female_bottom_06'
  | 'female_bottom_07'
  | 'female_bottom_08';
export type AvatarShoes =
  | 'male_shoes_01'
  | 'male_shoes_02'
  | 'male_shoes_03'
  | 'male_shoes_04'
  | 'male_shoes_05'
  | 'male_shoes_06'
  | 'female_shoes_01'
  | 'female_shoes_02'
  | 'female_shoes_03'
  | 'female_shoes_04'
  | 'female_shoes_05'
  | 'female_shoes_06';
export type AvatarAccessory =
  | 'none'
  | 'male_accessory_01'
  | 'male_accessory_02'
  | 'male_accessory_03'
  | 'male_accessory_04'
  | 'male_accessory_05'
  | 'male_accessory_06'
  | 'male_accessory_07'
  | 'male_accessory_08'
  | 'male_accessory_09'
  | 'male_accessory_10'
  | 'female_accessory_01'
  | 'female_accessory_02'
  | 'female_accessory_03'
  | 'female_accessory_04'
  | 'female_accessory_05'
  | 'female_accessory_06'
  | 'female_accessory_07'
  | 'female_accessory_08'
  | 'female_accessory_09'
  | 'female_accessory_10';

export type PixelAvatarConfig = {
  presetId?: PersonalAvatarId;
  bodyType: AvatarBodyType;
  skinTone: AvatarSkinTone;
  hairStyle: AvatarHairStyle;
  hairColor: AvatarHairColor;
  top: AvatarTop;
  bottom: AvatarBottom;
  shoes: AvatarShoes;
  accessory: AvatarAccessory;
};

type AvatarSheetId =
  | 'body'
  | 'bodyFront'
  | 'maleHairBack'
  | 'femaleHairBack'
  | 'maleHair'
  | 'femaleHair'
  | 'maleTops'
  | 'femaleTops'
  | 'maleBottoms'
  | 'femaleBottoms'
  | 'maleShoes'
  | 'femaleShoes'
  | 'maleAccessories'
  | 'femaleAccessories';

export type AvatarSheetConfig = {
  id: AvatarSheetId;
  path: string;
  source: ImageSourcePropType;
  width: number;
  height: number;
  columns: number;
  rows: number;
};

export type AvatarSpriteOption<T extends string = string> = {
  id: T;
  bodyType?: AvatarBodyType;
  sheet: AvatarSheetId;
  row: number;
  column: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AvatarHairColorOption = {
  id: AvatarHairColor;
  label: string;
};

export const USER_PIXEL_AVATAR_CONFIG_KEY = 'ai_werewolf_user_pixel_avatar_config';
export const USER_PIXEL_AVATAR_TRANSFORMS_KEY = 'ai_werewolf_user_pixel_avatar_transforms_v2';

export const AVATAR_SHEETS = {
  body: {
    id: 'body',
    path: '/public/assets/avatar/body-sheet-v4.png',
    source: require('../../public/assets/avatar/body-sheet-v4.png'),
    width: 1920,
    height: 960,
    columns: 6,
    rows: 2,
  },
  bodyFront: {
    id: 'bodyFront',
    path: '/public/assets/avatar/body-front-skin-sheet-v1.png',
    source: require('../../public/assets/avatar/body-front-skin-sheet-v1.png'),
    width: 1920,
    height: 960,
    columns: 6,
    rows: 2,
  },
  maleHair: {
    id: 'maleHair',
    path: '/public/assets/avatar/male-hair-sheet-v4.png',
    source: require('../../public/assets/avatar/male-hair-sheet-v4.png'),
    width: 1280,
    height: 960,
    columns: 4,
    rows: 2,
  },
  femaleHair: {
    id: 'femaleHair',
    path: '/public/assets/avatar/female-hair-sheet-v4.png',
    source: require('../../public/assets/avatar/female-hair-sheet-v4.png'),
    width: 1280,
    height: 960,
    columns: 4,
    rows: 2,
  },
  maleHairBack: {
    id: 'maleHairBack',
    path: '/public/assets/avatar/male-hair-back-sheet-v4.png',
    source: require('../../public/assets/avatar/male-hair-back-sheet-v4.png'),
    width: 1280,
    height: 960,
    columns: 4,
    rows: 2,
  },
  femaleHairBack: {
    id: 'femaleHairBack',
    path: '/public/assets/avatar/female-hair-back-sheet-v4.png',
    source: require('../../public/assets/avatar/female-hair-back-sheet-v4.png'),
    width: 1280,
    height: 960,
    columns: 4,
    rows: 2,
  },
  maleTops: {
    id: 'maleTops',
    path: '/public/assets/avatar/male-tops-sheet-v4.png',
    source: require('../../public/assets/avatar/male-tops-sheet-v4.png'),
    width: 1280,
    height: 960,
    columns: 4,
    rows: 2,
  },
  femaleTops: {
    id: 'femaleTops',
    path: '/public/assets/avatar/female-tops-sheet-v4.png',
    source: require('../../public/assets/avatar/female-tops-sheet-v4.png'),
    width: 1280,
    height: 960,
    columns: 4,
    rows: 2,
  },
  maleBottoms: {
    id: 'maleBottoms',
    path: '/public/assets/avatar/male-bottoms-sheet-v4.png',
    source: require('../../public/assets/avatar/male-bottoms-sheet-v4.png'),
    width: 1280,
    height: 960,
    columns: 4,
    rows: 2,
  },
  femaleBottoms: {
    id: 'femaleBottoms',
    path: '/public/assets/avatar/female-bottoms-sheet-v4.png',
    source: require('../../public/assets/avatar/female-bottoms-sheet-v4.png'),
    width: 1280,
    height: 960,
    columns: 4,
    rows: 2,
  },
  maleShoes: {
    id: 'maleShoes',
    path: '/public/assets/avatar/male-shoes-sheet-v4.png',
    source: require('../../public/assets/avatar/male-shoes-sheet-v4.png'),
    width: 1920,
    height: 480,
    columns: 6,
    rows: 1,
  },
  femaleShoes: {
    id: 'femaleShoes',
    path: '/public/assets/avatar/female-shoes-sheet-v4.png',
    source: require('../../public/assets/avatar/female-shoes-sheet-v4.png'),
    width: 1920,
    height: 480,
    columns: 6,
    rows: 1,
  },
  maleAccessories: {
    id: 'maleAccessories',
    path: '/public/assets/avatar/male-accessories-sheet-v4.png',
    source: require('../../public/assets/avatar/male-accessories-sheet-v4.png'),
    width: 1600,
    height: 960,
    columns: 5,
    rows: 2,
  },
  femaleAccessories: {
    id: 'femaleAccessories',
    path: '/public/assets/avatar/female-accessories-sheet-v4.png',
    source: require('../../public/assets/avatar/female-accessories-sheet-v4.png'),
    width: 1600,
    height: 960,
    columns: 5,
    rows: 2,
  },
} satisfies Record<AvatarSheetId, AvatarSheetConfig>;

function makeOption<T extends string>(
  id: T,
  sheetId: AvatarSheetId,
  row: number,
  column: number,
  bodyType?: AvatarBodyType
): AvatarSpriteOption<T> {
  const sheet = AVATAR_SHEETS[sheetId];
  const left = Math.round((column * sheet.width) / sheet.columns);
  const right = Math.round(((column + 1) * sheet.width) / sheet.columns);
  const top = Math.round((row * sheet.height) / sheet.rows);
  const bottom = Math.round(((row + 1) * sheet.height) / sheet.rows);
  return {
    id,
    bodyType,
    sheet: sheetId,
    row,
    column,
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function numberedOptions<T extends string>(
  prefix: string,
  count: number,
  sheet: AvatarSheetId,
  columns: number,
  bodyType: AvatarBodyType
): AvatarSpriteOption<T>[] {
  return Array.from({ length: count }, (_, index) =>
    makeOption(
      `${prefix}_${String(index + 1).padStart(2, '0')}` as T,
      sheet,
      Math.floor(index / columns),
      index % columns,
      bodyType
    )
  );
}

export const AVATAR_BODY_TYPES: AvatarBodyType[] = ['male', 'female'];

export const AVATAR_SKIN_OPTIONS: AvatarSpriteOption<AvatarSkinTone>[] = [
  ...Array.from({ length: 6 }, (_, index) =>
    makeOption(`skin_${String(index + 1).padStart(2, '0')}` as AvatarSkinTone, 'body', 0, index, 'male')
  ),
  ...Array.from({ length: 6 }, (_, index) =>
    makeOption(`skin_${String(index + 1).padStart(2, '0')}` as AvatarSkinTone, 'body', 1, index, 'female')
  ),
];

const AVATAR_FRONT_SKIN_OPTIONS: AvatarSpriteOption[] = [
  ...Array.from({ length: 6 }, (_, index) =>
    makeOption(`skin_${String(index + 1).padStart(2, '0')}_front`, 'bodyFront', 0, index, 'male')
  ),
  ...Array.from({ length: 6 }, (_, index) =>
    makeOption(`skin_${String(index + 1).padStart(2, '0')}_front`, 'bodyFront', 1, index, 'female')
  ),
];

export const AVATAR_HAIR_OPTIONS: AvatarSpriteOption<AvatarHairStyle>[] = [
  ...numberedOptions<AvatarHairStyle>('male_hair', 8, 'maleHair', 4, 'male'),
  ...numberedOptions<AvatarHairStyle>('female_hair', 8, 'femaleHair', 4, 'female'),
];

const AVATAR_HAIR_BACK_OPTIONS: AvatarSpriteOption[] = [
  ...numberedOptions('male_hair_back', 8, 'maleHairBack', 4, 'male'),
  ...numberedOptions('female_hair_back', 8, 'femaleHairBack', 4, 'female'),
];

export const AVATAR_TOP_OPTIONS: AvatarSpriteOption<AvatarTop>[] = [
  ...numberedOptions<AvatarTop>('male_top', 8, 'maleTops', 4, 'male'),
  ...numberedOptions<AvatarTop>('female_top', 8, 'femaleTops', 4, 'female'),
];

export const AVATAR_BOTTOM_OPTIONS: AvatarSpriteOption<AvatarBottom>[] = [
  ...numberedOptions<AvatarBottom>('male_bottom', 8, 'maleBottoms', 4, 'male'),
  ...numberedOptions<AvatarBottom>('female_bottom', 8, 'femaleBottoms', 4, 'female'),
];

export const AVATAR_SHOE_OPTIONS: AvatarSpriteOption<AvatarShoes>[] = [
  ...numberedOptions<AvatarShoes>('male_shoes', 6, 'maleShoes', 6, 'male'),
  ...numberedOptions<AvatarShoes>('female_shoes', 6, 'femaleShoes', 6, 'female'),
];

export const AVATAR_ACCESSORY_OPTIONS: AvatarSpriteOption<AvatarAccessory>[] = [
  ...numberedOptions<AvatarAccessory>('male_accessory', 10, 'maleAccessories', 5, 'male'),
  ...numberedOptions<AvatarAccessory>('female_accessory', 10, 'femaleAccessories', 5, 'female'),
];

export const AVATAR_HAIR_COLORS: AvatarHairColorOption[] = [
  { id: '#111111', label: 'black' },
  { id: '#3A2418', label: 'dark brown' },
  { id: '#8B5A2B', label: 'light brown' },
  { id: '#D8B45F', label: 'blonde' },
  { id: '#9A342A', label: 'red' },
  { id: '#C9C9C9', label: 'silver' },
  { id: '#D977A7', label: 'pink' },
  { id: '#3F6FB5', label: 'blue' },
  { id: '#4F8A45', label: 'green' },
];

export const DEFAULT_AVATAR_BY_BODY_TYPE: Record<AvatarBodyType, PixelAvatarConfig> = {
  male: {
    bodyType: 'male',
    skinTone: 'skin_01',
    hairStyle: 'male_hair_01',
    hairColor: '#3A2418',
    top: 'male_top_01',
    bottom: 'male_bottom_02',
    shoes: 'male_shoes_02',
    accessory: 'none',
  },
  female: {
    bodyType: 'female',
    skinTone: 'skin_01',
    hairStyle: 'female_hair_01',
    hairColor: '#3A2418',
    top: 'female_top_01',
    bottom: 'female_bottom_02',
    shoes: 'female_shoes_02',
    accessory: 'none',
  },
};

export const DEFAULT_PIXEL_AVATAR_CONFIG = DEFAULT_AVATAR_BY_BODY_TYPE.male;

function optionIds<T extends string>(options: readonly AvatarSpriteOption<T>[]): T[] {
  return options.map((o) => o.id);
}

export function optionsForBody<T extends string>(
  options: readonly AvatarSpriteOption<T>[],
  bodyType: AvatarBodyType
): AvatarSpriteOption<T>[] {
  return options.filter((option) => option.bodyType === bodyType);
}

function includes<T extends string>(items: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && items.includes(value as T);
}

function normalizeLegacyPart(value: unknown, prefix: string): string | undefined {
  if (typeof value !== 'string') return undefined;
  const legacy = /^(hair|shirt|pants|shoes|accessory|glasses)_(\d{2})$/.exec(value);
  if (!legacy) return value;
  const n = legacy[2];
  if (prefix.endsWith('top')) return `${prefix}_${n}`;
  if (prefix.endsWith('bottom')) return `${prefix}_${n}`;
  if (prefix.endsWith('hair')) return `${prefix}_${n}`;
  if (prefix.endsWith('shoes')) return `${prefix}_${n}`;
  if (prefix.endsWith('accessory')) return `${prefix}_${n === '01' ? '03' : n}`;
  return value;
}

export function parsePixelAvatarConfig(raw: string | null | undefined): PixelAvatarConfig | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PixelAvatarConfig>;
    const bodyType = includes(AVATAR_BODY_TYPES, parsed.bodyType)
      ? parsed.bodyType
      : DEFAULT_PIXEL_AVATAR_CONFIG.bodyType;
    const defaults = DEFAULT_AVATAR_BY_BODY_TYPE[bodyType];
    const prefix = bodyType;

    const fourVariants = (value: string | undefined) => value?.replace(/_(\d{2})$/, (_, n: string) => `_${String((Math.max(1, Number(n)) - 1) % 4 + 1).padStart(2, '0')}`);
    const hairStyle = fourVariants(normalizeLegacyPart(parsed.hairStyle, `${prefix}_hair`));
    const top = fourVariants(normalizeLegacyPart(parsed.top, `${prefix}_top`));
    const bottom = normalizeLegacyPart(parsed.bottom, `${prefix}_bottom`);
    const shoes = normalizeLegacyPart(parsed.shoes, `${prefix}_shoes`);
    const accessory = normalizeLegacyPart(parsed.accessory, `${prefix}_accessory`);
    const hairColors = AVATAR_HAIR_COLORS.map((c) => c.id);

    return {
      presetId: PERSONAL_AVATARS.find(avatar => avatar.id === parsed.presetId)?.id,
      bodyType,
      skinTone: includes(optionIds(optionsForBody(AVATAR_SKIN_OPTIONS, bodyType)), parsed.skinTone)
        ? parsed.skinTone
        : defaults.skinTone,
      hairStyle: includes(optionIds(optionsForBody(AVATAR_HAIR_OPTIONS, bodyType)), hairStyle)
        ? hairStyle
        : defaults.hairStyle,
      hairColor: includes(hairColors, parsed.hairColor) ? parsed.hairColor : defaults.hairColor,
      top: includes(optionIds(optionsForBody(AVATAR_TOP_OPTIONS, bodyType)), top) ? top : defaults.top,
      bottom: includes(optionIds(optionsForBody(AVATAR_BOTTOM_OPTIONS, bodyType)), bottom)
        ? bottom
        : defaults.bottom,
      shoes: includes(optionIds(optionsForBody(AVATAR_SHOE_OPTIONS, bodyType)), shoes)
        ? shoes
        : defaults.shoes,
      accessory:
        accessory === 'none'
          ? 'none'
          : includes(optionIds(optionsForBody(AVATAR_ACCESSORY_OPTIONS, bodyType)), accessory)
            ? accessory
            : defaults.accessory,
    };
  } catch {
    return null;
  }
}

function findRequired<T extends string>(
  options: readonly AvatarSpriteOption<T>[],
  id: T,
  bodyType: AvatarBodyType
): AvatarSpriteOption<T> {
  const found = options.find((option) => option.id === id && option.bodyType === bodyType);
  if (!found) {
    return optionsForBody(options, bodyType)[0]!;
  }
  return found;
}

export type AvatarRenderLayer =
  | { kind: 'sprite'; option: AvatarSpriteOption }
  | { kind: 'hair'; option: AvatarSpriteOption; color: AvatarHairColor };

export type AvatarLayerKind = 'body' | 'bottom' | 'shoes' | 'top' | 'hair' | 'accessory';

export type AvatarLayerTransform = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
};

export type AvatarItemTransformMap = Record<string, AvatarLayerTransform>;

export const DEFAULT_AVATAR_LAYER_TRANSFORM: AvatarLayerTransform = {
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
};

export const DEFAULT_AVATAR_ITEM_TRANSFORMS: AvatarItemTransformMap = {};

const AVATAR_LAYER_KINDS: AvatarLayerKind[] = ['body', 'bottom', 'shoes', 'top', 'hair', 'accessory'];

function clampTransformNumber(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function parseSingleTransform(input: unknown): AvatarLayerTransform {
  const value = input && typeof input === 'object'
    ? input as Record<string, unknown>
    : {};
  const legacyScale = clampTransformNumber(value.scale, 1, 0.1, 3);
  return {
    x: clampTransformNumber(value.x, DEFAULT_AVATAR_LAYER_TRANSFORM.x, -64, 64),
    y: clampTransformNumber(value.y, DEFAULT_AVATAR_LAYER_TRANSFORM.y, -96, 96),
    scaleX: clampTransformNumber(value.scaleX, legacyScale, 0.1, 3),
    scaleY: clampTransformNumber(value.scaleY, legacyScale, 0.1, 3),
  };
}

export function avatarItemIdForLayer(
  config: PixelAvatarConfig,
  kind: AvatarLayerKind
): string {
  if (kind === 'body') return config.skinTone;
  if (kind === 'hair') return config.hairStyle;
  if (kind === 'top') return config.top;
  if (kind === 'bottom') return config.bottom;
  if (kind === 'shoes') return config.shoes;
  return config.accessory;
}

export function parseAvatarItemTransforms(
  raw: string | null | undefined,
  currentConfig?: PixelAvatarConfig | null
): AvatarItemTransformMap {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = raw ? JSON.parse(raw) as Record<string, unknown> : {};
  } catch {
    parsed = {};
  }

  const result: AvatarItemTransformMap = {};
  Object.entries(parsed).forEach(([itemId, value]) => {
    if (!AVATAR_LAYER_KINDS.includes(itemId as AvatarLayerKind)) {
      result[itemId] = parseSingleTransform(value);
    }
  });

  // Migrate the previous category-wide calibration to only the item currently selected.
  if (currentConfig) {
    AVATAR_LAYER_KINDS.forEach((kind) => {
      if (!parsed[kind]) return;
      const itemId = avatarItemIdForLayer(currentConfig, kind);
      if (!result[itemId]) result[itemId] = parseSingleTransform(parsed[kind]);
    });
  }

  return result;
}

export function getAvatarRenderLayers(config: PixelAvatarConfig): AvatarRenderLayer[] {
  const body = findRequired(AVATAR_SKIN_OPTIONS, config.skinTone, config.bodyType);
  const frontSkin = findRequired(
    AVATAR_FRONT_SKIN_OPTIONS,
    `${config.skinTone}_front`,
    config.bodyType
  );
  const bottom = findRequired(AVATAR_BOTTOM_OPTIONS, config.bottom, config.bodyType);
  const shoes = findRequired(AVATAR_SHOE_OPTIONS, config.shoes, config.bodyType);
  const top = findRequired(AVATAR_TOP_OPTIONS, config.top, config.bodyType);
  const hair = findRequired(AVATAR_HAIR_OPTIONS, config.hairStyle, config.bodyType);
  const hairBack = findRequired(
    AVATAR_HAIR_BACK_OPTIONS,
    `${config.bodyType}_hair_back_${config.hairStyle.slice(-2)}`,
    config.bodyType
  );
  const accessory =
    config.accessory === 'none'
      ? null
      : findRequired(AVATAR_ACCESSORY_OPTIONS, config.accessory, config.bodyType);

  return [
    { kind: 'hair', option: hairBack, color: config.hairColor },
    { kind: 'sprite', option: body },
    { kind: 'sprite', option: bottom },
    { kind: 'sprite', option: shoes },
    { kind: 'sprite', option: top },
    { kind: 'sprite', option: frontSkin },
    { kind: 'hair', option: hair, color: config.hairColor },
    ...(accessory ? [{ kind: 'sprite' as const, option: accessory }] : []),
  ];
}
