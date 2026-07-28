import type { ImageSourcePropType } from 'react-native';

export type RoomStickerId =
  | 'husky_angry'
  | 'husky_smile'
  | 'husky_cry'
  | 'husky_laugh'
  | 'husky_thumb'
  | 'husky_dots';

const SOURCES: Record<RoomStickerId, ImageSourcePropType> = {
  husky_angry: require('../../assets/stickers/husky_angry.png'),
  husky_smile: require('../../assets/stickers/husky_smile.png'),
  husky_cry: require('../../assets/stickers/husky_cry.png'),
  husky_laugh: require('../../assets/stickers/husky_laugh.png'),
  husky_thumb: require('../../assets/stickers/husky_thumb.png'),
  husky_dots: require('../../assets/stickers/husky_dots.png'),
};

export const ROOM_STICKER_IDS = Object.keys(SOURCES) as RoomStickerId[];

export const ROOM_STICKER_PACK: { id: RoomStickerId; source: ImageSourcePropType }[] =
  ROOM_STICKER_IDS.map((id) => ({ id, source: SOURCES[id] }));

export function resolveStickerSource(id: string): ImageSourcePropType | null {
  return SOURCES[id as RoomStickerId] ?? null;
}
