import * as React from 'react';
import { useEffect } from 'react';
import {
  Image,
  View,
  Platform,
  type ImageProps,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { PIXEL_ART_BODY_PORTRAIT } from '../theme/pixelArtImage';
import { formatBundledImageSourceForLog } from '../utils/logBundledImageSource';

/** 角色脚下草地（透明底）；与立绘同框、同比例，不额外放大 */
const CHARACTER_STAND_GRASS = require('../../assets/characters/characterStandGrass.png');

type ResizeMode = NonNullable<ImageProps['resizeMode']>;

export type BodyPortraitImageProps = {
  source: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ResizeMode;
  /** 脚下草地衬图（默认开） */
  showStandGrass?: boolean;
  /** `__DEV__` 下打印 `Image.resolveAssetSource` 结果，核对 Metro 实际加载的 URI */
  debugTag?: string;
};

/**
 * 全身立绘：PNG alpha 由子级 `Image` 合成；外层 `View` `collapsable={false}` 减轻 Android 圆角裁切父级下的合成黑块。
 * Web：`PIXEL_ART_BODY_PORTRAIT` 含 `image-rendering: pixelated`。
 */
export default function BodyPortraitImage({
  source,
  style,
  resizeMode = 'contain',
  showStandGrass = true,
  debugTag,
}: BodyPortraitImageProps) {
  const rm = resizeMode ?? 'contain';

  useEffect(() => {
    if (!__DEV__) return;
    const tag = debugTag ?? 'BodyPortraitImage';
    // eslint-disable-next-line no-console
    console.log(formatBundledImageSourceForLog(tag, source));
  }, [source, debugTag]);

  return (
    <View collapsable={false} style={[WRAP, style]}>
      {showStandGrass ? (
        <Image
          source={CHARACTER_STAND_GRASS}
          style={[PIXEL_ART_BODY_PORTRAIT, IMG_LAYER, GRASS_BEHIND]}
          resizeMode={rm}
          pointerEvents="none"
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <Image
        source={source}
        style={[PIXEL_ART_BODY_PORTRAIT, IMG_LAYER, PORTRAIT_ABOVE_GRASS]}
        resizeMode={rm}
        {...(Platform.OS === 'android'
          ? ({
              fadeDuration: 0,
              /** 大幅缩小位图时优先走 native resize，减轻半透明边缘被「抹糊」 */
              resizeMethod: 'resize',
            } as const)
          : {})}
      />
    </View>
  );
}

const WRAP: ViewStyle = {
  position: 'relative',
  backgroundColor: 'transparent',
  overflow: 'visible',
};

/** 草地与立绘叠在同一区域，contain 时按各自原图比例缩放 */
const IMG_LAYER: ImageStyle = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'transparent',
};

const GRASS_BEHIND: ImageStyle = {
  zIndex: 0,
};

const PORTRAIT_ABOVE_GRASS: ImageStyle = {
  zIndex: 1,
};
