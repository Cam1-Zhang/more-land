import type {
  DaySpeechPromptInput,
  ExileVotePromptInput,
  KnightDuelPromptInput,
  LlmPhaseKey,
  NightSeerCheckPromptInput,
  NightWitchActionPromptInput,
  NightWolfBeautyCharmPromptInput,
  NightWolfKillPromptInput,
  PromptResult,
  SheriffVotePromptInput,
  SpeechChannel,
} from '../../llm/types';
import { DaySpeechPhase } from './DaySpeechPhase';
import { NightActionPhase } from './NightActionPhase';
import { VotePhase } from './VotePhase';
import type { GameLlmPhase } from './types';

function channelForPhase(phase: LlmPhaseKey): SpeechChannel {
  switch (phase) {
    case 'SHERIFF_SPEECH':
      return 'sheriff';
    case 'DAY_LAST_WORDS':
      return 'lastwords';
    default:
      return 'discussion';
  }
}

/**
 * wolfcha PhaseManager — routes game phase → prompt builder.
 * GameRoomScreen still owns UI loop; this centralizes LLM prompt assembly.
 */
export class PhaseManager {
  private readonly phases: Partial<Record<LlmPhaseKey, GameLlmPhase>>;

  constructor() {
    const daySpeech = new DaySpeechPhase('DAY_SPEECH');
    this.phases = {
      DAY_SPEECH: daySpeech,
      SHERIFF_SPEECH: new DaySpeechPhase('SHERIFF_SPEECH'),
      DAY_LAST_WORDS: new DaySpeechPhase('DAY_LAST_WORDS'),
      DAY_VOTE: new VotePhase('DAY_VOTE'),
      SHERIFF_VOTE: new VotePhase('SHERIFF_VOTE'),
      NIGHT_WOLF_KILL: new NightActionPhase('NIGHT_WOLF_KILL'),
      NIGHT_SEER_CHECK: new NightActionPhase('NIGHT_SEER_CHECK'),
      NIGHT_WITCH_ACTION: new NightActionPhase('NIGHT_WITCH_ACTION'),
      NIGHT_WOLF_BEAUTY_CHARM: new NightActionPhase('NIGHT_WOLF_BEAUTY_CHARM'),
      KNIGHT_DUEL: new NightActionPhase('KNIGHT_DUEL'),
    };
  }

  getPhase(phase: LlmPhaseKey): GameLlmPhase | null {
    return this.phases[phase] ?? null;
  }

  buildPrompt(phaseKey: LlmPhaseKey, context: unknown): PromptResult {
    const phase = this.getPhase(phaseKey);
    if (!phase) throw new Error(`[PhaseManager] missing phase ${phaseKey}`);
    const prompt = phase.getPrompt(context);
    if (!prompt) throw new Error(`[PhaseManager] null prompt for ${phaseKey}`);
    return prompt;
  }

  /** Build day/sheriff/last-words prompt (wolfcha DaySpeechPhase.getPrompt) */
  buildDaySpeechPrompt(input: DaySpeechPromptInput, phaseKey?: LlmPhaseKey): PromptResult {
    const key = phaseKey ?? this.inferSpeechPhaseKey(input.ctx.channel);
    const phase = this.getPhase(key);
    if (!phase) throw new Error(`[PhaseManager] missing phase ${key}`);
    const channel = channelForPhase(key);
    const merged: DaySpeechPromptInput = {
      ...input,
      ctx: { ...input.ctx, channel },
    };
    const prompt = phase.getPrompt(merged);
    if (!prompt) throw new Error(`[PhaseManager] null prompt for ${key}`);
    return prompt;
  }

  buildExileVotePrompt(input: ExileVotePromptInput): PromptResult {
    return this.buildPrompt('DAY_VOTE', input);
  }

  buildSheriffVotePrompt(input: SheriffVotePromptInput): PromptResult {
    return this.buildPrompt('SHERIFF_VOTE', input);
  }

  buildWolfKillPrompt(input: NightWolfKillPromptInput): PromptResult {
    return this.buildPrompt('NIGHT_WOLF_KILL', input);
  }

  buildSeerCheckPrompt(input: NightSeerCheckPromptInput): PromptResult {
    return this.buildPrompt('NIGHT_SEER_CHECK', input);
  }

  buildWitchActionPrompt(input: NightWitchActionPromptInput): PromptResult {
    return this.buildPrompt('NIGHT_WITCH_ACTION', input);
  }

  buildWolfBeautyCharmPrompt(input: NightWolfBeautyCharmPromptInput): PromptResult {
    return this.buildPrompt('NIGHT_WOLF_BEAUTY_CHARM', input);
  }

  buildKnightDuelPrompt(input: KnightDuelPromptInput): PromptResult {
    return this.buildPrompt('KNIGHT_DUEL', input);
  }

  private inferSpeechPhaseKey(channel?: SpeechChannel): LlmPhaseKey {
    if (channel === 'sheriff') return 'SHERIFF_SPEECH';
    if (channel === 'lastwords') return 'DAY_LAST_WORDS';
    return 'DAY_SPEECH';
  }
}

export const phaseManager = new PhaseManager();
