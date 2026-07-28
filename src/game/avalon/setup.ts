import { AVALON_10_PLAYER_ROLE_DECK, AVALON_PLAYER_COUNT } from './constants';
import type {
  AvalonAssignment,
  AvalonDeal,
  AvalonPlayerId,
  AvalonRng,
  AvalonRoleId,
} from './types';
import { getFactionForRole } from './rules';

function nextRandom(rng: AvalonRng): number {
  const value = rng();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new Error('Avalon RNG must return a finite number in the range [0, 1).');
  }
  return value;
}

export function shuffleAvalon<T>(values: readonly T[], rng: AvalonRng = Math.random): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(nextRandom(rng) * (index + 1));
    [result[index], result[other]] = [result[other]!, result[index]!];
  }
  return result;
}

/** A compact deterministic PRNG for simulations, replays, and tests. */
export function createAvalonSeededRng(seed: number | string): AvalonRng {
  const text = String(seed);
  let state = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    state ^= text.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  state >>>= 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function assertAvalonPlayerIds(playerIds: readonly AvalonPlayerId[]): void {
  if (playerIds.length !== AVALON_PLAYER_COUNT) {
    throw new Error(`10-player Avalon requires exactly ${AVALON_PLAYER_COUNT} players.`);
  }
  if (new Set(playerIds).size !== playerIds.length) {
    throw new Error('Avalon player ids must be unique.');
  }
  if (playerIds.some((id) => id.length === 0)) {
    throw new Error('Avalon player ids cannot be empty.');
  }
}

export function dealAvalonRoles(
  playerIds: readonly AvalonPlayerId[],
  rng: AvalonRng = Math.random
): AvalonDeal {
  assertAvalonPlayerIds(playerIds);
  const roles = shuffleAvalon(AVALON_10_PLAYER_ROLE_DECK, rng);
  const assignments: AvalonAssignment[] = playerIds.map((playerId, index) => {
    const role = roles[index] as AvalonRoleId;
    return { playerId, role, faction: getFactionForRole(role) };
  });
  const roleByPlayerId: Record<AvalonPlayerId, AvalonRoleId> = {};
  for (const assignment of assignments) {
    roleByPlayerId[assignment.playerId] = assignment.role;
  }
  return { assignments, roleByPlayerId };
}

