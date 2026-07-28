import type { ImageSourcePropType } from 'react-native';

/** 与设计稿切图一致（`assets/hub/homeModuleBtns/*.png`，约 1024×977） */
export const HOME_MODULE_BTN_W = 140;
export const HOME_MODULE_BTN_H = Math.round((HOME_MODULE_BTN_W * 977) / 1024);

export type HomeModuleButtonId = 'single' | 'team' | 'tutorial' | 'gallery';

export const HOME_MODULE_BUTTONS: Record<HomeModuleButtonId, ImageSourcePropType> = {
  single: require('../../assets/hub/homeModuleBtns/single.png'),
  team: require('../../assets/hub/homeModuleBtns/team.png'),
  tutorial: require('../../assets/hub/homeModuleBtns/tutorial.png'),
  gallery: require('../../assets/hub/homeModuleBtns/gallery.png'),
};
