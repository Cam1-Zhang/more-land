import { Text, TextInput, type StyleProp, type TextStyle } from 'react-native';

/** @expo-google-fonts/press-start-2p 注册名，与 useFonts 的 key 一致 */
export const GAME_PIXEL_FONT_FAMILY = 'PressStart2P_400Regular';

/** Zpix 最像素（`assets/fonts/Zpix.ttf`），中英文均为像素风 */
export const GAME_PIXEL_CJK_FONT_FAMILY = 'Zpix';

/** 对局顶栏法官仪式播报：中文像素 + 略宽字距 */
export const topBarModeratorHeadlineTextStyle: TextStyle = {
  fontFamily: GAME_PIXEL_CJK_FONT_FAMILY,
  fontSize: 18,
  lineHeight: 26,
  letterSpacing: 5,
  allowFontScaling: false,
};

let globalPixelFontApplied = false;

/**
 * 全局默认像素字体（中文等缺字会由系统回退，英文/数字为像素风）。
 * 仅在字体已成功 loadAsync 之后调用一次。
 */
export function applyGlobalPixelFontDefaults(): void {
  if (globalPixelFontApplied) return;
  try {
    const pixelStyle: TextStyle = { fontFamily: GAME_PIXEL_FONT_FAMILY, allowFontScaling: false };

    Text.defaultProps = {
      ...Text.defaultProps,
      allowFontScaling: false,
      style: mergeStyle(Text.defaultProps?.style, pixelStyle),
    };
    TextInput.defaultProps = {
      ...TextInput.defaultProps,
      allowFontScaling: false,
      style: mergeStyle(TextInput.defaultProps?.style, pixelStyle),
    };
  } catch (e) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // Some RN / React combos reject mutating defaultProps on host components.
      console.warn('[pixelFont] applyGlobalPixelFontDefaults skipped:', e);
    }
  } finally {
    globalPixelFontApplied = true;
  }
}

function mergeStyle(
  prev: StyleProp<TextStyle> | undefined,
  inject: TextStyle
): StyleProp<TextStyle> {
  if (prev == null) return inject;
  if (Array.isArray(prev)) return [inject, ...prev];
  return [inject, prev];
}
