import type { ImageSourcePropType } from 'react-native';

/** 角色图鉴全屏背景：书房书桌场景（原生像素尺寸） */
export const CHARACTER_GALLERY_ROOM_BG: ImageSourcePropType = require('../../assets/hub/characterGalleryRoom.jpg');
export const CHARACTER_GALLERY_ROOM_SIZE = { width: 1024, height: 582 } as const;

/** 新手教程选板：两本教程书（原生像素尺寸，与主页昼夜同步） */
export const TUTORIAL_PICK_BOOKS_DAY_BG: ImageSourcePropType = require('../../assets/hub/tutorialPickBooksDay.jpg');
export const TUTORIAL_PICK_BOOKS_NIGHT_BG: ImageSourcePropType = require('../../assets/hub/tutorialPickBooksNight.jpg');
export const TUTORIAL_PICK_BOOKS_SIZE = { width: 1024, height: 576 } as const;

/** 新手教程图文讲解：摊开的书·昼/夜（与主页昼夜同步） */
export const TUTORIAL_GUIDE_ROOM_DAY_BG: ImageSourcePropType = require('../../assets/hub/tutorialGuideRoom.jpg');
export const TUTORIAL_GUIDE_ROOM_DAY_SIZE = { width: 1024, height: 587 } as const;
export const TUTORIAL_GUIDE_ROOM_NIGHT_BG: ImageSourcePropType = require('../../assets/hub/tutorialGuideRoomNight.jpg');
export const TUTORIAL_GUIDE_ROOM_NIGHT_SIZE = { width: 1024, height: 587 } as const;

/** @deprecated 使用 `TUTORIAL_GUIDE_ROOM_DAY_BG` */
export const TUTORIAL_GUIDE_ROOM_BG = TUTORIAL_GUIDE_ROOM_DAY_BG;
/** @deprecated 使用 `TUTORIAL_GUIDE_ROOM_DAY_SIZE` */
export const TUTORIAL_GUIDE_ROOM_SIZE = TUTORIAL_GUIDE_ROOM_DAY_SIZE;
