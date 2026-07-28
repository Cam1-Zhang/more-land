import React, { useMemo } from 'react';
import {
  View,
  Image,
  StyleSheet,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { computeBottomRightWidthFillSize } from '../utils/hubSceneLayout';

type Props = {
  source: ImageSourcePropType;
  nativeWidth: number;
  nativeHeight: number;
  /** 整图下移（px），底边可略超出视口 */
  shiftDown?: number;
  letterboxColor?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

/**
 * 背景图：右、底贴屏；按宽度等比放大至左缘贴齐（高出视口从顶部裁切）。
 */
export default function HubSceneBottomRightWidthFill({
  source,
  nativeWidth,
  nativeHeight,
  shiftDown = 0,
  letterboxColor = '#120e0c',
  style,
  children,
}: Props) {
  const { width: winW } = useWindowDimensions();

  const { frameW, frameH, scale } = useMemo(
    () => computeBottomRightWidthFillSize(winW, nativeWidth, nativeHeight),
    [winW, nativeWidth, nativeHeight]
  );
  const scaledShiftDown = shiftDown ? shiftDown * scale : 0;

  return (
    <View style={[styles.viewport, { backgroundColor: letterboxColor }, style]}>
      <View
        style={[
          styles.frame,
          {
            width: frameW,
            height: frameH,
            transform: scaledShiftDown ? [{ translateY: scaledShiftDown }] : undefined,
          },
        ]}
      >
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
  viewport: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  frame: {
    position: 'relative',
    overflow: 'hidden',
  },
  childrenLayer: {
    ...StyleSheet.absoluteFillObject,
  },
});
