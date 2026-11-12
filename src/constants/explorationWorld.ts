export type WalkFacing = 'down' | 'left' | 'right' | 'up';
export type WalkPoint = { x: number; y: number };
export type WalkingActor = WalkPoint & { facing: WalkFacing; frame: number };
export const EXPLORATION_WORLD = { width: 960, height: 640 } as const;
export const WALK_FRAME = { width: 40, height: 48, footY: 44, count: 4 } as const;
const WALK_ROW: Record<WalkFacing, number> = { down: 0, left: 1, right: 2, up: 3 };
export function walkingCell(id: string, facing: WalkFacing, frame: number) {
  const column = Math.max(0, Math.min(3, Math.floor(frame)));
  // OldFox's last left-facing pose was drawn facing right. Reuse the matching
  // right-facing stride mirrored at render time, keeping the original pixels.
  const mirrored = id === '45' && facing === 'left' && column === 3;
  return { column, row: mirrored ? WALK_ROW.right : WALK_ROW[facing], mirrored };
}
export const WALK_VECTORS: Record<WalkFacing, WalkPoint> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};
export const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
export function clampWalkPoint(point: WalkPoint): WalkPoint {
  return { x: clamp(point.x, 28, EXPLORATION_WORLD.width - 28), y: clamp(point.y, 80, EXPLORATION_WORLD.height - 24) };
}
export function explorerHome(index: number): WalkPoint {
  return { x: 160 + (index % 8) * 88, y: 112 + Math.floor(index / 8) * 88 };
}
export function createExplorers(ids: readonly string[]): Record<string, WalkingActor> {
  return Object.fromEntries(ids.map((id, i) => [id, { ...explorerHome(i), facing: 'down', frame: 0 }]));
}
export function stepExplorer(actor: WalkingActor, goal: WalkPoint, distance: number, time: number): WalkingActor {
  const target = clampWalkPoint(goal), dx = target.x - actor.x, dy = target.y - actor.y;
  const remaining = Math.hypot(dx, dy);
  if (remaining < 0.01 || distance <= 0) return actor.frame === 0 ? actor : { ...actor, frame: 0 };
  const facing: WalkFacing = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up';
  const fraction = Math.min(distance / remaining, 1);
  return { x: actor.x + dx * fraction, y: actor.y + dy * fraction, facing, frame: fraction === 1 ? 0 : Math.floor(time / 140) % 4 };
}
export function explorationCamera(actor: WalkPoint, viewport: { width: number; height: number }, scale: number): WalkPoint {
  return {
    x: Math.round(clamp(actor.x * scale - viewport.width / 2, 0, Math.max(0, EXPLORATION_WORLD.width * scale - viewport.width))),
    y: Math.round(clamp((actor.y - 22) * scale - viewport.height / 2, 0, Math.max(0, EXPLORATION_WORLD.height * scale - viewport.height))),
  };
}
