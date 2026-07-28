import type { GameBoard } from '../types/game';

/** Full role deck per board (length = player count at the table). */
export const ROLES_POOL_BY_BOARD: Record<GameBoard, readonly string[]> = {
  Standard12: [
    'Werewolf',
    'Werewolf',
    'Werewolf',
    'Werewolf',
    'Seer',
    'Witch',
    'Hunter',
    'Idiot',
    'Villager',
    'Villager',
    'Villager',
    'Villager',
  ],
  WolfBeauty: [
    'Werewolf',
    'Werewolf',
    'Werewolf',
    'WolfBeauty',
    'Seer',
    'Witch',
    'Guard',
    'Knight',
    'Villager',
    'Villager',
    'Villager',
    'Villager',
  ],
  /** 6-player 预女局：2 狼 + 预 + 女 + 2 民 */
  SeerWitch6: ['Werewolf', 'Werewolf', 'Seer', 'Witch', 'Villager', 'Villager'],
  /** 10-player Avalon: 6 loyal players versus 4 minions of Mordred. */
  Avalon10: [
    'Merlin',
    'Percival',
    'LoyalServant',
    'LoyalServant',
    'LoyalServant',
    'LoyalServant',
    'Assassin',
    'Morgana',
    'Mordred',
    'Oberon',
  ],
};

/** Random human role: one pick per kind on this board. */
export const ROLE_KIND_ORDER_BY_BOARD: Record<GameBoard, readonly string[]> = {
  Standard12: ['Werewolf', 'Seer', 'Witch', 'Hunter', 'Idiot', 'Villager'],
  WolfBeauty: ['Werewolf', 'WolfBeauty', 'Seer', 'Witch', 'Guard', 'Knight', 'Villager'],
  SeerWitch6: ['Werewolf', 'Seer', 'Witch', 'Villager'],
  Avalon10: ['Merlin', 'Percival', 'LoyalServant', 'Assassin', 'Morgana', 'Mordred', 'Oberon'],
};

export function isGameBoard(v: unknown): v is GameBoard {
  return v === 'Standard12' || v === 'WolfBeauty' || v === 'SeerWitch6' || v === 'Avalon10';
}

export function parseGameBoard(v: unknown): GameBoard {
  return isGameBoard(v) ? v : 'Standard12';
}

export function playerCountForBoard(board: GameBoard): number {
  return ROLES_POOL_BY_BOARD[board].length;
}

/** How many AI opponents the human must pick (1 human + N AI). */
export function aiOpponentCountForBoard(board: GameBoard): number {
  return playerCountForBoard(board) - 1;
}

/** 白天放逐为暗票（不公开谁投给谁）；仅 debug 可开 dayExileVotesPublic。 */
export function boardUsesSecretDayBallot(_board: GameBoard): boolean {
  return true;
}
