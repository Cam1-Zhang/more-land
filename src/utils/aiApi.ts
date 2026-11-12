import type { AppLanguage } from '../i18n/appStrings';
import { phaseManager } from '../game/phases';
import { llmChat, toChatMessages } from '../llm/client';
import {
  parseExileVoteJson,
  parseKnightDuelJson,
  parseNightTargetJson,
  parseWitchNightJson,
} from '../llm/actionParse';
import { expandSpeechBubbleParts } from '../llm/speechParse';
import { bubblesFromDaySpeechRaw } from './speechBubbles';
import { llmChatPrompt } from '../llm/runAction';
import type {
  ActionCandidate,
  AISpeechCharacter,
  KnightDuelPromptInput,
  NightSeerCheckPromptInput,
  NightWitchActionPromptInput,
  NightWolfBeautyCharmPromptInput,
  NightWolfKillPromptInput,
  SpeechChannel,
  SpeechContext,
  WitchNightLlmDecision,
} from '../llm/types';

export type {
  AISpeechCharacter,
  SpeechChannel,
  SpeechContext,
} from '../llm/types';

export type ExileVoteCandidate = ActionCandidate;
export type NightActionCandidate = ActionCandidate;
export type { WitchNightLlmDecision };

/**
 * AI discussion speech — wolfcha PhaseManager → DaySpeechPhase → llmChat (Ollama by default).
 * Failures throw; GameRoomScreen fetchSpeechSafe handles fallback.
 */
/** Day speech: LLM JSON array → one string per chat bubble. */
export const fetchAISpeechBubbles = async (
  character: AISpeechCharacter,
  role: string,
  history: string[],
  lang: AppLanguage,
  ctx: SpeechContext
): Promise<string[]> => {
  try {
    const prompt = phaseManager.buildDaySpeechPrompt({ character, role, history, lang, ctx });
    const raw = await llmChat({
      modelRef: character.modelRef,
      messages: toChatMessages(prompt.system, prompt.user),
      temperature: prompt.temperature,
      maxTokens: prompt.maxTokens,
      // Table turns should keep moving even when the provider is congested.
      // GameRoomScreen supplies an in-character fallback after this deadline.
      timeoutMs: 25_000,
      // Reasoning models dump CoT into reasoning_content — never treat that as table speech.
      contentOnly: true,
    });
    const bubbles = expandSpeechBubbleParts(
      bubblesFromDaySpeechRaw(raw, character, role, lang, ctx)
    );
    if (bubbles.length > 0) return bubbles;
    const fallback = raw.trim();
    if (fallback.length > 0) {
      if (__DEV__) console.warn('[aiApi] bubble parse empty — skip raw LLM text');
    }
    throw new Error('[llm] empty speech after postProcess');
  } catch (e) {
    if (__DEV__) console.warn('[aiApi] fetchAISpeechBubbles failed:', e);
    throw e;
  }
};

function pickRandomCandidateId(candidates: ActionCandidate[]): string {
  return candidates[Math.floor(Math.random() * candidates.length)]!.id;
}

/**
 * 放逐投票：PhaseManager → llmChat。失败时随机选一名候选人。
 */
export async function fetchAIExileVote(params: {
  voter: AISpeechCharacter;
  role: string;
  lang: AppLanguage;
  history: string[];
  candidates: ExileVoteCandidate[];
  dayNumber: number;
  sheriffVoteWeight: number;
}): Promise<string> {
  const { voter, candidates } = params;
  if (candidates.length === 0) return 'me';
  if (candidates.length === 1) return candidates[0]!.id;
  const pickFall = () => pickRandomCandidateId(candidates);

  try {
    const prompt = phaseManager.buildExileVotePrompt(params);
    const text = await llmChatPrompt(voter.modelRef, prompt);
    if (!text) return pickFall();
    const id = parseExileVoteJson(text, candidates);
    if (id && candidates.some((c) => c.id === id)) return id;
    return pickFall();
  } catch (e) {
    console.warn('fetchAIExileVote fallback:', e);
    return pickFall();
  }
}

/**
 * 警长投票：PhaseManager → llmChat；失败时随机候选人。
 */
export async function fetchAISheriffVote(params: {
  voter: AISpeechCharacter;
  role: string;
  lang: AppLanguage;
  history: string[];
  candidates: ExileVoteCandidate[];
  dayNumber: number;
}): Promise<string> {
  const { voter, candidates } = params;
  if (candidates.length === 0) return 'me';
  if (candidates.length === 1) return candidates[0]!.id;

  try {
    const prompt = phaseManager.buildSheriffVotePrompt(params);
    const text = await llmChatPrompt(voter.modelRef, prompt);
    if (text) {
      const id = parseExileVoteJson(text, candidates);
      if (id && candidates.some((c) => c.id === id)) return id;
    }
    return pickRandomCandidateId(candidates);
  } catch (e) {
    console.warn('fetchAISheriffVote fallback:', e);
    return pickRandomCandidateId(candidates);
  }
}

/** Wolf kill target — JSON {"target":"DisplayName"} */
export async function fetchAIWolfKill(params: NightWolfKillPromptInput): Promise<string | null> {
  const { actor, candidates } = params;
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0]!.id;

  const prompt = phaseManager.buildWolfKillPrompt(params);
  const text = await llmChatPrompt(actor.modelRef, prompt);
  if (!text) return null;
  const id = parseNightTargetJson(text, candidates);
  return id && candidates.some((c) => c.id === id) ? id : null;
}

/** Seer check — JSON {"target":"DisplayName"} */
export async function fetchAISeerCheck(params: NightSeerCheckPromptInput): Promise<string | null> {
  const { actor, candidates } = params;
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0]!.id;

  const prompt = phaseManager.buildSeerCheckPrompt(params);
  const text = await llmChatPrompt(actor.modelRef, prompt);
  if (!text) return null;
  const id = parseNightTargetJson(text, candidates);
  return id && candidates.some((c) => c.id === id) ? id : null;
}

/** Witch — JSON {"action":"save"|"pass"|"poison","target":"Name"?} */
export async function fetchAIWitchAction(
  params: NightWitchActionPromptInput
): Promise<WitchNightLlmDecision | null> {
  const {
    actor,
    poisonCandidates,
    hasAntidote,
    hasPoison,
    knifeVictimName,
    knifeVictimId,
    witchId,
    isFirstNight,
  } = params;

  const saveAllowed =
    hasAntidote && !!knifeVictimId && (knifeVictimId !== witchId || isFirstNight);

  const prompt = phaseManager.buildWitchActionPrompt(params);
  const text = await llmChatPrompt(actor.modelRef, prompt);
  if (!text) return null;
  const parsed = parseWitchNightJson(text, poisonCandidates, {
    hasAntidote,
    hasPoison,
    knifeVictimName,
    isFirstNight,
    witchSelfKnifed: knifeVictimId === witchId,
  });
  if (!parsed) return null;
  if (parsed.save && parsed.poisonTargetId) return { save: true, poisonTargetId: null };
  if (parsed.save && !saveAllowed) return { save: false, poisonTargetId: parsed.poisonTargetId };
  return parsed;
}

/** Wolf Beauty charm — JSON {"target":"DisplayName"} */
export async function fetchAIWolfBeautyCharm(
  params: NightWolfBeautyCharmPromptInput
): Promise<string | null> {
  const { actor, candidates } = params;
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0]!.id;

  const prompt = phaseManager.buildWolfBeautyCharmPrompt(params);
  const text = await llmChatPrompt(actor.modelRef, prompt);
  if (!text) return null;
  const id = parseNightTargetJson(text, candidates);
  return id && candidates.some((c) => c.id === id) ? id : null;
}

/** Knight duel — JSON {"useSkill":true,"target":"Name"} or {"useSkill":false} */
export async function fetchAIKnightDuel(
  params: KnightDuelPromptInput
): Promise<{ useSkill: boolean; targetId: string | null } | null> {
  const { actor, candidates } = params;
  const prompt = phaseManager.buildKnightDuelPrompt(params);
  const text = await llmChatPrompt(actor.modelRef, prompt);
  if (!text) return null;
  const parsed = parseKnightDuelJson(text, candidates);
  if (!parsed) return null;
  if (parsed.useSkill && parsed.targetId && !candidates.some((c) => c.id === parsed.targetId)) {
    return { useSkill: false, targetId: null };
  }
  return parsed;
}
