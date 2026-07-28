/** 圆桌头像：轻微朝向环心、上下略缩放（不做复杂侧面） */

export type SeatFacingStyle = { rotateDeg: number; scale: number };

export function seatFacingTowardTable(
  pos: { left: number; top: number },
  ringW: number,
  ringH: number,
  slotW: number,
  slotH: number,
  /** 与桌面/座位共用纵向偏移（环心略低于舞台几何中心） */
  centerOffsetY: number = 0
): SeatFacingStyle {
  const cx = ringW / 2;
  const cy = ringH / 2 + centerOffsetY;
  const mx = pos.left + slotW / 2;
  const my = pos.top + slotH / 2;
  const vx = cx - mx;
  const vy = cy - my;
  const ax = Math.abs(vx);
  const ay = Math.abs(vy);
  if (ay >= ax * 1.12) {
    if (vy < 0) return { rotateDeg: 0, scale: 0.9 };
    return { rotateDeg: 0, scale: 1 };
  }
  if (vx > 6) return { rotateDeg: -9, scale: 1 };
  if (vx < -6) return { rotateDeg: 9, scale: 1 };
  return { rotateDeg: 0, scale: 1 };
}
