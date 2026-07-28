import type { DifficultyType } from '../types';

/** Default Ollama model when EXPO_PUBLIC_LLM_PROVIDER=ollama. */
export const OLLAMA_FAST_MODEL = process.env.EXPO_PUBLIC_OLLAMA_MODEL ?? 'qwen2.5:3b';

const OLLAMA_BY_DIFF_ENV: Record<DifficultyType, string> = {
  Novice: 'EXPO_PUBLIC_OLLAMA_MODEL_NOVICE',
  Easy: 'EXPO_PUBLIC_OLLAMA_MODEL_EASY',
  Medium: 'EXPO_PUBLIC_OLLAMA_MODEL_MEDIUM',
  Hard: 'EXPO_PUBLIC_OLLAMA_MODEL_HARD',
};

export function ollamaModelForDifficulty(diff: DifficultyType): string {
  const tier = (process.env[OLLAMA_BY_DIFF_ENV[diff]] ?? '').trim();
  if (tier) return tier;
  const hard = (process.env.EXPO_PUBLIC_OLLAMA_MODEL_HARD ?? '').trim();
  if (diff === 'Hard' && hard) return hard;
  return OLLAMA_FAST_MODEL;
}
