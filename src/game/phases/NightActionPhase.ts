import {
  compileKnightDuelPrompt,
  compileSeerCheckPrompt,
  compileWitchActionPrompt,
  compileWolfBeautyCharmPrompt,
  compileWolfKillPrompt,
} from '../../llm/compileNightPrompt';
import type {
  KnightDuelPromptInput,
  LlmPhaseKey,
  NightSeerCheckPromptInput,
  NightWitchActionPromptInput,
  NightWolfBeautyCharmPromptInput,
  NightWolfKillPromptInput,
  PromptResult,
} from '../../llm/types';
import type { GameLlmPhase } from './types';

export class NightActionPhase implements GameLlmPhase {
  readonly phaseKey: LlmPhaseKey;

  constructor(
    phaseKey: Extract<
      LlmPhaseKey,
      | 'NIGHT_WOLF_KILL'
      | 'NIGHT_SEER_CHECK'
      | 'NIGHT_WITCH_ACTION'
      | 'NIGHT_WOLF_BEAUTY_CHARM'
      | 'KNIGHT_DUEL'
    >
  ) {
    this.phaseKey = phaseKey;
  }

  getPrompt(context: unknown): PromptResult | null {
    switch (this.phaseKey) {
      case 'NIGHT_WOLF_KILL': {
        const input = context as NightWolfKillPromptInput;
        if (!input?.actor || !input.candidates) return null;
        return compileWolfKillPrompt(input);
      }
      case 'NIGHT_SEER_CHECK': {
        const input = context as NightSeerCheckPromptInput;
        if (!input?.actor || !input.candidates) return null;
        return compileSeerCheckPrompt(input);
      }
      case 'NIGHT_WITCH_ACTION': {
        const input = context as NightWitchActionPromptInput;
        if (!input?.actor) return null;
        return compileWitchActionPrompt(input);
      }
      case 'NIGHT_WOLF_BEAUTY_CHARM': {
        const input = context as NightWolfBeautyCharmPromptInput;
        if (!input?.actor || !input.candidates) return null;
        return compileWolfBeautyCharmPrompt(input);
      }
      case 'KNIGHT_DUEL': {
        const input = context as KnightDuelPromptInput;
        if (!input?.actor) return null;
        return compileKnightDuelPrompt(input);
      }
      default:
        return null;
    }
  }
}
