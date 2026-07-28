export type AvalonFaction = 'good' | 'evil';

export type AvalonRoleId =
  | 'merlin'
  | 'percival'
  | 'loyal_servant'
  | 'assassin'
  | 'morgana'
  | 'mordred'
  | 'oberon';

export type AvalonPlayerId = string;
export type AvalonRng = () => number;

export type AvalonRoleDefinition = {
  id: AvalonRoleId;
  faction: AvalonFaction;
  name: string;
  nameZh: string;
  summaryZh: string;
  unique: boolean;
};

export type AvalonAssignment = {
  playerId: AvalonPlayerId;
  role: AvalonRoleId;
  faction: AvalonFaction;
};

export type AvalonDeal = {
  assignments: readonly AvalonAssignment[];
  roleByPlayerId: Readonly<Record<AvalonPlayerId, AvalonRoleId>>;
};

export type AvalonQuestNumber = 1 | 2 | 3 | 4 | 5;

export type AvalonQuestRule = {
  questNumber: AvalonQuestNumber;
  teamSize: number;
  failVotesRequired: number;
};

export type AvalonProposalVote = 'approve' | 'reject';
export type AvalonMissionVote = 'success' | 'fail';

export type AvalonProposalResolution = {
  approved: boolean;
  approveVotes: number;
  rejectVotes: number;
  rejectionTrackBefore: number;
  rejectionTrackAfter: number;
  evilWinsByFiveRejections: boolean;
};

export type AvalonQuestResolution = {
  questNumber: AvalonQuestNumber;
  succeeded: boolean;
  successVotes: number;
  failVotes: number;
  failVotesRequired: number;
};

export type AvalonKnowledgeSignalKind =
  | 'known_evil'
  | 'evil_teammate'
  | 'merlin_or_morgana';

/**
 * A signal deliberately describes only what the viewer learns during setup.
 * It never exposes a target's exact role.
 */
export type AvalonKnowledgeSignal = {
  playerId: AvalonPlayerId;
  kind: AvalonKnowledgeSignalKind;
};

export type AvalonPlayerKnowledge = {
  viewerId: AvalonPlayerId;
  viewerRole: AvalonRoleId;
  viewerFaction: AvalonFaction;
  signals: readonly AvalonKnowledgeSignal[];
  /** Includes the viewer when the viewer is evil. */
  certainEvilPlayerIds: readonly AvalonPlayerId[];
  /** Evil teammates visible to a non-Oberon evil player; excludes the viewer. */
  evilTeammateIds: readonly AvalonPlayerId[];
  /** The two indistinguishable setup targets shown to Percival. */
  merlinOrMorganaIds: readonly AvalonPlayerId[];
};

export type AvalonWinReason =
  | 'three_failed_quests'
  | 'five_rejected_teams'
  | 'merlin_assassinated'
  | 'merlin_survived';

export type AvalonOutcome = {
  winner: AvalonFaction | null;
  reason: AvalonWinReason | null;
  awaitingAssassination: boolean;
};

/** All AI style values are normalized to the inclusive 0..1 range. */
export type AvalonAiStyle = {
  caution?: number;
  deception?: number;
  aggression?: number;
  randomness?: number;
};

/** 0 means fully trusted and 1 means certainly evil. */
export type AvalonSuspicionMap = Readonly<Record<AvalonPlayerId, number>>;

/** 0 means impossible and 1 means the AI is certain this player is Merlin. */
export type AvalonMerlinLikelihoodMap = Readonly<Record<AvalonPlayerId, number>>;

