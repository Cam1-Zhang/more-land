/**
 * Top-level conversational humanization: style instructions for LLM + light line roughening for local/output.
 * Does not alter reasoning engines.
 */
import type { AppLanguage } from '../i18n/appStrings';
import type { AIBehaviorProfile } from '../data/aiBehaviorProfiles';
import {
  applyRhythmToLine,
  hesitationPrefixEn,
  hesitationPrefixZh,
  pickSpeechRhythm,
  trailingSoftenerEn,
  trailingSoftenerZh,
} from './speechImperfectionSystem';
import { randomSocialInsert } from './socialNoiseEngine';
import { emotionalLeadIn, emotionalTail, type EmotionalSpeechContext } from './emotionalSpeechLayer';

export type ConversationPersonaKind =
  | 'shy'
  | 'aggressive'
  | 'manipulative'
  | 'emotional'
  | 'logical'
  | 'neutral';

type VerbalEdge = 'clean' | 'snide' | 'heated' | 'profane';

/**
 * Decide how abrasive this specific turn may sound. Profanity is deliberately
 * reserved for hot-headed personas under pressure so it stays characterful.
 */
function verbalEdgeForTurn(
  kind: ConversationPersonaKind,
  profile: AIBehaviorProfile,
  emotional: EmotionalSpeechContext,
  seed: number
): VerbalEdge {
  const heated = emotional.accusedThisRound || emotional.voteHeatHigh || emotional.dangerLevel >= 72;
  const roll = seed % 100;
  if (
    kind === 'aggressive' &&
    profile.aggression >= 82 &&
    profile.emotionality >= 68 &&
    heated &&
    roll < 52
  ) {
    return 'profane';
  }
  if (kind === 'aggressive' && (heated || roll < 34)) return 'heated';
  if (kind === 'emotional' && heated && roll < 36) return 'heated';
  if (kind === 'manipulative' && roll < 48) return 'snide';
  return 'clean';
}

export function classifyConversationPersona(
  personalityLabel: string,
  profile: AIBehaviorProfile
): ConversationPersonaKind {
  const s = personalityLabel.toLowerCase();
  if (/shy|timid|内向|胆怯|害羞|腼腆/i.test(personalityLabel) || (profile.sociability < 34 && profile.aggression < 40)) {
    return 'shy';
  }
  if (/agg|aggressive|暴躁|强硬|冲|烈/i.test(personalityLabel) || profile.aggression >= 72) {
    return 'aggressive';
  }
  if (/manipul|deceiv|圆滑|阴|套路|油/i.test(s) || profile.deception >= 70) {
    return 'manipulative';
  }
  if (/emotion|冲动|敏感|热|急/i.test(s) || profile.emotionality >= 76) {
    return 'emotional';
  }
  if (/logic|理性|冷|分析/i.test(s) || profile.logic >= 74) {
    return 'logical';
  }
  return 'neutral';
}

/** Prompt block: steer remote renderer toward messy human table talk. */
export function buildConversationalStylePrompt(
  lang: AppLanguage,
  personalityLabel: string,
  profile: AIBehaviorProfile,
  emotional: EmotionalSpeechContext,
  seed: number,
  styleMeta?: { characterId?: string; elenaSteerTurn?: boolean }
): string {
  const kind = classifyConversationPersona(personalityLabel, profile);
  const verbalEdge = verbalEdgeForTurn(kind, profile, emotional, seed);
  const elena = styleMeta?.characterId === '27';
  const elenaSteer = elena && styleMeta?.elenaSteerTurn === true;
  if (lang === 'zh') {
    const bits: string[] = [];
    bits.push(
      '【说话真实感】你不是播音员也不是复盘员。用自然口语，可以带火气、怂、抱怨或阴阳怪气；允许顺嘴改口一次，但别故意演结巴。不要像写论文一样层层递进，不要凡事“综上所述”。'
    );
    if (kind === 'shy') bits.push('你偏胆小：句子可以短、留半句、带点不确定。');
    if (kind === 'aggressive') bits.push('你偏冲：直给、带压迫，盯着对方这局的发言和玩法喷。');
    if (kind === 'manipulative') bits.push('你偏圆滑：表面软、话里藏针，别演成鸡汤。');
    if (verbalEdge === 'profane') {
      bits.push(
        '【本轮语言尺度：可爆粗】这轮确实被惹火了，可以自然地骂一句脏话，例如“XXX，你他妈会不会玩”“你这说的什么屁话”“妈的，别硬装了”“纯扯淡”。最多一句、不要每句话都骂。只骂对方本局的发言或玩法；禁止仇恨词、家人攻击、性羞辱和现实威胁。'
      );
    } else if (verbalEdge === 'heated') {
      bits.push('【本轮语言尺度：火大】可以说“你会不会玩”“少扯淡”“别装了”“这什么破逻辑”，但不必硬塞脏话。');
    } else if (verbalEdge === 'snide') {
      bits.push('【本轮语言尺度：阴阳】不爆粗，用反问、冷笑或轻蔑表达刺对方，例如“你自己信吗”“这也能圆？”。');
    } else {
      bits.push('【本轮语言尺度：克制】按你的性格正常说话，不要为了像真人而强行骂人。');
    }
    if (elena) {
      bits.push(
        elenaSteer
          ? '【本句分寸】可自然夹一小拍桌感（锁得快、想先听谁说、压力感像推票不像狼线、谁急着挡了一下、先别完全收口）——像随口观感，**一句分量**就够；说完立刻回到你对具体人的具体疑点。**禁止**归票腔、警长分配流程、全场主持口吻。'
          : '【常态】你话术强但要像上牌里难读的一员：不要每轮控议程、不要场主口吻；多数轮次只做普通队员式追问与接话。'
      );
    }
    if (profile.sociability > 76 && profile.leadership > 65 && profile.confidence >= 68) {
      bits.push(
        '你有观众缘也有带场感：可以用轻声量“收一收/摊开”话题——比如先听谁把话说满、别把谁放太干净、感觉桌在推动但别下命令；像聊天一样轻推议程，不要领头归票腔。'
      );
    }
    if (kind === 'emotional') bits.push('你偏情绪：嘴比脑子快一点、偶尔收不住，但不要自我打断，也不要重复整句话。');
    if (kind === 'logical') bits.push('你偏理性：可以清楚，但仍要像聊天，不要报告口吻。');
    if (emotional.accusedThisRound) bits.push('你刚被点名：语气里可以带委屈/急，但还是要扣回具体人具体事。');
    if (emotional.voteHeatHigh) bits.push('场上票味很冲：可以写出紧迫感、烦躁、不想被裹挟。');
    if (emotional.feelingIgnored) bits.push('你接麦有点晚：可以抱怨接不上、半开玩笑也行。');
    if (emotional.allyEliminatedRecently) bits.push('你刚失去同伴：可以短促失态一句再拉回正题。');
    bits.push(
      `本轮口语节奏 seed=${seed % 997}：像立即接麦，说完就停；不要复用固定口头禅，不要把每个疑点都讲成完整结论。`
    );
    return bits.join('');
  }
  const bits: string[] = [];
  bits.push(
    '[Human mic] You are NOT a narrator or analyst. Use casual table talk with emotion, complaints, or sarcasm. One quick self-correction is natural; staged stammering is not. Avoid polished essay structure and “in conclusion”.'
  );
  if (kind === 'shy') bits.push('Sound smaller: shorter clauses, leave a loose end.');
  if (kind === 'aggressive') bits.push('Sound sharp and confrontational; attack the play or argument, not protected traits.');
  if (kind === 'manipulative') bits.push('Sound smooth: polite surface, pointed subtext—no therapy talk.');
  if (verbalEdge === 'profane') {
    bits.push('[This turn: profanity allowed] You are genuinely tilted. One natural swear or “do you even know how to play?” is allowed. At most one; no slurs, family attacks, sexual degradation, or real-world threats.');
  } else if (verbalEdge === 'heated') {
    bits.push('[This turn: heated] Be rude about the play or logic if natural, but profanity is optional.');
  } else if (verbalEdge === 'snide') {
    bits.push('[This turn: snide] Use a cutting question or dry contempt, without swearing.');
  } else {
    bits.push('[This turn: restrained] Do not force profanity just to sound human.');
  }
  if (elena) {
    bits.push(
      elenaSteer
        ? '[This line only] You may weave ONE light room beat (table locking fast, who you want to hear first, pressure vs a clean wolf read, who defended that, do not fully close yet)—casual, gossipy, not a host. Then snap back to a named player + checkable hinge. No vote-call, no meeting agenda.'
        : '[Default] Stay hard to read as one equal seat: do NOT run the table every round—no moderator energy, no recurring “here is the plan”.'
    );
  }
  if (profile.sociability > 76 && profile.leadership > 65 && profile.confidence >= 68) {
    bits.push(
      'You read the room and lead without commanding: gently widen/narrow focus (“hear A/B out first”, “don’t rush clearing X”), name drift/pressure as feeling—not orders. No shot-caller tone.'
    );
  }
  if (kind === 'emotional') bits.push('Sound impulsive, but do not self-interrupt or repeat a full sentence.');
  if (kind === 'logical') bits.push('Sound clear but still conversational—not a report.');
  if (emotional.accusedThisRound) bits.push('You were challenged: show tilt, then anchor to a name + fact.');
  if (emotional.voteHeatHigh) bits.push('Votes feel loud: urgency, frustration, refusal to be dragged.');
  if (emotional.feelingIgnored) bits.push('You speak late: you can gripe about catching up.');
  if (emotional.allyEliminatedRecently) bits.push('You just lost a buddy: one raw beat, then back to the thread.');
  bits.push(
    `Live-mic rhythm seed=${seed % 997}: stop when the point lands. Do not recycle a canned catchphrase or turn every hunch into a finished case.`
  );
  return bits.join(' ');
}

function clampSpeechLen(s: string, lang: AppLanguage): string {
  const max = lang === 'zh' ? 118 : 420;
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

/**
 * Deterministic roughening: prefix/split/tail — keeps original content recognizable.
 */
export function roughenSpokenLine(
  lang: AppLanguage,
  line: string,
  personalityLabel: string,
  profile: AIBehaviorProfile,
  emotional: EmotionalSpeechContext,
  seed: number
): string {
  const trimmed = line.trim();
  if (trimmed.length < 4) return trimmed;

  const kind = classifyConversationPersona(personalityLabel, profile);
  const rhythm = pickSpeechRhythm(seed, {
    shy: kind === 'shy',
    emotional: kind === 'emotional',
    logical: kind === 'logical',
  });

  let body = applyRhythmToLine(lang, trimmed, rhythm, seed + 17);

  let prefix = emotionalLeadIn(lang, emotional, seed).trim();
  const r = seed % 100;
  if (!prefix && kind === 'shy' && r < 52) {
    prefix = (lang === 'zh' ? hesitationPrefixZh(seed) : hesitationPrefixEn(seed)).trimEnd();
  }
  if (!prefix && kind === 'emotional' && r < 38) {
    prefix = (lang === 'zh' ? hesitationPrefixZh(seed + 1) : hesitationPrefixEn(seed + 1)).trimEnd();
  }
  if (!prefix && kind === 'neutral' && r < 22) {
    prefix = (lang === 'zh' ? hesitationPrefixZh(seed + 2) : hesitationPrefixEn(seed + 2)).trimEnd();
  }

  if (r % 17 === 0 && emotional.channel !== 'lastwords') {
    const ins = randomSocialInsert(lang, seed + 99);
    if (ins) body = lang === 'zh' ? `${body}${ins}` : `${body} ${ins}`;
  }

  let tail = emotionalTail(lang, emotional, seed + 5).trim();
  const tr = (seed >> 5) % 100;
  if (!tail && kind === 'shy' && tr < 40) {
    tail = (lang === 'zh' ? trailingSoftenerZh(seed) : trailingSoftenerEn(seed)).trim();
  }
  if (!tail && kind === 'manipulative' && tr < 28) {
    tail = (
      lang === 'zh'
        ? pick(['…你懂的。', '…我就点到为止。'], seed, 50)
        : pick(['…you feel me.', '…I will leave it there.'], seed, 51)
    ).trim();
  }

  let out: string;
  if (lang === 'zh') {
    out = `${prefix}${body}${tail}`;
  } else {
    const p = prefix ? `${prefix.trimEnd()} ` : '';
    const t = tail ? ` ${tail}` : '';
    out = `${p}${body}${t}`;
  }

  return clampSpeechLen(out.replace(/\s{2,}/g, ' ').trim(), lang);
}

function pick<T>(arr: readonly T[], seed: number, salt: number): T {
  return arr[(seed + salt) % arr.length]!;
}
