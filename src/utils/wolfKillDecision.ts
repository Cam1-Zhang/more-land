import type { AppLanguage } from '../i18n/appStrings';
import type { Character, ModelRef } from '../types';
import { getAIBehaviorProfile } from '../data/aiBehaviorProfiles';
import { fetchAIWolfKill } from './aiApi';
import { pickWolfKillTarget, type PoolPlayer } from './nightTargetStrategy';
import type { AiSpeechSeatBrain } from './speechPrep';
import { characterDescriptionForUi, characterPersonalityForUi } from './characterDisplayCopy';

export type WolfPackVoteLean = {
  voterName: string;
  targetName: string;
};

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** Fisher–Yates：避免刀口候选固定为「玩家列表第一位」（常为真人座位）。 */
export function shuffleKillCandidates<T>(pool: readonly T[]): T[] {
  const a = [...pool];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

/** 单只 AI 狼人刀人：LLM 结合公开信息 + 狼队友倾向；失败回退 persona 策略。 */
export async function resolveAiWolfKillVote(params: {
  wolf: PoolPlayer & { name: string; isAI: boolean };
  char: Character;
  modelRef: ModelRef | undefined;
  brain: AiSpeechSeatBrain | null;
  pool: readonly PoolPlayer[];
  lang: AppLanguage;
  history: readonly string[];
  nightNumber: number;
  isFirstNight: boolean;
  sheriffId: string | null;
  packMateNames: readonly string[];
  packVotesSoFar: readonly WolfPackVoteLean[];
  alivePlayers: readonly { id: string; name: string }[];
}): Promise<string> {
  const {
    wolf,
    char,
    modelRef,
    brain,
    pool,
    lang,
    history,
    nightNumber,
    isFirstNight,
    sheriffId,
    packMateNames,
    packVotesSoFar,
    alivePlayers,
  } = params;

  if (pool.length === 0) return wolf.id;
  if (pool.length === 1) return pool[0]!.id;

  const candidates = shuffleKillCandidates(pool);

  const profile = getAIBehaviorProfile(char);
  const sheriffName =
    sheriffId != null ? alivePlayers.find((p) => p.id === sheriffId)?.name ?? null : null;

  const packLeanLine =
    packVotesSoFar.length > 0
      ? lang === 'zh'
        ? packVotesSoFar.map((v) => `${v.voterName}→${v.targetName}`).join('；')
        : packVotesSoFar.map((v) => `${v.voterName}→${v.targetName}`).join('; ')
      : null;

  const actor = {
    id: wolf.id,
    name: wolf.name,
    personality: characterPersonalityForUi(char, lang),
    personalityDescription: characterDescriptionForUi(char, lang),
    difficulty: char.difficulty,
    modelRef,
  };

  const packVotesForLlm = isFirstNight ? [] : packVotesSoFar;

  const llmPick = await fetchAIWolfKill({
    actor,
    lang,
    candidates: candidates.map((p) => ({ id: p.id, name: p.name })),
    history: [...history],
    nightNumber,
    packMateNames,
    packVotesSoFar: packVotesForLlm,
    sheriffName,
    isFirstNight,
    knifeHint: packLeanLine,
  });

  if (llmPick && candidates.some((p) => p.id === llmPick)) return llmPick;

  const heuristic =
    pickWolfKillTarget({
      wolfId: wolf.id,
      brain,
      profile,
      pool: candidates,
      sheriffId,
      isFirstNight,
    }) ?? null;
  if (heuristic && candidates.some((p) => p.id === heuristic)) return heuristic;

  return pickRandom(candidates).id;
}
