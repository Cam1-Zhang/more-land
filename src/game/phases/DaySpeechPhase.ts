import { compileDaySpeechPrompt } from '../../llm/compileDaySpeechPrompt';
import type { DaySpeechPromptInput, LlmPhaseKey, PromptResult } from '../../llm/types';
import type { GameLlmPhase } from './types';

/** Discussion, sheriff campaign, last words — single prompt builder. */
export class DaySpeechPhase implements GameLlmPhase {
  readonly phaseKey: LlmPhaseKey;

  constructor(phaseKey: Extract<LlmPhaseKey, 'DAY_SPEECH' | 'SHERIFF_SPEECH' | 'DAY_LAST_WORDS'>) {
    this.phaseKey = phaseKey;
  }

  getPrompt(context: unknown): PromptResult | null {
    const input = context as DaySpeechPromptInput;
    if (!input?.character || !input.ctx) return null;
    return compileDaySpeechPrompt(input);
  }
}
