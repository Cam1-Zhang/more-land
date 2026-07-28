/**
 * Per-AI dynamic attention: who they *notice* this phase (speech layer).
 * Does not replace thoughtEngine; biases mic focus and salience.
 */
import type { AIBehaviorProfile } from '../data/aiBehaviorProfiles';
import type { InternalThoughtSnapshot } from './thoughtEngine';
import type { SuspicionState } from './suspicionEngine';
import type { DiscussionFocusSnapshot } from './focusTracker';
import type { ConversationPersonaKind } from './conversationalHumanizer';

function topDefendPartnerForSubjectLocal(
  suspicion: SuspicionState,
  subjectId: string,
  observerId: string
): { partnerId: string; count: number } | null {
  const row = suspicion.defendTally[subjectId];
  if (!row) return null;
  let bestId: string | null = null;
  let best = 0;
  for (const [pid, c] of Object.entries(row)) {
    if (pid === observerId) continue;
    if (c > best) {
      best = c;
      bestId = pid;
    }
  }
  return bestId && best > 0 ? { partnerId: bestId, count: best } : null;
}

function hasCoVoteAllyStub(suspicion: SuspicionState, subjectId: string, observerId: string, minSync: number): boolean {
  const row = suspicion.coVoteSameTarget[subjectId];
  if (!row) return false;
  for (const [other, c] of Object.entries(row)) {
    if (other === observerId || other === subjectId) continue;
    if (c >= minSync) return true;
  }
  return false;
}

function coVoteAllyNamesLocal(
  suspicion: SuspicionState,
  subjectId: string,
  observerId: string,
  idToName: (id: string) => string,
  minSync: number
): string[] {
  const row = suspicion.coVoteSameTarget[subjectId];
  if (!row) return [];
  const out: string[] = [];
  for (const [other, c] of Object.entries(row)) {
    if (other === observerId || other === subjectId) continue;
    if (c >= minSync) out.push(idToName(other));
  }
  return out.sort();
}

export type AttentionTag =
  | 'suspicion_hot'
  | 'attacker_toward_self'
  | 'defended_chain'
  | 'emotional_loud'
  | 'vote_leader'
  | 'room_echo'
  | 'co_vote_stub'
  | 'legacy_pick'
  | 'parallel_stub';

export type AttentionSlot = {
  playerId: string;
  weight: number;
  tags: AttentionTag[];
};

export type AttentionState = {
  slots: AttentionSlot[];
  /** Sticky tunnel target (personality + seed toggles) */
  tunnelPlayerId: string | null;
  /** Last mic primary seat (for revive / stubborn threads) */
  lastSpeechTargetId: string | null;
  lastSpeechTick: number;
  /** Anchor suspicion id that stubborn personas keep bumping */
  stubbornAnchorId: string | null;
};

function hash(parts: readonly string[]): number {
  const s = parts.join('|');
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function createEmptyAttentionState(): AttentionState {
  return {
    slots: [],
    tunnelPlayerId: null,
    lastSpeechTargetId: null,
    lastSpeechTick: 0,
    stubbornAnchorId: null,
  };
}

function mergeSlot(map: Map<string, AttentionSlot>, playerId: string, add: number, tag: AttentionTag): void {
  const cur = map.get(playerId);
  if (!cur) {
    map.set(playerId, { playerId, weight: add, tags: [tag] });
    return;
  }
  cur.weight += add;
  if (!cur.tags.includes(tag)) cur.tags.push(tag);
}

/** Reason tags for a seat that is not necessarily thoughtEngine's primary — keeps formatter honest. */
export function buildSpeechReasonTagsForAlternateTarget(
  suspicion: SuspicionState,
  targetId: string,
  observerId: string,
  daytimeExileBallotDetailPublic = false
): string[] {
  const score = suspicion.scores[targetId] ?? 0;
  const out: string[] = [];
  if (score >= 78) out.push('very_high_suspicion_score');
  else if (score >= 52) out.push('elevated_suspicion_score');
  else out.push('nonzero_suspicion_signal');

  const flip = suspicion.accusationFlipCount[targetId] ?? 0;
  if (daytimeExileBallotDetailPublic && flip >= 2) out.push('changed_vote_or_accusation_line');
  const blind = suspicion.blindFollowCount[targetId] ?? 0;
  if (daytimeExileBallotDetailPublic && blind >= 2) out.push('followed_majority_blindly');

  const defend = topDefendPartnerForSubjectLocal(suspicion, targetId, observerId);
  if (defend && defend.count >= 2) out.push('defended_others_linked_to_hot_seats');

  if (daytimeExileBallotDetailPublic && hasCoVoteAllyStub(suspicion, targetId, observerId, 2))
    out.push('manipulation_read_defense_network');

  if (out.length === 0) out.push('insufficient_structural_signals');
  return out.slice(0, 6);
}

type TickInput = {
  state: AttentionState;
  observerId: string;
  suspicion: SuspicionState;
  thought: InternalThoughtSnapshot;
  focus: DiscussionFocusSnapshot;
  aliveIds: readonly string[];
  idToName: (id: string) => string;
  nameToId: (display: string) => string | undefined;
  thoughtTick: number;
  profile: AIBehaviorProfile;
  personaKind: ConversationPersonaKind;
  seed: number;
  /** When false, do not seed attention from co-vote matrix (daytime secret ballot). */
  daytimeExileBallotDetailPublic?: boolean;
};

/**
 * Rebuild salience slots + apply persistence (stubborn / chaotic / cautious).
 */
export function tickAttentionState(input: TickInput): AttentionState {
  const {
    observerId,
    suspicion,
    thought,
    focus,
    aliveIds,
    idToName,
    nameToId,
    thoughtTick,
    profile,
    personaKind,
    seed,
    daytimeExileBallotDetailPublic = false,
  } = input;
  let state = input.state;

  const m = new Map<string, AttentionSlot>();

  const others = aliveIds.filter((id) => id !== observerId);
  const ranked = [...others].sort((a, b) => (suspicion.scores[b] ?? 0) - (suspicion.scores[a] ?? 0));
  for (let i = 0; i < Math.min(4, ranked.length); i += 1) {
    const id = ranked[i]!;
    const sc = suspicion.scores[id] ?? 0;
    mergeSlot(m, id, clamp(18 + sc * 0.42, 8, 92), 'suspicion_hot');
  }

  const leadId = thought.votePrediction.leadingTargetId;
  if (leadId && leadId !== observerId) {
    mergeSlot(m, leadId, 26, 'vote_leader');
  }

  for (const edge of focus.accusationEdges) {
    if (edge.targetDisplay !== idToName(observerId)) continue;
    const aid = nameToId(edge.accuserDisplay);
    if (aid && aid !== observerId) mergeSlot(m, aid, 34, 'attacker_toward_self');
  }

  for (const n of focus.emotionallyHotNames) {
    const id = nameToId(n);
    if (id && id !== observerId) mergeSlot(m, id, 20, 'emotional_loud');
  }

  for (const n of focus.roomEchoLeaderNames) {
    const id = nameToId(n);
    if (id && id !== observerId) mergeSlot(m, id, 14, 'room_echo');
  }

  for (const n of focus.voteHeatNames) {
    const id = nameToId(n);
    if (id && id !== observerId) mergeSlot(m, id, 12, 'vote_leader');
  }

  for (const id of ranked.slice(0, 3)) {
    const defend = topDefendPartnerForSubjectLocal(suspicion, id, observerId);
    if (defend && defend.count >= 2 && defend.partnerId !== observerId) {
      mergeSlot(m, defend.partnerId, 16, 'defended_chain');
    }
  }

  const thoughtCoNames = daytimeExileBallotDetailPublic
    ? coVoteAllyNamesLocal(suspicion, thought.targetId, observerId, idToName, 2)
    : [];
  for (const nm of thoughtCoNames.slice(0, 2)) {
    const id = nameToId(nm);
    if (id && id !== observerId) mergeSlot(m, id, 12, 'co_vote_stub');
  }

  // Parallel thread stubs: pick mid suspicion not in top1 — encourages split focus
  if (ranked.length >= 3) {
    const mid = ranked[Math.min(ranked.length - 1, 2 + (seed % 2))]!;
    if (mid !== ranked[0]) mergeSlot(m, mid, 10 + (seed % 9), 'parallel_stub');
  }

  let slots = [...m.values()].sort((a, b) => b.weight - a.weight).slice(0, 8);

  // --- Persistence ---
  const jitter = hash([String(seed), observerId, String(thoughtTick), 'att']) % 1000;

  if (personaKind === 'aggressive' && profile.revengeBias >= 62) {
    for (const s of slots) {
      if (s.tags.includes('attacker_toward_self')) s.weight += 22;
    }
  }

  if (profile.randomness >= 68 || personaKind === 'emotional') {
    // Chaotic: permute mid-tier weights slightly
    const k = jitter % slots.length;
    if (slots.length > 1) {
      const tmp = slots[0]!.weight;
      slots[0]!.weight = slots[k]!.weight;
      slots[k]!.weight = tmp;
    }
  }

  if (profile.caution >= 78 && profile.aggression < 45) {
    // Cautious: flatten spikes, widen tail
    slots = slots.map((s) => ({ ...s, weight: clamp(s.weight * 0.88 + 6, 6, 100) }));
  }

  if (profile.voteChangeResistance >= 72 && profile.logic >= 55) {
    // Stubborn: anchor top suspicion seat
    const topSus = ranked[0];
    if (topSus) {
      state = { ...state, stubbornAnchorId: topSus };
      for (const s of slots) {
        if (s.playerId === topSus) s.weight += 18;
      }
    }
  }

  // Tunnel stickiness: logical/manipulative sometimes lock one rival for a few ticks
  const tunnelStick =
    (personaKind === 'logical' && profile.reasoningDepth >= 2) ||
    (personaKind === 'manipulative' && profile.deception >= 66);
  if (tunnelStick && state.tunnelPlayerId && others.includes(state.tunnelPlayerId)) {
    for (const s of slots) {
      if (s.playerId === state.tunnelPlayerId) s.weight += 24;
    }
  } else if (tunnelStick && ranked[0] && jitter % 5 === 0) {
    state = { ...state, tunnelPlayerId: ranked[0]! };
  }

  slots.sort((a, b) => b.weight - a.weight);

  return {
    ...state,
    slots,
    lastSpeechTick: thoughtTick,
  };
}

/** After a speech pick resolves, persist mic memory for next turns */
export function persistSpeechTargetInAttention(
  state: AttentionState,
  pickedTargetId: string,
  thoughtTick: number
): AttentionState {
  return {
    ...state,
    lastSpeechTargetId: pickedTargetId,
    lastSpeechTick: thoughtTick,
  };
}

/** Strengthen tunnel stickiness after a speech pick locks onto someone. */
export function reinforceAttentionTunnel(state: AttentionState, id: string | null): AttentionState {
  return { ...state, tunnelPlayerId: id };
}
