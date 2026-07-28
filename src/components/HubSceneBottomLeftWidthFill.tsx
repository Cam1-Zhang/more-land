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
import { computeBottomLeftWidthFillSize } from '../utils/hubSceneLayout';

type Props = {
  source: ImageSourcePropType;
  nativeWidth: number;
  nativeHeight: number;
  /** 顶部裁切后露出的衬色 */
  letterboxColor?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

/**
 * 背景图：左、底贴屏；宽度铺满至右缘（等比放大）；高出视口部分从顶部裁掉。
 * 子元素（热区）坐标相对铺满后的画框。
 */
export default function HubSceneBottomLeftWidthFill({
  source,
  nativeWidth,
  nativeHeight,
  letterboxColor = '#120e0c',
  style,
  children,
}: Props) {
  const { width: winW } = useWindowDimensions();

  const { frameW, frameH } = useMemo(
    () => computeBottomLeftWidthFillSize(winW, nativeWidth, nativeHeight),
    [winW, nativeWidth, nativeHeight]
  );

  return (
    <View style={[styles.viewport, { backgroundColor: letterboxColor }, style]}>
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
  viewport: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  frame: {
    position: 'relative',
    overflow: 'hidden',
  },
  childrenLayer: {
    ...StyleSheet.absoluteFillObject,
  },
});
