/**
 * Orchestrates thoughtEngine + suspicion + memory + emotion + voting pressure
 * into speech-ready structured context (LLM is renderer-only).
 */
import type { AppLanguage } from '../i18n/appStrings';
import type { AICharacter } from '../types';
import type { AIBehaviorProfile } from '../data/aiBehaviorProfiles';
import { getAIBehaviorProfile } from '../data/aiBehaviorProfiles';
import {
  createEmptySuspicionState,
  updateSuspicionFromEvent,
  applySuspicionChange,
  buildSuspicionContext,
} from './suspicionEngine';
import {
  createEmptyMemoryStore,
  rememberEvent,
  retrieveRelevantMemories,
  mergeSuspicionWithMemory,
  getMemoryInfluenceOnBehavior,
  stripDaytimeExileBallotVoteEvents,
  ingestPublicSpeechMemories,
  type MemoryStore,
} from './memoryEngine';
import { buildStrategicIntent, type StrategicIntent } from './strategicIntent';
import { createInitialEmotionState, updateEmotionState, getSpeechFacingEmotion, type EmotionState } from './emotionEngine';
import type { SuspicionState } from './suspicionEngine';
import { generateThoughts, type InternalThoughtSnapshot, type ThoughtEngineContext } from './thoughtEngine';
import { evaluateVotePressure, type VotingEngineContext } from './votingEngine';
import { buildRichDialogueContext, type RichDialogueContext, type DialogueSpeechChannel } from './dialogueContextBuilder';
import {
  formatDynamicObservationLines,
  type DynamicReasonFormatInput,
} from './dynamicReasonFormatter';
import {
  buildPlayerSafeDialoguePack,
  sanitizeLineList,
  type PlayerSafeDialoguePack,
} from './reasoningHumanizer';
import { buildEmotionalSpeechContext, type EmotionalSpeechContext } from './emotionalSpeechLayer';
import {
  buildConversationalStylePrompt,
  classifyConversationPersona,
} from './conversationalHumanizer';
import { buildDiscussionFocusSnapshot } from './focusTracker';
import type { AttentionState } from './attentionEngine';
import {
  createEmptyAttentionState,
  tickAttentionState,
  persistSpeechTargetInAttention,
  reinforceAttentionTunnel,
} from './attentionEngine';
import {
  buildDiscussionPriorityPlan,
  resolveSpeechAttentionPick,
  buildAttentionPromptAppend,
} from './discussionPrioritySystem';
import {
  buildWolfHiddenTruthScores,
  buildWolfPublicStanceScores,
  buildWolfDeceptionPromptBlock,
  isWolfDeceptionRole,
} from './wolfDeceptionState';
import { wolfTableActingCeiling } from './personaDifficultyPriority';
import { deriveUncertaintyKnobs, buildUncertaintyPromptBlock } from './uncertaintyCommitment';
import { scrubHiddenDaytimeBallotLine, scrubHiddenDaytimeBallotLines } from './hiddenDayVoteSpeechGuard';
import { lineDirectlyAccusesTarget } from './speechAccusation';

export type AiSpeechSeatBrain = {
  suspicion: SuspicionState;
  emotion: EmotionState;
  thoughtTick: number;
  attention: AttentionState;
  /** Last resolved primary read (thoughtEngine targetId) for pivot resistance. */
  lastThoughtPrimaryId: string | null;
  /** Consecutive thought ticks with the same primary read (commitment inertia). */
  consecutivePrimaryThoughtTicks: number;
  /** All wolf-role seat ids this game (including self); null if not a wolf AI. */
  wolfPackMemberIds: readonly string[] | null;
  /** Elena (id 27): soft "room pace" lines injected at most a few times per match. */
  softRoomNudgesUsed: number;
};

export type AiSpeechBrainHub = {
  sharedMemory: MemoryStore;
  byAiId: Record<string, AiSpeechSeatBrain>;
  lastExileBallot: Record<string, string> | null;
  exilePhaseIndex: number;
  /** Mirrors night/day counter from game screen for memory rounds */
  dayRoundApprox: number;
  /**
   * When false, per-voter daytime exile maps must not be written to `lastExileBallot` / shared vote memory.
   * Wolf night knife coordination uses separate night flows, not this flag.
   */
  dayExileVotesPublic: boolean;
};

export type PreparedAiSpeechDialogue = {
  thought: InternalThoughtSnapshot;
  richContext: RichDialogueContext;
  concreteObservations: string[];
  memoryAnchors: string[];
  /** Player-safe pack for LLM (no engine vocabulary). */
  playerSafeDialogue: PlayerSafeDialoguePack;
  speechFacingEmotion: ReturnType<typeof getSpeechFacingEmotion>;
  forbidGenericFiller: boolean;
  /** Prompt block: messy human mic, not analyst. */
  conversationalStylePrompt: string;
  emotionalSpeechContext: EmotionalSpeechContext;
  personalityLabel: string;
  behaviorProfile: AIBehaviorProfile;
  /** Same as hub: whether per-voter daytime exile is table-public for this match. */
  dayExileVotesPublic: boolean;
  /** Werewolf-only: prompt appendix for difficulty-scaled table acting. */
  wolfDeceptionPromptBlock?: string;
  /** 1–3 cap used with local speech / prompts for wolves. */
  wolfTableActingCeiling?: number;
  /** Prompt appendix: soften certainty / delay commitment (high deception & weak info). */
  uncertaintyPromptBlock?: string;
  /**
   * Compact factual signal labels for the LLM JSON.
   * These are SHORT identifiers like "Toby: 高票压目标" rather than template sentences.
   * The LLM must generate its own speech FROM these signals — it cannot copy them verbatim
   * because they are labels, not speakable sentences.
   */
  llmSignalLines: string[];
  /** One-line speech direction for this turn (LLM must not copy verbatim). */
  strategicIntent?: StrategicIntent;
};

function cloneSuspicionBaseline(allIds: readonly string[]): SuspicionState {
  return createEmptySuspicionState(allIds);
}

export function createAiSpeechBrainHub(
  players: { id: string; isAI: boolean }[],
  opts?: { dayExileVotesPublic?: boolean }
): AiSpeechBrainHub | null {
  if (players.length === 0) return null;
  const ids = players.map((p) => p.id);
  const hub: AiSpeechBrainHub = {
    sharedMemory: createEmptyMemoryStore(),
    byAiId: {},
    lastExileBallot: null,
    exilePhaseIndex: 0,
    dayRoundApprox: 1,
    dayExileVotesPublic: opts?.dayExileVotesPublic === true,
  };
  for (const p of players) {
    if (!p.isAI) continue;
    hub.byAiId[p.id] = {
      suspicion: cloneSuspicionBaseline(ids),
      emotion: createInitialEmotionState(),
      thoughtTick: 0,
      attention: createEmptyAttentionState(),
      lastThoughtPrimaryId: null,
      consecutivePrimaryThoughtTicks: 0,
      wolfPackMemberIds: null,
      softRoomNudgesUsed: 0,
    };
  }
  return hub;
}

/** Call once per match after roles are assigned so wolf AIs know the pack (hidden truth only). */
export function bindWolfPackKnowledge(
  hub: AiSpeechBrainHub,
  players: readonly { id: string; role: string; isAI: boolean }[]
): void {
  const wolfIds = players
    .filter((p) => p.role === 'Werewolf' || p.role === 'WolfBeauty')
    .map((p) => p.id);
  for (const p of players) {
    if (!p.isAI) continue;
    const b = hub.byAiId[p.id];
    if (!b) continue;
    b.wolfPackMemberIds = p.role === 'Werewolf' || p.role === 'WolfBeauty' ? wolfIds : null;
  }
}

export function syncBrainDayRound(hub: AiSpeechBrainHub, dayApprox: number): void {
  hub.dayRoundApprox = Math.max(1, dayApprox);
}

/**
 * After an exile ballot resolves: update per-AI suspicion (observer-lens), shared memory, flip detection.
 */
export function applyPublicExileBallotToBrains(
  hub: AiSpeechBrainHub,
  votes: ReadonlyMap<string, string>,
  alivePlayers: readonly { id: string; isAI: boolean }[],
  charactersById: ReadonlyMap<string, AICharacter>
): void {
  if (!hub.dayExileVotesPublic) return;
  const ids = alivePlayers.map((p) => p.id);
  const voteObj = Object.fromEntries(votes);
  const phase = hub.exilePhaseIndex + 1;
  const tally = new Map<string, number>();
  for (const tid of votes.values()) {
    tally.set(tid, (tally.get(tid) ?? 0) + 1);
  }
  const maxVotes = Math.max(0, ...tally.values());
  const majorityShare = votes.size > 0 ? maxVotes / votes.size : 0;

  for (const p of alivePlayers) {
    if (!p.isAI) continue;
    const char = charactersById.get(p.id);
    if (!char) continue;
    const brain = hub.byAiId[p.id];
    if (!brain) continue;
    const ctx = buildSuspicionContext(p.id, char, ids);
    let s = brain.suspicion;

    s = updateSuspicionFromEvent(
      s,
      { type: 'vote_phase_ballot', subjectId: p.id, voteByVoter: voteObj, phaseIndex: phase },
      ctx
    );

    for (const [tid, c] of tally) {
      const bump = clampRound(5 + c * 5 + majorityShare * 10);
      s = applySuspicionChange(s, tid, bump, ctx.profile, { eventType: 'random_voting' });
    }

    if (hub.lastExileBallot) {
      for (const [voterId, tid] of votes) {
        const prev = hub.lastExileBallot[voterId];
        if (prev && prev !== tid) {
          s = updateSuspicionFromEvent(s, { type: 'vote_changed', subjectId: voterId, magnitude: 1 }, ctx);
        }
      }
    }

    brain.suspicion = s;
  }

  for (const [voterId, tid] of votes) {
    const prev = hub.lastExileBallot?.[voterId];
    const tags = ['exile_ballot'];
    if (prev && prev !== tid) tags.push('vote_changed');
    hub.sharedMemory = rememberEvent(hub.sharedMemory, {
      round: hub.dayRoundApprox,
      phaseIndex: phase,
      kind: 'vote',
      subjectId: voterId,
      targetId: tid,
      intensity: clampRound(36 + (tally.get(tid) ?? 1) * 4),
      tags,
    });
  }

  hub.lastExileBallot = voteObj;
  hub.exilePhaseIndex = phase;
}

/**
 * Secret daytime exile ballot: advance phase counter only — no per-voter ballot on the hub,
 * no vote-shaped shared memories, no suspicion events derived from hidden `votes` map.
 */
export function applySecretExileBallotToBrains(hub: AiSpeechBrainHub): void {
  if (hub.dayExileVotesPublic) return;
  hub.exilePhaseIndex += 1;
  hub.lastExileBallot = null;
  hub.sharedMemory = stripDaytimeExileBallotVoteEvents(hub.sharedMemory);
  for (const brain of Object.values(hub.byAiId)) {
    brain.suspicion = {
      ...brain.suspicion,
      coVoteSameTarget: {},
      accusationFlipCount: {},
      blindFollowCount: {},
    };
  }
}

function clampRound(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function formatMemoryAnchors(
  store: MemoryStore,
  targetId: string,
  idToName: (id: string) => string,
  lang: AppLanguage,
  currentRound: number,
  maxRoundsBack = 4,
  includePerVoterVoteMemories = true
): string[] {
  const ev = retrieveRelevantMemories(store, {
    playerId: targetId,
    currentRound,
    maxRoundsBack,
    limit: 6,
  });
  const out: string[] = [];
  for (const e of ev) {
    const sub = idToName(e.subjectId);
    const tg = e.targetId ? idToName(e.targetId) : '';
    if (e.kind === 'vote' && tg) {
      if (!includePerVoterVoteMemories) continue;
      out.push(
        lang === 'zh'
          ? `我记得${sub}上一轮票型指向过${tg}。`
          : `I still have ${sub} voting toward ${tg} on record.`
      );
    } else if (e.kind === 'accusation' && tg) {
      out.push(
        lang === 'zh'
          ? `记录里${sub}咬过${tg}一口，我想看这条线有没有后续。`
          : `Logs have ${sub} pressing ${tg}—I want the follow-up.`
      );
    } else if (e.kind === 'alliance_hint' && tg) {
      out.push(
        lang === 'zh'
          ? `${sub}和${tg}有过“站同一边”的痕迹，我记着。`
          : `${sub} and ${tg} hinted the same camp once—I am tracking it.`
      );
    }
    if (out.length >= 3) break;
  }
  return out;
}

export function shouldAllowGenericFiller(input: {
  thought: InternalThoughtSnapshot;
  profile: AIBehaviorProfile;
  speechIndex: number;
  priorSpeechLines: number;
  channel: DialogueSpeechChannel;
}): boolean {
  const passive =
    input.profile.caution >= 82 &&
    input.profile.aggression < 32 &&
    input.profile.sociability < 40;
  const lowConfidence = input.thought.confidence < 24;
  const weakSignals = input.thought.reasons.includes('insufficient_structural_signals');
  const thinTable = input.priorSpeechLines < 2 && input.speechIndex === 0 && input.channel === 'discussion';
  return (lowConfidence && weakSignals) || passive || thinTable;
}

export function mapEmotionToDialogueString(e: ReturnType<typeof getSpeechFacingEmotion>): string {
  switch (e) {
    case 'nervous':
      return 'nervous';
    case 'angry':
      return 'angry';
    case 'scared':
      return 'scared';
    case 'confident':
      return 'confident';
    case 'desperate':
      return 'scared';
    case 'suspicious':
      return 'suspicious';
    default:
      return 'calm';
  }
}

export function prepareAiSpeechDialogue(input: {
  hub: AiSpeechBrainHub | null;
  observerCharacter: AICharacter;
  observerId: string;
  alivePlayers: readonly { id: string; name: string }[];
  lang: AppLanguage;
  channel: DialogueSpeechChannel;
  speechIndex: number;
  totalSpeakers: number;
  gameNonce: string;
  priorSpeakerName?: string | null;
  priorSpeechLines: number;
  accusedThisRound: boolean;
  /** Optional: narrator hint that a same-side ally was recently eliminated (expression layer only). */
  allyEliminatedRecently?: boolean;
  /** Recent public log lines (newest last) — room focus / multi-thread attention. */
  recentLogLines?: readonly string[];
  /** Hidden role for wolf truth vs public stance split (GameRoom passes this). */
  observerRole: string;
}): PreparedAiSpeechDialogue | null {
  if (!input.hub) return null;
  const brain = input.hub.byAiId[input.observerId];
  if (!brain) return null;
  if (typeof brain.softRoomNudgesUsed !== 'number' || Number.isNaN(brain.softRoomNudgesUsed)) {
    brain.softRoomNudgesUsed = 0;
  }

  if (input.recentLogLines && input.recentLogLines.length > 0) {
    input.hub.sharedMemory = ingestPublicSpeechMemories(input.hub.sharedMemory, {
      logLines: input.recentLogLines,
      alivePlayers: input.alivePlayers,
      lang: input.lang,
      round: input.hub.dayRoundApprox,
      phaseIndex: input.hub.exilePhaseIndex,
    });
  }

  const profile = getAIBehaviorProfile(input.observerCharacter);
  const ids = input.alivePlayers.map((p) => p.id);
  const idToName = (id: string) => input.alivePlayers.find((p) => p.id === id)?.name ?? id;

  brain.thoughtTick += 1;
  const daytimeExileBallotDetailPublic = input.hub.dayExileVotesPublic === true;
  const thoughtCtx: ThoughtEngineContext = {
    observerId: input.observerId,
    observerCharacter: input.observerCharacter,
    alivePlayers: input.alivePlayers.map((p) => ({ id: p.id, name: p.name })),
    suspicionState: brain.suspicion,
    thoughtTick: brain.thoughtTick,
    dayExileVotesPublic: daytimeExileBallotDetailPublic,
    lastVoteByVoter: daytimeExileBallotDetailPublic ? input.hub.lastExileBallot ?? undefined : undefined,
  };

  const memInf = getMemoryInfluenceOnBehavior(
    input.hub.sharedMemory,
    input.observerId,
    profile,
    input.observerCharacter.difficulty,
    ids.filter((x) => x !== input.observerId),
    { daytimeExileBallotDetailPublic }
  );
  const mergedScores = mergeSuspicionWithMemory(brain.suspicion.scores, memInf.suspicionDeltaByPlayerId);
  let suspicionForThought: SuspicionState = { ...brain.suspicion, scores: mergedScores };

  let wolfDeceptionPromptBlock: string | undefined;
  let wolfTableActingCeilingNum: number | undefined;
  if (isWolfDeceptionRole(input.observerRole) && brain.wolfPackMemberIds && brain.wolfPackMemberIds.length > 0) {
    const truthScores = buildWolfHiddenTruthScores(
      mergedScores,
      input.observerId,
      brain.wolfPackMemberIds,
      ids
    );
    const tickSeed = brain.thoughtTick + hashSeed([input.gameNonce, input.observerId, 'wpub']);
    const publicScores = buildWolfPublicStanceScores({
      truthScores,
      difficulty: input.observerCharacter.difficulty,
      profile,
      observerId: input.observerId,
      packMemberIds: brain.wolfPackMemberIds,
      aliveIds: ids,
      lastExileBallot: input.hub.lastExileBallot,
      tickSeed,
    });
    suspicionForThought = { ...brain.suspicion, scores: publicScores };
    wolfTableActingCeilingNum = wolfTableActingCeiling(input.observerCharacter.difficulty);
    wolfDeceptionPromptBlock = buildWolfDeceptionPromptBlock(
      input.lang,
      input.observerCharacter.difficulty,
      wolfTableActingCeilingNum,
      input.observerCharacter.personality,
      profile
    );
  }

  const memHorizon = profile.caution >= 78 ? 8 : profile.caution >= 66 ? 6 : 4;

  const thoughtCtxMerged: ThoughtEngineContext = {
    ...thoughtCtx,
    suspicionState: suspicionForThought,
    dayExileVotesPublic: daytimeExileBallotDetailPublic,
    priorThoughtPrimaryId: brain.lastThoughtPrimaryId,
    readCommitmentTicks: brain.consecutivePrimaryThoughtTicks,
  };
  const thought = generateThoughts(thoughtCtxMerged);

  const tid = thought.targetId;
  if (brain.lastThoughtPrimaryId === tid) {
    brain.consecutivePrimaryThoughtTicks = Math.min(220, brain.consecutivePrimaryThoughtTicks + 1);
  } else {
    brain.consecutivePrimaryThoughtTicks = 1;
  }
  brain.lastThoughtPrimaryId = tid;

  if (!brain.attention) brain.attention = createEmptyAttentionState();
  const focusSnapshot = buildDiscussionFocusSnapshot(
    input.recentLogLines ?? [],
    input.alivePlayers.map((p) => p.name),
    input.lang
  );
  const nameToId = (display: string) => input.alivePlayers.find((p) => p.name === display)?.id;
  const personaKind = classifyConversationPersona(input.observerCharacter.personality, profile);
  const varietySeedPre = hashSeed([
    input.gameNonce,
    input.observerId,
    String(input.speechIndex),
    String(brain.thoughtTick),
  ]);
  brain.attention = tickAttentionState({
    state: brain.attention,
    observerId: input.observerId,
    suspicion: suspicionForThought,
    thought,
    focus: focusSnapshot,
    aliveIds: ids,
    idToName,
    nameToId,
    thoughtTick: brain.thoughtTick,
    profile,
    personaKind,
    seed: varietySeedPre,
    daytimeExileBallotDetailPublic,
  });
  const speechDayNumber = Math.max(1, input.hub.dayRoundApprox ?? 1);
  const priorityPlan = buildDiscussionPriorityPlan({
    lang: input.lang,
    profile,
    personaKind,
    focus: focusSnapshot,
    thought,
    attention: brain.attention,
    priorSpeakerName: input.priorSpeakerName ?? null,
    speechIndex: input.speechIndex,
    channel: input.channel,
    seed: varietySeedPre + 17,
    dayNumber: speechDayNumber,
  });
  const speechPick = resolveSpeechAttentionPick({
    thought,
    suspicion: suspicionForThought,
    attention: brain.attention,
    plan: priorityPlan,
    personaKind,
    profile,
    observerId: input.observerId,
    priorSpeakerName: input.priorSpeakerName ?? null,
    idToName,
    nameToId,
    channel: input.channel,
    lang: input.lang,
    seed: varietySeedPre + 29,
    daytimeExileBallotDetailPublic,
    dayNumber: speechDayNumber,
  });
  brain.attention = persistSpeechTargetInAttention(brain.attention, speechPick.speechTargetId, brain.thoughtTick);
  if (speechPick.plan.primaryThread === 'tunnel' && hashSeed([input.observerId, String(varietySeedPre), 'tnl']) % 100 < 58) {
    brain.attention = reinforceAttentionTunnel(brain.attention, speechPick.speechTargetId);
  }

  const voteCtx: VotingEngineContext = {
    observerId: input.observerId,
    observerCharacter: input.observerCharacter,
    alivePlayers: thoughtCtxMerged.alivePlayers,
    suspicionState: suspicionForThought,
    thoughtTick: brain.thoughtTick,
    phaseIndex: input.hub.exilePhaseIndex,
    currentBallot: undefined,
    lastPhaseVoteByVoter: daytimeExileBallotDetailPublic ? input.hub.lastExileBallot ?? undefined : undefined,
  };
  const votePressureRaw = evaluateVotePressure(voteCtx);
  // Dampen vote pressure on early game days — suspicion scores exist but no real ballot
  // history yet, so "high pressure" language would feel wrong to players.
  const dayDamp = input.hub.dayRoundApprox <= 1 ? 0.45 : input.hub.dayRoundApprox <= 2 ? 0.72 : 1;
  const votePressure = Math.round(votePressureRaw * dayDamp);

  const otherIds = ids.filter((x) => x !== input.observerId);
  const suspVals = otherIds.map((id) => mergedScores[id] ?? 0).sort((a, b) => b - a);
  const spreadTopTwo = suspVals.length >= 2 ? suspVals[0]! - suspVals[1]! : suspVals[0] ?? 0;

  const uncertaintyKnobs = deriveUncertaintyKnobs({
    profile,
    difficulty: input.observerCharacter.difficulty,
    dayRoundApprox: input.hub.dayRoundApprox,
    votePressure,
    thoughtConfidence: thought.confidence,
    spreadTopTwo,
    isWolf: isWolfDeceptionRole(input.observerRole),
  });
  const certaintyDamp =
    (uncertaintyKnobs.certaintyMasking / 100) * (0.2 + profile.deception / 480) + (profile.deception >= 72 ? 0.06 : 0);
  const speechThought: InternalThoughtSnapshot = {
    ...thought,
    confidence: Math.max(14, Math.min(92, Math.round(thought.confidence * (1 - certaintyDamp)))),
  };

  const uncertaintyPromptBlock =
    profile.deception >= 56
      ? buildUncertaintyPromptBlock(input.lang, uncertaintyKnobs, input.observerCharacter.personality) ?? undefined
      : undefined;

  const survivalOdds = clampRound(100 - thought.dangerLevel - thought.survivalPriority * 0.25);
  const targeting = clampRound((brain.suspicion.scores[input.observerId] ?? 0) * 0.65 + thought.socialPressure * 0.35);

  brain.emotion = updateEmotionState(brain.emotion, {
    accusedThisRound: input.accusedThisRound,
    survivalOdds,
    alliesDeadCount: 0,
    aliveAllyCount: 3,
    pressure: Math.max(votePressure, thought.socialPressure),
    isolation: clampRound(100 - profile.sociability),
    voteTargeting: targeting,
    profile,
  });
  const speechFacing = getSpeechFacingEmotion(brain.emotion, profile);

  const varietySeed = varietySeedPre;

  const dynInput: DynamicReasonFormatInput = {
    lang: input.lang,
    targetName: speechPick.speechTargetName,
    targetId: speechPick.speechTargetId,
    reasonTags: speechPick.reasonTags,
    thought: speechThought,
    suspicion: suspicionForThought,
    observerId: input.observerId,
    idToName,
    personality: profile,
    varietySeed,
    dayExileVotesPublic: daytimeExileBallotDetailPublic,
  };
  const concreteObservations = formatDynamicObservationLines(dynInput);
  // Vote memories are already factored into suspicion scores by the engine;
  // never surface per-voter ballot lines as copyable text for the LLM.
  const memoryAnchors = formatMemoryAnchors(
    input.hub.sharedMemory,
    speechPick.speechTargetId,
    idToName,
    input.lang,
    input.hub.dayRoundApprox,
    memHorizon,
    false
  );

  const obsSan = sanitizeLineList(concreteObservations, input.lang, speechPick.speechTargetName, varietySeed);
  const memSan = sanitizeLineList(memoryAnchors, input.lang, speechPick.speechTargetName, varietySeed + 11);
  const obsForSpeech = daytimeExileBallotDetailPublic
    ? obsSan
    : scrubHiddenDaytimeBallotLines(obsSan, input.lang, speechPick.speechTargetName, varietySeed);
  const memForSpeech = daytimeExileBallotDetailPublic
    ? memSan
    : scrubHiddenDaytimeBallotLines(memSan, input.lang, speechPick.speechTargetName, varietySeed + 11);

  const obsForSpeechFinal =
    input.channel === 'sheriff' ? ([] as string[]) : obsForSpeech;
  const memForSpeechFinal =
    input.channel === 'sheriff' ? ([] as string[]) : memForSpeech;

  const forbidGenericFiller = !shouldAllowGenericFiller({
    thought,
    profile,
    speechIndex: input.speechIndex,
    priorSpeechLines: input.priorSpeechLines,
    channel: input.channel,
  });

  const leadId = thought.votePrediction.leadingTargetId;
  const voteLeadingDisplayName = leadId ? idToName(leadId) : null;

  const allyHintName =
    thought.predictedAllies.find((n) => n !== speechPick.speechTargetName && n.trim().length > 0) ?? null;

  const elenaSteerRoll =
    input.observerId === '27' &&
    input.channel === 'discussion' &&
    brain.softRoomNudgesUsed < 3 &&
    hashSeed([
      input.gameNonce,
      input.observerId,
      'elenaSteer',
      String(input.hub.dayRoundApprox),
      String(input.speechIndex),
      String(brain.thoughtTick),
    ]) %
      100 <
      15;
  if (elenaSteerRoll) {
    brain.softRoomNudgesUsed += 1;
  }
  const steerOthers = input.alivePlayers
    .map((p) => p.name)
    .filter((n) => n !== speechPick.speechTargetName && n.trim().length > 0);
  const elenaSteerPartner =
    steerOthers.length > 0
      ? steerOthers[hashSeed([input.gameNonce, 'elenaP2', String(varietySeedPre)]) % steerOthers.length]!
      : null;

  const richContext = buildRichDialogueContext({
    lang: input.lang,
    channel: input.channel,
    speechIndex: input.speechIndex,
    totalSpeakers: input.totalSpeakers,
    primaryTargetId: speechPick.speechTargetId,
    primaryTargetName: speechPick.speechTargetName,
    thought: speechThought,
    speechFacingEmotion: speechFacing,
    concreteObservations: obsForSpeechFinal,
    memoryAnchors: memForSpeechFinal,
    votePressure,
    voteLeadingDisplayName,
    priorSpeakerName: input.priorSpeakerName ?? null,
    aliveNames: input.alivePlayers.map((p) => p.name),
    forbidGenericFiller,
    profile,
  });

  const playerSafeDialogue = buildPlayerSafeDialoguePack({
    lang: input.lang,
    thought: speechThought,
    profile,
    concreteObservations: obsForSpeechFinal,
    memoryAnchors: memForSpeechFinal,
    votePressure,
    priorSpeakerName: input.priorSpeakerName ?? null,
    aliveNames: input.alivePlayers.map((p) => p.name),
    forbidGenericFiller,
    focusPlayerName: speechPick.speechTargetName,
    voteLeaderName: voteLeadingDisplayName,
    allyHintName,
    varietySeed: varietySeed + 3,
    uncertaintyKnobs,
    personalityLabel: input.observerCharacter.personality,
    dayExileVotesPublic: daytimeExileBallotDetailPublic,
    elenaSoftRoomSteer: elenaSteerRoll
      ? { partnerName: elenaSteerPartner, votePressure, lineSeed: varietySeed + 901 }
      : null,
  });

  const emotionalSpeechContext = buildEmotionalSpeechContext({
    accusedThisRound: input.accusedThisRound,
    allyEliminatedRecently: input.allyEliminatedRecently,
    votePressure,
    socialPressure: thought.socialPressure,
    priorSpeechLines: input.priorSpeechLines,
    speechIndex: input.speechIndex,
    totalSpeakers: input.totalSpeakers,
    channel: input.channel,
    dangerLevel: thought.dangerLevel,
  });

  const conversationalStylePrompt =
    buildConversationalStylePrompt(
      input.lang,
      input.observerCharacter.personality,
      profile,
      emotionalSpeechContext,
      varietySeed + 41,
      { characterId: input.observerId, elenaSteerTurn: elenaSteerRoll }
    ) + buildAttentionPromptAppend(input.lang, speechPick);

  // Compact signal labels for the LLM JSON — short factual identifiers, NOT template sentences.
  // The LLM receives these as raw reasoning seeds and must write its own speech from them.
  // Passing full template sentences here (like voteTensionPhrase output) causes the LLM to copy
  // them verbatim. Labels like "Toby: 高票压" cannot be copy-pasted as speech.
  const llmSignalLines: string[] = [];
  if (input.channel === 'sheriff') {
    if (input.lang === 'zh') {
      llmSignalLines.push('你已选择上警：必须拉票，说明身份倾向与拿徽后带队方向');
      if (input.observerRole === 'Seer') {
        llmSignalLines.push('真预言家可考虑跳身份并报查验');
      } else if (isWolfDeceptionRole(input.observerRole)) {
        llmSignalLines.push('隐藏真实身份；可选悍跳好人神职或以平民视角表水，勿说不要警徽');
      } else {
        llmSignalLines.push('可表水竞选（如「我是平民不跳神」），但仍要争取警徽');
      }
      for (const m of memForSpeech.slice(0, 2)) {
        llmSignalLines.push(m);
      }
    } else {
      llmSignalLines.push('You signed up — pitch for the badge with identity stance and day-one direction');
      if (input.observerRole === 'Seer') {
        llmSignalLines.push('Real Seer may claim and report checks');
      } else if (isWolfDeceptionRole(input.observerRole)) {
        llmSignalLines.push('Wolves may hard-claim or plain-campaign — never decline the badge');
      } else {
        llmSignalLines.push('Town may plain-campaign but still fight for the badge');
      }
      for (const m of memForSpeech.slice(0, 2)) {
        llmSignalLines.push(m);
      }
    }
  } else {
    const vpBandSig: 'high' | 'mid' | 'low' = votePressure >= 60 ? 'high' : votePressure >= 30 ? 'mid' : 'low';
    if (input.lang === 'zh') {
      const focusLabel =
        vpBandSig === 'high' ? '本轮高票压，首要追问对象' :
        vpBandSig === 'mid'  ? '有压力，值得重点关注' :
                               '低关注，可留意观察';
      llmSignalLines.push(`${speechPick.speechTargetName}：${focusLabel}`);
      if (voteLeadingDisplayName && voteLeadingDisplayName !== speechPick.speechTargetName) {
        llmSignalLines.push(`当前票压最高者：${voteLeadingDisplayName}`);
      }
      if (allyHintName && allyHintName !== speechPick.speechTargetName) {
        llmSignalLines.push(`${speechPick.speechTargetName}与${allyHintName}可能站边（警惕）`);
      }
      for (const m of memForSpeech.slice(0, 3)) {
        llmSignalLines.push(m);
      }
    } else {
      const focusLabel =
        vpBandSig === 'high' ? 'high vote pressure this round, top seat to press' :
        vpBandSig === 'mid'  ? 'moderate pressure, worth following up' :
                               'low focus, light watch for now';
      llmSignalLines.push(`${speechPick.speechTargetName}: ${focusLabel}`);
      if (voteLeadingDisplayName && voteLeadingDisplayName !== speechPick.speechTargetName) {
        llmSignalLines.push(`Current vote pressure leader: ${voteLeadingDisplayName}`);
      }
      if (allyHintName && allyHintName !== speechPick.speechTargetName) {
        llmSignalLines.push(`${speechPick.speechTargetName} may be aligned with ${allyHintName}`);
      }
      for (const m of memForSpeech.slice(0, 3)) {
        llmSignalLines.push(m);
      }
    }
  }

  const strategicIntent = buildStrategicIntent({
    lang: input.lang,
    channel: input.channel,
    observerId: input.observerId,
    observerRole: input.observerRole,
    profile,
    thought,
    speechTargetId: speechPick.speechTargetId,
    speechTargetName: speechPick.speechTargetName,
    accusedThisRound: input.accusedThisRound,
    memory: input.hub.sharedMemory,
    idToName,
    votePressure,
    isWolf: isWolfDeceptionRole(input.observerRole),
    dayRoundApprox: input.hub.dayRoundApprox,
  });

  return {
    thought,
    richContext,
    concreteObservations: obsForSpeechFinal,
    memoryAnchors: memForSpeechFinal,
    playerSafeDialogue,
    speechFacingEmotion: speechFacing,
    forbidGenericFiller,
    conversationalStylePrompt,
    emotionalSpeechContext,
    personalityLabel: input.observerCharacter.personality,
    behaviorProfile: profile,
    llmSignalLines,
    strategicIntent,
    ...(wolfDeceptionPromptBlock !== undefined
      ? { wolfDeceptionPromptBlock, wolfTableActingCeiling: wolfTableActingCeilingNum! }
      : {}),
    ...(uncertaintyPromptBlock !== undefined ? { uncertaintyPromptBlock } : {}),
    dayExileVotesPublic: daytimeExileBallotDetailPublic,
  };
}

function hashSeed(parts: readonly string[]): number {
  const s = parts.join('|');
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function countPlayerSpeechLinesInHistory(history: readonly string[]): number {
  let n = 0;
  for (const line of history) {
    if (/^(系统|法官|System|Moderator)/.test(line)) continue;
    if (/^([^:：\n]{1,24})[:：]\s*\S/.test(line)) n += 1;
  }
  return n;
}

export function detectDirectedAccusationAgainst(
  history: readonly string[],
  displayName: string,
  lang: AppLanguage
): boolean {
  if (!displayName || history.length === 0) return false;
  // The caller passes current-day logs. Require a directional accusation rather than
  // treating any line containing both a name and a wolf-related word as an attack.
  for (const line of history.slice(-6)) {
    if (lineDirectlyAccusesTarget(line, displayName, lang)) return true;
  }
  return false;
}

/**
 * Scan the last N log lines for a player who openly declared themselves wolf
 * (e.g. "我是狼人" / "I am a werewolf"). Returns the speaker's display name or null.
 * Wolf teammates' wolf-kill coordination is private and should not appear in public chat,
 * so any public wolf self-declaration is either a bluff or genuine — either way it is a
 * major game event that every AI should react to.
 */
export function detectWolfSelfRevealInHistory(
  history: readonly string[],
  lang: AppLanguage,
  lookback = 12
): string | null {
  for (const line of history.slice(-lookback)) {
    const m = line.match(/^([^:：\n]{1,24})[:：]\s*(.+)$/);
    if (!m) continue;
    const speaker = m[1]!.trim();
    const body = m[2]!.trim();
    if (['系统', '法官', 'System', 'Moderator'].some((x) => speaker.startsWith(x))) continue;
    if (lang === 'zh') {
      if (/我(是|就是|承认是|真的是)(狼人|狼美人|大灰狼)|我自爆|我是狼/.test(body)) return speaker;
    } else {
      if (/\bI('m| am) (a )?werewolf\b|\bI self.?destruct\b|\bI confess.{0,20}wolf\b/i.test(body))
        return speaker;
    }
  }
  return null;
}
