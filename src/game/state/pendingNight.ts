import type { NightActionsRecord } from '../types';
import { nightActionsFromPending } from '../types';

/** Runtime night-action buffer (GameRoom pendingNightRef). Synced to wolfcha `nightActions`. */
export type PendingNightRecord = {
  guardTargetId: string | null;
  wolfKillTargetId: string | null;
  wolfBeautyCharmTargetId: string | null;
  witchUsesAntidote: boolean;
  witchPoisonTargetId: string | null;
  seerInspectTargetId: string | null;
};

export function createEmptyPendingNight(): PendingNightRecord {
  return {
    guardTargetId: null,
    wolfKillTargetId: null,
    wolfBeautyCharmTargetId: null,
    witchUsesAntidote: false,
    witchPoisonTargetId: null,
    seerInspectTargetId: null,
  };
}

export function pendingToNightActions(pending: PendingNightRecord): NightActionsRecord {
  return nightActionsFromPending(pending);
}
