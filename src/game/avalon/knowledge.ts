import type {
  AvalonAssignment,
  AvalonKnowledgeSignal,
  AvalonPlayerId,
  AvalonPlayerKnowledge,
} from './types';

function getViewer(
  assignments: readonly AvalonAssignment[],
  viewerId: AvalonPlayerId
): AvalonAssignment {
  const viewer = assignments.find((assignment) => assignment.playerId === viewerId);
  if (!viewer) throw new Error(`Unknown Avalon player: ${viewerId}`);
  return viewer;
}

/**
 * Returns only information legally shown to one player during Avalon setup:
 * - Merlin sees Assassin, Morgana, and Oberon as evil, but not Mordred.
 * - Percival sees Merlin and Morgana without knowing which is which.
 * - Assassin, Morgana, and Mordred see one another, but nobody sees Oberon.
 * - Oberon and Loyal Servants receive no target information.
 */
export function getAvalonPlayerKnowledge(
  assignments: readonly AvalonAssignment[],
  viewerId: AvalonPlayerId
): AvalonPlayerKnowledge {
  const viewer = getViewer(assignments, viewerId);
  let signals: AvalonKnowledgeSignal[] = [];

  if (viewer.role === 'merlin') {
    signals = assignments
      .filter(
        (target) =>
          target.faction === 'evil' &&
          target.role !== 'mordred'
      )
      .map((target) => ({ playerId: target.playerId, kind: 'known_evil' as const }));
  } else if (viewer.role === 'percival') {
    signals = assignments
      .filter((target) => target.role === 'merlin' || target.role === 'morgana')
      .map((target) => ({ playerId: target.playerId, kind: 'merlin_or_morgana' as const }));
  } else if (viewer.faction === 'evil' && viewer.role !== 'oberon') {
    signals = assignments
      .filter(
        (target) =>
          target.playerId !== viewer.playerId &&
          target.faction === 'evil' &&
          target.role !== 'oberon'
      )
      .map((target) => ({ playerId: target.playerId, kind: 'evil_teammate' as const }));
  }

  const evilTeammateIds = signals
    .filter((signal) => signal.kind === 'evil_teammate')
    .map((signal) => signal.playerId);
  const certainEvilPlayerIds = [
    ...(viewer.faction === 'evil' ? [viewer.playerId] : []),
    ...signals
      .filter((signal) => signal.kind === 'known_evil' || signal.kind === 'evil_teammate')
      .map((signal) => signal.playerId),
  ];
  const merlinOrMorganaIds = signals
    .filter((signal) => signal.kind === 'merlin_or_morgana')
    .map((signal) => signal.playerId);

  return {
    viewerId,
    viewerRole: viewer.role,
    viewerFaction: viewer.faction,
    signals,
    certainEvilPlayerIds,
    evilTeammateIds,
    merlinOrMorganaIds,
  };
}

export function getAvalonKnowledgeSignal(
  knowledge: AvalonPlayerKnowledge,
  targetId: AvalonPlayerId
): AvalonKnowledgeSignal['kind'] | null {
  return knowledge.signals.find((signal) => signal.playerId === targetId)?.kind ?? null;
}

