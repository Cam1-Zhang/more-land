/** Read OpenAI-compatible JSON; detect HTML error pages (Expo index, 404, etc.). */
export async function readLlmJsonResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  const trimmed = text.trim();
  if (trimmed.startsWith('<') || trimmed.startsWith('<!DOCTYPE')) {
    throw new Error(
      '[llm] 收到网页而非 Ollama JSON。请确认 Ollama 已启动，且 EXPO_PUBLIC_OLLAMA_BASE_URL=http://127.0.0.1:11434'
    );
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`[llm] invalid JSON (HTTP ${res.status}): ${trimmed.slice(0, 80)}`);
  }
}

function textFromContentField(content: unknown): string | null {
  if (typeof content === 'string' && content.trim().length > 0) return content.trim();
  if (!Array.isArray(content)) return null;
  const parts = content
    .map((part) => {
      if (!part || typeof part !== 'object') return '';
      const entry = part as { type?: unknown; text?: unknown };
      if (entry.type === 'text' && typeof entry.text === 'string') return entry.text;
      return '';
    })
    .filter(Boolean);
  const joined = parts.join('').trim();
  return joined.length > 0 ? joined : null;
}

/** Extract assistant text from OpenAI-compatible chat completion JSON. */
export function extractChatCompletionText(data: Record<string, unknown>): string | null {
  const choices = data.choices as Array<Record<string, unknown>> | undefined;
  if (!choices?.length) return null;
  const first = choices[0]!;
  const message = first.message as Record<string, unknown> | undefined;
  if (message) {
    const content = textFromContentField(message.content);
    if (content) return content;
    const reasoning = message.reasoning_content;
    if (typeof reasoning === 'string' && reasoning.trim().length > 0) return reasoning.trim();
  }
  const legacyText = first.text;
  if (typeof legacyText === 'string' && legacyText.trim().length > 0) return legacyText.trim();
  return null;
}

/** Like extractChatCompletionText but never falls back to reasoning_content (for speech/actions). */
export function extractChatCompletionContentOnly(data: Record<string, unknown>): string | null {
  const choices = data.choices as Array<Record<string, unknown>> | undefined;
  if (!choices?.length) return null;
  const first = choices[0]!;
  const message = first.message as Record<string, unknown> | undefined;
  if (message) {
    const content = textFromContentField(message.content);
    if (content) return content;
  }
  const legacyText = first.text;
  if (typeof legacyText === 'string' && legacyText.trim().length > 0) return legacyText.trim();
  return null;
}
