import { describeDashscopeMisconfig } from './dashscopeEnv';
import { normalizedLlmProvider } from './providerEnv';

const DEFAULT_OLLAMA = 'http://127.0.0.1:11434';

/** Resolve Ollama base URL at call time (not module load). */
export function getOllamaBaseUrl(): string {
  const envBase = (process.env.EXPO_PUBLIC_OLLAMA_BASE_URL ?? '').trim();
  if (envBase) return envBase.replace(/\/+$/, '');

  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return '';
  }

  return DEFAULT_OLLAMA;
}

export function describeLlmMisconfig(lang: 'zh' | 'en' = 'zh'): string | null {
  const dashscopeMis = describeDashscopeMisconfig(lang);
  if (dashscopeMis) return dashscopeMis;

  if (normalizedLlmProvider() !== 'ollama') return null;
  const base = getOllamaBaseUrl();
  if (!base && typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return lang === 'zh'
      ? 'HTTPS 线上版无法连接本机 Ollama。请用 npm run web 本地 http 调试，或配置 DeepSeek/SiliconFlow。'
      : 'HTTPS deploy cannot reach local Ollama. Use local `npm run web` or a cloud LLM provider.';
  }
  return null;
}
