import {
  DASHSCOPE_COMPAT_ENDPOINT,
  dashscopeModelForDifficulty,
  getDashscopeApiKey,
} from './dashscopeEnv';
import { OLLAMA_FAST_MODEL } from './ollamaEnv';
import { readLlmJsonResponse, extractChatCompletionText } from './llmResponseParse';
import { getOllamaBaseUrl } from './ollamaUrl';

export type LlmHealthResult = { ok: true; model: string } | { ok: false; error: string };

export async function probeOllama(timeoutMs = 25_000): Promise<LlmHealthResult> {
  const base = getOllamaBaseUrl();
  if (!base) {
    return { ok: false, error: 'Ollama URL not configured for HTTPS page' };
  }
  const endpoint = `${base.replace(/\/+$/, '')}/v1/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_FAST_MODEL,
        messages: [{ role: 'user', content: 'reply with exactly: ok' }],
        max_tokens: 16,
        temperature: 0,
      }),
    });
    const data = await readLlmJsonResponse(res);
    if (!res.ok) {
      const msg =
        typeof (data.error as { message?: string } | undefined)?.message === 'string'
          ? (data.error as { message: string }).message
          : `HTTP ${res.status}`;
      return { ok: false, error: msg };
    }
    const text = extractChatCompletionText(data);
    if (text) {
      return { ok: true, model: OLLAMA_FAST_MODEL };
    }
    return { ok: false, error: 'empty completion' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('abort')) return { ok: false, error: `timeout (${Math.round(timeoutMs / 1000)}s)` };
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

export async function probeDashscope(timeoutMs = 25_000): Promise<LlmHealthResult> {
  const apiKey = getDashscopeApiKey();
  if (!apiKey) return { ok: false, error: 'missing EXPO_PUBLIC_DASHSCOPE_API_KEY' };
  const model = dashscopeModelForDifficulty('Novice');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(DASHSCOPE_COMPAT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'reply with exactly: ok' }],
        max_tokens: 16,
        temperature: 0,
      }),
    });
    const data = await readLlmJsonResponse(res);
    if (!res.ok) {
      const msg =
        typeof (data.error as { message?: string } | undefined)?.message === 'string'
          ? (data.error as { message: string }).message
          : `HTTP ${res.status}`;
      return { ok: false, error: msg };
    }
    const text = extractChatCompletionText(data);
    if (text) {
      return { ok: true, model };
    }
    return { ok: false, error: `empty completion (${model})` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('abort')) return { ok: false, error: `timeout (${Math.round(timeoutMs / 1000)}s)` };
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

export function formatLlmErrorForUser(err: unknown, lang: 'zh' | 'en' = 'zh'): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (lang === 'zh') {
    if (raw.includes('混合内容') || raw.includes('HTTPS')) return '浏览器拦截了本机 Ollama（HTTPS 页面）';
    if (raw.includes('network error') || raw.includes('Failed to fetch')) return '连不上 Ollama，请确认已启动 ollama serve';
    if (raw.includes('timeout')) return 'Ollama 响应超时，机器可能还在加载模型';
    if (raw.includes('model') && raw.includes('not found')) return '模型未安装：请 ollama pull qwen2.5:3b';
    if (raw.includes('DOCTYPE') || raw.includes('网页而非 Ollama'))
      return '连到了网页而不是 Ollama，请设 EXPO_PUBLIC_OLLAMA_BASE_URL=http://127.0.0.1:11434 并重启';
    return raw.replace(/^\[llm\]\s*/i, '').slice(0, 120);
  }
  return raw.replace(/^\[llm\]\s*/i, '').slice(0, 120);
}
