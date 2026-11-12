import React from 'react';
import { Image, View, type StyleProp, type ViewStyle } from 'react-native';
import type { AvatarItemTransformMap, PixelAvatarConfig } from '../constants/avatarCreator';
import type { Facing } from './ExplorationSprite';
import { getPersonalAvatar, PERSONAL_AVATAR_SEATED_ROWS } from '../constants/personalAvatars';
import { PIXEL_ART_SPRITE } from '../theme/pixelArtImage';
const AVATARS = require('../../assets/avatar-creator/personal/avatars.png');

/** Complete generated figures: no paper-doll joins or simulated seated pose. */
export default function PixelAvatarSprite({ config, size = 128, style, pose = 'standing', facing = 'down' }: {
  config: PixelAvatarConfig; size?: number; style?: StyleProp<ViewStyle>;
  transforms?: AvatarItemTransformMap; pose?: 'standing' | 'seated'; facing?: Facing;
}) {
  const width = Math.max(1, size), height = width * 96 / 80;
  const avatar = getPersonalAvatar(config);
  return <View testID={pose === 'seated' ? 'pixel-avatar-seated' : 'pixel-avatar-sprite'} pointerEvents="none"
    accessibilityLabel={`${avatar.bodyType === 'male' ? '男生' : '女生'} · ${avatar.style}`}
    style={[{ width, height, overflow: 'hidden' }, style]}>
    <Image source={AVATARS} resizeMode="stretch" style={[PIXEL_ART_SPRITE, {
      position: 'absolute', width: width * 6, height: height * 5,
      left: -avatar.column * width, top: pose === 'seated' ? -PERSONAL_AVATAR_SEATED_ROWS[facing] * height : 0,
    }]} />
  </View>;
}
