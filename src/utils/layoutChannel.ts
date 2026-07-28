/**
 * 局内圆环座位区：每个槽位尺寸（与背景立绘里的桌大致同心由 GameRoom 偏移与半径控制）。
 * 网页与原生共用同一套数值。
 */
export type RingSeatGeometry = {
  slotW: number;
  slotH: number;
};

export const NATIVE_RING_GEOMETRY: RingSeatGeometry = {
  /** 须容纳：顶栏 emoji + 较大头像圆框 + 昵称 + 刀标；过小会裁切名字（尤其 Web） */
  slotW: 72,
  slotH: 128,
};
