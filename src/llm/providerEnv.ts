import { publicLlmProviderRaw } from '../config/publicEnv';

type LlmProvider = 'ollama' | 'deepseek' | 'siliconflow' | 'dashscope';

let runtimeProviderOverride: LlmProvider | null = null;

/** Runtime override used by in-app settings. */
export function setRuntimeLlmProviderOverride(provider: LlmProvider | null): void {
  runtimeProviderOverride = provider;
}

/** Trimmed env; empty string falls back to ollama. */
export function normalizedLlmProvider(): LlmProvider {
  if (runtimeProviderOverride) return runtimeProviderOverride;
  const raw = publicLlmProviderRaw().toLowerCase();
  if (raw === 'dashscope' || raw === 'siliconflow' || raw === 'deepseek' || raw === 'ollama') {
    return raw;
  }
  return 'ollama';
}
