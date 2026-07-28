/**
 * Builds a JSON-serializable engine context for dialogue renderers (LLM = renderer only).
 * All fields originate from deterministic engines (thought / suspicion / memory / voting pressure).
 */
import type { AppLanguage } from '../i18n/appStrings';
import type { AIBehaviorProfile } from '../data/aiBehaviorProfiles';
import type { EmotionLabel } from './emotionEngine';
import type { InternalThoughtSnapshot } from './thoughtEngine';

export type DialogueSpeechChannel = 'discussion' | 'sheriff' | 'lastwords';

export type RichDialogueContext = {
  version: 1;
  lang: AppLanguage;
  channel: DialogueSpeechChannel;
  speechOrder: { index: number; total: number };
  /** Primary pressure / focus seat */
  primaryTarget: { id: string; name: string };
  /** Internal engines */
  thoughtEmotion: string;
  speechFacingEmotion: EmotionLabel;
  thoughtConfidence: number;
  dangerLevel: number;
  survivalPriority: number;
  allianceRisk: number;
  socialPressure: number;
  votePrediction: {
    /** Display name of simulated plurality leader (resolved by caller) */
    leadingTargetName: string | null;
    confidence: number;
    forwardNotes: readonly string[];
  };
  predictedAllies: readonly string[];
  manipulationAwareness: readonly string[];
  roleHeuristicByPlayerId: Record<string, 'unknown' | 'lean_town' | 'lean_wolf'>;
  /** Machine tags from thoughtEngine */
  internalReasonTags: readonly string[];
  /** Natural-language anchors (already name-bound) */
  concreteObservations: readonly string[];
  memoryAnchors: readonly string[];
  /** 0–100 from votingEngine.evaluateVotePressure */
  votePressure: number;
  priorSpeakerName: string | null;
  /** Renderer must not invent seats outside these */
  aliveNames: readonly string[];
  forbidGenericFiller: boolean;
  personalitySnapshot: Pick<
    AIBehaviorProfile,
    'aggression' | 'caution' | 'confidence' | 'logic' | 'deception' | 'emotionality' | 'leadership' | 'sociability'
  >;
};

export function buildRichDialogueContext(input: {
  lang: AppLanguage;
  channel: DialogueSpeechChannel;
  speechIndex: number;
  totalSpeakers: number;
  primaryTargetId: string;
  primaryTargetName: string;
  thought: InternalThoughtSnapshot;
  speechFacingEmotion: EmotionLabel;
  concreteObservations: readonly string[];
  memoryAnchors: readonly string[];
  votePressure: number;
  voteLeadingDisplayName: string | null;
  priorSpeakerName?: string | null;
  aliveNames: readonly string[];
  forbidGenericFiller: boolean;
  profile: AIBehaviorProfile;
}): RichDialogueContext {
  const t = input.thought;
  return {
    version: 1,
    lang: input.lang,
    channel: input.channel,
    speechOrder: { index: input.speechIndex, total: input.totalSpeakers },
    primaryTarget: { id: input.primaryTargetId, name: input.primaryTargetName },
    thoughtEmotion: t.emotion,
    speechFacingEmotion: input.speechFacingEmotion,
    thoughtConfidence: t.confidence,
    dangerLevel: t.dangerLevel,
    survivalPriority: t.survivalPriority,
    allianceRisk: t.allianceRisk,
    socialPressure: t.socialPressure,
    votePrediction: {
      leadingTargetName: input.voteLeadingDisplayName,
      confidence: t.votePrediction.confidence,
      forwardNotes: t.votePrediction.forwardNotes,
    },
    predictedAllies: t.predictedAllies,
    manipulationAwareness: t.manipulationAwareness,
    roleHeuristicByPlayerId: t.roleHeuristicByPlayerId,
    internalReasonTags: t.reasons,
    concreteObservations: input.concreteObservations,
    memoryAnchors: input.memoryAnchors,
    votePressure: input.votePressure,
    priorSpeakerName: input.priorSpeakerName ?? null,
    aliveNames: input.aliveNames,
    forbidGenericFiller: input.forbidGenericFiller,
    personalitySnapshot: {
      aggression: input.profile.aggression,
      caution: input.profile.caution,
      confidence: input.profile.confidence,
      logic: input.profile.logic,
      deception: input.profile.deception,
      emotionality: input.profile.emotionality,
      leadership: input.profile.leadership,
      sociability: input.profile.sociability,
    },
  };
}
