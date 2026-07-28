/** 夜间各身份「睁眼」左下角立绘 + 对话框（像素风） */
export const GAME_ROOM_NIGHT_CUE_GUARD = require('../../assets/gameRoom/nightCue/guard.png');
export const GAME_ROOM_NIGHT_CUE_WOLVES = require('../../assets/gameRoom/nightCue/wolves.png');
export const GAME_ROOM_NIGHT_CUE_SEER = require('../../assets/gameRoom/nightCue/seer.png');
export const GAME_ROOM_NIGHT_CUE_WITCH = require('../../assets/gameRoom/nightCue/witch.png');

/** 参考图 1024×682：文案叠在底部羊皮对话框内 */
export const GAME_ROOM_NIGHT_CUE_ART_W = 1024;
export const GAME_ROOM_NIGHT_CUE_ART_H = 682;
export const GAME_ROOM_NIGHT_CUE_ART_ASPECT = GAME_ROOM_NIGHT_CUE_ART_W / GAME_ROOM_NIGHT_CUE_ART_H;

/** 对话框在立绘内的相对区域（%） */
export const GAME_ROOM_NIGHT_CUE_DIALOG_INSET = {
  left: '5%',
  right: '3%',
  top: '53%',
  bottom: '9%',
} as const;

/** 立绘显示宽度（px）— 屏宽 38% */
export const GAME_ROOM_NIGHT_CUE_WIDTH_MIN = 200;
export const GAME_ROOM_NIGHT_CUE_WIDTH_MAX = 560;
export const GAME_ROOM_NIGHT_CUE_WIDTH_SCREEN_RATIO = 0.38;
