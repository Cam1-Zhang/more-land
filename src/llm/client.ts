import type { ModelRef } from '../types';
import { DASHSCOPE_COMPAT_ENDPOINT, getDashscopeApiKey } from './dashscopeEnv';
import { OLLAMA_FAST_MODEL } from './ollamaEnv';
import { readLlmJsonResponse, extractChatCompletionText, extractChatCompletionContentOnly } from './llmResponseParse';
import { getOllamaBaseUrl } from './ollamaUrl';
import { normalizedLlmProvider } from './providerEnv';
import type { LlmChatParams, LlmMessage } from './types';
import { runSerializedOllamaTask } from './requestGate';

const DEFAULT_SPEECH_TIMEOUT_MS = 30_000;
const DEFAULT_ACTION_TIMEOUT_MS = 20_000;

export { normalizedLlmProvider };

export const llmProvider = normalizedLlmProvider();

const envDeepseekKey = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY;
const envSiliconflowKey = process.env.EXPO_PUBLIC_SILICONFLOW_API_KEY;
const envDashscopeKey = getDashscopeApiKey();

function assertWebCanReachEndpoint(endpoint: string): void {
  if (typeof window === 'undefined') return;
  try {
    const pageProto = window.location.protocol;
    const targetProto = new URL(endpoint).protocol;
    if (pageProto === 'https:' && targetProto === 'http:') {
      throw new Error(
        '[llm] HTTPS 页面无法请求本机 HTTP Ollama（浏览器混合内容拦截）。请用 `npm run web` 本地 http 调试，或改用 DeepSeek/SiliconFlow。'
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('[llm]')) throw e;
  }
}

if (__DEV__) {
  if (llmProvider === 'ollama') {
    console.log(`[llm] Ollama — ${getOllamaBaseUrl() || '(blocked on HTTPS)'} model=${OLLAMA_FAST_MODEL}`);
  } else if (llmProvider === 'siliconflow') {
    const ok = typeof envSiliconflowKey === 'string' && envSiliconflowKey.length >= 12;
    console.log(ok ? '[llm] SiliconFlow key loaded' : '[llm] No SiliconFlow key');
  } else if (llmProvider === 'dashscope') {
    const ok = envDashscopeKey.length >= 12;
    console.log(ok ? '[llm] DashScope (Bailian) key loaded' : '[llm] No DashScope key');
  } else {
    const ok =
      typeof envDeepseekKey === 'string' &&
      envDeepseekKey.length >= 12 &&
      !/YOUR_|PLACEHOLDER|xxx|在这里/i.test(envDeepseekKey);
    console.log(ok ? '[llm] DeepSeek key loaded' : '[llm] No DeepSeek key');
  }
}

export function resolveApiCall(modelRef: ModelRef | undefined): {
  endpoint: string;
  model: string;
  apiKey: string;
  needsAuth: boolean;
} {
  const provider = normalizedLlmProvider();

  if (provider === 'ollama') {
    const base = getOllamaBaseUrl();
    if (!base) {
      throw new Error(
        '[llm] HTTPS 页面无法连接本机 Ollama。请本地 `npm run web`（http）或配置云端 EXPO_PUBLIC_LLM_PROVIDER。'
      );
    }
    return {
      endpoint: `${base.replace(/\/+$/, '')}/v1/chat/completions`,
      model: modelRef?.model ?? OLLAMA_FAST_MODEL,
      apiKey: '',
      needsAuth: false,
    };
  }
  if (provider === 'siliconflow') {
    return {
      endpoint: 'https://api.siliconflow.cn/v1/chat/completions',
      model: modelRef?.model ?? 'deepseek-ai/DeepSeek-V3',
      apiKey: envSiliconflowKey ?? '',
      needsAuth: true,
    };
  }
  if (provider === 'dashscope') {
    return {
      endpoint: DASHSCOPE_COMPAT_ENDPOINT,
      model: modelRef?.model ?? 'qwen3.6-flash',
      apiKey: envDashscopeKey,
      needsAuth: true,
    };
  }
  return {
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    model: modelRef?.model ?? 'deepseek-chat',
    apiKey: envDeepseekKey ?? '',
    needsAuth: true,
  };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(`[llm] timeout after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** OpenAI-compatible chat completion — used by all wolfcha-style phases */
export async function llmChat(params: LlmChatParams): Promise<string> {
  return runSerializedOllamaTask(() => llmChatOnce(params));
}

async function llmChatOnce(params: LlmChatParams): Promise<string> {
  const { endpoint, model, apiKey, needsAuth } = resolveApiCall(params.modelRef);
  assertWebCanReachEndpoint(endpoint);

  const timeoutMs =
    params.timeoutMs ??
    (params.maxTokens != null && params.maxTokens <= 128
      ? DEFAULT_ACTION_TIMEOUT_MS
      : DEFAULT_SPEECH_TIMEOUT_MS);

  const body = JSON.stringify({
    model,
    messages: params.messages,
    temperature: params.temperature ?? 0.65,
    max_tokens: params.maxTokens ?? 320,
  });

  const requestInit: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(needsAuth ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body,
  };

  const attempt = async (): Promise<Response> => fetchWithTimeout(endpoint, requestInit, timeoutMs);

  let response: Response;
  try {
    response = await attempt();
  } catch (e) {
    if (__DEV__) console.warn('[llm] fetch failed:', endpoint, e);
    // A timeout already consumed the whole turn budget. Retrying the same
    // request here made the UI appear frozen for minutes; let the caller use
    // its game-safe fallback instead.
    if (e instanceof Error && e.message.startsWith('[llm] timeout')) throw e;
    try {
      response = await attempt();
    } catch (e2) {
      throw new Error(`[llm] network error: ${String(e2)}`);
    }
  }

  const data = await readLlmJsonResponse(response);

  if (!response.ok) {
    const errMsg =
      typeof (data.error as { message?: string } | undefined)?.message === 'string'
        ? (data.error as { message: string }).message
        : `HTTP ${response.status}`;
    if (__DEV__) console.warn('[llm] API error:', model, errMsg);
    throw new Error(`[llm] ${errMsg}`);
  }

  const text = params.contentOnly
    ? extractChatCompletionContentOnly(data)
    : extractChatCompletionText(data);
  if (text) return text;
  if (__DEV__) console.warn('[llm] empty completion:', model, JSON.stringify(data).slice(0, 200));
  throw new Error('[llm] empty completion content');
}

export async function llmChatJson(params: LlmChatParams): Promise<string> {
  return llmChat({ ...params, maxTokens: params.maxTokens ?? 128 });
}

export function toChatMessages(system: string, user: string): LlmMessage[] {
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}
