/**
 * Expression layer: internal reasoning → player-safe wording for prompts & fallbacks.
 * Underlying engines unchanged — only strings shown to renderers / players.
 */
import type { AppLanguage } from '../i18n/appStrings';
import type { AIBehaviorProfile } from '../data/aiBehaviorProfiles';
import type { UncertaintySpeechKnobs } from './uncertaintyCommitment';
import {
  buildUncertaintyFramedReadsEn,
  buildUncertaintyFramedReadsZh,
} from './uncertaintyCommitment';
import type { InternalThoughtSnapshot } from './thoughtEngine';
import {
  sensationBand,
  voteTensionPhrase,
  allianceUneasePhrase,
  tableCrowdingPhrase,
  forwardNoteToPlayerLine,
  manipulationTagToPlayerLine,
  personaSpeakHint,
} from './socialLanguageMapper';

/** Substrings that must never appear in spoken dialogue (ZH). */
const BANNED_SUBSTRINGS_ZH: readonly string[] = [
  '票型模拟',
  '归票中心',
  '结构化信号',
  '怀疑权重',
  '在我表里',
  '多项指标',
  '默认对话落点',
  '身份链',
  '热点牌',
  '护人链',
  '反向盘TA收益',
  '协同感',
  '共识掩护',
  'bandwagon',
  'vote pressure',
  'alliance risk',
  'social momentum',
  'wagon',
  'simulation',
  'pivot_risk',
  'simulated_',
  'engine',
  'JSON',
  'FACT',
  '算法',
  '模型',
  '指标叠',
];

/** Substrings that must never appear in spoken dialogue (EN). */
const BANNED_SUBSTRINGS_EN: readonly string[] = [
  'bandwagon',
  'vote pressure',
  'alliance risk',
  'social momentum',
  'wagon',
  'simulation',
  'simulated',
  'engine',
  'JSON',
  'FACT',
  'debug',
  'algorithm',
  'model output',
  'metrics',
];

function pick<T>(arr: readonly T[], seed: number, salt: number): T {
  return arr[(seed + salt) % arr.length]!;
}

function charmLeadProfile(profile: AIBehaviorProfile): boolean {
  return profile.sociability > 76 && profile.leadership > 65 && profile.confidence >= 68;
}

/** Elena (id 27): one short beat about room pace / listening order — not host, not vote-call. */
function buildElenaSoftRoomSteerLine(input: {
  lang: AppLanguage;
  focusName: string;
  partnerName: string | null;
  votePressure: number;
  seed: number;
}): string {
  const { lang, focusName, partnerName, votePressure, seed } = input;
  const b = partnerName && partnerName !== focusName ? partnerName : null;
  if (lang === 'zh') {
    const pool: string[] = [
      '我感觉这桌有点锁得太快了，信息还没摊开。',
      b
        ? `我更想先听${focusName}和${b}把这一轮说满，再收紧。`
        : `我想先把${focusName}这条线听完整，不急着盖棺。`,
      '现在更像大家在互相推，还不像一条站得住的狼线。',
      '我其实更在意是谁急着帮那句挡了一下——那一下很显眼。',
      '这条先别完全收口吧，留半拍给后面接话的人。',
    ];
    if (votePressure > 48) {
      pool.push('压迫感有点重，我想把它听成“推力”而不是已经坐实的狼坑。');
    }
    return pool[pick(pool, seed, 401) % pool.length]!;
  }
  const pool: string[] = [
    'The table feels like it is locking a little fast for where we are.',
    b
      ? `I would rather hear ${focusName} and ${b} out first before we tighten.`
      : `I want ${focusName} to finish the thread before we close the lid on it.`,
    'This reads more like pressure to me than a clean wolf line yet.',
    'I am more interested in who jumped to defend that—it stood out.',
    'Let us not fully close this thread yet; leave half a beat for the next mic.',
  ];
  if (votePressure > 48) {
    pool.push('It feels pushed—I am treating that as tempo, not a finished wolf read.');
  }
  return pool[pick(pool, seed, 403) % pool.length]!;
}

/** Conversational soft steering — not shot-caller / dictator tone. */
function buildCharismaticSteeringReadsZh(
  focusName: string,
  voteLeaderName: string | null,
  allyHintName: string | null,
  votePressure: number,
  seed: number
): string[] {
  const partner = voteLeaderName && voteLeaderName !== focusName ? voteLeaderName : allyHintName;
  const pool: string[] = [];
  if (partner) {
    pool.push(
      `我更想先听${focusName}和${partner}把话说满：我们别把节奏推得像要立刻钉死谁，更像先把线对齐。`
    );
    pool.push(`先别急着把${focusName}放得太干净——我也想看看${partner}后面怎么接、怎么圆。`);
  } else {
    pool.push(`这轮我想把气氛收一收：先听${focusName}讲清楚，我们再一起收紧，不抢拍子。`);
  }
  if (votePressure > 44) {
    pool.push(`我感觉今天场上更像“推力很大”的状态，我先把这听成压力线，还没直接翻成定锤。`);
  }
  pool.push(`我蛮好奇是谁在帮${focusName}悄悄分担火力——这也会决定我怎么听下一轮。`);
  const i0 = seed % pool.length;
  const out = [pool[i0]!];
  if (pool.length > 1 && seed % 5 < 2) {
    const i1 = (i0 + 1 + (seed % (pool.length - 1))) % pool.length;
    if (i1 !== i0) out.push(pool[i1]!);
  }
  return out.slice(0, 2);
}

function buildCharismaticSteeringReadsEn(
  focusName: string,
  voteLeaderName: string | null,
  allyHintName: string | null,
  votePressure: number,
  seed: number
): string[] {
  const partner = voteLeaderName && voteLeaderName !== focusName ? voteLeaderName : allyHintName;
  const pool: string[] = [];
  if (partner) {
    pool.push(
      `I'd rather hear ${focusName} and ${partner} out fully before we dial it to a hard exile—we can align first.`
    );
    pool.push(`Let's not rush clearing ${focusName}; I want to see how ${partner} answers next.`);
  } else {
    pool.push(`I want to ease the room's pace: let ${focusName} finish the thread, then we tighten together.`);
  }
  if (votePressure > 44) {
    pool.push(
      `The table feels pushed today—I'm reading it as pressure, not a closed wolf case yet.`
    );
  }
  pool.push(`I'm curious who's quietly taking heat off ${focusName}—that shapes my next pass.`);
  const i0 = seed % pool.length;
  const out = [pool[i0]!];
  if (pool.length > 1 && seed % 5 < 2) {
    const i1 = (i0 + 1 + (seed % (pool.length - 1))) % pool.length;
    if (i1 !== i0) out.push(pool[i1]!);
  }
  return out.slice(0, 2);
}

/**
 * Remove / soften leaked system wording. If line becomes empty, returns a safe short fallback naming `focusName`.
 */
export function sanitizeDialogueLine(text: string, lang: AppLanguage, focusName: string, seed: number): string {
  let t = text;
  const banned = lang === 'zh' ? BANNED_SUBSTRINGS_ZH : BANNED_SUBSTRINGS_EN;
  for (const b of banned) {
    if (!b) continue;
    if (t.toLowerCase().includes(b.toLowerCase())) {
      t = t.split(new RegExp(b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')).join('');
    }
  }
  t = t.replace(/\s{2,}/g, ' ').replace(/：\s*：/g, '：').trim();
  if (t.length >= 6) return t;
  return lang === 'zh'
    ? pick([`我这轮最想听${focusName}自己把话说圆。`, `我对${focusName}有个坎儿，想当面问清楚。`], seed, 1)
    : pick(
        [`I want ${focusName} to explain their thread out loud.`, `I have a hard question for ${focusName} this round.`],
        seed,
        2
      );
}

export function sanitizeLineList(
  lines: readonly string[],
  lang: AppLanguage,
  focusName: string,
  seed: number
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const ln of lines) {
    const s = sanitizeDialogueLine(ln, lang, focusName, seed ^ out.length);
    if (s.length < 6 || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out.slice(0, 8);
}

/** LLM-facing pack: no engine field names, no machine tags, no numeric scores. */
export type PlayerSafeDialoguePackZh = {
  本轮最想追问: string;
  嘴边想说的点: string[];
  还记着的事: string[];
  场上气氛一句: string;
  说话气质: string;
  上一麦是谁: string | null;
  场上还有谁: string[];
  别讲套话: boolean;
};

export type PlayerSafeDialoguePackEn = {
  seatToPress: string;
  whatStoodOut: string[];
  oldGrudgesOrPromises: string[];
  oneLineRoomFeel: string;
  voiceNote: string;
  previousSpeaker: string | null;
  namesStillInPlay: string[];
  avoidVagueFiller: boolean;
};

export type PlayerSafeDialoguePack = PlayerSafeDialoguePackZh | PlayerSafeDialoguePackEn;

export function buildPlayerSafeDialoguePack(input: {
  lang: AppLanguage;
  thought: InternalThoughtSnapshot;
  profile: AIBehaviorProfile;
  concreteObservations: readonly string[];
  memoryAnchors: readonly string[];
  votePressure: number;
  priorSpeakerName: string | null;
  aliveNames: readonly string[];
  forbidGenericFiller: boolean;
  /** primary suspect display name */
  focusPlayerName: string;
  /** plurality leader display name if any */
  voteLeaderName: string | null;
  /** second name for alliance unease (e.g. top co-voter) */
  allyHintName: string | null;
  varietySeed: number;
  uncertaintyKnobs: UncertaintySpeechKnobs;
  personalityLabel: string;
  /** Rare room-pace line for Elena only (speechPrep gates budget + roll). */
  elenaSoftRoomSteer?: {
    partnerName: string | null;
    votePressure: number;
    lineSeed: number;
  } | null;
  /** When false, soften lines that imply per-seat daytime exile ballots are public knowledge. */
  dayExileVotesPublic?: boolean;
}): PlayerSafeDialoguePack {
  const seed = input.varietySeed;
  const ballotPublic = input.dayExileVotesPublic !== false;
  const vpBand = sensationBand(input.votePressure);
  const arBand = sensationBand(input.thought.allianceRisk);
  const spBand = sensationBand(input.thought.socialPressure);

  const reads: string[] = sanitizeLineList(
    [...input.concreteObservations, ...input.memoryAnchors],
    input.lang,
    input.focusPlayerName,
    seed
  );

  for (const note of input.thought.votePrediction.forwardNotes) {
    const ln = forwardNoteToPlayerLine(note, input.lang, seed, ballotPublic);
    if (ln) reads.push(sanitizeDialogueLine(ln, input.lang, input.focusPlayerName, seed + reads.length));
  }
  for (const tag of input.thought.manipulationAwareness) {
    const ln = manipulationTagToPlayerLine(tag, input.lang, seed);
    if (ln) reads.push(sanitizeDialogueLine(ln, input.lang, input.focusPlayerName, seed + reads.length + 17));
  }

  const uncLines =
    input.lang === 'zh'
      ? buildUncertaintyFramedReadsZh(input.focusPlayerName, input.uncertaintyKnobs, input.personalityLabel, seed)
      : buildUncertaintyFramedReadsEn(input.focusPlayerName, input.uncertaintyKnobs, input.personalityLabel, seed);
  for (const ul of uncLines) {
    reads.push(sanitizeDialogueLine(ul, input.lang, input.focusPlayerName, seed + reads.length + 31));
  }

  if (charmLeadProfile(input.profile)) {
    const steerLines =
      input.lang === 'zh'
        ? buildCharismaticSteeringReadsZh(
            input.focusPlayerName,
            input.voteLeaderName,
            input.allyHintName,
            input.votePressure,
            seed + 61
          )
        : buildCharismaticSteeringReadsEn(
            input.focusPlayerName,
            input.voteLeaderName,
            input.allyHintName,
            input.votePressure,
            seed + 61
          );
    for (const sl of steerLines) {
      reads.push(sanitizeDialogueLine(sl, input.lang, input.focusPlayerName, seed + reads.length + 73));
    }
  }

  const tension = voteTensionPhrase(
    input.lang,
    vpBand,
    input.voteLeaderName ?? input.focusPlayerName,
    seed + 3,
    ballotPublic
  );
  reads.push(sanitizeDialogueLine(tension, input.lang, input.focusPlayerName, seed + 5));

  if (input.allyHintName) {
    const ally = allianceUneasePhrase(
      input.lang,
      arBand,
      input.focusPlayerName,
      input.allyHintName,
      seed + 7,
      ballotPublic
    );
    reads.push(sanitizeDialogueLine(ally, input.lang, input.focusPlayerName, seed + 9));
  } else if (arBand === 'high') {
    const a = input.thought.predictedAllies[0];
    if (a && a !== input.focusPlayerName) {
      const ally = allianceUneasePhrase(input.lang, arBand, input.focusPlayerName, a, seed + 8, ballotPublic);
      reads.push(sanitizeDialogueLine(ally, input.lang, input.focusPlayerName, seed + 10));
    }
  }

  const crowd = tableCrowdingPhrase(input.lang, spBand, seed + 11);
  const voice = personaSpeakHint(input.profile, input.lang, seed + 13);

  const uniq: string[] = [];
  const seen = new Set<string>();
  for (const r of reads) {
    const t = r.trim();
    if (t.length < 6 || seen.has(t)) continue;
    seen.add(t);
    uniq.push(t);
  }
  let topReads = uniq.slice(0, 5);
  if (input.elenaSoftRoomSteer) {
    const steerRaw = buildElenaSoftRoomSteerLine({
      lang: input.lang,
      focusName: input.focusPlayerName,
      partnerName: input.elenaSoftRoomSteer.partnerName,
      votePressure: input.elenaSoftRoomSteer.votePressure,
      seed: input.elenaSoftRoomSteer.lineSeed,
    });
    const steer = sanitizeDialogueLine(steerRaw, input.lang, input.focusPlayerName, seed + 401);
    if (steer.length >= 6) {
      topReads = [steer, ...topReads].slice(0, 6);
    }
  }

  const rememberedOnly = sanitizeLineList([...input.memoryAnchors], input.lang, input.focusPlayerName, seed + 19).slice(
    0,
    3
  );

  if (input.lang === 'zh') {
    const pack: PlayerSafeDialoguePackZh = {
      本轮最想追问: input.focusPlayerName,
      嘴边想说的点: topReads,
      还记着的事: rememberedOnly,
      场上气氛一句: sanitizeDialogueLine(crowd, 'zh', input.focusPlayerName, seed + 21),
      说话气质: voice,
      上一麦是谁: input.priorSpeakerName,
      场上还有谁: [...input.aliveNames],
      别讲套话: input.forbidGenericFiller,
    };
    return pack;
  }

  const packEn: PlayerSafeDialoguePackEn = {
    seatToPress: input.focusPlayerName,
    whatStoodOut: topReads,
    oldGrudgesOrPromises: rememberedOnly.length > 0 ? rememberedOnly : topReads.slice(0, 2),
    oneLineRoomFeel: sanitizeDialogueLine(crowd, 'en', input.focusPlayerName, seed + 21),
    voiceNote: voice,
    previousSpeaker: input.priorSpeakerName,
    namesStillInPlay: [...input.aliveNames],
    avoidVagueFiller: input.forbidGenericFiller,
  };
  return packEn;
}

export function flattenPlayerSafePack(pack: PlayerSafeDialoguePack, lang: AppLanguage): string[] {
  if (lang === 'zh') {
    const p = pack as PlayerSafeDialoguePackZh;
    return [...p.嘴边想说的点, ...p.还记着的事, p.场上气氛一句].filter(
      (s) => typeof s === 'string' && s.trim().length > 0
    );
  }
  const p = pack as PlayerSafeDialoguePackEn;
  return [...p.whatStoodOut, ...p.oldGrudgesOrPromises, p.oneLineRoomFeel].filter(
    (s) => typeof s === 'string' && s.trim().length > 0
  );
}
