import type { RoomPlayer } from './nightResolver';

/** 警长出局后：按圆桌 `seatOrder` 顺时针找下一名存活玩家继承警徽。 */
export function nextSheriffAfterDeath(
  deadSheriffId: string,
  alivePlayers: RoomPlayer[],
  seatOrder: string[]
): string | null {
  const aliveIds = new Set(alivePlayers.filter((p) => p.isAlive).map((p) => p.id));
  if (aliveIds.size === 0) return null;
  const start = seatOrder.indexOf(deadSheriffId);
  if (start < 0) {
    const first = alivePlayers.find((p) => p.isAlive);
    return first?.id ?? null;
  }
  for (let k = 1; k <= seatOrder.length; k += 1) {
    const id = seatOrder[(start + k) % seatOrder.length]!;
    if (aliveIds.has(id)) return id;
  }
  return null;
}
