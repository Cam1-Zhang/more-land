import React, { useMemo } from 'react';
import { Text, StyleSheet, useWindowDimensions } from 'react-native';
import { GAME_PIXEL_CJK_FONT_FAMILY, GAME_PIXEL_FONT_FAMILY } from '../theme/pixelFont';
import type { AppLanguage } from '../i18n/appStrings';

type Props = {
  lang: AppLanguage;
  text: string;
};

/** 与选玩法顶栏一致的像素风字号（中英文） */
export function useTutorialPixelBannerTypography(lang: AppLanguage) {
  const { width: winW } = useWindowDimensions();

  return useMemo(() => {
    const maxW = Math.min(winW - 32, 520);
    const fontSize = lang === 'zh' ? (maxW >= 400 ? 18 : 15) : maxW >= 400 ? 11 : 10;
    const lineHeight = Math.round(fontSize * (lang === 'zh' ? 1.5 : 1.6));
    const fontFamily = lang === 'zh' ? GAME_PIXEL_CJK_FONT_FAMILY : GAME_PIXEL_FONT_FAMILY;
    return { maxW, fontSize, lineHeight, fontFamily };
  }, [lang, winW]);
}

/** 新手选板页顶栏提示：仅像素风文案 */
export default function TutorialPickBanner({ lang, text }: Props) {
  const typography = useTutorialPixelBannerTypography(lang);

  return (
    <Text
      style={[
        styles.line,
        {
          fontFamily: typography.fontFamily,
          fontSize: typography.fontSize,
          lineHeight: typography.lineHeight,
          maxWidth: typography.maxW,
        },
      ]}
      numberOfLines={2}
      allowFontScaling={false}
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  line: {
    color: '#fff8ec',
    textAlign: 'center',
    alignSelf: 'center',
    textShadowColor: 'rgba(18, 12, 8, 0.85)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
});

export const tutorialPixelBannerTextStyle = styles.line;
