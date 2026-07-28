import { Platform } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';

import { GAME_WOOD_BTN } from '../theme/gameButton';

/** 与选人返回钮、`GameWoodButton` 图标钮一致 */
export const HUB_CHROME_BTN = GAME_WOOD_BTN.iconSize;
/** 顶栏图标钮之间的横向间距 */
export const HUB_CHROME_GAP = 10;

/** 首页右上角条：设置 / 昼夜切换 */
export function homeChromeTop(insets: EdgeInsets): number {
  return Math.max(insets.top, Platform.OS === 'web' ? 8 : 4) + 4;
}

/** 首页右上角条：贴右基准 */
export function homeChromeRight(insets: EdgeInsets): number {
  return Math.max(insets.right, 8) + 6;
}

/** 首页左下角：开灯钮 */
export function homeChromeLeft(insets: EdgeInsets): number {
  return Math.max(insets.left, 8) + 6;
}

export function homeChromeBottom(insets: EdgeInsets): number {
  return Math.max(insets.bottom, Platform.OS === 'web' ? 12 : 8) + 8;
}

/**
 * 已在 SafeAreaView 内的子树：与首页顶栏图标垂直对齐的 `top`。
 */
export function hubChromeTopInSafeContent(insets: EdgeInsets): number {
  return Math.max(0, homeChromeTop(insets) - insets.top);
}

/**
 * 选人页「随机」与设置同排、在紧挨设置左侧；父容器为 safe 内容区时的 `position.absolute` 的 `right`。
 */
export function hubShuffleRightInSafeContent(insets: EdgeInsets): number {
  return (
    homeChromeRight(insets) - insets.right + HUB_CHROME_BTN + HUB_CHROME_GAP + HUB_CHROME_BTN
  );
}

/** 顶栏标题避让「随机 + 设置」两枚 hub 按钮 */
export function characterSelectSoloHeaderRightPadding(insets: EdgeInsets): number {
  const shuffleRight = hubShuffleRightInSafeContent(insets);
  return Math.max(12, Math.round(shuffleRight + HUB_CHROME_BTN + 12));
}
