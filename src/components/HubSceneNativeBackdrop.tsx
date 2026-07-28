import React, { useMemo } from 'react';
import { View, Image, StyleSheet, useWindowDimensions } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { computeNativeFrameSize } from '../utils/hubSceneLayout';

type Props = {
  source: ImageSourcePropType;
  nativeWidth: number;
  nativeHeight: number;
};

/** 居中铺一层原生尺寸背景图（不裁切、不拉伸铺满屏） */
export default function HubSceneNativeBackdrop({ source, nativeWidth, nativeHeight }: Props) {
  const { width: winW, height: winH } = useWindowDimensions();
  const { frameW, frameH } = useMemo(
    () => computeNativeFrameSize(winW, winH, nativeWidth, nativeHeight),
    [winW, winH, nativeWidth, nativeHeight]
  );

  return (
    <View style={styles.layer} pointerEvents="none">
      <Image
        source={source}
        style={{ width: frameW, height: frameH }}
        resizeMode="stretch"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
