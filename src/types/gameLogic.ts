export type GameBoard = 'Standard12' | 'WolfBeauty' | 'SeerWitch6';

export type GamePhase = 
  | 'INIT'                // 发牌
  | 'NIGHT_START'         // 入夜
  | 'WOLVES_ACTION'       // 狼人行动
  | 'WOLF_BEAUTY_ACTION'  // 狼美人魅惑（仅限狼美人局）
  | 'SEER_ACTION'         // 预言家验人
  | 'WITCH_ACTION'        // 女巫用药
  | 'DAY_ANNOUNCE'        // 宣布死讯
  | 'SHERIFF_ELECT'       // 警长竞选
  | 'DISCUSSION'          // 发言环节
  | 'VOTING'              // 投票环节
  | 'GAME_OVER';

export interface Player {
  id: string;
  name: string;
  avatarIcon: string;
  role: 'Werewolf' | 'WolfBeauty' | 'Seer' | 'Witch' | 'Hunter' | 'Knight' | 'Guard' | 'Idiot' | 'Villager';
  isAlive: boolean;
  isAI: boolean;
  isCharmed: boolean;     // 狼美人标记
  hasPoison: boolean;     // 女巫药水情况
  hasAntidote: boolean;
}

export interface GameState {
  board: GameBoard;
  phase: GamePhase;
  dayCount: number;
  players: Player[];
  logs: string[];
  lastNightDeaths: string[]; // 昨晚谁死了
}