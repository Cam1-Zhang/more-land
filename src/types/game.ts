export type WerewolfGameBoard = 'Standard12' | 'WolfBeauty' | 'SeerWitch6';
export type GameBoard = WerewolfGameBoard | 'Avalon10';

export interface GameConfig {
  board: GameBoard;
  aiDifficulty?: 'Novice' | 'Easy' | 'Medium' | 'Hard';
  playerRole: string;
  selectedAIIds: string[];
  /** 教学链路上的练习局：首夜有人出局时弹出遗言规则说明 */
  fromTutorial?: boolean;
}
