/**
 * Maps personality + room focus + attention slots into discussion branches
 * and a concrete speech target (may diverge from thoughtEngine primary).
 */
import type { AppLanguage } from '../i18n/appStrings';
import type { AIBehaviorProfile } from '../data/aiBehaviorProfiles';
import type { InternalThoughtSnapshot } from './thoughtEngine';
import type { SuspicionState } from './suspicionEngine';
import type { DiscussionFocusSnapshot } from './focusTracker';
import type { AttentionState, AttentionSlot } from './attentionEngine';
import { buildSpeechReasonTagsForAlternateTarget } from './attentionEngine';
import type { ConversationPersonaKind } from './conversationalHumanizer';
import type { DialogueSpeechChannel } from './dialogueContextBuilder';

export type DiscussionThreadKind =
  | 'core_suspicion'
  | 'vote_shape'
  | 'social_echo'
  | 'self_lane'
  | 'power_redirect'
  | 'revive_grudge'
  | 'tunnel';

export type SelectiveResponseMode = 'engage' | 'minimal_ack' | 'redirect' | 'split_branch' | 'ignore_momentum';

export type DiscussionPriorityPlan = {
  primaryThread: DiscussionThreadKind;
  selectiveMode: SelectiveResponseMode;
  /** When true, renderer should not treat prior speaker as mandatory pivot */
  antiEchoPriorSpeaker: boolean;
  /** Permission to open a second suspicion thread verbally */
  allowTopicShift: boolean;
  branchHintZh: string;
  branchHintEn: string;
};

export type SpeechAttentionPick = {
  speechTargetId: string;
  speechTargetName: string;
  reasonTags: readonly string[];
  divergedFromThought: boolean;
  plan: DiscussionPriorityPlan;
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

function pickBranchHints(
  thread: DiscussionThreadKind,
  lang: AppLanguage,
  seed: number
): { zh: string; en: string } {
  const r = seed % 5;
  if (lang === 'zh') {
    switch (thread) {
      case 'vote_shape':
        return {
          zh: '【分线】你更想从票型/站边摆动入手，不必复述上一位的句子。',
          en: '',
        };
      case 'social_echo':
        return {
          zh: '【分线】你更在意场上气氛和谁在带节奏，可以轻踩共识。',
          en: '',
        };
      case 'self_lane':
        return {
          zh: '【分线】你先顾自己的生存叙述：谁压你、你怎么接，再点到别人。',
          en: '',
        };
      case 'power_redirect':
        return {
          zh: '【分线】你想把火力从当前共识挪开，点名另一条更值得盯的人。',
          en: '',
        };
      case 'revive_grudge':
        return {
          zh: '【分线】你故意捡起上一轮没吵完的线，不必顺着最新话题走。',
          en: '',
        };
      case 'tunnel':
        return {
          zh: '【分线】你对一个人盯死追问，其他名字只带过。',
          en: '',
        };
      default:
        return {
          zh:
            r === 0
              ? '【分线】你主盯最可疑的那张牌，但用口语别像复盘。'
              : '【分线】你以疑点链为主，允许漏听半句麦上噪音。',
          en: '',
        };
    }
  }
  switch (thread) {
    case 'vote_shape':
      return {
        zh: '',
        en: '[Branch] Lean on vote shapes / pivots—do not mirror the previous speaker line-for-line.',
      };
    case 'social_echo':
      return {
        zh: '',
        en: '[Branch] Focus room momentum and who steers the table; you may brush against the consensus.',
      };
    case 'self_lane':
      return {
        zh: '',
        en: '[Branch] Start from your own pressure story, then touch others briefly.',
      };
    case 'power_redirect':
      return {
        zh: '',
        en: '[Branch] Redirect heat off the current wagon; name a different hinge player.',
      };
    case 'revive_grudge':
      return {
        zh: '',
        en: '[Branch] Revive an older beef—ignore the freshest thread if it helps.',
      };
    case 'tunnel':
      return {
        zh: '',
        en: '[Branch] Tunnel one player; others only in passing.',
      };
    default:
      return {
        zh: '',
        en:
          r === 0
            ? '[Branch] Primary suspicion thread, spoken—not analyst notes.'
            : '[Branch] Suspicion chain first; messy human mic ok.',
      };
  }
}

function demoteSocialEchoOnDayOne(
  thread: DiscussionThreadKind,
  dayNumber: number,
  seed: number
): DiscussionThreadKind {
  if (dayNumber !== 1 || thread !== 'social_echo') return thread;
  const alt = hash([String(seed), 'day1-no-echo']) % 3;
  return alt === 0 ? 'vote_shape' : alt === 1 ? 'core_suspicion' : 'self_lane';
}

export function buildDiscussionPriorityPlan(input: {
  lang: AppLanguage;
  profile: AIBehaviorProfile;
  personaKind: ConversationPersonaKind;
  focus: DiscussionFocusSnapshot;
  thought: InternalThoughtSnapshot;
  attention: AttentionState;
  priorSpeakerName: string | null;
  speechIndex: number;
  channel: DialogueSpeechChannel;
  seed: number;
  /** 第一天降低跟风 social_echo */
  dayNumber?: number;
}): DiscussionPriorityPlan {
  const { profile, personaKind, focus, thought, speechIndex, channel, seed } = input;
  const dayNumber = Math.max(1, input.dayNumber ?? 99);
  const dayOne = dayNumber === 1;
  const h = hash([String(seed), String(speechIndex), thought.targetId, 'plan']) % 100;
  const echoCut = dayOne ? 14 : 0;

  if (channel === 'lastwords') {
    const hints = pickBranchHints('self_lane', input.lang, seed);
    return {
      primaryThread: 'self_lane',
      selectiveMode: 'engage',
      antiEchoPriorSpeaker: true,
      allowTopicShift: false,
      branchHintZh: hints.zh,
      branchHintEn: hints.en,
    };
  }

  if (channel === 'sheriff') {
    return {
      primaryThread: 'self_lane',
      selectiveMode: 'engage',
      antiEchoPriorSpeaker: !!input.priorSpeakerName,
      allowTopicShift: false,
      branchHintZh: '【分线】警上竞选：亮身份倾向、说拿徽后怎么带队；禁止说不要警徽或退水。',
      branchHintEn: '[Branch] Sheriff campaign: identity stance + what you would do with the badge; never decline the badge.',
    };
  }

  let primaryThread: DiscussionThreadKind = 'core_suspicion';
  if (personaKind === 'logical' && (h < 38 || profile.logic >= 78)) primaryThread = h < 52 ? 'vote_shape' : 'core_suspicion';
  else if (personaKind === 'emotional')
    primaryThread = h < 44 - echoCut ? 'social_echo' : h < 74 ? 'self_lane' : 'core_suspicion';
  else if (personaKind === 'manipulative')
    primaryThread = h < 48 ? 'power_redirect' : h < 82 - echoCut ? 'social_echo' : 'tunnel';
  else if (personaKind === 'shy' || (profile.caution >= 80 && profile.survivalInstinct >= 70)) {
    primaryThread = h < 55 ? 'self_lane' : 'vote_shape';
  } else if (personaKind === 'aggressive') primaryThread = h < 35 ? 'tunnel' : 'core_suspicion';
  else {
    if (h < 22) primaryThread = 'vote_shape';
    else if (h < 40 - echoCut) primaryThread = 'social_echo';
    else if (h < 58) primaryThread = 'revive_grudge';
  }

  if (focus.accusationEdges.length >= 3 && personaKind === 'manipulative') primaryThread = 'power_redirect';
  primaryThread = demoteSocialEchoOnDayOne(primaryThread, dayNumber, seed);

  const antiEchoBase =
    profile.randomness * 0.22 +
    (personaKind === 'logical' ? 26 : 0) +
    (personaKind === 'manipulative' ? 18 : 0) +
    (personaKind === 'emotional' ? 12 : 0);
  const antiEchoPriorSpeaker =
    !!input.priorSpeakerName &&
    (hash([String(seed), 'anti', input.priorSpeakerName]) % 100) <
      clamp(antiEchoBase + speechIndex * 5, 32, 88);

  let selectiveMode: SelectiveResponseMode = 'engage';
  const hm = hash([String(seed), 'sel']) % 100;
  if (personaKind === 'shy' && profile.sociability < 44 && hm < 22) selectiveMode = 'minimal_ack';
  else if (
    personaKind === 'manipulative' &&
    focus.roomEchoLeaderNames.length >= 2 &&
    hm < (dayOne ? 22 : 34)
  ) {
    selectiveMode = 'redirect';
  }
  else if (primaryThread === 'revive_grudge' && hm < 50) selectiveMode = 'ignore_momentum';
  else if (hm < 18 && speechIndex > 1) selectiveMode = 'split_branch';

  const allowTopicShift =
    selectiveMode === 'redirect' ||
    selectiveMode === 'split_branch' ||
    primaryThread === 'power_redirect' ||
    primaryThread === 'revive_grudge';

  const hints = pickBranchHints(primaryThread, input.lang, seed);
  return {
    primaryThread,
    selectiveMode,
    antiEchoPriorSpeaker,
    allowTopicShift,
    branchHintZh: hints.zh,
    branchHintEn: hints.en,
  };
}

function slotScore(
  slot: AttentionSlot,
  personaKind: ConversationPersonaKind,
  profile: AIBehaviorProfile,
  dayNumber: number
): number {
  let w = slot.weight;
  const dayOne = dayNumber === 1;
  for (const t of slot.tags) {
    if (t === 'emotional_loud' && (personaKind === 'emotional' || profile.emotionality >= 76)) w += 10;
    if (t === 'vote_leader' && (personaKind === 'logical' || profile.logic >= 70)) w += 12;
    if (t === 'room_echo') {
      if (dayOne) w -= 6;
      else if (personaKind === 'manipulative' || personaKind === 'neutral' || profile.sociability >= 72) w += 11;
    }
    if (t === 'attacker_toward_self' && (personaKind === 'emotional' || profile.revengeBias >= 60)) w += 16;
    if (t === 'parallel_stub' && personaKind === 'logical') w += 8;
    if (t === 'suspicion_hot' && personaKind === 'aggressive') w += 9;
    if (t === 'vote_leader' && (personaKind === 'shy' || profile.survivalInstinct >= 75)) w += 9;
  }
  return w;
}

/**
 * Choose which seat this AI should *talk about* this turn (speech layer).
 */
export function resolveSpeechAttentionPick(input: {
  thought: InternalThoughtSnapshot;
  suspicion: SuspicionState;
  attention: AttentionState;
  plan: DiscussionPriorityPlan;
  personaKind: ConversationPersonaKind;
  profile: AIBehaviorProfile;
  observerId: string;
  priorSpeakerName: string | null;
  idToName: (id: string) => string;
  nameToId: (display: string) => string | undefined;
  channel: DialogueSpeechChannel;
  lang: AppLanguage;
  seed: number;
  daytimeExileBallotDetailPublic?: boolean;
  dayNumber?: number;
}): SpeechAttentionPick {
  const {
    thought,
    suspicion,
    attention,
    plan,
    personaKind,
    profile,
    observerId,
    priorSpeakerName,
    idToName,
    nameToId,
    channel,
    seed,
    daytimeExileBallotDetailPublic = false,
  } = input;

  const priorId = priorSpeakerName ? nameToId(priorSpeakerName) : undefined;

  if (channel === 'lastwords') {
    return {
      speechTargetId: thought.targetId,
      speechTargetName: thought.target,
      reasonTags: thought.reasons,
      divergedFromThought: false,
      plan,
    };
  }

  if (channel === 'sheriff') {
    return {
      speechTargetId: observerId,
      speechTargetName: idToName(observerId),
      reasonTags: input.lang === 'zh' ? ['警上拉票', '身份倾向'] : ['campaign', 'identity stance'],
      divergedFromThought: true,
      plan,
    };
  }

  const dayNumber = Math.max(1, input.dayNumber ?? 99);
  let slots = attention.slots.map((s) => ({
    ...s,
    weight: slotScore(s, personaKind, profile, dayNumber),
  }));

  if (plan.antiEchoPriorSpeaker && priorId) {
    slots = slots.map((s) => (s.playerId === priorId ? { ...s, weight: Math.max(4, s.weight * 0.35) } : s));
  }

  slots.sort((a, b) => b.weight - a.weight);

  const thoughtBoost =
    48 +
    thought.confidence * 0.22 +
    (plan.primaryThread === 'core_suspicion' || plan.primaryThread === 'tunnel' ? 22 : 0);

  const top = slots[0];
  const second = slots[1];

  let pickId = thought.targetId;
  let diverged = false;

  const roll = hash([String(seed), thought.targetId, 'pick']) % 100;

  if (
    plan.primaryThread === 'revive_grudge' &&
    attention.lastSpeechTargetId &&
    attention.lastSpeechTargetId !== thought.targetId
  ) {
    const aliveish = (suspicion.scores[attention.lastSpeechTargetId] ?? 0) >= 0;
    if (aliveish && roll < 58) {
      pickId = attention.lastSpeechTargetId;
      diverged = pickId !== thought.targetId;
    }
  }

  if (!diverged && plan.primaryThread === 'tunnel' && attention.tunnelPlayerId && roll < 72) {
    pickId = attention.tunnelPlayerId;
    diverged = pickId !== thought.targetId;
  }

  if (!diverged && top && top.weight >= thoughtBoost + (roll % 31) - (plan.primaryThread === 'vote_shape' ? 14 : 0)) {
    pickId = top.playerId;
    diverged = pickId !== thought.targetId;
  } else if (!diverged && plan.selectiveMode === 'split_branch' && second && second.weight + 18 >= (top?.weight ?? 0)) {
    pickId = second.playerId;
    diverged = pickId !== thought.targetId;
  }

  if (pickId === observerId) {
    pickId = thought.targetId;
    diverged = false;
  }

  const speechTargetName = idToName(pickId);
  const reasonTags = diverged
    ? buildSpeechReasonTagsForAlternateTarget(suspicion, pickId, observerId, daytimeExileBallotDetailPublic)
    : thought.reasons;

  return {
    speechTargetId: pickId,
    speechTargetName,
    reasonTags,
    divergedFromThought: diverged,
    plan,
  };
}

export function buildAttentionPromptAppend(lang: AppLanguage, pick: SpeechAttentionPick): string {
  const { plan, divergedFromThought, speechTargetName } = pick;
  if (lang === 'zh') {
    const bits: string[] = [];
    bits.push(plan.branchHintZh);
    if (plan.antiEchoPriorSpeaker) bits.push('【注意】你不必接龙上一位的发言题目；可以另起一条线。');
    if (plan.selectiveMode === 'minimal_ack') bits.push('【注意】你可以只短回应半句，然后把火力投向你更关心的人。');
    if (plan.selectiveMode === 'redirect') bits.push('【注意】你可以把话题轻轻拐走，别帮房间把同一个名字复读成共识。');
    if (plan.selectiveMode === 'ignore_momentum') bits.push('【注意】你可以装作没跟上最新节奏，坚持你旧的怀疑点。');
    if (plan.selectiveMode === 'split_branch') bits.push('【注意】同时带两条弱线也行：一条新刺点，一条旧账。');
    if (divergedFromThought)
      bits.push(
        `【分线焦点】这轮你嘴上主盯「${speechTargetName}」——不必和内心排序完全一致，但要像真人抓错焦点那样自然。`
      );
    return bits.filter(Boolean).join('');
  }
  const bits: string[] = [];
  if (plan.branchHintEn) bits.push(plan.branchHintEn);
  if (plan.antiEchoPriorSpeaker)
    bits.push('[Attention] You do NOT need to answer the previous speaker’s prompt directly—fork the thread.');
  if (plan.selectiveMode === 'minimal_ack')
    bits.push('[Attention] You may acknowledge briefly, then pivot to who YOU care about.');
  if (plan.selectiveMode === 'redirect') bits.push('[Attention] Gently steer the room off the loudest wagon.');
  if (plan.selectiveMode === 'ignore_momentum')
    bits.push('[Attention] You can miss the freshest beat on purpose—press an older suspicion.');
  if (plan.selectiveMode === 'split_branch') bits.push('[Attention] Two loose threads in one breath is ok.');
  if (divergedFromThought)
    bits.push(
      `[Attention] Verbal focus seat: "${speechTargetName}"—humans mis-allocate focus; sound natural, not contradictory for sport.`
    );
  return bits.join(' ');
}
