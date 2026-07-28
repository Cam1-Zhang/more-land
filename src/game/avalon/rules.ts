import {
  AVALON_10_PLAYER_QUESTS,
  AVALON_MAX_REJECTED_TEAMS,
  AVALON_PLAYER_COUNT,
  AVALON_QUESTS_TO_WIN,
  AVALON_ROLE_DEFINITIONS,
} from './constants';
import type {
  AvalonAssignment,
  AvalonFaction,
  AvalonMissionVote,
  AvalonOutcome,
  AvalonPlayerId,
  AvalonProposalResolution,
  AvalonProposalVote,
  AvalonQuestNumber,
  AvalonQuestResolution,
  AvalonQuestRule,
  AvalonRoleDefinition,
  AvalonRoleId,
} from './types';

export function getAvalonRoleDefinition(role: AvalonRoleId): AvalonRoleDefinition {
  return AVALON_ROLE_DEFINITIONS[role];
}

export function getFactionForRole(role: AvalonRoleId): AvalonFaction {
  return AVALON_ROLE_DEFINITIONS[role].faction;
}

export function isGoodAvalonRole(role: AvalonRoleId): boolean {
  return getFactionForRole(role) === 'good';
}

export function isEvilAvalonRole(role: AvalonRoleId): boolean {
  return getFactionForRole(role) === 'evil';
}

export function getAvalonQuestRule(questNumber: AvalonQuestNumber): AvalonQuestRule {
  const rule = AVALON_10_PLAYER_QUESTS[questNumber - 1];
  if (!rule) throw new Error(`Invalid Avalon quest number: ${questNumber}`);
  return rule;
}

export function getAvalonAssignmentsByFaction(
  assignments: readonly AvalonAssignment[],
  faction: AvalonFaction
): AvalonAssignment[] {
  return assignments.filter((assignment) => assignment.faction === faction);
}

export function canCastAvalonMissionVote(
  role: AvalonRoleId,
  vote: AvalonMissionVote
): boolean {
  return vote === 'success' || isEvilAvalonRole(role);
}

/** Leader auto-approves their own team; other players vote. Ties reject. */
export function resolveAvalonProposalVotes(
  votesByPlayerId: Readonly<Record<string, AvalonProposalVote>>,
  participantIds: readonly AvalonPlayerId[],
  leaderId: AvalonPlayerId,
  rejectionTrackBefore = 0
): AvalonProposalResolution {
  if (participantIds.length !== AVALON_PLAYER_COUNT) {
    throw new Error(`A proposal vote requires exactly ${AVALON_PLAYER_COUNT} players.`);
  }
  if (!participantIds.includes(leaderId)) {
    throw new Error('Proposal leader must be one of the table players.');
  }
  if (!Number.isInteger(rejectionTrackBefore) || rejectionTrackBefore < 0 || rejectionTrackBefore >= 5) {
    throw new Error('Proposal rejection track must be an integer from 0 through 4.');
  }
  let approveVotes = 1;
  let rejectVotes = 0;
  for (const playerId of participantIds) {
    if (playerId === leaderId) continue;
    const vote = votesByPlayerId[playerId];
    if (vote !== 'approve' && vote !== 'reject') {
      throw new Error(`Missing proposal vote for player ${playerId}.`);
    }
    if (vote === 'approve') approveVotes += 1;
    else rejectVotes += 1;
  }
  const approved = approveVotes > rejectVotes;
  const rejectionTrackAfter = approved ? 0 : rejectionTrackBefore + 1;
  return {
    approved,
    approveVotes,
    rejectVotes,
    rejectionTrackBefore,
    rejectionTrackAfter,
    evilWinsByFiveRejections:
      !approved && rejectionTrackAfter >= AVALON_MAX_REJECTED_TEAMS,
  };
}

export function resolveAvalonMissionVotes(
  questNumber: AvalonQuestNumber,
  votes: readonly AvalonMissionVote[]
): AvalonQuestResolution {
  const rule = getAvalonQuestRule(questNumber);
  if (votes.length !== rule.teamSize) {
    throw new Error(
      `Quest ${questNumber} requires exactly ${rule.teamSize} mission ballots.`
    );
  }
  const failVotes = votes.filter((vote) => vote === 'fail').length;
  const successVotes = votes.length - failVotes;
  return {
    questNumber,
    succeeded: failVotes < rule.failVotesRequired,
    successVotes,
    failVotes,
    failVotesRequired: rule.failVotesRequired,
  };
}

export function isMerlinAssassinated(
  assignments: readonly AvalonAssignment[],
  targetId: AvalonPlayerId
): boolean {
  return assignments.find((assignment) => assignment.playerId === targetId)?.role === 'merlin';
}

export type EvaluateAvalonOutcomeInput = {
  questResults: readonly Pick<AvalonQuestResolution, 'succeeded'>[];
  rejectionTrack?: number;
  assassinationTargetId?: AvalonPlayerId | null;
  assignments?: readonly AvalonAssignment[];
};

/** Evaluates the complete win order, including the post-three-success assassination. */
export function evaluateAvalonOutcome(input: EvaluateAvalonOutcomeInput): AvalonOutcome {
  if ((input.rejectionTrack ?? 0) >= AVALON_MAX_REJECTED_TEAMS) {
    return { winner: 'evil', reason: 'five_rejected_teams', awaitingAssassination: false };
  }

  const failed = input.questResults.filter((result) => !result.succeeded).length;
  if (failed >= AVALON_QUESTS_TO_WIN) {
    return { winner: 'evil', reason: 'three_failed_quests', awaitingAssassination: false };
  }

  const succeeded = input.questResults.filter((result) => result.succeeded).length;
  if (succeeded < AVALON_QUESTS_TO_WIN) {
    return { winner: null, reason: null, awaitingAssassination: false };
  }

  if (input.assassinationTargetId == null) {
    return { winner: null, reason: null, awaitingAssassination: true };
  }
  if (!input.assignments) {
    throw new Error('Assignments are required to resolve Merlin assassination.');
  }
  const hitMerlin = isMerlinAssassinated(input.assignments, input.assassinationTargetId);
  return hitMerlin
    ? { winner: 'evil', reason: 'merlin_assassinated', awaitingAssassination: false }
    : { winner: 'good', reason: 'merlin_survived', awaitingAssassination: false };
}

