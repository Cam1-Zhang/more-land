import type { ModelRef } from '../types';
import { llmChat } from './client';
import type { LlmMessage, PromptResult } from './types';

/** Single user-message completions (vote / night JSON) — matches legacy aiApi shape */
export function messagesFromPrompt(prompt: PromptResult): LlmMessage[] {
  if (prompt.system.trim()) {
    return [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ];
  }
  return [{ role: 'user', content: prompt.user }];
}

export async function llmChatPrompt(
  modelRef: ModelRef | undefined,
  prompt: PromptResult
): Promise<string | null> {
  try {
    return await llmChat({
      modelRef,
      messages: messagesFromPrompt(prompt),
      temperature: prompt.temperature ?? modelRef?.temperature ?? 0.35,
      maxTokens: prompt.maxTokens ?? 64,
    });
  } catch (e) {
    console.warn('[llm] action completion failed:', e);
    return null;
  }
}
