import type { AppLanguage } from '../../i18n/appStrings';
import { gameCopy } from '../../i18n/appStrings';
import { resolveKnightDuel } from '../../utils/knightDuel';
import type { RoomPlayer } from '../../utils/nightResolver';
import { applyWolfBeautyMartyr } from '../../utils/wolfBeautyMartyr';

export type KnightDuelResolveInput = {
  players: readonly RoomPlayer[];
  knightId: string;
  targetId: string;
  lang: AppLanguage;
};

export type KnightDuelResolveOutput = {
  players: RoomPlayer[];
  logs: string[];
  lastWordDead: RoomPlayer[];
  targetDied: boolean;
  knightDied: boolean;
  targetId: string;
  targetRole: string | undefined;
};

/** Pure knight duel resolve + wolf-beauty martyr (Resolve step; no async UI). */
export function applyKnightDuelResolution(input: KnightDuelResolveInput): KnightDuelResolveOutput {
  const { players, knightId, targetId, lang } = input;
  const t = gameCopy[lang];
  const knight = players.find((p) => p.id === knightId);
  const target = players.find((p) => p.id === targetId);
  const targetName = target?.name ?? targetId;
  const targetRole = target?.role;

  const outcome = resolveKnightDuel(players, knightId, targetId);
  let next = outcome.players;
  const logs: string[] = [];
  const lastWordDead: RoomPlayer[] = [];
  let martyrDead: RoomPlayer | null = null;

  if (outcome.targetDied) {
    logs.push(t.knightDuelTargetWolf(knight?.name ?? knightId, targetName));
    if (targetRole === 'WolfBeauty') {
      const martyr = applyWolfBeautyMartyr(next, targetId);
      next = martyr.players;
      martyrDead = martyr.martyr;
      if (martyr.martyr) logs.push(t.wolfBeautyMartyr(martyr.martyr.name));
    }
    const dead = next.find((p) => p.id === targetId && !p.isAlive);
    if (dead) lastWordDead.push(dead);
    if (martyrDead) lastWordDead.push(martyrDead);
  } else if (outcome.knightDied) {
    logs.push(t.knightDuelKnightFalls(knight?.name ?? knightId, targetName));
    const deadKnight = next.find((p) => p.id === knightId && !p.isAlive);
    if (deadKnight) lastWordDead.push(deadKnight);
  }

  return {
    players: next,
    logs,
    lastWordDead,
    targetDied: outcome.targetDied,
    knightDied: outcome.knightDied,
    targetId,
    targetRole,
  };
}
