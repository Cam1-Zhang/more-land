/**
 * Wolfcha-aligned game state shapes.
 * Rules & transitions live under src/game/; GameRoomScreen = UI + I/O adapter.
 */

export type WolfchaGamePhase =
  | 'LOBBY'
  | 'NIGHT_START'
  | 'NIGHT_GUARD_ACTION'
  | 'NIGHT_WOLF_ACTION'
  | 'NIGHT_WOLF_BEAUTY_CHARM'
  | 'NIGHT_WITCH_ACTION'
  | 'NIGHT_SEER_ACTION'
  | 'NIGHT_RESOLVE'
  | 'DAY_START'
  | 'DAY_SPEECH'
  | 'KNIGHT_DUEL'
  | 'DAY_VOTE'
  | 'DAY_RESOLVE'
  | 'SHERIFF_SIGNUP'
  | 'SHERIFF_SPEECH'
  | 'SHERIFF_VOTE'
  | 'HUNTER_SHOOT'
  | 'IDIOT_REVEAL'
  | 'GAME_END';

export type NightSegmentId = 'guard' | 'wolves' | 'wolf_beauty' | 'witch' | 'seer';

export type PhaseActionType = 'night_action' | 'special' | 'speech' | 'vote';

export type NightActionsRecord = {
  guardTarget: string | null;
  wolfTarget: string | null;
  wolfBeautyTarget: string | null;
  witchSave: boolean;
  witchPoison: string | null;
  seerTarget: string | null;
};

export type RoleAbilitiesRecord = {
  witchHealUsed: boolean;
  witchPoisonUsed: boolean;
  hunterCanShoot: boolean;
  knightUsed: boolean;
  wolfBeautyLastTarget: string | null;
  guardLastTarget: string | null;
  idiotRevealed: boolean;
  idiotCanVote: boolean;
};

export type VoteHistoryKind = 'day_exile' | 'sheriff';

/** 结构化票型记录，供 AI prompt 引用（不依赖发言推断）。 */
export type VoteHistoryEntry = {
  kind: VoteHistoryKind;
  /** 第几天（与 nightCountRef / 白天序号一致） */
  day: number;
  voterId: string;
  targetId: string;
};

export type WolfchaGameState = {
  phase: WolfchaGamePhase;
  day: number;
  players: readonly unknown[];
  votes: Record<string, string>;
  voteHistory: readonly VoteHistoryEntry[];
  events: readonly unknown[];
  messages: readonly string[];
  nightActions: NightActionsRecord;
  roleAbilities: Record<string, RoleAbilitiesRecord>;
  winner: 'good' | 'wolf' | null;
};

export function createInitialWolfchaGameState(): WolfchaGameState {
  return {
    phase: 'LOBBY',
    day: 1,
    players: [],
    votes: {},
    voteHistory: [],
    events: [],
    messages: [],
    nightActions: {
      guardTarget: null,
      wolfTarget: null,
      wolfBeautyTarget: null,
      witchSave: false,
      witchPoison: null,
      seerTarget: null,
    },
    roleAbilities: {},
    winner: null,
  };
}

/** Map GameRoom `pendingNightRef` shape ↔ wolfcha `nightActions`. */
export function nightActionsFromPending(p: {
  guardTargetId?: string | null;
  wolfKillTargetId: string | null;
  wolfBeautyCharmTargetId?: string | null;
  witchUsesAntidote: boolean;
  witchPoisonTargetId: string | null;
  seerInspectTargetId: string | null;
}): NightActionsRecord {
  return {
    guardTarget: p.guardTargetId ?? null,
    wolfTarget: p.wolfKillTargetId,
    wolfBeautyTarget: p.wolfBeautyCharmTargetId ?? null,
    witchSave: p.witchUsesAntidote,
    witchPoison: p.witchPoisonTargetId,
    seerTarget: p.seerInspectTargetId,
  };
}

export function pendingFromNightActions(n: NightActionsRecord): {
  guardTargetId: string | null;
  wolfKillTargetId: string | null;
  wolfBeautyCharmTargetId: string | null;
  witchUsesAntidote: boolean;
  witchPoisonTargetId: string | null;
  seerInspectTargetId: string | null;
} {
  return {
    guardTargetId: n.guardTarget,
    wolfKillTargetId: n.wolfTarget,
    wolfBeautyCharmTargetId: n.wolfBeautyTarget,
    witchUsesAntidote: n.witchSave,
    witchPoisonTargetId: n.witchPoison,
    seerInspectTargetId: n.seerTarget,
  };
}
