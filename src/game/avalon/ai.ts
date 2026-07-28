import { getAvalonQuestRule, isEvilAvalonRole } from './rules';
import type {
  AvalonAiStyle,
  AvalonMerlinLikelihoodMap,
  AvalonMissionVote,
  AvalonPlayerId,
  AvalonPlayerKnowledge,
  AvalonProposalVote,
  AvalonQuestNumber,
  AvalonRng,
  AvalonSuspicionMap,
} from './types';

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const DEFAULT_STYLE = {
  caution: 0.55,
  deception: 0.55,
  aggression: 0.5,
  randomness: 0.15,
};

type ResolvedStyle = typeof DEFAULT_STYLE;

function resolveStyle(style: AvalonAiStyle | undefined): ResolvedStyle {
  return {
    caution: clamp01(style?.caution ?? DEFAULT_STYLE.caution),
    deception: clamp01(style?.deception ?? DEFAULT_STYLE.deception),
    aggression: clamp01(style?.aggression ?? DEFAULT_STYLE.aggression),
    randomness: clamp01(style?.randomness ?? DEFAULT_STYLE.randomness),
  };
}

function belief(map: AvalonSuspicionMap | undefined, playerId: AvalonPlayerId): number {
  return clamp01(map?.[playerId] ?? 0.5);
}

function randomJitter(rng: AvalonRng, amount: number): number {
  const value = rng();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new Error('Avalon RNG must return a finite number in the range [0, 1).');
  }
  return (value - 0.5) * amount;
}

function uniqueIds(playerIds: readonly AvalonPlayerId[], label: string): AvalonPlayerId[] {
  const result = [...new Set(playerIds)];
  if (result.length !== playerIds.length) throw new Error(`${label} cannot contain duplicate player ids.`);
  return result;
}

function includesKnownEvil(
  knowledge: AvalonPlayerKnowledge,
  teamIds: readonly AvalonPlayerId[]
): boolean {
  return teamIds.some(
    (id) => id !== knowledge.viewerId && knowledge.certainEvilPlayerIds.includes(id)
  );
}

export type SelectAvalonTeamInput = {
  questNumber: AvalonQuestNumber;
  candidateIds: readonly AvalonPlayerId[];
  knowledge: AvalonPlayerKnowledge;
  suspicionByPlayerId?: AvalonSuspicionMap;
  style?: AvalonAiStyle;
  rng?: AvalonRng;
};

export type SelectAvalonTeamDecision = {
  teamIds: readonly AvalonPlayerId[];
  scoreByPlayerId: Readonly<Record<AvalonPlayerId, number>>;
};

/**
 * Picks a legal team from the actor's private knowledge and public suspicion only.
 * Evil leaders seed enough visible evil players to meet the quest's fail threshold
 * where possible, then fill remaining slots with trusted-looking cover.
 */
export function selectAvalonTeam(input: SelectAvalonTeamInput): SelectAvalonTeamDecision {
  const rule = getAvalonQuestRule(input.questNumber);
  const candidates = uniqueIds(input.candidateIds, 'Avalon team candidates');
  if (candidates.length < rule.teamSize) throw new Error('Not enough candidates for this quest team.');
  if (!candidates.includes(input.knowledge.viewerId)) {
    throw new Error('Avalon team candidates must include the acting leader.');
  }

  const style = resolveStyle(input.style);
  const rng = input.rng ?? Math.random;
  const evilActor = input.knowledge.viewerFaction === 'evil';
  const visibleEvil = new Set(input.knowledge.certainEvilPlayerIds);
  const scoreByPlayerId: Record<AvalonPlayerId, number> = {};

  for (const playerId of candidates) {
    const suspicion = belief(input.suspicionByPlayerId, playerId);
    const knownEvil = visibleEvil.has(playerId);
    let score: number;

    if (!evilActor) {
      score = 1 - suspicion;
      if (knownEvil) score -= 10;
      if (input.knowledge.merlinOrMorganaIds.includes(playerId)) score -= 0.12;
      if (playerId === input.knowledge.viewerId) score += 0.22;
    } else {
      // Low-suspicion players make convincing cover; visible evil players are
      // ranked separately below for the required sabotage seats.
      score = (1 - suspicion) * (0.7 + style.deception * 0.3);
      if (knownEvil) score += 0.25 + style.aggression * 0.2;
      if (playerId === input.knowledge.viewerId) score += 0.08;
    }
    score += randomJitter(rng, style.randomness * 0.25);
    scoreByPlayerId[playerId] = score;
  }

  const byScore = (left: AvalonPlayerId, right: AvalonPlayerId): number =>
    scoreByPlayerId[right]! - scoreByPlayerId[left]! || left.localeCompare(right);
  const selected: AvalonPlayerId[] = [];

  if (evilActor) {
    const sabotageCandidates = candidates.filter((id) => visibleEvil.has(id)).sort(byScore);
    const sabotageSeats = Math.min(rule.failVotesRequired, sabotageCandidates.length);
    selected.push(...sabotageCandidates.slice(0, sabotageSeats));
  }

  const remaining = candidates.filter((id) => !selected.includes(id)).sort(byScore);
  selected.push(...remaining.slice(0, rule.teamSize - selected.length));
  return { teamIds: selected, scoreByPlayerId };
}

export type DecideAvalonProposalVoteInput = {
  questNumber: AvalonQuestNumber;
  teamIds: readonly AvalonPlayerId[];
  knowledge: AvalonPlayerKnowledge;
  rejectionTrack: number;
  suspicionByPlayerId?: AvalonSuspicionMap;
  style?: AvalonAiStyle;
  rng?: AvalonRng;
};

export type AvalonProposalVoteReason =
  | 'prevent_five_rejections'
  | 'trigger_five_rejections'
  | 'known_evil_on_team'
  | 'enough_visible_saboteurs'
  | 'team_looks_trustworthy'
  | 'team_looks_risky'
  | 'self_included'
  | 'maintain_cover';

export type DecideAvalonProposalVoteDecision = {
  vote: AvalonProposalVote;
  approvalScore: number;
  reasons: readonly AvalonProposalVoteReason[];
};

export function decideAvalonProposalVote(
  input: DecideAvalonProposalVoteInput
): DecideAvalonProposalVoteDecision {
  const rule = getAvalonQuestRule(input.questNumber);
  const teamIds = uniqueIds(input.teamIds, 'Avalon proposal team');
  if (teamIds.length !== rule.teamSize) {
    throw new Error(`Quest ${input.questNumber} proposal must contain ${rule.teamSize} players.`);
  }
  if (!Number.isInteger(input.rejectionTrack) || input.rejectionTrack < 0 || input.rejectionTrack > 4) {
    throw new Error('Avalon rejection track must be an integer from 0 through 4.');
  }

  const evilActor = input.knowledge.viewerFaction === 'evil';
  if (input.rejectionTrack === 4) {
    return evilActor
      ? { vote: 'reject', approvalScore: -10, reasons: ['trigger_five_rejections'] }
      : { vote: 'approve', approvalScore: 10, reasons: ['prevent_five_rejections'] };
  }

  const style = resolveStyle(input.style);
  const rng = input.rng ?? Math.random;
  const averageSuspicion = teamIds.reduce(
    (total, playerId) => total + belief(input.suspicionByPlayerId, playerId),
    0
  ) / teamIds.length;
  const selfIncluded = teamIds.includes(input.knowledge.viewerId);
  const reasons: AvalonProposalVoteReason[] = [];
  let approvalScore = 0;

  if (evilActor) {
    const visibleSaboteurs = teamIds.filter((id) =>
      input.knowledge.certainEvilPlayerIds.includes(id)
    ).length;
    if (visibleSaboteurs >= rule.failVotesRequired) {
      approvalScore += 1.15;
      reasons.push('enough_visible_saboteurs');
    } else {
      approvalScore -= 0.65 + style.aggression * 0.25;
      if (style.deception > 0.65) {
        approvalScore += 0.35;
        reasons.push('maintain_cover');
      }
    }
  } else if (includesKnownEvil(input.knowledge, teamIds)) {
    approvalScore -= 2;
    reasons.push('known_evil_on_team');
  }

  const riskTolerance = 0.58 - style.caution * 0.18;
  approvalScore += (riskTolerance - averageSuspicion) * 1.25;
  if (averageSuspicion <= riskTolerance) reasons.push('team_looks_trustworthy');
  else reasons.push('team_looks_risky');
  if (selfIncluded) {
    approvalScore += 0.18;
    reasons.push('self_included');
  }
  approvalScore += randomJitter(rng, style.randomness * 0.4);

  return {
    vote: approvalScore >= 0 ? 'approve' : 'reject',
    approvalScore,
    reasons,
  };
}

/** On the 5th team pick (rejectionTrack 4), good must approve and evil must reject. */
export function resolveAvalonSeatProposalVote(
  rejectionTrack: number,
  knowledge: AvalonPlayerKnowledge,
  modelVote: AvalonProposalVote | null,
  fallbackVote: AvalonProposalVote
): AvalonProposalVote {
  if (rejectionTrack === 4) {
    return knowledge.viewerFaction === 'evil' ? 'reject' : 'approve';
  }
  return modelVote ?? fallbackVote;
}

export type DecideAvalonMissionVoteInput = {
  questNumber: AvalonQuestNumber;
  teamIds: readonly AvalonPlayerId[];
  knowledge: AvalonPlayerKnowledge;
  goodQuestWins?: number;
  evilQuestWins?: number;
  style?: AvalonAiStyle;
  rng?: AvalonRng;
};

export type AvalonMissionVoteReason =
  | 'good_must_succeed'
  | 'designated_saboteur'
  | 'avoid_extra_fail_card'
  | 'two_fail_quest_needs_help'
  | 'hide_evil_identity'
  | 'must_stop_good_match_point';

export type DecideAvalonMissionVoteDecision = {
  vote: AvalonMissionVote;
  reasons: readonly AvalonMissionVoteReason[];
};

export function decideAvalonMissionVote(
  input: DecideAvalonMissionVoteInput
): DecideAvalonMissionVoteDecision {
  const rule = getAvalonQuestRule(input.questNumber);
  const teamIds = uniqueIds(input.teamIds, 'Avalon mission team');
  if (teamIds.length !== rule.teamSize) {
    throw new Error(`Quest ${input.questNumber} team must contain ${rule.teamSize} players.`);
  }
  const actorId = input.knowledge.viewerId;
  if (!teamIds.includes(actorId)) throw new Error('Only a player on the quest team can cast a mission vote.');
  if (!isEvilAvalonRole(input.knowledge.viewerRole)) {
    return { vote: 'success', reasons: ['good_must_succeed'] };
  }

  const style = resolveStyle(input.style);
  const rng = input.rng ?? Math.random;
  const visibleSaboteurs = teamIds.filter((id) =>
    input.knowledge.certainEvilPlayerIds.includes(id)
  );
  const actorIndex = visibleSaboteurs.indexOf(actorId);
  const designated = actorIndex >= 0 && actorIndex < rule.failVotesRequired;
  const urgent = (input.goodQuestWins ?? 0) >= 2;

  if (!designated) {
    return { vote: 'success', reasons: ['avoid_extra_fail_card'] };
  }
  if (urgent) {
    return { vote: 'fail', reasons: ['must_stop_good_match_point'] };
  }

  const concealChance =
    input.questNumber <= 2
      ? style.deception * 0.28 * (1 - style.aggression)
      : style.deception * 0.08 * (1 - style.aggression);
  if (rng() < concealChance) {
    return { vote: 'success', reasons: ['hide_evil_identity'] };
  }
  return {
    vote: 'fail',
    reasons: [
      'designated_saboteur',
      ...(rule.failVotesRequired === 2 ? (['two_fail_quest_needs_help'] as const) : []),
    ],
  };
}

export type ChooseAvalonAssassinationInput = {
  candidateIds: readonly AvalonPlayerId[];
  knowledge: AvalonPlayerKnowledge;
  merlinLikelihoodByPlayerId?: AvalonMerlinLikelihoodMap;
  suspicionByPlayerId?: AvalonSuspicionMap;
  style?: AvalonAiStyle;
  rng?: AvalonRng;
};

export type ChooseAvalonAssassinationDecision = {
  targetId: AvalonPlayerId;
  scoreByPlayerId: Readonly<Record<AvalonPlayerId, number>>;
};

/**
 * Chooses an assassination target without consulting ground-truth roles. Known
 * evil teammates are removed, while hidden Oberon remains a possible mistake.
 */
export function chooseAvalonAssassinationTarget(
  input: ChooseAvalonAssassinationInput
): ChooseAvalonAssassinationDecision {
  if (input.knowledge.viewerRole !== 'assassin') {
    throw new Error('Only the Assassin can choose the Avalon assassination target.');
  }
  const candidates = uniqueIds(input.candidateIds, 'Avalon assassination candidates').filter(
    (id) =>
      id !== input.knowledge.viewerId &&
      !input.knowledge.evilTeammateIds.includes(id)
  );
  if (candidates.length === 0) throw new Error('No legal assassination candidates are available.');

  const style = resolveStyle(input.style);
  const rng = input.rng ?? Math.random;
  const scoreByPlayerId: Record<AvalonPlayerId, number> = {};
  for (const playerId of candidates) {
    const explicitLikelihood = clamp01(input.merlinLikelihoodByPlayerId?.[playerId] ?? 0.5);
    // Merlin often appears informed while avoiding direct accusation. Lower
    // evil suspicion acts only as a weak tie-breaker, never as hidden truth.
    const trustedAppearance = 1 - belief(input.suspicionByPlayerId, playerId);
    scoreByPlayerId[playerId] =
      explicitLikelihood * 0.82 +
      trustedAppearance * 0.18 +
      randomJitter(rng, style.randomness * 0.25);
  }
  candidates.sort(
    (left, right) =>
      scoreByPlayerId[right]! - scoreByPlayerId[left]! || left.localeCompare(right)
  );
  return { targetId: candidates[0]!, scoreByPlayerId };
}

