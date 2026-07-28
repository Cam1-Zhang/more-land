import type { RoomPlayer } from './nightResolver';

function isWolfTeam(role: string): boolean {
  return role === 'Werewolf' || role === 'WolfBeauty';
}

/** 好人胜利：狼人全部出局。狼人胜利：存活狼数 ≥ 存活好人数（wolfcha 数量优势）。 */
export function evaluateGameEnd(players: RoomPlayer[]): 'good' | 'wolf' | null {
  const alive = players.filter((p) => p.isAlive);
  const wolves = alive.filter((p) => isWolfTeam(p.role)).length;
  const good = alive.filter((p) => !isWolfTeam(p.role)).length;
  if (wolves === 0) return 'good';
  if (wolves >= good) return 'wolf';
  return null;
}
