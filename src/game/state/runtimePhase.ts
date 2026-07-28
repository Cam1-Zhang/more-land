import type { NightSegmentId, WolfchaGamePhase } from '../types';

/** UI day-phase enum used by GameRoomScreen (React state). */
export type UiDayPhase =
  | 'PREPARING'
  | 'NIGHT'
  | 'SHERIFF_SIGNUP'
  | 'SHERIFF_SPEECH'
  | 'SHERIFF_VOTE'
  | 'DISCUSSION'
  | 'KNIGHT_DUEL'
  | 'VOTING'
  | 'ENDED';

/** Map night segment → wolfcha canonical phase id (for logging / future reducer). */
export function nightSegmentToWolfchaPhase(seg: NightSegmentId): WolfchaGamePhase {
  switch (seg) {
    case 'guard':
      return 'NIGHT_GUARD_ACTION';
    case 'wolves':
      return 'NIGHT_WOLF_ACTION';
    case 'wolf_beauty':
      return 'NIGHT_WOLF_BEAUTY_CHARM';
    case 'witch':
      return 'NIGHT_WITCH_ACTION';
    case 'seer':
      return 'NIGHT_SEER_ACTION';
    default:
      return 'NIGHT_WOLF_ACTION';
  }
}

export function uiPhaseToWolfchaPhase(phase: UiDayPhase): WolfchaGamePhase {
  switch (phase) {
    case 'PREPARING':
      return 'LOBBY';
    case 'NIGHT':
      return 'NIGHT_START';
    case 'SHERIFF_SIGNUP':
      return 'SHERIFF_SIGNUP';
    case 'SHERIFF_SPEECH':
      return 'SHERIFF_SPEECH';
    case 'SHERIFF_VOTE':
      return 'SHERIFF_VOTE';
    case 'DISCUSSION':
      return 'DAY_SPEECH';
    case 'KNIGHT_DUEL':
      return 'KNIGHT_DUEL';
    case 'VOTING':
      return 'DAY_VOTE';
    case 'ENDED':
      return 'GAME_END';
    default:
      return 'LOBBY';
  }
}
