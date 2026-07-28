/**
 * Per-seat ModelRef at game start — speech / vote / night all use the same model.
 *
 * Provider via EXPO_PUBLIC_LLM_PROVIDER:
 *
 *   dashscope (百炼 Bailian, recommended for 4 difficulty tiers):
 *     Novice → qwen3.6-flash
 *     Easy   → qwen-plus-2025-07-28
 *     Medium → qwen3.7-plus
 *     Hard   → deepseek-v3.2
 *     Override any tier with EXPO_PUBLIC_DASHSCOPE_MODEL_NOVICE etc.
 *
 *   deepseek: Novice–Medium → deepseek-chat, Hard → deepseek-reasoner
 *   siliconflow: Novice–Medium → Qwen2.5-7B, Hard → DeepSeek-V3
 *   ollama: all seats → EXPO_PUBLIC_OLLAMA_MODEL (optional per-tier env)
 */

import { dashscopeModelForDifficulty } from '../llm/dashscopeEnv';
import { ollamaModelForDifficulty } from '../llm/ollamaEnv';
import { normalizedLlmProvider } from '../llm/providerEnv';
import type { DifficultyType, ModelRef } from '../types';

const DEEPSEEK_CHAT: ModelRef = { model: 'deepseek-chat', provider: 'deepseek' };
const DEEPSEEK_REASONER: ModelRef = { model: 'deepseek-reasoner', provider: 'deepseek', temperature: 0.6 };

const SILICONFLOW_FAST: ModelRef = { model: 'Qwen/Qwen2.5-7B-Instruct', provider: 'siliconflow' };
const SILICONFLOW_STRONG: ModelRef = { model: 'deepseek-ai/DeepSeek-V3', provider: 'siliconflow' };

function dashscopeRef(diff: DifficultyType): ModelRef {
  const model = dashscopeModelForDifficulty(diff);
  const temperature =
    diff === 'Novice' ? 0.85 : diff === 'Easy' ? 0.75 : diff === 'Medium' ? 0.7 : 0.65;
  return { model, provider: 'dashscope', temperature };
}

/**
 * Assigns a ModelRef for one AI character from their card difficulty + provider.
 */
export function modelRefForDifficulty(diff: DifficultyType): ModelRef {
  const provider = normalizedLlmProvider();
  if (provider === 'dashscope') return dashscopeRef(diff);
  if (provider === 'ollama') {
    return { model: ollamaModelForDifficulty(diff), provider: 'ollama' };
  }
  if (provider === 'siliconflow') {
    return diff === 'Hard' ? SILICONFLOW_STRONG : SILICONFLOW_FAST;
  }
  return diff === 'Hard' ? DEEPSEEK_REASONER : DEEPSEEK_CHAT;
}

export function buildModelRefMap(
  aiCharacters: Array<{ id: string; difficulty?: DifficultyType }>
): Map<string, ModelRef> {
  const map = new Map<string, ModelRef>();
  for (const c of aiCharacters) {
    map.set(c.id, modelRefForDifficulty(c.difficulty ?? 'Easy'));
  }
  return map;
}

export function resolveModelRef(
  map: ReadonlyMap<string, ModelRef>,
  playerId: string,
  difficulty: DifficultyType = 'Easy'
): ModelRef {
  return map.get(playerId) ?? modelRefForDifficulty(difficulty);
}
