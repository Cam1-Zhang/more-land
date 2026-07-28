import {
  publicDashscopeApiKey,
  publicDashscopeModelForDifficulty,
} from '../config/publicEnv';
import type { DifficultyType } from '../types';
import { normalizedLlmProvider } from './providerEnv';

/** 百炼 DashScope OpenAI 兼容端点 */
export const DASHSCOPE_COMPAT_ENDPOINT =
  'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

export function getDashscopeApiKey(): string {
  return publicDashscopeApiKey();
}

const DEFAULT_BY_DIFF: Record<DifficultyType, string> = {
  Novice: 'qwen3.6-flash',
  Easy: 'qwen-plus-2025-07-28',
  Medium: 'qwen3.7-plus',
  Hard: 'deepseek-v3.2',
};

/** Model id on Bailian / DashScope for each difficulty tier (overridable via .env). */
export function dashscopeModelForDifficulty(diff: DifficultyType): string {
  const fromConfig = publicDashscopeModelForDifficulty(diff);
  return fromConfig || DEFAULT_BY_DIFF[diff];
}

/** Human-readable Novice/Easy/Medium/Hard → model line for connect logs. */
export function formatDashscopeDifficultyModelMap(lang: 'zh' | 'en' = 'zh'): string {
  const rows: DifficultyType[] = ['Novice', 'Easy', 'Medium', 'Hard'];
  const label =
    lang === 'zh'
      ? { Novice: '新手', Easy: '简单', Medium: '中等', Hard: '困难' }
      : { Novice: 'Novice', Easy: 'Easy', Medium: 'Medium', Hard: 'Hard' };
  return rows.map((d) => `${label[d]}=${dashscopeModelForDifficulty(d)}`).join(lang === 'zh' ? '；' : '; ');
}

export function describeDashscopeMisconfig(lang: 'zh' | 'en' = 'zh'): string | null {
  if (normalizedLlmProvider() !== 'dashscope') return null;
  const key = getDashscopeApiKey();
  if (key.length >= 12) return null;
  return lang === 'zh'
    ? '未检测到百炼 Key：本地请在 .env 配置 EXPO_PUBLIC_DASHSCOPE_API_KEY；线上请在 Vercel → Settings → Environment Variables 添加同名变量并重新 Deploy（勾选 Production）。同时设 EXPO_PUBLIC_LLM_PROVIDER=dashscope，设置里选「云模型」。'
    : 'Bailian API key missing: set EXPO_PUBLIC_DASHSCOPE_API_KEY in .env (local) or Vercel env vars (production), redeploy, and pick Cloud model in Settings.';
}
