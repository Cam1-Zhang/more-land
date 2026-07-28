import { HUB_HOME_BG_NATIVE_H, HUB_HOME_BG_NATIVE_W } from '../constants/hubHomeBackgroundImages';

/**
 * 固定 center-cover：同尺寸 Hub 底图在相同视口下可见裁切矩形一致（昼夜/开灯切换不跳框）。
 */
export function computeHubHomeBackgroundCoverLayout(
  viewW: number,
  viewH: number,
  nativeWidth: number = HUB_HOME_BG_NATIVE_W,
  nativeHeight: number = HUB_HOME_BG_NATIVE_H
): { width: number; height: number; left: number; top: number } {
  const safeW = Math.max(1, viewW);
  const safeH = Math.max(1, viewH);
  const scale = Math.max(safeW / nativeWidth, safeH / nativeHeight);
  const width = nativeWidth * scale;
  const height = nativeHeight * scale;
  return {
    width,
    height,
    left: (safeW - width) / 2,
    top: (safeH - height) / 2,
  };
}

/** 原生尺寸画框：屏幕不足时等比缩小，不放大超过 1:1 */
export function computeNativeFrameSize(
  winW: number,
  winH: number,
  nativeWidth: number,
  nativeHeight: number
): { frameW: number; frameH: number; scale: number } {
  const safeW = Math.max(1, winW);
  const safeH = Math.max(1, winH);
  const scale = Math.min(1, safeW / nativeWidth, safeH / nativeHeight);
  return {
    frameW: Math.round(nativeWidth * scale),
    frameH: Math.round(nativeHeight * scale),
    scale,
  };
}

/**
 * 底边、左边贴屏；按宽度等比放大直到右边贴齐（等价于以右下角为锚点缩放）。
 * 高度超出视口时从顶部裁切。
 */
export function computeBottomLeftWidthFillSize(
  winW: number,
  nativeWidth: number,
  nativeHeight: number
): { frameW: number; frameH: number; scale: number } {
  const safeW = Math.max(1, winW);
  const scale = safeW / nativeWidth;
  return {
    frameW: safeW,
    frameH: Math.round(nativeHeight * scale),
    scale,
  };
}

/**
 * 底边、右边贴屏；按宽度等比放大直到左边贴齐（以左上角方向放大）。
 * 高度超出视口时从顶部裁切。
 */
export function computeBottomRightWidthFillSize(
  winW: number,
  nativeWidth: number,
  nativeHeight: number
): { frameW: number; frameH: number; scale: number } {
  return computeBottomLeftWidthFillSize(winW, nativeWidth, nativeHeight);
}
