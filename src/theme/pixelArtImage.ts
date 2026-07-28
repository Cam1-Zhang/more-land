import { Platform, type ImageStyle } from 'react-native';

/**
 * Web：nearest-neighbor（须加在真正画位图的 `Image` 上；`View` 不会传到 `<img>`）。
 * 多前缀减少 Safari/Firefox 对 alpha 边缘的双线性柔化。
 */
const WEB_NEAREST_NO_SMOOTH: ImageStyle = {
  ...( { imageRendering: 'pixelated' } as ImageStyle ),
  ...( { WebkitImageRendering: 'pixelated' } as ImageStyle ),
  ...( { MsInterpolationMode: 'nearest-neighbor' } as ImageStyle ),
  /** Firefox：更接近「不插值平滑」的旧语义 */
  ...( { MozImageRendering: 'crisp-edges' } as ImageStyle ),
};

/**
 * 像素风精灵 / 立绘的 RN `Image` 样式：Web 最近邻；`Image` 底透明不叠衬色。
 * 原生侧由系统按 `resizeMode` 缩放；Web 必须显式 CSS 才接近「不糊边」。
 */
export const PIXEL_ART_SPRITE: ImageStyle = {
  backgroundColor: 'transparent',
  ...Platform.select<ImageStyle>({
    web: WEB_NEAREST_NO_SMOOTH,
    default: {},
  }),
};

/** @deprecated 使用 `PIXEL_ART_SPRITE` */
export const PIXEL_ART_IMAGE = PIXEL_ART_SPRITE;

/** 全身立绘与精灵共用同一套 Web 缩放策略 */
export const PIXEL_ART_BODY_PORTRAIT = PIXEL_ART_SPRITE;

/**
 * `ImageBackground` 的 `imageStyle`：对底层位图应用最近邻（全屏像素场景 / parchment 等）。
 */
export const PIXEL_ART_BACKGROUND_IMAGE: ImageStyle = Platform.select<ImageStyle>({
  web: WEB_NEAREST_NO_SMOOTH,
  default: {},
});
