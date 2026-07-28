import type { HomeBgLights, HomeBgMode } from '../utils/homeBgMode';

/** 四张 Hub 场景底图统一画布（裁切计算用） */
export const HUB_HOME_BG_NATIVE_W = 1024;
export const HUB_HOME_BG_NATIVE_H = 576;

/**
 * 黑夜切图相对白天整体上移时的补偿（1024 画布上的设计像素；随 cover 缩放）。
 * 仅昼夜切换时应用，开/关灯两张夜图共用同一偏移。
 */
export const HUB_HOME_NIGHT_CONTENT_SHIFT_DOWN_PX = 1;

export function hubHomeNightContentShiftDown(scaledImageWidth: number): number {
  return HUB_HOME_NIGHT_CONTENT_SHIFT_DOWN_PX * (scaledImageWidth / HUB_HOME_BG_NATIVE_W);
}

/** 图1 白天关灯 */
const HOME_HUB_DAY_OFF = require('../../assets/homeHubDayOff.png');
/** 图4 白天开灯 */
const HOME_HUB_DAY_ON = require('../../assets/homeHubDayOn.png');
/** 图3 黑夜关灯 */
const HOME_HUB_NIGHT_OFF = require('../../assets/homeHubNightOff.png');
/** 图2 黑夜开灯 */
const HOME_HUB_NIGHT_ON = require('../../assets/homeHubNightOn.png');

export function getHubHomeBackgroundSource(mode: HomeBgMode, lights: HomeBgLights) {
  if (mode === 'day') {
    return lights === 'on' ? HOME_HUB_DAY_ON : HOME_HUB_DAY_OFF;
  }
  return lights === 'on' ? HOME_HUB_NIGHT_ON : HOME_HUB_NIGHT_OFF;
}
