import type { Facing } from '../components/ExplorationSprite';
import type { ImageSourcePropType } from 'react-native';

/** Reference-image coordinates. Every layer and seat shares this same space. */
export const HALL = {
  width: 1024, height: 576,
  table: { left: 231, top: 186, width: 432, height: 302, depth: 375 },
  seatCenter: { x: 447, y: 358 },
  seatRadius: { x: 260, y: 150 },
} as const;

export type HallSeat = { id: number; x: number; y: number; facing: Facing; behindTable: boolean };
export type HallOccupant = {
  id: string; name: string; seatId: number; characterId?: string;
  avatarSource?: ImageSourcePropType; isAlive?: boolean; badge?: string;
  highlighted?: boolean; speaking?: boolean; speech?: string;
  stickerSource?: ImageSourcePropType; tally?: string;
};
export const INITIAL_HALL_OCCUPANTS: HallOccupant[] = [
  { id: 'toby', name: 'Toby', seatId: 11 },
  { id: 'momo', name: 'Momo', seatId: 1 },
];

/** Same centered `contain` geometry and horizontal pan as the original backdrop. */
export function getHallViewport(width: number, height: number, panX = 0) {
  const scale = Math.min(width / HALL.width, height / HALL.height);
  return {
    scale,
    left: (width - HALL.width * scale) / 2 + panX,
    top: (height - HALL.height * scale) / 2,
  };
}

export function getHallSeats(count: number): HallSeat[] {
  return Array.from({ length: count }, (_, i) => {
    const id = count === 6 ? i * 2 : i;
    const angle = -Math.PI / 2 + i * Math.PI * 2 / count;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const facing: Facing = Math.abs(dy) >= Math.abs(dx) * 0.8
      ? (dy < 0 ? 'down' : 'up') : (dx < 0 ? 'right' : 'left');
    const y = Math.round(HALL.seatCenter.y + HALL.seatRadius.y * dy);
    return { id, x: Math.round(HALL.seatCenter.x + HALL.seatRadius.x * dx), y, facing, behindTable: y <= HALL.table.depth };
  });
}

/** Swapping occupied seats keeps both characters visible and uniquely seated. */
export function moveHallOccupant(occupants: HallOccupant[], id: string, seatId: number): HallOccupant[] {
  const moving = occupants.find(actor => actor.id === id);
  if (!moving) return occupants;
  return occupants.map(actor => actor.id === id ? { ...actor, seatId }
    : actor.seatId === seatId ? { ...actor, seatId: moving.seatId } : actor);
}

/** Match order, rather than character ID, determines both the chair and its number. */
export function assignHallSeats<T extends { id: string; name: string }>(players: readonly T[]): (T & { seatId: number })[] {
  const seats = getHallSeats(players.length);
  return players.map((player, index) => ({ ...player, seatId: seats[index].id }));
}

export function fitHallOccupants(occupants: HallOccupant[], count: 6 | 12): HallOccupant[] {
  const seats = getHallSeats(count), taken = new Set<number>();
  return occupants.map(actor => {
    const preferred = seats.find(seat => seat.id === actor.seatId && !taken.has(seat.id));
    const seat = preferred ?? seats.find(candidate => !taken.has(candidate.id))!;
    taken.add(seat.id);
    return { ...actor, seatId: seat.id };
  });
}
