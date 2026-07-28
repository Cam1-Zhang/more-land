import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { GAME_PIXEL_FONT_FAMILY } from '../theme/pixelFont';

const TITLE = 'AI WEREWOLF VALLEY';

/** 8 向白描边（2px，细描边） */
const OUTLINE_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-2, 0],
  [2, 0],
  [0, -2],
  [0, 2],
  [-2, -2],
  [2, -2],
  [-2, 2],
  [2, 2],
];

/** 标题横向略收窄 */
const TITLE_SCALE_X = 0.88;
/** 标题竖向略拉长（像素字拉高） */
const TITLE_SCALE_Y = 1.2;
/** 叠在 LOGO 上时整体下移（px） */
const TITLE_OVERLAY_SHIFT_DOWN = 12;
/** 描边：略深于白的暖黄（非牛皮纸色） */
const TITLE_OUTLINE_COLOR = '#f0ead8';

type Props = {
  layoutWidth: number;
  /** 主页固定 38；未传则按宽度推算 */
  fontSize?: number;
  /** 叠在 LOGO 上时不占文档流间距 */
  overlay?: boolean;
};

function PixelOutlinedTitle({
  fontSize,
  lineHeight,
  letterSpacing,
  scaleX,
  scaleY,
}: {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  scaleX: number;
  scaleY: number;
}) {
  const glyph = [
    styles.glyph,
    { fontSize, lineHeight, letterSpacing },
  ] as const;

  return (
    <View style={[styles.titleStack, { transform: [{ scaleX }, { scaleY }] }]}>
      {OUTLINE_OFFSETS.map(([dx, dy]) => (
        <Text
          key={`${dx}-${dy}`}
          style={[
            ...glyph,
            styles.outline,
            { transform: [{ translateX: dx }, { translateY: dy }] },
          ]}
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
        >
          {TITLE}
        </Text>
      ))}
      <Text style={[...glyph, styles.fill]} numberOfLines={1}>
        {TITLE}
      </Text>
    </View>
  );
}

/**
 * 主页像素风英文大标题：黑字 + 暖黄描边（Press Start 2P）。
 */
export default function HomePixelBrandTitle({
  layoutWidth,
  fontSize: fontSizeProp,
  overlay = false,
}: Props) {
  const fontSize = useMemo(() => {
    if (fontSizeProp != null) return fontSizeProp;
    const w = Math.max(200, layoutWidth);
    return Math.max(16, Math.min(26, Math.floor(w / 22)));
  }, [fontSizeProp, layoutWidth]);

  const lineHeight = Math.round(fontSize * 1.35);
  const letterSpacing = fontSize >= 32 ? 0 : fontSize >= 24 ? 2 : fontSize >= 18 ? 3 : 2;

  return (
    <View
      style={[styles.wrap, overlay && styles.wrapOverlay]}
      accessibilityRole="header"
    >
      <PixelOutlinedTitle
        fontSize={fontSize}
        lineHeight={lineHeight}
        letterSpacing={letterSpacing}
        scaleX={TITLE_SCALE_X}
        scaleY={TITLE_SCALE_Y}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    alignItems: 'center',
    maxWidth: '100%',
    marginBottom: 12,
  },
  wrapOverlay: {
    marginBottom: 0,
    paddingHorizontal: 4,
    alignSelf: 'center',
    transform: [{ translateY: TITLE_OVERLAY_SHIFT_DOWN }],
  },
  titleStack: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  glyph: {
    fontFamily: GAME_PIXEL_FONT_FAMILY,
    textAlign: 'center',
    allowFontScaling: false,
    flexShrink: 0,
    ...Platform.select({
      android: { includeFontPadding: false, textBreakStrategy: 'simple' as const },
      web: { whiteSpace: 'nowrap' as const },
      default: {},
    }),
  },
  outline: {
    position: 'absolute',
    color: TITLE_OUTLINE_COLOR,
  },
  fill: {
    color: '#1a1208',
    position: 'relative',
    zIndex: 2,
  },
});
