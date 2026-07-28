/**
 * One-shot speech intent derived from persona + thought + public memory.
 * Fed to the LLM as a single natural-language line (not copied verbatim as speech).
 */
import type { AppLanguage } from '../i18n/appStrings';
import type { AIBehaviorProfile } from '../data/aiBehaviorProfiles';
import type { InternalThoughtSnapshot } from './thoughtEngine';
import type { MemoryStore } from './memoryEngine';
import {
  getPlayersWhoAccusedObserver,
  getPlayersWhoBackedObserver,
} from './memoryEngine';
import { deriveDecisionWeights } from './nightTargetStrategy';

export type StrategicIntentGoal =
  | 'accuse_specific'
  | 'defend_self'
  | 'claim_role'
  | 'follow_seer'
  | 'follow_sheriff'
  | 'stay_quiet'
  | 'sow_confusion'
  | 'sheriff_campaign'
  | 'repay_ally'
  | 'settle_score';

export type StrategicIntent = {
  primaryGoal: StrategicIntentGoal;
  accuseTargetId?: string;
  accuseTargetName?: string;
  toneHint: 'soft' | 'firm' | 'aggressive' | 'evasive';
  /** Prompt line — LLM uses as direction, not copy-paste script. */
  promptLine: string;
};

export type BuildStrategicIntentInput = {
  lang: AppLanguage;
  channel: 'discussion' | 'sheriff' | 'lastwords';
  observerId: string;
  observerRole: string;
  profile: AIBehaviorProfile;
  thought: InternalThoughtSnapshot;
  speechTargetId: string;
  speechTargetName: string;
  accusedThisRound: boolean;
  memory: MemoryStore;
  idToName: (id: string) => string;
  votePressure: number;
  isWolf: boolean;
  dayRoundApprox: number;
};

function toneFromProfile(p: AIBehaviorProfile): StrategicIntent['toneHint'] {
  const w = deriveDecisionWeights(p);
  if (w.deceptionDrive > 0.55 && w.carefulness > 0.5) return 'evasive';
  if (w.loudness > 0.62 && w.riskAppetite > 0.45) return 'aggressive';
  if (w.carefulness > 0.62 || p.confidence < 35) return 'soft';
  return 'firm';
}

/** Build a one-line strategic intent for the LLM user message. */
export function buildStrategicIntent(input: BuildStrategicIntentInput): StrategicIntent {
  const tone = toneFromProfile(input.profile);
  const w = deriveDecisionWeights(input.profile);
  const isZh = input.lang === 'zh';
  const accusers = getPlayersWhoAccusedObserver(input.memory, input.observerId, { limit: 4 });
  const backers = getPlayersWhoBackedObserver(input.memory, input.observerId, { limit: 3 });

  if (input.channel === 'sheriff') {
    const line = isZh
      ? input.isWolf
        ? '竞选发言：你已经选择上警，必须争取警徽。按人设决定跳神或悍跳，说明拿徽后第一天怎么带队；禁止说不想拿警徽或退水。'
        : '竞选发言：你已经选择上警，必须争取警徽。说明身份倾向（可表水但不跳神），说清楚拿徽后第一天怎么带队；禁止说不想拿警徽或退水。'
      : input.isWolf
        ? 'Campaign: you signed up — fight for the badge. Bluff or claim per persona; say your day-one plan. Never say you do not want the badge.'
        : 'Campaign: you signed up — fight for the badge. State your identity lean (plain villager OK); say your day-one plan. Never step down in speech.';
    return { primaryGoal: 'sheriff_campaign', toneHint: tone, promptLine: line };
  }

  if (input.channel === 'lastwords') {
    const line = isZh
      ? `遗言：按「${input.speechTargetName}」这条线做最后表态，别像裁判总结。`
      : `Last words: make your final stand on the ${input.speechTargetName} thread — not a moderator recap.`;
    return { primaryGoal: 'accuse_specific', accuseTargetId: input.speechTargetId, accuseTargetName: input.speechTargetName, toneHint: tone, promptLine: line };
  }

  if (input.accusedThisRound) {
    const topAccuser = accusers[0] ? input.idToName(accusers[0]) : null;
    const line = isZh
      ? topAccuser
        ? `你被点名了——先自辩，${w.revengeDrive > 0.45 ? `可以反压${topAccuser}的逻辑漏洞` : '把矛盾点说清楚'}。`
        : '你被点名了——先自辩，说明为什么你不是狼，别空泛喊冤。'
      : topAccuser
        ? `You were called out — defend yourself${w.revengeDrive > 0.45 ? `; you may push back on ${topAccuser}'s logic` : '; explain the contradiction'}.`
        : 'You were called out — defend with specifics, not generic denial.';
    return { primaryGoal: 'defend_self', toneHint: tone, promptLine: line };
  }

  // Public-memory revenge: only from speech accusations, never hidden ballots.
  if (accusers.length > 0 && w.revengeDrive > 0.38 && input.profile.emotionality > 45) {
    const aid = accusers[0]!;
    const an = input.idToName(aid);
    const line = isZh
      ? `${an}之前公开咬过你——按你的人设决定要不要回敬、怎么回敬。`
      : `${an} publicly pressed you before — decide whether and how to push back, per your persona.`;
    return {
      primaryGoal: 'settle_score',
      accuseTargetId: aid,
      accuseTargetName: an,
      toneHint: w.revengeDrive > 0.6 ? 'aggressive' : tone,
      promptLine: line,
    };
  }

  if (backers.length > 0 && w.groupConformity > 0.35 && input.profile.sociability > 40) {
    const bid = backers[0]!;
    const bn = input.idToName(bid);
    const line = isZh
      ? `${bn}曾公开站过你——可以顺带巩固这条同盟线，或借TA的逻辑延伸你的判断。`
      : `${bn} publicly backed you — you may reinforce that alliance or extend their read.`;
    return { primaryGoal: 'repay_ally', accuseTargetId: bid, accuseTargetName: bn, toneHint: 'soft', promptLine: line };
  }

  if (input.isWolf && w.deceptionDrive > 0.42 && input.votePressure < 55) {
    const line = isZh
      ? '搅浑水：带一个模糊方向或假信息，但别编造不存在的查验/票型。'
      : 'Sow doubt: steer with a vague angle or misdirection — do not invent checks or vote maps.';
    return { primaryGoal: 'sow_confusion', toneHint: 'evasive', promptLine: line };
  }

  if (input.observerRole === 'Seer' && input.dayRoundApprox <= 2 && input.profile.leadership > 50) {
    const line = isZh
      ? '你是预言家视角：决定是否跳身份、报验或留一手，按谨慎程度来。'
      : 'Seer lens: decide whether to claim, report a check, or hold — match your caution level.';
    return { primaryGoal: 'claim_role', toneHint: tone, promptLine: line };
  }

  if (w.loudness < 0.28 && input.votePressure < 35 && input.profile.speakFrequency < 45) {
    const line = isZh
      ? '低存在感：简短表态或观望，别强行带全场节奏。'
      : 'Low profile: keep it brief or observational — do not force a table-wide push.';
    return { primaryGoal: 'stay_quiet', toneHint: 'soft', promptLine: line };
  }

  const target = input.speechTargetName;
  const highPressure = input.votePressure >= 55;
  const line = isZh
    ? highPressure
      ? `主攻方向：追问${target}，把逻辑落点说清楚，别空喊"很可疑"。`
      : `当前重点：围绕${target}展开你的独立判断，给出一个具体疑点或站边理由。`
    : highPressure
      ? `Main push: press ${target} with a concrete logical hook — not vague "sus".`
      : `Focus: build your own read on ${target} with one specific doubt or lean.`;

  return {
    primaryGoal: 'accuse_specific',
    accuseTargetId: input.speechTargetId,
    accuseTargetName: target,
    toneHint: tone,
    promptLine: line,
  };
}
