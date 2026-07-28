import React, { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet } from 'react-native';
import {
  HOME_MODULE_BTN_H,
  HOME_MODULE_BTN_W,
  HOME_MODULE_BUTTONS,
  type HomeModuleButtonId,
} from '../constants/homeModuleButtonImages';
import { PIXEL_ART_SPRITE } from '../theme/pixelArtImage';

/** 鼠标悬停时略放大（Web）；原生无悬停 */
const HOVER_SCALE = 1.06;

type Props = {
  module: HomeModuleButtonId;
  onPress: () => void;
  accessibilityLabel: string;
};

/** 首页模块：木框切图 + Web 悬停微放大 */
export function HomeMenuModuleButton({ module, onPress, accessibilityLabel }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.touch,
        {
          transform: [{ scale: hovered ? HOVER_SCALE : pressed ? 1.03 : 1 }],
          ...(Platform.OS === 'web'
            ? ({ transition: 'transform 0.14s ease-out' } as object)
            : null),
        },
      ]}
    >
      <Image
        source={HOME_MODULE_BUTTONS[module]}
        style={styles.image}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touch: {
    width: HOME_MODULE_BTN_W,
    height: HOME_MODULE_BTN_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: HOME_MODULE_BTN_W,
    height: HOME_MODULE_BTN_H,
    ...PIXEL_ART_SPRITE,
  },
});
