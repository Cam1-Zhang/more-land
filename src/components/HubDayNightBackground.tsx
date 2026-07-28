import React, { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  ImageBackground,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getHubHomeBackgroundSource,
  hubHomeNightContentShiftDown,
} from '../constants/hubHomeBackgroundImages';
import { PIXEL_ART_BACKGROUND_IMAGE } from '../theme/pixelArtImage';
import { readHomeHubScene, type HomeHubScene } from '../utils/homeBgMode';
import { computeHubHomeBackgroundCoverLayout } from '../utils/hubSceneLayout';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 首页传入受控 scene；子页不传则 focus 时从 storage 读取 */
  scene?: HomeHubScene;
};

/**
 * 与首页共用昼夜 + 开灯状态；四张 1024×576 底图用同一套 center-cover 裁切框。
 */
export default function HubDayNightBackground({ children, style, scene: sceneProp }: Props) {
  const { width: winW, height: winH } = useWindowDimensions();
  const [storedScene, setStoredScene] = useState<HomeHubScene>({ mode: 'day', lights: 'off' });
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });

  const scene = sceneProp ?? storedScene;

  useFocusEffect(
    useCallback(() => {
      if (sceneProp) return;
      let cancelled = false;
      void readHomeHubScene().then((s) => {
        if (!cancelled) setStoredScene(s);
      });
      return () => {
        cancelled = true;
      };
    }, [sceneProp])
  );

  const coverImageStyle = useMemo((): ImageStyle | null => {
    const w = viewSize.width > 0 ? viewSize.width : winW;
    const h = viewSize.height > 0 ? viewSize.height : winH;
    if (w <= 0 || h <= 0) return null;
    const { width, height, left, top } = computeHubHomeBackgroundCoverLayout(w, h);
    const nightShiftDown =
      scene.mode === 'night' ? hubHomeNightContentShiftDown(width) : 0;
    return {
      ...PIXEL_ART_BACKGROUND_IMAGE,
      position: 'absolute',
      width,
      height,
      left,
      top: top + nightShiftDown,
    };
  }, [scene.mode, viewSize.width, viewSize.height, winW, winH]);

  return (
    <View
      style={[styles.root, style]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 0 && height > 0) {
          setViewSize({ width, height });
        }
      }}
    >
      {coverImageStyle ? (
        <ImageBackground
          source={getHubHomeBackgroundSource(scene.mode, scene.lights)}
          style={StyleSheet.absoluteFillObject}
          imageStyle={coverImageStyle}
          resizeMode="stretch"
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <View style={styles.childrenLayer} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f0d14',
    overflow: 'hidden',
  },
  childrenLayer: {
    ...StyleSheet.absoluteFillObject,
  },
});
