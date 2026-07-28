import type { LlmPhaseKey, PromptResult } from '../../llm/types';

export type { LlmPhaseKey, PromptResult };

/** wolfcha GamePhase — each phase builds LLM prompts for one action type */
export interface GameLlmPhase {
  readonly phaseKey: LlmPhaseKey;
  getPrompt(context: unknown): PromptResult | null;
}
