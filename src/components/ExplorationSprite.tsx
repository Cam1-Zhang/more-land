import React, { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { PIXEL_ART_SPRITE } from '../theme/pixelArtImage';
import { getExplorationSprite } from '../constants/explorationSprites';
import { walkingCell } from '../constants/explorationWorld';

export type ExplorerId = 'toby' | 'momo';
export type Facing = 'down' | 'left' | 'right' | 'up';

export default memo(function ExplorationSprite({ character, facing = 'down', frame = 0, scale = 2 }: {
  character: string; facing?: Facing; frame?: number; scale?: number;
}) {
  const cell = walkingCell(character, facing, frame);
  return (
    <View pointerEvents="none" style={{ width: 40 * scale, height: 48 * scale, overflow: 'hidden', transform: [{ scaleX: cell.mirrored ? -1 : 1 }] }}>
      <Image source={getExplorationSprite(character)} resizeMode="stretch" style={[
        PIXEL_ART_SPRITE, styles.sheet,
        { width: 160 * scale, height: 192 * scale, left: -cell.column * 40 * scale, top: -cell.row * 48 * scale },
      ]} />
    </View>
  );
});
const styles = StyleSheet.create({ sheet: { position: 'absolute' } });
