import { CHARACTERS } from '../../data/mockData';
import type { ModelRef } from '../../types';
import type {
  AvalonFaction,
  AvalonProposalResolution,
  AvalonProposalVote,
  AvalonQuestNumber,
  AvalonQuestResolution,
  AvalonRoleId,
} from './types';

export type PersistedAvalonSeat = {
  id: string;
  name: string;
  role: AvalonRoleId;
  faction: AvalonFaction;
  isHuman: boolean;
  roleArtVariant?: number;
  characterId?: string;
};

export type AvalonEventRecordSnapshot =
  | {
      id: string;
      kind: 'team';
      questNumber: AvalonQuestNumber;
      attempt: number;
      approved: boolean;
      approveVotes: number;
      rejectVotes: number;
      leaderName: string;
      teamNames: string;
      votes?: {
        playerName: string;
        vote: AvalonProposalVote;
        autoApprove?: boolean;
      }[];
    }
  | {
      id: string;
      kind: 'mission';
      questNumber: AvalonQuestNumber;
      succeeded: boolean;
      failVotes: number;
      teamNames: string;
      byFiveRejections?: boolean;
    };

export type AvalonSessionSnapshot = {
  restartKey: number;
  lang: 'zh' | 'en';
  humanAvatarIndex: number;
  seats: PersistedAvalonSeat[];
  leaderIndex: number;
  phase: string;
  nightStep: number;
  matchStarted: boolean;
  roleConfirmed: boolean;
  roleVisible: boolean;
  discussionIndex: number;
  discussionPurpose: string;
  evilDiscussionIndex: number;
  evilDiscussionSecondsLeft: number;
  questNumber: AvalonQuestNumber;
  questResults: AvalonQuestResolution[];
  rejectionTrack: number;
  teamIds: string[];
  proposalVotes: Record<string, AvalonProposalVote> | null;
  proposalResolution: AvalonProposalResolution | null;
  missionResolution: AvalonQuestResolution | null;
  suspicion: Record<string, number>;
  assassinationTargetId: string | null;
  endState: {
    winner: AvalonFaction;
    reason: string;
    assassinationTargetId?: string;
  } | null;
  endVisible: boolean;
  logs: { text: string; isSystem: boolean }[];
  eventRecords: AvalonEventRecordSnapshot[];
  playerNotepad: string;
  panelTab: 'chat' | 'notepad' | 'events';
  modelRefMap: Record<string, ModelRef>;
};

export function serializeAvalonSeats(
  seats: ReadonlyArray<{
    id: string;
    name: string;
    role: AvalonRoleId;
    faction: AvalonFaction;
    isHuman: boolean;
    roleArtVariant?: number;
    character?: { id: string };
  }>
): PersistedAvalonSeat[] {
  return seats.map((seat) => ({
    id: seat.id,
    name: seat.name,
    role: seat.role,
    faction: seat.faction,
    isHuman: seat.isHuman,
    roleArtVariant: seat.roleArtVariant,
    characterId: seat.character?.id,
  }));
}

export function hydrateAvalonSeats(seats: readonly PersistedAvalonSeat[]) {
  return seats.map((seat) => ({
    id: seat.id,
    name: seat.name,
    role: seat.role,
    faction: seat.faction,
    isHuman: seat.isHuman,
    roleArtVariant: seat.roleArtVariant,
    character: seat.characterId
      ? CHARACTERS.find((entry) => entry.id === seat.characterId)
      : undefined,
  }));
}
