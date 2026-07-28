import type { GameBoard } from './game';

export type DifficultyType = 'Novice' | 'Easy' | 'Medium' | 'Hard';

/**
 * Per-character LLM model reference — mirrors wolfcha's ModelRef pattern.
 * Each AI player is assigned one ModelRef at game start and all their LLM calls use it.
 */
export interface ModelRef {
  /** Model identifier passed to the API, e.g. "deepseek-chat" or "deepseek-reasoner" */
  model: string;
  /** Optional override temperature for this model */
  temperature?: number;
  /** Optional provider tag for future multi-provider support */
  provider?: 'deepseek' | 'openai' | 'qwen' | 'ollama' | 'siliconflow' | 'dashscope';
}

export interface AICharacter {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Non-binary';
  constellation: string;
  personality: string;
  difficulty: DifficultyType;
  avatarIcon: string;
  description: string;
}

export type RootStackParamList = {
  Home: undefined;
  Settings: undefined;
  Tutorial: undefined;
  CharacterSelect: {
    presetBoard?: GameBoard;
    lockBoard?: boolean;
    /** 教学结束进入选人：仅展示新手难度 AI */
    lockToNoviceDifficulty?: boolean;
    fromTutorial?: boolean;
    /** 创建房间流程：房主已在上一页锁定的难度 */
    lockedDifficulty?: DifficultyType;
    /** 创建房间流程：板型已在上一页选定 */
    lockBoardWithPreset?: GameBoard;
    fromCreateRoom?: boolean;
    /** 房主从组队页带入的 6 位房间号（展示用） */
    createRoomCode?: string;
    /** 仅浏览人设，不进入对局 */
    galleryOnly?: boolean;
    joinRoomCode?: string;
    fromJoinRoom?: boolean;
  };
  TeamLobby: undefined;
  GameRoom: {
    config: {
      board: string;
      playerRole: string;
      selectedAIIds: string[];
      /** 每次点击开局递增，避免复用同一局路由参数时不重新洗牌 */
      matchNonce?: number;
      fromTutorial?: boolean;
      /** 单人/练习：可跳过「夜间非本人行动」的倒计时；本人狼刀/神职操作回合不可跳过 */
      allowSkipAiWait?: boolean;
      /**
       * When false: daytime exile votes are secret to the table — AI speech brains must not
       * ingest per-voter ballots (still resolves exile in UI). Default false (secret ballot).
       */
      dayExileVotesPublic?: boolean;
    };
  };
  AvalonGameRoom: {
    config: {
      board: 'Avalon10';
      playerRole: string;
      selectedAIIds: string[];
      matchNonce?: number;
      fromTutorial?: false;
      aiDifficulty?: DifficultyType;
      allowSkipAiWait?: boolean;
      dayExileVotesPublic?: boolean;
    };
  };
};
