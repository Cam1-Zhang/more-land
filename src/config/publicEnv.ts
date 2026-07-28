/**
 * 构建时公开配置：优先读 Metro 内联的 EXPO_PUBLIC_*，否则读 app.config.js → extra（Vercel / CI 更稳）。
 */
import Constants from 'expo-constants';
import type { DifficultyType } from '../types';

type PublicExtra = {
  llmProvider?: string;
  dashscopeApiKey?: string;
  bailianApiKey?: string;
  dashscopeModelNovice?: string;
  dashscopeModelEasy?: string;
  dashscopeModelMedium?: string;
  dashscopeModelHard?: string;
};

function extra(): PublicExtra {
  return (Constants.expoConfig?.extra ?? {}) as PublicExtra;
}

function fromEnv(name: string): string {
  const v = process.env[name];
  return typeof v === 'string' ? v.trim() : '';
}

export function publicLlmProviderRaw(): string {
  return (fromEnv('EXPO_PUBLIC_LLM_PROVIDER') || extra().llmProvider || '').trim();
}

export function publicDashscopeApiKey(): string {
  return (
    fromEnv('EXPO_PUBLIC_DASHSCOPE_API_KEY') ||
    fromEnv('EXPO_PUBLIC_BAILIAN_API_KEY') ||
    extra().dashscopeApiKey ||
    extra().bailianApiKey ||
    ''
  ).trim();
}

const DASHSCOPE_MODEL_EXTRA: Record<DifficultyType, keyof PublicExtra> = {
  Novice: 'dashscopeModelNovice',
  Easy: 'dashscopeModelEasy',
  Medium: 'dashscopeModelMedium',
  Hard: 'dashscopeModelHard',
};

const DASHSCOPE_MODEL_ENV: Record<DifficultyType, string> = {
  Novice: 'EXPO_PUBLIC_DASHSCOPE_MODEL_NOVICE',
  Easy: 'EXPO_PUBLIC_DASHSCOPE_MODEL_EASY',
  Medium: 'EXPO_PUBLIC_DASHSCOPE_MODEL_MEDIUM',
  Hard: 'EXPO_PUBLIC_DASHSCOPE_MODEL_HARD',
};

export function publicDashscopeModelForDifficulty(diff: DifficultyType): string {
  const fromProcessEnv = fromEnv(DASHSCOPE_MODEL_ENV[diff]);
  if (fromProcessEnv) return fromProcessEnv;
  const k = DASHSCOPE_MODEL_EXTRA[diff];
  const fromExtra = extra()[k];
  return typeof fromExtra === 'string' ? fromExtra.trim() : '';
}
