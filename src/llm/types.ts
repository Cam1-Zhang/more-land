import type { AppLanguage } from '../i18n/appStrings';
import type { DifficultyType, ModelRef } from '../types';
import type { PreparedAiSpeechDialogue } from '../utils/speechPrep';

/** wolfcha-style phase keys for LLM prompt routing */
export type LlmPhaseKey =
  | 'DAY_SPEECH'
  | 'SHERIFF_SPEECH'
  | 'DAY_LAST_WORDS'
  | 'DAY_VOTE'
  | 'SHERIFF_VOTE'
  | 'NIGHT_WOLF_KILL'
  | 'NIGHT_SEER_CHECK'
  | 'NIGHT_WITCH_ACTION'
  | 'NIGHT_WOLF_BEAUTY_CHARM'
  | 'KNIGHT_DUEL';

export type SpeechChannel = 'discussion' | 'sheriff' | 'lastwords';

export type AISpeechCharacter = {
  id: string;
  name: string;
  personality: string;
  personalityDescription?: string;
  difficulty?: DifficultyType;
  modelRef?: ModelRef;
};

export type SpeechContext = {
  speechIndex: number;
  totalSpeakers: number;
  dayNumber: number;
  difficulty: DifficultyType;
  gameNonce: string;
  personality: string;
  channel?: SpeechChannel;
  humanPlayerName?: string;
  priorSpeakerName?: string | null;
  preparedDialogue?: PreparedAiSpeechDialogue | null;
  dayExileVotesPublic?: boolean;
  wolfSelfRevealName?: string | null;
  gameContextBlock?: string | null;
  focusAngleHints?: string[] | null;
  selfSpeechToday?: string | null;
};

/** wolfcha PromptResult — system + user messages */
export type PromptResult = {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
};

export type DaySpeechPromptInput = {
  character: AISpeechCharacter;
  role: string;
  history: string[];
  lang: AppLanguage;
  ctx: SpeechContext;
};

export type DaySpeechPromptResult = PromptResult;

export type ActionCandidate = { id: string; name: string };

export type ExileVotePromptInput = {
  voter: AISpeechCharacter;
  role: string;
  lang: AppLanguage;
  history: string[];
  candidates: ActionCandidate[];
  dayNumber: number;
  sheriffVoteWeight: number;
};

export type SheriffVotePromptInput = {
  voter: AISpeechCharacter;
  role: string;
  lang: AppLanguage;
  history: string[];
  candidates: ActionCandidate[];
  dayNumber: number;
};

export type NightWolfKillPromptInput = {
  actor: AISpeechCharacter;
  lang: AppLanguage;
  candidates: ActionCandidate[];
  history: string[];
  nightNumber: number;
  packMateNames?: readonly string[];
  packVotesSoFar?: readonly { voterName: string; targetName: string }[];
  sheriffName?: string | null;
  isFirstNight?: boolean;
  knifeHint?: string | null;
};

export type NightSeerCheckPromptInput = {
  actor: AISpeechCharacter;
  lang: AppLanguage;
  candidates: ActionCandidate[];
  history: string[];
  nightNumber: number;
};

export type NightWitchActionPromptInput = {
  actor: AISpeechCharacter;
  lang: AppLanguage;
  poisonCandidates: ActionCandidate[];
  history: string[];
  nightNumber: number;
  hasAntidote: boolean;
  hasPoison: boolean;
  knifeVictimName: string | null;
  knifeVictimId: string | null;
  witchId: string;
  isFirstNight: boolean;
};

export type NightWolfBeautyCharmPromptInput = {
  actor: AISpeechCharacter;
  lang: AppLanguage;
  candidates: ActionCandidate[];
  history: string[];
  nightNumber: number;
};

export type KnightDuelPromptInput = {
  actor: AISpeechCharacter;
  lang: AppLanguage;
  candidates: ActionCandidate[];
  history: string[];
  dayNumber: number;
};

export type WitchNightLlmDecision = {
  save: boolean;
  poisonTargetId: string | null;
};

export type LlmMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type LlmChatParams = {
  modelRef?: ModelRef;
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Abort fetch after this many ms (local Ollama on 7B/14B often needs 60–120s). */
  timeoutMs?: number;
  /** When true, ignore reasoning_content — only use message.content (speech/votes). */
  contentOnly?: boolean;
};
