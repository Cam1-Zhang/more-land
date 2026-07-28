import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

/** 与选人页 `mainShellGallery` 半透明白底一致 */
export const PICKER_GLASS_PANEL_BG = 'rgba(255, 252, 245, 0.72)' as const;
/** 半透明白底面板描边：金黄色细线 */
export const PICKER_GLASS_PANEL_BORDER = '#c9a040' as const;
/** 对局右栏底栏：比 `PICKER_GLASS_PANEL_BG` 更透，露出牛皮纸 */
export const GAME_ROOM_FOOTER_PANEL_BG = 'rgba(255, 252, 245, 0.52)' as const;
/** 公开事件 Tab 白条：比选人玻璃更透，露出牛皮纸纹理 */
export const PARCHMENT_PUBLIC_EVENT_ROW_BG = 'rgba(255, 252, 245, 0.38)' as const;
/** 对局底栏木色按钮图标（与「确认狼刀票」Target 一致） */
export const GAME_ROOM_FOOTER_ICON_COLOR = '#e8c44a' as const;

/** 与选人页 `cardPicker` 星露谷木框描边一致（上左高光、下右深影） */
export const pickerCharacterCardBorder: Pick<
  ViewStyle,
  'borderWidth' | 'borderTopColor' | 'borderLeftColor' | 'borderBottomColor' | 'borderRightColor'
> = {
  borderWidth: 4,
  borderTopColor: '#9a7a58',
  borderLeftColor: '#9a7a58',
  borderBottomColor: '#2a1810',
  borderRightColor: '#2a1810',
};
/** 牛皮纸聊天区「最新一条」半透明白条 */
export const PARCHMENT_LOG_ROW_HIGHLIGHT_BG = 'rgba(255, 252, 245, 0.24)' as const;

/** 与选人页 `galleryBackSquare` 一致的游戏按钮色 */
export const GAME_WOOD_BTN = {
  bg: '#4a3728',
  border: '#2f2118',
  text: '#fff8ec',
  bgMuted: '#6e5c4e',
  borderMuted: '#4a4038',
  textMuted: 'rgba(255, 248, 236, 0.72)',
  radius: 10,
  borderWidth: 2,
  iconSize: 44,
  /** 文字钮与图标钮同宽（内容可撑开）；「开始本局」等主 CTA 额外加宽 */
  textMinWidth: 44,
  textPaddingH: 16,
  textPaddingHWide: 40,
  textMinWidthWide: 220,
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 } as const,
} as const;

export type GameWoodButtonTone = 'default' | 'muted' | 'outline';

export function gameWoodButtonFace(tone: GameWoodButtonTone = 'default'): ViewStyle {
  if (tone === 'outline') {
    return {
      backgroundColor: '#faf6ef',
      borderWidth: GAME_WOOD_BTN.borderWidth,
      borderColor: GAME_WOOD_BTN.border,
      borderRadius: GAME_WOOD_BTN.radius,
    };
  }
  if (tone === 'muted') {
    return {
      backgroundColor: GAME_WOOD_BTN.bgMuted,
      borderWidth: GAME_WOOD_BTN.borderWidth,
      borderColor: GAME_WOOD_BTN.borderMuted,
      borderRadius: GAME_WOOD_BTN.radius,
    };
  }
  return {
    backgroundColor: GAME_WOOD_BTN.bg,
    borderWidth: GAME_WOOD_BTN.borderWidth,
    borderColor: GAME_WOOD_BTN.border,
    borderRadius: GAME_WOOD_BTN.radius,
  };
}

export function gameWoodButtonLabel(tone: GameWoodButtonTone = 'default'): TextStyle {
  if (tone === 'outline') {
    return { color: GAME_WOOD_BTN.bg, fontWeight: '900' as const };
  }
  if (tone === 'muted') {
    return { color: GAME_WOOD_BTN.textMuted, fontWeight: '900' as const };
  }
  return { color: GAME_WOOD_BTN.text, fontWeight: '900' as const };
}

/** 预置样式：图标钮 / 文字钮 / 分段选中 */
export const gameButtonStyles = StyleSheet.create({
  iconTouch: {
    width: GAME_WOOD_BTN.iconSize,
    height: GAME_WOOD_BTN.iconSize,
    alignItems: 'center',
    justifyContent: 'center',
    ...gameWoodButtonFace('default'),
  },
  textTouch: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: GAME_WOOD_BTN.textPaddingH,
    paddingVertical: 10,
    minWidth: GAME_WOOD_BTN.textMinWidth,
    minHeight: GAME_WOOD_BTN.iconSize,
    ...gameWoodButtonFace('default'),
  },
  textTouchWide: {
    paddingHorizontal: GAME_WOOD_BTN.textPaddingHWide,
    minWidth: GAME_WOOD_BTN.textMinWidthWide,
  },
  textTouchCompact: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    minHeight: 40,
  },
  textLabel: {
    fontSize: 14,
    textAlign: 'center',
    ...gameWoodButtonLabel('default'),
  },
  textLabelCompact: {
    fontSize: 11,
  },
  segmentBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: GAME_WOOD_BTN.radius,
    borderWidth: 1,
    borderColor: '#c9b89a',
    overflow: 'hidden',
    backgroundColor: '#faf6ef',
  },
  segmentCell: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  segmentCellOn: {
    ...gameWoodButtonFace('default'),
    borderWidth: 0,
    borderRadius: 0,
  },
  segmentTxt: {
    fontSize: 9,
    fontWeight: '800',
    color: GAME_WOOD_BTN.bg,
    textAlign: 'center',
  },
  segmentTxtOn: {
    ...gameWoodButtonLabel('default'),
    fontSize: 9,
    fontWeight: '800',
  },
});
