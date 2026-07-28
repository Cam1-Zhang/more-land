import React, { useMemo } from 'react';
import { View, Image, StyleSheet, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { computeNativeFrameSize } from '../utils/hubSceneLayout';

type Props = {
  source: ImageSourcePropType;
  nativeWidth: number;
  nativeHeight: number;
  /** 画框外衬色（比例与图不一致时出现信箱条） */
  letterboxColor?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

/**
 * 按图片原生宽高展示（不 cover 裁切）；屏幕更小时等比缩小，更大时不放大。
 */
export default function HubSceneNativeFrame({
  source,
  nativeWidth,
  nativeHeight,
  letterboxColor = '#120e0c',
  style,
  children,
}: Props) {
  const { width: winW, height: winH } = useWindowDimensions();

  const { frameW, frameH } = useMemo(
    () => computeNativeFrameSize(winW, winH, nativeWidth, nativeHeight),
    [winW, winH, nativeWidth, nativeHeight]
  );

  return (
    <View style={[styles.letterbox, { backgroundColor: letterboxColor }, style]}>
      <View style={[styles.frame, { width: frameW, height: frameH }]}>
        <Image
          source={source}
          style={{ width: frameW, height: frameH }}
          resizeMode="stretch"
          accessibilityIgnoresInvertColors
        />
        {children ? <View style={styles.childrenLayer}>{children}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  letterbox: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frame: {
    position: 'relative',
    overflow: 'hidden',
  },
  childrenLayer: {
    ...StyleSheet.absoluteFillObject,
  },
});
