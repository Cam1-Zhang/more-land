/**
 * Sandbox roster resolution: custom order, stress targets, presets, import/export.
 */
import type { AICharacter, DifficultyType } from '../types';
import { getAIBehaviorProfile } from '../data/aiBehaviorProfiles';

export type SandboxRosterMode = 'random' | 'custom';
export type SandboxRoleMode = 'random' | 'manual';

export type StressProfileTargets = {
  /** Minimum seats with deception ≥ 70 (can overlap other buckets). */
  manipulative?: number;
  /** Minimum seats with emotionality ≥ 72. */
  emotional?: number;
  /** Minimum seats with caution ≥ 72. */
  cautious?: number;
};

export type SandboxPresetId =
  | 'novice_table'
  | 'easy_table'
  | 'medium_table'
  | 'hard_table'
  | 'mixed_realistic'
  | 'manipulator_showcase'
  | 'emotional_chaos';

const PRESET_IDS: readonly SandboxPresetId[] = [
  'novice_table',
  'easy_table',
  'medium_table',
  'hard_table',
  'mixed_realistic',
  'manipulator_showcase',
  'emotional_chaos',
];

/** Character ids (mockData order) for quick 8-seat tables. */
export const SANDBOX_PRESETS: Record<
  SandboxPresetId,
  { label: string; characterIds: readonly string[]; tags: readonly string[] }
> = {
  novice_table: {
    label: 'Novice table (8)',
    characterIds: ['1', '2', '3', '4', '5', '6', '7', '8'],
    tags: ['preset:novice_table', 'difficulty:all_novice'],
  },
  easy_table: {
    label: 'Easy table (8)',
    characterIds: ['13', '14', '15', '16', '17', '18', '19', '20'],
    tags: ['preset:easy_table', 'difficulty:all_easy'],
  },
  medium_table: {
    label: 'Medium table (8)',
    characterIds: ['25', '26', '27', '28', '29', '30', '31', '32'],
    tags: ['preset:medium_table', 'difficulty:all_medium'],
  },
  hard_table: {
    label: 'Hard table (8)',
    characterIds: ['36', '37', '38', '39', '40', '41', '42', '43'],
    tags: ['preset:hard_table', 'difficulty:all_hard'],
  },
  mixed_realistic: {
    label: 'Mixed realistic (8)',
    characterIds: ['1', '14', '27', '29', '36', '7', '19', '41'],
    tags: ['preset:mixed_realistic', 'difficulty:mixed'],
  },
  manipulator_showcase: {
    label: 'Manipulator showcase (8)',
    characterIds: ['27', '26', '29', '35', '36', '37', '40', '41'],
    tags: ['preset:manipulator_showcase', 'persona:high_deception'],
  },
  emotional_chaos: {
    label: 'Emotional chaos (8)',
    characterIds: ['1', '3', '7', '8', '9', '28', '30', '32'],
    tags: ['preset:emotional_chaos', 'persona:high_emotion'],
  },
};

export function listSandboxPresets(): readonly { id: SandboxPresetId; label: string }[] {
  return PRESET_IDS.map((id) => ({ id, label: SANDBOX_PRESETS[id].label }));
}

function shuffleCopy<T>(arr: readonly T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** Resolve tokens (id or display name) to characters; order follows tokens. */
export function resolveCharactersFromTokens(
  tokens: readonly string[],
  pool: readonly AICharacter[]
): { characters: AICharacter[]; unresolved: string[] } {
  const byId = new Map(pool.map((c) => [norm(c.id), c]));
  const byName = new Map(pool.map((c) => [norm(c.name), c]));
  const out: AICharacter[] = [];
  const unresolved: string[] = [];
  const seen = new Set<string>();
  for (const raw of tokens) {
    const t = raw.trim();
    if (!t) continue;
    const c = byId.get(norm(t)) ?? byName.get(norm(t));
    if (!c) {
      unresolved.push(t);
      continue;
    }
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
  return { characters: out, unresolved };
}

export function defaultWolfCountForPlayers(n: number): number {
  return Math.max(2, Math.min(n - 4, Math.ceil(n * 0.28)));
}

export function buildDifficultyMix(roster: readonly AICharacter[]): Record<DifficultyType, number> {
  const mix: Record<DifficultyType, number> = { Novice: 0, Easy: 0, Medium: 0, Hard: 0 };
  for (const c of roster) {
    mix[c.difficulty] += 1;
  }
  return mix;
}

function poolByProfile(
  pool: readonly AICharacter[],
  pred: (c: AICharacter) => boolean,
  rng: () => number
): AICharacter[] {
  return shuffleCopy(
    pool.filter(pred),
    rng
  );
}

/**
 * Pick `n` distinct characters satisfying stress minimums (overlap allowed), then fill randomly.
 */
export function buildStressWeightedRoster(
  pool: readonly AICharacter[],
  rng: () => number,
  n: number,
  targets: StressProfileTargets
): AICharacter[] {
  const wantM = Math.max(0, Math.floor(targets.manipulative ?? 0));
  const wantE = Math.max(0, Math.floor(targets.emotional ?? 0));
  const wantC = Math.max(0, Math.floor(targets.cautious ?? 0));
  const picked: AICharacter[] = [];
  const seen = new Set<string>();

  const take = (c: AICharacter | undefined) => {
    if (!c || seen.has(c.id)) return;
    seen.add(c.id);
    picked.push(c);
  };

  const mPool = poolByProfile(pool, (c) => getAIBehaviorProfile(c).deception >= 70, rng);
  const ePool = poolByProfile(pool, (c) => getAIBehaviorProfile(c).emotionality >= 72, rng);
  const cPool = poolByProfile(pool, (c) => getAIBehaviorProfile(c).caution >= 72, rng);

  for (let i = 0; i < wantM; i += 1) take(mPool[i]);
  for (let i = 0; i < wantE; i += 1) take(ePool[i]);
  for (let i = 0; i < wantC; i += 1) take(cPool[i]);

  const rest = shuffleCopy(
    pool.filter((c) => !seen.has(c.id)),
    rng
  );
  for (const c of rest) {
    if (picked.length >= n) break;
    take(c);
  }
  return picked.slice(0, n);
}

function lookupManualRole(c: AICharacter, manual: Readonly<Record<string, 'wolf' | 'town'>>): 'wolf' | 'town' | undefined {
  const byId = manual[c.id];
  if (byId) return byId;
  for (const [k, v] of Object.entries(manual)) {
    if (norm(k) === norm(c.name)) return v;
  }
  return undefined;
}

export type WolfAssignmentResult = {
  wolfIds: Set<string>;
  usedManual: boolean;
  fallbackReason?: string;
};

/**
 * Assign wolf seats. Manual keys: character id or name (case-insensitive).
 * Seats without a manual entry default to town, then unassigned seats are promoted to wolf to reach the default wolf count.
 * If counts cannot be reconciled, falls back to random wolves.
 */
export function assignSandboxWolfIds(
  roster: readonly AICharacter[],
  rng: () => number,
  roleMode: SandboxRoleMode | undefined,
  manual: Readonly<Record<string, 'wolf' | 'town'>> | undefined
): WolfAssignmentResult {
  const n = roster.length;
  const wc = defaultWolfCountForPlayers(n);

  if (roleMode !== 'manual' || !manual || Object.keys(manual).length === 0) {
    const shuffled = shuffleCopy([...roster], rng);
    return { wolfIds: new Set(shuffled.slice(0, wc).map((c) => c.id)), usedManual: false };
  }

  const explicit = new Map<string, 'wolf' | 'town'>();
  for (const c of roster) {
    const m = lookupManualRole(c, manual);
    if (m) explicit.set(c.id, m);
  }

  const side = new Map<string, 'wolf' | 'town'>();
  for (const c of roster) {
    side.set(c.id, explicit.get(c.id) ?? 'town');
  }

  const countWolves = () => roster.filter((c) => side.get(c.id) === 'wolf').length;
  let W = countWolves();

  if (W < wc) {
    const unassigned = shuffleCopy(
      roster.filter((c) => !explicit.has(c.id)),
      rng
    );
    for (const c of unassigned) {
      if (W >= wc) break;
      if (side.get(c.id) === 'town') {
        side.set(c.id, 'wolf');
        W += 1;
      }
    }
  }

  if (W < wc) {
    const flexTowns = shuffleCopy(
      roster.filter((c) => side.get(c.id) === 'town' && !explicit.has(c.id)),
      rng
    );
    for (const c of flexTowns) {
      if (W >= wc) break;
      side.set(c.id, 'wolf');
      W += 1;
    }
  }

  if (W < wc) {
    const anyTown = shuffleCopy(
      roster.filter((c) => side.get(c.id) === 'town'),
      rng
    );
    for (const c of anyTown) {
      if (W >= wc) break;
      side.set(c.id, 'wolf');
      W += 1;
    }
  }

  if (W > wc) {
    const softWolves = shuffleCopy(
      roster.filter((c) => side.get(c.id) === 'wolf' && explicit.get(c.id) !== 'wolf'),
      rng
    );
    for (const c of softWolves) {
      if (W <= wc) break;
      side.set(c.id, 'town');
      W -= 1;
    }
  }

  if (W > wc) {
    const anyWolf = shuffleCopy(
      roster.filter((c) => side.get(c.id) === 'wolf'),
      rng
    );
    for (const c of anyWolf) {
      if (W <= wc) break;
      side.set(c.id, 'town');
      W -= 1;
    }
  }

  const finalWolves = new Set(roster.filter((c) => side.get(c.id) === 'wolf').map((c) => c.id));
  W = finalWolves.size;
  const ok = W === wc && W >= 2 && W <= n - 4;
  if (!ok) {
    const shuffled = shuffleCopy([...roster], rng);
    return {
      wolfIds: new Set(shuffled.slice(0, wc).map((c) => c.id)),
      usedManual: false,
      fallbackReason: 'manual_roles_inconsistent',
    };
  }

  return { wolfIds: finalWolves, usedManual: true };
}

export type SandboxRosterResolution = {
  roster: AICharacter[];
  rosterMode: SandboxRosterMode;
  orderPreserved: boolean;
  unresolvedTokens: string[];
  stressApplied: boolean;
};

export function resolveSandboxRoster(
  pool: readonly AICharacter[],
  rng: () => number,
  opts: {
    playerCount: number;
    rosterMode?: SandboxRosterMode;
    customRosterOrder?: readonly string[];
    preserveCustomOrder?: boolean;
    stressProfileTargets?: StressProfileTargets;
  }
): SandboxRosterResolution {
  const nTarget = Math.max(6, Math.min(10, Math.floor(opts.playerCount)));
  const stress =
    opts.stressProfileTargets &&
    ((opts.stressProfileTargets.manipulative ?? 0) > 0 ||
      (opts.stressProfileTargets.emotional ?? 0) > 0 ||
      (opts.stressProfileTargets.cautious ?? 0) > 0);

  if (opts.rosterMode === 'custom' && opts.customRosterOrder && opts.customRosterOrder.length >= 6) {
    const { characters, unresolved } = resolveCharactersFromTokens(opts.customRosterOrder, pool);
    if (characters.length >= 6) {
      let roster = characters.slice(0, 10);
      const preserve = opts.preserveCustomOrder !== false;
      if (!preserve) roster = shuffleCopy(roster, rng);
      if (roster.length > nTarget) roster = roster.slice(0, nTarget);
      return {
        roster,
        rosterMode: 'custom',
        orderPreserved: preserve,
        unresolvedTokens: unresolved,
        stressApplied: false,
      };
    }
    return {
      roster: shuffleCopy([...pool], rng).slice(0, nTarget),
      rosterMode: 'random',
      orderPreserved: false,
      unresolvedTokens: unresolved,
      stressApplied: false,
    };
  }

  if (stress && opts.stressProfileTargets) {
    const roster = buildStressWeightedRoster(pool, rng, nTarget, opts.stressProfileTargets);
    if (roster.length >= 6) {
      return {
        roster,
        rosterMode: 'random',
        orderPreserved: false,
        unresolvedTokens: [],
        stressApplied: true,
      };
    }
  }

  const shuffled = shuffleCopy([...pool], rng);
  return {
    roster: shuffled.slice(0, nTarget),
    rosterMode: 'random',
    orderPreserved: false,
    unresolvedTokens: [],
    stressApplied: false,
  };
}

export type SandboxImportV1 = {
  version: 1;
  rosterMode?: SandboxRosterMode;
  preserveCustomOrder?: boolean;
  playerCount?: number;
  customRosterOrder?: readonly string[];
  roleMode?: SandboxRoleMode;
  manualRolesByIdOrName?: Readonly<Record<string, 'wolf' | 'town'>>;
  stressProfileTargets?: StressProfileTargets;
  matchTags?: readonly string[];
  seed?: number;
  maxPhases?: number;
  speedMs?: number;
  roleRerollOffset?: number;
};

export function parseSandboxImportJson(raw: string): { ok: true; data: SandboxImportV1 } | { ok: false; error: string } {
  try {
    const j = JSON.parse(raw) as unknown;
    if (!j || typeof j !== 'object') return { ok: false, error: 'Not an object' };
    const o = j as Record<string, unknown>;
    if (o.version !== 1 && o.version !== undefined) {
      if (o.version == null) {
        /* allow missing version as v1 */
      } else if (o.version !== 1) return { ok: false, error: 'Unsupported version' };
    }
    return {
      ok: true,
      data: {
        version: 1,
        rosterMode: (o.rosterMode as SandboxRosterMode) ?? 'random',
        preserveCustomOrder: o.preserveCustomOrder !== false,
        playerCount: typeof o.playerCount === 'number' ? o.playerCount : 8,
        customRosterOrder: Array.isArray(o.customRosterOrder) ? (o.customRosterOrder as string[]) : undefined,
        roleMode: (o.roleMode as SandboxRoleMode) ?? 'random',
        manualRolesByIdOrName:
          o.manualRolesByIdOrName && typeof o.manualRolesByIdOrName === 'object'
            ? (o.manualRolesByIdOrName as Record<string, 'wolf' | 'town'>)
            : undefined,
        stressProfileTargets:
          o.stressProfileTargets && typeof o.stressProfileTargets === 'object'
            ? (o.stressProfileTargets as StressProfileTargets)
            : undefined,
        matchTags: Array.isArray(o.matchTags) ? (o.matchTags as string[]) : undefined,
        seed: typeof o.seed === 'number' ? o.seed : undefined,
        maxPhases: typeof o.maxPhases === 'number' ? o.maxPhases : undefined,
        speedMs: typeof o.speedMs === 'number' ? o.speedMs : undefined,
        roleRerollOffset: typeof o.roleRerollOffset === 'number' ? o.roleRerollOffset : undefined,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invalid JSON' };
  }
}

export function exportSandboxConfigJson(payload: SandboxImportV1): string {
  return JSON.stringify(payload, null, 2);
}
