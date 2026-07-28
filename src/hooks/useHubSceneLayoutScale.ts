import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { TUTORIAL_LAYOUT_REF_WIDTH } from '../constants/tutorialLayoutReference';

/**
 * 将教程/Hub 场景里在参考宽度下调好的 px 常量，按当前视口宽度等比缩放。
 * 背景 `HubSceneBottomRightWidthFill` 使用相同的 width-fill 比例（nativeArtWidth 默认 1024）。
 */
export function useHubSceneLayoutScale(
  nativeArtWidth: number = TUTORIAL_LAYOUT_REF_WIDTH
) {
  const { width: winW } = useWindowDimensions();

  return useMemo(() => {
    const safeW = Math.max(1, winW);
    const scale = safeW / nativeArtWidth;
    return {
      scale,
      px: (tuned: number) => tuned * scale,
      roundPx: (tuned: number) => Math.round(tuned * scale),
    };
  }, [winW, nativeArtWidth]);
}
