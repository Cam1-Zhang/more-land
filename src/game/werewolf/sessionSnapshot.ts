import type { NarratorLine } from '../info/narrator';
import type { PendingNightRecord } from '../state/pendingNight';
import type { WolfchaGameState } from '../types';
import type { ModelRef } from '../../types';
import type { AiSpeechBrainHub } from '../../utils/speechPrep';
import type { RoomPlayer, SeerCheckRecord, WitchNightState, WitchPoisonRecord } from '../../utils/nightResolver';
import type { NightSegmentId } from '../types';
import type { UiDayPhase } from '../state/runtimePhase';

export type WerewolfSessionSnapshot = {
  players: RoomPlayer[];
  tableSeatOrder: string[];
  phase: UiDayPhase;
  nightSeg: NightSegmentId | null;
  nightCount: number;
  dawnCount: number;
  backdropIsNight: boolean;
  narratorLines: NarratorLine[];
  logs: string[];
  wolfcha: WolfchaGameState;
  pendingNight: PendingNightRecord;
  witchState: WitchNightState;
  seerPrivate: Record<string, SeerCheckRecord[]>;
  guardLastTarget: { id: string; name: string } | null;
  wolfBeautyCharmMeta: { lastNight: number; lastTarget: string | null };
  witchPoisonHistory: WitchPoisonRecord[];
  sheriffId: string | null;
  sheriffElectionComplete: boolean;
  modelRefMap: Record<string, ModelRef>;
  aiBrainHub: AiSpeechBrainHub | null;
  roleCardDismissed: boolean;
  playerNotepad: string;
};

export function mapToRecord<V>(map: ReadonlyMap<string, V>): Record<string, V> {
  return Object.fromEntries(map.entries());
}

export function recordToMap<V>(record: Record<string, V>): Map<string, V> {
  return new Map(Object.entries(record));
}
