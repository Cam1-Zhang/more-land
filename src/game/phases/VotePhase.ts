import { compileExileVotePrompt, compileSheriffVotePrompt } from '../../llm/compileVotePrompt';
import type {
  ExileVotePromptInput,
  LlmPhaseKey,
  PromptResult,
  SheriffVotePromptInput,
} from '../../llm/types';
import type { GameLlmPhase } from './types';

export class VotePhase implements GameLlmPhase {
  readonly phaseKey: LlmPhaseKey;

  constructor(phaseKey: Extract<LlmPhaseKey, 'DAY_VOTE' | 'SHERIFF_VOTE'>) {
    this.phaseKey = phaseKey;
  }

  getPrompt(context: unknown): PromptResult | null {
    if (this.phaseKey === 'DAY_VOTE') {
      const input = context as ExileVotePromptInput;
      if (!input?.voter || !input.candidates) return null;
      return compileExileVotePrompt(input);
    }
    const input = context as SheriffVotePromptInput;
    if (!input?.voter || !input.candidates) return null;
    return compileSheriffVotePrompt(input);
  }
}
