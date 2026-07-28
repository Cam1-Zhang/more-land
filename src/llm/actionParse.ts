/** JSON parsers for vote / night LLM outputs (single user-message completions). */

import type { ActionCandidate, WitchNightLlmDecision } from './types';

export type { ActionCandidate, WitchNightLlmDecision };

export function parseExileVoteJson(text: string, candidates: ActionCandidate[]): string | null {
  const trimmed = text.trim();
  let jsonStr = trimmed;
  const code = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  if (code) jsonStr = code[1]!.trim();
  let obj: unknown;
  try {
    obj = JSON.parse(jsonStr);
  } catch {
    const l = trimmed.indexOf('{');
    const r = trimmed.lastIndexOf('}');
    if (l < 0 || r <= l) return null;
    try {
      obj = JSON.parse(trimmed.slice(l, r + 1));
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  const v = o.vote ?? o.target ?? o.targetName ?? o.name;
  if (typeof v === 'string') return matchCandidateId(v, candidates);
  const seat = o.seat;
  if (typeof seat === 'number' && Number.isFinite(seat) && seat >= 1 && seat <= candidates.length) {
    return candidates[seat - 1]!.id;
  }
  if (typeof seat === 'string') {
    const n = parseInt(seat, 10);
    if (Number.isFinite(n) && n >= 1 && n <= candidates.length) return candidates[n - 1]!.id;
  }
  return null;
}

export function parseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  let jsonStr = trimmed;
  const code = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  if (code) jsonStr = code[1]!.trim();
  try {
    const obj = JSON.parse(jsonStr);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj as Record<string, unknown>;
  } catch {
    const l = trimmed.indexOf('{');
    const r = trimmed.lastIndexOf('}');
    if (l >= 0 && r > l) {
      try {
        const obj = JSON.parse(trimmed.slice(l, r + 1));
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj as Record<string, unknown>;
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

export function matchCandidateId(raw: unknown, candidates: readonly ActionCandidate[]): string | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const voteStr = String(raw).trim();
  if (!voteStr) return null;
  const ex = candidates.find((c) => c.name === voteStr);
  if (ex) return ex.id;
  const byId = candidates.find((c) => c.id === voteStr);
  if (byId) return byId.id;
  const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();
  return candidates.find((c) => norm(c.name) === norm(voteStr))?.id ?? null;
}

export function parseNightTargetJson(text: string, candidates: readonly ActionCandidate[]): string | null {
  const o = parseJsonObject(text);
  if (!o) return null;
  const v = o.target ?? o.targetName ?? o.name ?? o.seat ?? o.vote;
  return matchCandidateId(v, candidates);
}

export function parseWitchNightJson(
  text: string,
  candidates: readonly ActionCandidate[],
  opts: {
    hasAntidote: boolean;
    hasPoison: boolean;
    knifeVictimName: string | null;
    isFirstNight: boolean;
    witchSelfKnifed: boolean;
  }
): WitchNightLlmDecision | null {
  const o = parseJsonObject(text);
  if (!o) return null;
  const actionRaw = o.action ?? o.choice ?? o.decision;
  const action = typeof actionRaw === 'string' ? actionRaw.trim().toLowerCase() : '';

  if (action === 'save' || action === 'heal' || action === 'antidote') {
    if (!opts.hasAntidote) return { save: false, poisonTargetId: null };
    if (opts.witchSelfKnifed && !opts.isFirstNight) return { save: false, poisonTargetId: null };
    return { save: true, poisonTargetId: null };
  }

  if (action === 'pass' || action === 'skip' || action === 'none' || action === 'idle') {
    return { save: false, poisonTargetId: null };
  }

  if (action === 'poison' || action === 'kill') {
    if (!opts.hasPoison) return { save: false, poisonTargetId: null };
    const tid =
      matchCandidateId(o.target ?? o.targetName ?? o.name ?? o.seat, candidates) ??
      matchCandidateId(o.poison ?? o.poisonTarget, candidates);
    return { save: false, poisonTargetId: tid };
  }

  const maybePoison = matchCandidateId(o.target ?? o.targetName, candidates);
  if (maybePoison && opts.hasPoison) {
    return { save: false, poisonTargetId: maybePoison };
  }

  return null;
}

export function parseKnightDuelJson(
  text: string,
  candidates: readonly ActionCandidate[]
): { useSkill: boolean; targetId: string | null } | null {
  const o = parseJsonObject(text);
  if (!o) return null;
  const rawUse = o.useSkill ?? o.use ?? o.duel ?? o.action;
  const useSkill =
    rawUse === true ||
    rawUse === 'true' ||
    rawUse === 1 ||
    rawUse === 'yes' ||
    rawUse === 'duel';
  if (!useSkill) return { useSkill: false, targetId: null };
  const tid = matchCandidateId(o.target ?? o.targetName ?? o.name ?? o.seat, candidates);
  return { useSkill: true, targetId: tid };
}
