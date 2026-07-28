import type { AppLanguage } from '../../i18n/appStrings';
import { llmChat, toChatMessages } from '../../llm/client';
import { OLLAMA_FAST_MODEL } from '../../llm/ollamaEnv';
import { normalizedLlmProvider } from '../../llm/providerEnv';
import {
  flattenJsonSpeechBubbles,
  looksLikeJsonStringArray,
  parseJsonArraySpeech,
} from '../../llm/speechParse';
import { sanitizeDialogueLine } from '../../utils/reasoningHumanizer';
import { AVALON_MAX_REJECTED_TEAMS } from './constants';
import type { DifficultyType, ModelRef } from '../../types';
import type {
  AvalonMissionVote,
  AvalonPlayerId,
  AvalonPlayerKnowledge,
  AvalonProposalVote,
  AvalonQuestNumber,
  AvalonQuestResolution,
} from './types';

export type AvalonModelActor = {
  id: AvalonPlayerId;
  name: string;
  personality: string;
  personalityDescription?: string;
  difficulty: DifficultyType;
  modelRef?: ModelRef;
};

export type AvalonModelCandidate = {
  id: AvalonPlayerId;
  name: string;
};

export type AvalonModelPublicState = {
  questNumber: AvalonQuestNumber;
  rejectionTrack: number;
  goodQuestWins: number;
  evilQuestWins: number;
  proposedTeam?: readonly AvalonModelCandidate[];
  currentLeader?: AvalonModelCandidate;
  proposalHistory?: readonly {
    questNumber: AvalonQuestNumber;
    attempt: number;
    leaderName: string;
    teamNames: string;
    approved: boolean;
    approveVotes: number;
    rejectVotes: number;
    votes?: readonly {
      playerName: string;
      vote: AvalonProposalVote;
      autoApprove?: boolean;
    }[];
  }[];
  missionHistory?: readonly {
    questNumber: AvalonQuestNumber;
    teamNames: string;
    succeeded: boolean;
    byFiveRejections?: boolean;
  }[];
  questResults: readonly Pick<AvalonQuestResolution, 'questNumber' | 'succeeded'>[];
  recentPublicLog: readonly string[];
};

function currentProposalAttempt(rejectionTrack: number): number {
  return rejectionTrack + 1;
}

function proposalAttemptProse(rejectionTrack: number, lang: AppLanguage): string {
  const attempt = currentProposalAttempt(rejectionTrack);
  const max = AVALON_MAX_REJECTED_TEAMS;
  const zh = lang === 'zh';
  if (zh) {
    let line = `本任务第 ${attempt}/${max} 次队长组队`;
    if (rejectionTrack > 0) line += `（此前已有 ${rejectionTrack} 次组队被否决）`;
    if (attempt >= max) line += '；若本次组队再被否决，坏人直接得一分任务失败';
    return line;
  }
  let line = `Team proposal ${attempt}/${max} for this quest`;
  if (rejectionTrack > 0) line += ` (${rejectionTrack} prior rejection${rejectionTrack === 1 ? '' : 's'} this quest)`;
  if (attempt >= max) line += '; another rejection scores one failed mission for Evil';
  return line;
}

type AvalonModelBase = {
  actor: AvalonModelActor;
  knowledge: AvalonPlayerKnowledge;
  state: AvalonModelPublicState;
  lang: AppLanguage;
};

const difficultyGuidance: Record<DifficultyType, string> = {
  Novice:
    'You are a novice player. Use shallow reads, overvalue recent events, and sometimes make a plausible mistake.',
  Easy:
    'You are an inexperienced player. Notice obvious risks but do not perform exhaustive deduction.',
  Medium:
    'You are a competent player. Compare team composition, votes, quest outcomes, and your private information.',
  Hard:
    'You are an expert player. Track contradictions and incentives carefully, bluff subtly, and avoid leaking privileged information.',
};

function temperatureForDifficulty(difficulty: DifficultyType): number {
  if (difficulty === 'Novice') return 0.9;
  if (difficulty === 'Easy') return 0.78;
  if (difficulty === 'Medium') return 0.66;
  return 0.52;
}

function roleKnowledgeBlock(knowledge: AvalonPlayerKnowledge): string {
  return JSON.stringify({
    role: knowledge.viewerRole,
    faction: knowledge.viewerFaction,
    certainEvilPlayerIds: knowledge.certainEvilPlayerIds,
    evilTeammateIds: knowledge.evilTeammateIds,
    merlinOrMorganaIds: knowledge.merlinOrMorganaIds,
    setupSignals: knowledge.signals,
  });
}

function speechBriefingBlock(
  knowledge: AvalonPlayerKnowledge,
  namesById: Readonly<Record<string, string>>
): string {
  const name = (id: string) => namesById[id] ?? id;
  if (knowledge.viewerFaction === 'good') {
    if (knowledge.viewerRole === 'merlin') {
      const evilNames = knowledge.signals
        .filter((signal) => signal.kind === 'known_evil')
        .map((signal) => name(signal.playerId));
      return evilNames.length > 0
        ? `You are Good. Night setup marked these players as certainly Evil: ${evilNames.join(', ')}.`
        : 'You are Good with only public table information.';
    }
    if (knowledge.viewerRole === 'percival') {
      const pair = knowledge.merlinOrMorganaIds.map((id) => name(id));
      return pair.length > 0
        ? `You are Good. Night setup showed ${pair.join(' and ')}; one may be Merlin and one may be Morgana.`
        : 'You are Good with only public table information.';
    }
    return 'You are Good with only public table information.';
  }
  const teammates = knowledge.evilTeammateIds.map((id) => name(id));
  return teammates.length > 0
    ? `You are Evil. Secret teammates from night setup: ${teammates.join(', ')}.`
    : 'You are Evil with no visible teammates from night setup.';
}

function looksLikeInternalReasoning(text: string): boolean {
  if (
    /certainEvilPlayerIds|evilTeammateIds|viewerRole|merlinOrMorganaIds|setupSignals/i.test(text) ||
    /我们被要求|我们被问到|被问到要|作为.{0,10}(写|发言|speech)|扮演.{0,6}(梅林|刺客|坏人)|Private knowledge|Private briefing|Public state|public table facts/i.test(text) ||
    /Your name is|currentProposedTeam|currentLeader|currentProposedTeam是|用户说|用户给了|the user said/i.test(text) ||
    /maybe I(?:'m| am)|am I [A-Z]|我是不是|难道我是/i.test(text) ||
    /\[\s*\{\s*["']id["']\s*:|"\s*id\s*"\s*:\s*["']me["']/i.test(text) ||
    /Return JSON|json string|字符串数组|不要 markdown/i.test(text) ||
    /\bID\s*\d+\b/i.test(text) ||
    /要把全场当|算清胜率|数学题|已知.{0,8}是坏人之一/i.test(text) ||
    /邪恶方|邪恶阵营|好人方|好人阵营|evil side|good side/i.test(text) ||
    /我们是.{0,16}(邪恶|好人|evil|good)|we are.{0,24}(evil|good)/i.test(text) ||
    /需要发表|写一段.*发言|发表一段|deliver a speech|write a speech/i.test(text) ||
    /当前leader|当前队长|提议队伍|proposed team is|current leader is/i.test(text) ||
    /从投票角度|策略上|因此我们应该|所以要反对|这样对邪恶|对邪恶方|对好人方|therefore we should/i.test(text) ||
    /队友是|teammates are|secret teammates/i.test(text)
  ) {
    return true;
  }
  if (
    text.length > 140 &&
    /(首先|然后|因此|所以|需要|应该|maybe|therefore|we should|从.*角度)/i.test(text) &&
    /(邪恶|好人|proposal|队伍|投票|leader|speech|发言|任务|approve|reject)/i.test(text)
  ) {
    return true;
  }
  return false;
}

const AVALON_BANNED_DIALOGUE_ZH: readonly string[] = [
  '邪恶方',
  '邪恶阵营',
  '好人方',
  '好人阵营',
  '我们被要求',
  '我们被问到',
  'Private briefing',
  'Public state',
  '需要发表',
  '写一段speech',
  '发表一段',
  '当前leader',
  'currentProposedTeam',
  'Your name is',
  '提议队伍',
  '从投票角度',
  '策略上',
  '因此我们应该',
  '内心推理',
  '字符串数组',
];

const AVALON_BANNED_DIALOGUE_EN: readonly string[] = [
  'evil side',
  'good side',
  'we were asked',
  'private briefing',
  'public state',
  'deliver a speech',
  'write a speech',
  'current leader is',
  'currentproposedteam',
  'your name is',
  'proposed team is',
  'therefore we should',
  'inner reasoning',
  'json string array',
];

function avalonTableRosterBlock(
  namesById: Readonly<Record<string, string>>,
  speakerName: string,
  lang: AppLanguage
): string {
  const entries = Object.entries(namesById)
    .map(([id, name]) => ({ id, name: name.trim() }))
    .filter((entry) => entry.name);
  if (entries.length === 0) return '';
  if (lang === 'zh') {
    const lines = entries.map((entry) => {
      if (entry.name === speakerName) return `· ${entry.name}（你，本局发言者）`;
      if (entry.id === 'me') return `· ${entry.name}（人类玩家）`;
      return `· ${entry.name}`;
    });
    return `【同桌】\n${lines.join('\n')}`;
  }
  const lines = entries.map((entry) => {
    if (entry.name === speakerName) return `· ${entry.name} (you, speaking now)`;
    if (entry.id === 'me') return `· ${entry.name} (human player)`;
    return `· ${entry.name}`;
  });
  return `[Table]\n${lines.join('\n')}`;
}

type AvalonSpeechRetryReason = 'meta' | 'required' | 'format' | 'echo' | null;

const SPEECH_PARSE_RETRY_DELAYS_MS = [0, 800, 1_500, 2_500, 4_000] as const;

function splitAvalonSpeechSentences(text: string): string[] {
  const normalized = text.replace(/\r/g, '').trim();
  if (!normalized) return [];
  const sentences =
    normalized.match(/[^。！？；.!?\n…]+[。！？；.!?…]?/g)
      ?.map((sentence) => sentence.trim())
      .filter(Boolean) ?? [normalized];
  return sentences.length > 0 ? sentences : [normalized];
}

function avalonSpeechFormatBlock(lang: AppLanguage): string {
  return lang === 'zh'
    ? [
        '【输出格式 — 最重要】',
        '先在内心完成推理，不要把推理、分析写出来。',
        '整个回复只能是一个 JSON 对象：字段名 speech，值为字符串数组（1-2 条牌桌口语，每条 8-40 个汉字）。',
        '不要 markdown、不要代码块、不要除 speech 以外的字段、不要任何额外文字。',
      ].join('\n')
    : [
        '[Output format — most important]',
        'Reason silently first — do not write analysis.',
        'Your entire reply must be one JSON object: key speech, value a string array (1-2 short public table lines, 8-40 words each).',
        'No markdown, no code fences, no keys besides speech, no extra text.',
      ].join('\n');
}

function avalonSpeechFormatReminder(lang: AppLanguage): string {
  return lang === 'zh'
    ? '再次提醒：只输出 {"speech":[...]} 这一个 JSON 对象，speech 里是 1-2 条你自己的牌桌发言。'
    : 'Reminder: output only one JSON object {"speech":[...]} with 1-2 original table lines in speech.';
}

export type AvalonSpeechTurnEntry = {
  name: string;
  seatNumber: number;
};

export type AvalonSpeechTurnOrder = {
  order: readonly AvalonSpeechTurnEntry[];
  currentIndex: number;
  /** Table discussion: one pass per player. Evil discussion: cycle until timer ends. */
  mode: 'once' | 'cycle';
};

function avalonSpeechTurnOrderBlock(
  turn: AvalonSpeechTurnOrder,
  lang: AppLanguage
): string {
  const { order, currentIndex, mode } = turn;
  if (order.length === 0) return '';

  const statusFor = (index: number): string => {
    if (lang === 'zh') {
      if (index < currentIndex) return mode === 'cycle' ? '本圈已发言' : '已发言';
      if (index === currentIndex) return '← 现在轮到你';
      return mode === 'cycle' ? '本圈待发言' : '待发言';
    }
    if (index < currentIndex) return mode === 'cycle' ? 'spoken this lap' : 'done';
    if (index === currentIndex) return '← your turn now';
    return mode === 'cycle' ? 'waiting this lap' : 'waiting';
  };

  const lines = order.map((entry, index) => {
    const status = statusFor(index);
    return lang === 'zh'
      ? `${index + 1}. ${entry.seatNumber}号 ${entry.name}（${status}）`
      : `${index + 1}. #${entry.seatNumber} ${entry.name} (${status})`;
  });

  const intro =
    lang === 'zh'
      ? mode === 'cycle'
        ? '【坏人发言顺序】坏人按下列顺序轮流发言（循环进行；前一位说完才到下一位）。只写你自己此刻说出口的话，不要替别人发言或过麦。'
        : '【本轮发言顺序】从当前队长起按顺时针依次发言，每人本轮只说一次；前一位说完才轮到下一位。只写你自己此刻说出口的话，不要替别人发言或过麦。'
      : mode === 'cycle'
        ? '[Evil speaking order] Evil players speak in this order, cycling until time ends. Finish your turn before the next speaker. Only say your own lines — do not speak for others or pass.'
        : '[Speaking order] Starting from the current leader, players speak clockwise once this round. Wait your turn; only say your own lines — do not speak for others or pass.';

  return `${intro}\n${lines.join('\n')}`;
}

function avalonSpeechProgressBlock(
  turn: AvalonSpeechTurnOrder | undefined,
  lang: AppLanguage
): string {
  if (!turn || turn.mode !== 'once' || turn.order.length === 0) return '';
  const spoken = turn.order.slice(0, turn.currentIndex).map((entry) => entry.name);
  const pending = turn.order.slice(turn.currentIndex + 1).map((entry) => entry.name);
  const zh = lang === 'zh';
  const lines: string[] = [];
  if (spoken.length > 0) {
    lines.push(zh ? `本轮已发言（说完）：${spoken.join('、')}` : `Spoken this round: ${spoken.join(', ')}`);
  }
  if (pending.length > 0) {
    lines.push(zh ? `本轮尚未发言：${pending.join('、')}` : `Not yet spoken: ${pending.join(', ')}`);
  } else {
    lines.push(zh ? '本轮尚未发言：（无，你是最后一位）' : 'Not yet spoken: (none — you are last)');
  }
  if (spoken.length > 0) {
    lines.push(
      zh
        ? `不要说已在「本轮已发言」名单中的玩家「还没发言」或「想听他再说」。`
        : 'Do not say anyone on the "Spoken" list has "not spoken yet" or that you still need to hear them.'
    );
  }
  return zh ? `【本轮进度】\n${lines.join('\n')}` : `[Round progress]\n${lines.join('\n')}`;
}

function avalonSpeechAntiEchoBlock(
  roundSpeeches: readonly string[],
  actorName: string,
  lang: AppLanguage
): string {
  const others = roundSpeeches
    .map((line) => {
      const speaker = parseAvalonSpeechSpeaker(line);
      if (!speaker || speaker === actorName) return null;
      const text = line.replace(/^[^：:]+[：:]/, '').trim();
      return text ? `${speaker}：${text}` : null;
    })
    .filter((line): line is string => Boolean(line));
  if (others.length === 0) return '';
  const zh = lang === 'zh';
  return zh
    ? [
        '【禁止复读】前面玩家已经说过的话见上文。禁止照搬他人原句、同一套句式、同一组点名或同一理由。',
        '不要重复已出现过的说法；用你自己的口吻和侧重点，结合本局实际信息发言。',
      ].join('\n')
    : [
        '[No echo] See prior lines above. Do not copy others\' wording, name picks, or reasoning templates.',
        'Say something original in your own voice, grounded in this match\'s actual facts.',
      ].join('\n');
}

function normalizeAvalonSpeechCompare(text: string): string {
  return text.replace(/\s/g, '').replace(/[。！？，、.!?,]/g, '').toLowerCase();
}

function avalonSpeechEchoesOthers(
  bubbles: readonly string[],
  roundSpeeches: readonly string[],
  actorName: string
): boolean {
  const otherTexts = roundSpeeches
    .map((line) => {
      const speaker = parseAvalonSpeechSpeaker(line);
      if (!speaker || speaker === actorName) return null;
      return line.replace(/^[^：:]+[：:]/, '').trim();
    })
    .filter((text): text is string => Boolean(text));

  for (const bubble of bubbles) {
    const norm = normalizeAvalonSpeechCompare(bubble);
    if (norm.length < 8) continue;
    for (const other of otherTexts) {
      const otherNorm = normalizeAvalonSpeechCompare(other);
      if (otherNorm.length < 8) continue;
      if (norm === otherNorm) return true;
      const shorter = norm.length <= otherNorm.length ? norm : otherNorm;
      const longer = norm.length > otherNorm.length ? norm : otherNorm;
      if (shorter.length >= 10 && longer.includes(shorter)) return true;
    }
  }
  return false;
}

function parseAvalonSpeechSpeaker(line: string): string | null {
  const match = /^([^：:]+)[：:]/.exec(line);
  return match ? match[1]!.trim() : null;
}

function isAvalonSpeechLine(line: string): boolean {
  if (/：(?:赞成|反对)组队\s*$/.test(line)) return false;
  if (/（队长）自动赞成组队/.test(line)) return false;
  if (/ \(Leader\) auto-approved team$/i.test(line)) return false;
  if (/ team proposal$/i.test(line) && /: (?:approve|reject)$/i.test(line)) return false;
  return /^[^：:]+[：:].+/.test(line);
}

function extractAvalonSpeechLines(log: readonly string[]): string[] {
  return log.filter(isAvalonSpeechLine);
}

/** Last system line that opens a discussion segment (proposal recap, mission recap, evil talk). */
function findDiscussionRoundStartIndex(log: readonly string[]): number {
  for (let index = log.length - 1; index >= 0; index -= 1) {
    const line = log[index]!;
    if (
      /提议（本任务第|proposes \(team pick/i.test(line) ||
      /任务结果已公布|quest result is public/i.test(line) ||
      /坏人阵营可以自由发言|Evil may speak openly/i.test(line) ||
      /全员依次发表|Everyone speaks before/i.test(line)
    ) {
      return index;
    }
  }
  return 0;
}

function avalonRoundSpeechTranscript(
  state: AvalonModelPublicState,
  actorName: string,
  turnOrder?: AvalonSpeechTurnOrder
): {
  roundSpeechesInOrder: string[];
  selfRoundSpeeches: string[];
  priorSpeeches: string[];
} {
  const startIndex = findDiscussionRoundStartIndex(state.recentPublicLog);
  const roundLog = state.recentPublicLog.slice(startIndex + 1);
  const roundSpeeches = extractAvalonSpeechLines(roundLog);
  const priorSpeeches = extractAvalonSpeechLines(state.recentPublicLog.slice(0, startIndex));

  const selfRoundSpeeches = roundSpeeches.filter(
    (line) => parseAvalonSpeechSpeaker(line) === actorName
  );

  if (turnOrder?.mode === 'once' && turnOrder.order.length > 0) {
    const bySpeaker = new Map<string, string[]>();
    for (const line of roundSpeeches) {
      const speaker = parseAvalonSpeechSpeaker(line);
      if (!speaker) continue;
      const bucket = bySpeaker.get(speaker) ?? [];
      bucket.push(line);
      bySpeaker.set(speaker, bucket);
    }
    const roundSpeechesInOrder: string[] = [];
    for (const entry of turnOrder.order.slice(0, turnOrder.currentIndex)) {
      roundSpeechesInOrder.push(...(bySpeaker.get(entry.name) ?? []));
    }
    return { roundSpeechesInOrder, selfRoundSpeeches, priorSpeeches };
  }

  return {
    roundSpeechesInOrder: roundSpeeches.filter(
      (line) => parseAvalonSpeechSpeaker(line) !== actorName
    ),
    selfRoundSpeeches,
    priorSpeeches,
  };
}

function avalonSpeechPurposeLine(
  purpose: 'beforeTeamVote' | 'afterMission' | 'evilDiscussion',
  lang: AppLanguage
): string {
  if (lang === 'zh') {
    if (purpose === 'evilDiscussion') {
      return '好人已完成三次任务。作为坏人公开讨论谁是梅林，可点名怀疑对象，但不要装好人。';
    }
    if (purpose === 'afterMission') {
      return '针对上一轮已结算的任务结果，发表你的公开看法。';
    }
    return '讨论当前组队提案是否应被通过。提案被否决不等于任务失败，本轮还没有任务结算。';
  }
  if (purpose === 'evilDiscussion') {
    return 'Good has completed three quests. Speak openly as Evil: debate who Merlin is from speeches, teams, and votes. Name suspects and reasoning; do not pretend to be Good.';
  }
  if (purpose === 'afterMission') {
    return 'React to the latest SCORED MISSION result and update your public reads.';
  }
  return 'Discuss whether the current TEAM PROPOSAL should be approved. No mission result exists for this proposal yet; do not call proposal approval/rejection a mission success/failure.';
}

function avalonSpeechTask(
  input: AvalonModelBase & {
    purpose: 'beforeTeamVote' | 'afterMission' | 'evilDiscussion';
    leaderName: string;
    namesById: Readonly<Record<string, string>>;
    speechTurnOrder?: AvalonSpeechTurnOrder;
  },
  retry: AvalonSpeechRetryReason
): string {
  const { roundSpeechesInOrder, selfRoundSpeeches, priorSpeeches } = avalonRoundSpeechTranscript(
    input.state,
    input.actor.name,
    input.speechTurnOrder
  );
  const rosterBlock = avalonTableRosterBlock(input.namesById, input.actor.name, input.lang);
  const turnOrderBlock = input.speechTurnOrder
    ? avalonSpeechTurnOrderBlock(input.speechTurnOrder, input.lang)
    : '';
  const progressBlock = avalonSpeechProgressBlock(input.speechTurnOrder, input.lang);
  const antiEchoBlock = avalonSpeechAntiEchoBlock(roundSpeechesInOrder, input.actor.name, input.lang);
  return [
    avalonSpeechFormatBlock(input.lang),
    avalonSpeechPurposeLine(input.purpose, input.lang),
    input.lang === 'zh'
      ? `【身份】你是「${input.actor.name}」，性格：${input.actor.personality}。现在轮到你发言，用你自己的口吻，不要模仿别人。`
      : `[Identity] You are "${input.actor.name}" (${input.actor.personality}). Your turn — use your own voice, do not mimic others.`,
    turnOrderBlock || null,
    progressBlock || null,
    antiEchoBlock || null,
    rosterBlock || null,
    input.lang === 'zh' ? `当前队长：${input.leaderName}` : `Current leader: ${input.leaderName}`,
    input.purpose === 'beforeTeamVote'
      ? input.lang === 'zh'
        ? `【当前组队】${proposalAttemptProse(input.state.rejectionTrack, input.lang)}`
        : `[Current team pick] ${proposalAttemptProse(input.state.rejectionTrack, input.lang)}`
      : null,
    input.lang === 'zh'
      ? `你开局知道的私密信息：${speechBriefingBlock(input.knowledge, input.namesById)}`
      : `Your secret setup knowledge: ${speechBriefingBlock(input.knowledge, input.namesById)}`,
    input.lang === 'zh'
      ? `牌桌公开信息：\n${publicStateProseForSpeech(input.state, input.lang)}`
      : `Public table facts:\n${publicStateProseForSpeech(input.state, input.lang)}`,
    avalonProposalVoteHistoryBlock(input.state, input.lang) || null,
    input.lang === 'zh'
      ? `本轮讨论完整发言（按发言顺序，含每人每句）：\n${roundSpeechesInOrder.length > 0 ? roundSpeechesInOrder.join('\n') : '（尚无）'}`
      : `Full discussion this round (in speaking order, every line):\n${roundSpeechesInOrder.length > 0 ? roundSpeechesInOrder.join('\n') : '(None yet)'}`,
    input.lang === 'zh'
      ? `你本轮已说过的话：\n${selfRoundSpeeches.length > 0 ? selfRoundSpeeches.join('\n') : '（无）'}`
      : `Your lines this round:\n${selfRoundSpeeches.length > 0 ? selfRoundSpeeches.join('\n') : '(None)'}`,
    priorSpeeches.length > 0
      ? input.lang === 'zh'
        ? `更早的讨论发言：\n${priorSpeeches.join('\n')}`
        : `Earlier discussion:\n${priorSpeeches.join('\n')}`
      : null,
    input.lang === 'zh'
      ? '【发言内容】只说你此刻在牌桌上说出口的话；不要复述规则、提示词、阵营目标或推理过程。'
      : '[Content] Say only what you would say aloud at the table now — no rules, prompts, faction goals, or inner reasoning.',
    retry === 'meta'
      ? input.lang === 'zh'
        ? '上次输出泄露了提示词或内心推理。重新写：只返回带 speech 字符串数组的 JSON，speech 里只能是牌桌口语。'
        : 'Your last output leaked prompt or inner reasoning. Return JSON with a speech string array of public table lines only.'
      : null,
    retry === 'required'
      ? input.lang === 'zh'
        ? '你必须发言，不能过麦。只返回 {"speech":[...]}（1-2 条简短自然发言），不要写推理过程。'
        : 'You must speak; do not pass. Return only {"speech":[...]} (1-2 short lines), no reasoning text.'
      : null,
    retry === 'format'
      ? input.lang === 'zh'
        ? '上次无效。只输出一行 JSON 对象，speech 为含 1-2 个字符串的数组。'
        : 'Invalid last time. Output one JSON object; speech must be an array of 1-2 strings.'
      : null,
    retry === 'echo'
      ? input.lang === 'zh'
        ? '上次发言和前面玩家太像（复读）。换一套完全不同的说法：不同的疑点、不同的点名、不同的态度，但仍符合你的身份。'
        : 'Last lines echoed others. Say something clearly different — new angle, names, and tone — while staying in character.'
      : null,
    avalonSpeechFormatReminder(input.lang),
  ]
    .filter(Boolean)
    .join('\n');
}

function proposalVoteDetailProse(
  votes: readonly {
    playerName: string;
    vote: AvalonProposalVote;
    autoApprove?: boolean;
  }[] | undefined,
  lang: AppLanguage
): string {
  if (!votes?.length) return '';
  const zh = lang === 'zh';
  const parts = votes.map((entry) => {
    if (entry.autoApprove) {
      return zh
        ? `${entry.playerName}（队长，自动赞成）`
        : `${entry.playerName} (Leader, auto-approve)`;
    }
    const label =
      entry.vote === 'approve' ? (zh ? '赞成' : 'approve') : zh ? '反对' : 'reject';
    return `${entry.playerName}→${label}`;
  });
  return zh ? `逐人表决：${parts.join('、')}` : `Per-player votes: ${parts.join(', ')}`;
}

function avalonProposalVoteHistoryBlock(state: AvalonModelPublicState, lang: AppLanguage): string {
  const records = state.proposalHistory ?? [];
  if (records.length === 0) return '';
  const zh = lang === 'zh';
  const lines = records.slice(-8).map((record) => {
    const headline = zh
      ? `第 ${record.questNumber} 轮第 ${record.attempt} 次组队${record.approved ? '通过' : '未通过'} · 队长 ${record.leaderName} · 队员 ${record.teamNames} · ${record.approveVotes}:${record.rejectVotes}`
      : `Q${record.questNumber} attempt ${record.attempt} ${record.approved ? 'approved' : 'rejected'} · leader ${record.leaderName} · team ${record.teamNames} · ${record.approveVotes}:${record.rejectVotes}`;
    const detail = proposalVoteDetailProse(record.votes, lang);
    return detail ? `${headline}\n  ${detail}` : headline;
  });
  return zh
    ? `【历次组队表决（公开）】\n${lines.join('\n')}`
    : `[Team proposal votes (public)]\n${lines.join('\n')}`;
}

function publicStateBlock(state: AvalonModelPublicState): string {
  return JSON.stringify({
    currentQuestNumber: state.questNumber,
    currentProposalAttemptNumber: currentProposalAttempt(state.rejectionTrack),
    currentProposalRejectionCount: state.rejectionTrack,
    missionScoreOnly: { successfulMissions: state.goodQuestWins, failedMissions: state.evilQuestWins },
    currentLeader: state.currentLeader ?? null,
    currentProposedTeam: state.proposedTeam ?? [],
    teamProposalHistory: state.proposalHistory ?? [],
    scoredMissionHistory: (state.missionHistory ?? []).map(
      ({ questNumber, teamNames, succeeded, byFiveRejections }) => ({
        questNumber,
        teamNames,
        succeeded,
        byFiveRejections,
      })
    ),
    scoredMissionResultsOnly: state.questResults.map(({ questNumber, succeeded }) => ({
      questNumber,
      succeeded,
    })),
    recentPublicLog: state.recentPublicLog.slice(-24),
  });
}

/** Player-safe public facts for speech prompts — prose only, like Werewolf day logs (no JSON / ids). */
function publicStateProseForSpeech(state: AvalonModelPublicState, lang: AppLanguage): string {
  const zh = lang === 'zh';
  const lines: string[] = [
    zh
      ? `任务比分：好人 ${state.goodQuestWins} · 坏人 ${state.evilQuestWins}`
      : `Mission score — Good ${state.goodQuestWins} · Evil ${state.evilQuestWins}`,
    zh
      ? `当前第 ${state.questNumber} 轮任务 · ${proposalAttemptProse(state.rejectionTrack, lang)}`
      : `Quest ${state.questNumber} · ${proposalAttemptProse(state.rejectionTrack, lang)}`,
    state.currentLeader
      ? zh
        ? `当前队长：${state.currentLeader.name}`
        : `Leader: ${state.currentLeader.name}`
      : '',
    state.proposedTeam?.length
      ? zh
        ? `当前组队：${state.proposedTeam.map((player) => player.name).join('、')}`
        : `Proposed team: ${state.proposedTeam.map((player) => player.name).join(', ')}`
      : '',
  ];
  for (const record of state.missionHistory ?? []) {
    lines.push(
      zh
        ? record.byFiveRejections
          ? `第 ${record.questNumber} 轮任务失败（连续五次组队未通过）· 队员：${record.teamNames}`
          : `第 ${record.questNumber} 轮任务${record.succeeded ? '成功' : '失败'} · 队员：${record.teamNames}`
        : record.byFiveRejections
          ? `Quest ${record.questNumber} failed (five rejected teams) — ${record.teamNames}`
          : `Quest ${record.questNumber} ${record.succeeded ? 'succeeded' : 'failed'} — ${record.teamNames}`
    );
  }
  for (const record of (state.proposalHistory ?? []).slice(-6)) {
    const headline = zh
      ? `第 ${record.questNumber} 轮第 ${record.attempt} 次组队${record.approved ? '通过' : '未通过'} · 队长 ${record.leaderName} · 队员 ${record.teamNames} · 票 ${record.approveVotes}:${record.rejectVotes}`
      : `Q${record.questNumber} attempt ${record.attempt} ${record.approved ? 'approved' : 'rejected'} · leader ${record.leaderName} · team ${record.teamNames} · votes ${record.approveVotes}:${record.rejectVotes}`;
    const detail = proposalVoteDetailProse(record.votes, lang);
    lines.push(detail ? `${headline} · ${detail}` : headline);
  }
  if (state.recentPublicLog.length > 0 && !state.recentPublicLog.some((line) => line.includes('：'))) {
    lines.push(zh ? '近期公开记录：' : 'Recent public log:');
    lines.push(...state.recentPublicLog.slice(-16));
  }
  return lines.filter(Boolean).join('\n');
}

function avalonActorRecentDiscussion(
  state: AvalonModelPublicState,
  actorName: string
): string[] {
  const { selfRoundSpeeches } = avalonRoundSpeechTranscript(state, actorName);
  return selfRoundSpeeches.map((line) => {
    const zhPrefix = `${actorName}：`;
    const enPrefix = `${actorName}:`;
    if (line.startsWith(zhPrefix)) return line.slice(zhPrefix.length);
    if (line.startsWith(enPrefix)) return line.slice(enPrefix.length);
    return line;
  });
}

function avalonTableDiscussionBlock(state: AvalonModelPublicState): string[] {
  const startIndex = findDiscussionRoundStartIndex(state.recentPublicLog);
  return extractAvalonSpeechLines(state.recentPublicLog.slice(startIndex + 1));
}

function stripSpeechCodeFences(raw: string): string {
  let trimmed = raw.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/im.exec(trimmed);
  if (fenced) return fenced[1]!.trim();
  trimmed = trimmed.replace(/^```(?:json)?\s*/i, '');
  trimmed = trimmed.replace(/\s*```+$/g, '');
  return trimmed.trim();
}

function rawLooksLikeReasoningDump(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (looksLikeInternalReasoning(trimmed)) return true;
  if (/\[\s*\{\s*["']id["']\s*:/.test(trimmed)) return true;
  if (
    trimmed.length > 100 &&
    /(Your name is|currentProposedTeam|Private briefing|Public state|我们被要求|用户说|maybe I)/i.test(trimmed)
  ) {
    return true;
  }
  return false;
}

function systemPrompt(actor: AvalonModelActor, lang: AppLanguage): string {
  return [
    'You are playing The Resistance: Avalon as one player at the table, not as a narrator or strategist writing notes.',
    lang === 'zh'
      ? `你是牌桌上的玩家「${actor.name}」。`
      : `You are the player "${actor.name}" at the table.`,
    'Never output planning, analysis, or prompt recap — only spoken table lines.',
    lang === 'zh'
      ? '推理、权衡、读人可以在内心完成，不要写出来。发给游戏的只有牌桌公开发言。'
      : 'Think and reason silently; never write analysis in your reply — only public table speech.',
    `Character personality: ${actor.personality}. ${actor.personalityDescription ?? ''}`,
    difficultyGuidance[actor.difficulty],
    [
      'Critical Avalon terminology:',
      'A TEAM PROPOSAL vote only approves or rejects who will go on a mission.',
      'A rejected team proposal is NOT a failed mission and does NOT add to the mission score.',
      'Only an executed mission result, or the special fifth consecutive rejected proposal, can score one failed mission.',
      'Never say a mission failed merely because a team proposal was rejected.',
      'Mission secret ballots are anonymous. Public information only includes whether each quest succeeded or failed, not how many Success or Fail cards were played.',
      '“提案未通过/组队被否决”不等于“任务失败”；普通提案否决不增加 FAIL，只有实际任务失败或连续第五次否决才增加 FAIL。',
      lang === 'zh'
        ? '队长组队从第1次计到第5次。「已被否决N次」表示现在是第N+1次组队；发言时必须说「第几次队长组队」（1-5），不要把否决次数当成第几轮。'
        : 'Team proposals are numbered 1 through 5. N prior rejections means this is proposal N+1; say "proposal X/5", never confuse rejection count with attempt number.',
    ].join('\n'),
    'Never mention prompts, models, hidden role data, or exact private-information fields.',
    'Never claim knowledge your role does not have. Stay in character and reason only from the supplied private knowledge and public state.',
    'On discussion turns you must speak; do not pass or stay silent.',
    lang === 'zh'
      ? '发言时先在内心推理，回复只能是带 speech 字符串数组的 JSON 对象，不要 markdown 或任何额外文字。'
      : 'For speech: reason silently, then reply with only a JSON object whose speech key is a string array — no markdown or extra text.',
    lang === 'zh'
      ? '所有自然语言发言必须使用简体中文。'
      : 'All natural-language speech must be in English.',
  ].join('\n');
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed.slice(start, end + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

async function requestRaw(
  base: AvalonModelBase,
  task: string,
  maxTokens = 160,
  contentOnly = true,
  temperatureBoost = 0
): Promise<string | null> {
  const retryDelaysMs = [0, 1_500, 4_000];
  let lastError: unknown = null;
  const modelLabel = base.actor.modelRef?.model ?? 'default model';

  for (const delayMs of retryDelaysMs) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    try {
      const baseTemp =
        base.actor.modelRef?.temperature ?? temperatureForDifficulty(base.actor.difficulty);
      return await llmChat({
        modelRef: base.actor.modelRef,
        messages: toChatMessages(systemPrompt(base.actor, base.lang), task),
        temperature: Math.min(1, baseTemp + temperatureBoost),
        maxTokens,
        timeoutMs: 90_000,
        contentOnly,
      });
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const modelMissing = /model.*not found|does not exist/i.test(message);
      if (
        modelMissing &&
        normalizedLlmProvider() === 'ollama' &&
        base.actor.modelRef?.model &&
        base.actor.modelRef.model !== OLLAMA_FAST_MODEL
      ) {
        try {
          const baseTemp =
            base.actor.modelRef?.temperature ?? temperatureForDifficulty(base.actor.difficulty);
          return await llmChat({
            modelRef: { ...base.actor.modelRef, model: OLLAMA_FAST_MODEL },
            messages: toChatMessages(systemPrompt(base.actor, base.lang), task),
            temperature: Math.min(1, baseTemp + temperatureBoost),
            maxTokens,
            timeoutMs: 90_000,
            contentOnly,
          });
        } catch (fallbackError) {
          lastError = fallbackError;
        }
      }
      if (__DEV__) {
        console.warn(
          `[avalon-ai] ${base.actor.name} model call failed (${modelLabel}, retry in ${delayMs}ms done):`,
          error
        );
      }
    }
  }

  if (__DEV__) {
    console.warn(`[avalon-ai] ${base.actor.name} exhausted retries for ${modelLabel}:`, lastError);
  }
  return null;
}

async function requestJson(
  base: AvalonModelBase,
  task: string,
  maxTokens = 160
): Promise<Record<string, unknown> | null> {
  const raw = await requestRaw(base, task, maxTokens);
  if (!raw) return null;
  const parsed = extractJsonObject(raw);
  if (!parsed && __DEV__) {
    console.warn(
      `[avalon-ai] ${base.actor.name} returned invalid JSON from ${base.actor.modelRef?.model ?? 'default model'}:`,
      raw.slice(0, 240)
    );
  }
  return parsed;
}

const VOTE_RETRY_DELAYS_MS = [0, 1_000, 2_500, 5_000] as const;
const VOTE_MAX_ATTEMPTS = VOTE_RETRY_DELAYS_MS.length;

async function requestJsonUntilValid<T>(
  base: AvalonModelBase,
  buildTask: (attempt: number) => string,
  parse: (json: Record<string, unknown> | null) => T | null,
  maxTokens = 80
): Promise<T | null> {
  for (let attempt = 0; attempt < VOTE_MAX_ATTEMPTS; attempt++) {
    const delayMs = VOTE_RETRY_DELAYS_MS[attempt] ?? 0;
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    const parsed = parse(await requestJson(base, buildTask(attempt), maxTokens));
    if (parsed !== null) return parsed;
    if (__DEV__) {
      console.warn(
        `[avalon-ai] ${base.actor.name} vote JSON invalid (attempt ${attempt + 1}/${VOTE_MAX_ATTEMPTS})`
      );
    }
  }
  if (__DEV__) {
    console.warn(`[avalon-ai] ${base.actor.name} exhausted vote retries`);
  }
  return null;
}

function buildProposalVoteTask(
  input: AvalonModelBase & { playerNamesById?: Readonly<Record<string, string>> },
  attempt: number
): string {
  const ownSpeech = avalonActorRecentDiscussion(input.state, input.actor.name);
  const tableDiscussion = avalonTableDiscussionBlock(input.state);
  const namesById = input.playerNamesById ?? Object.fromEntries(
    (input.state.proposedTeam ?? []).map((player) => [player.id, player.name])
  );
  const zh = input.lang === 'zh';
  return [
    zh
      ? `对当前组队提案投票（组队投票，不是任务结果）。${proposalAttemptProse(input.state.rejectionTrack, input.lang)}。队长 ${input.state.currentLeader?.name ?? '（未知）'} 已自动投赞成，无需投票。`
      : `Vote on the proposed quest team (team proposal vote, not mission result). ${proposalAttemptProse(input.state.rejectionTrack, input.lang)}. Leader ${input.state.currentLeader?.name ?? '(unknown)'} auto-approves and does not vote.`,
    zh
      ? `你是玩家「${input.actor.name}」，请以自己的身份与利益做出最终投票。`
      : `You are "${input.actor.name}". Cast your final vote from your role, incentives, and the discussion.`,
    zh
      ? `你的身份与夜间信息：${speechBriefingBlock(input.knowledge, namesById)}`
      : `Private briefing: ${speechBriefingBlock(input.knowledge, namesById)}`,
    zh
      ? `牌桌公开信息：\n${publicStateProseForSpeech(input.state, input.lang)}`
      : `Public table facts:\n${publicStateProseForSpeech(input.state, input.lang)}`,
    avalonProposalVoteHistoryBlock(input.state, input.lang) || null,
    tableDiscussion.length > 0
      ? zh
        ? `本轮桌上讨论（完整，按时间顺序）：\n${tableDiscussion.map((line) => `· ${line}`).join('\n')}`
        : `Table discussion this round (full, chronological):\n${tableDiscussion.map((line) => `- ${line}`).join('\n')}`
      : null,
    ownSpeech.length > 0
      ? zh
        ? `你（${input.actor.name}）的发言摘录：\n${ownSpeech.map((line) => `· ${line}`).join('\n')}\n早先表态仅供参考——若被他人说服，可以改变立场；投票应体现听完讨论后的最终判断，不要无理由自相矛盾。`
        : `Your statements (${input.actor.name}):\n${ownSpeech.map((line) => `- ${line}`).join('\n')}\nEarlier lines are context only — you may change your mind if persuaded; vote your final judgment after the discussion, not a random flip.`
      : zh
        ? '结合本轮讨论与你的身份利益，做出最终投票。'
        : 'Weigh the discussion and your role incentives, then cast your final vote.',
    attempt > 0
      ? zh
        ? '上次返回无效。请只输出合法 JSON：{"vote":"approve"} 或 {"vote":"reject"}，不要其他文字。'
        : 'Previous response was invalid. Return ONLY valid JSON: {"vote":"approve"} or {"vote":"reject"}. No other text.'
      : null,
    'Return JSON only: {"vote":"approve"} or {"vote":"reject"}.',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildMissionVoteTask(input: AvalonModelBase, attempt: number): string {
  const zh = input.lang === 'zh';
  const good = input.knowledge.viewerFaction === 'good';
  return [
    zh
      ? '投出你的秘密任务牌。好人必须出成功；坏人可选成功或失败。'
      : 'Cast your secret quest card. Good players must play success. Evil may play success or fail.',
    zh
      ? `私密信息：${roleKnowledgeBlock(input.knowledge)}`
      : `Private knowledge: ${roleKnowledgeBlock(input.knowledge)}`,
    zh
      ? `牌桌公开信息：\n${publicStateProseForSpeech(input.state, input.lang)}`
      : `Public table facts:\n${publicStateProseForSpeech(input.state, input.lang)}`,
    good
      ? zh
        ? '你是好人，只能投 {"vote":"success"}。'
        : 'You are Good — you must vote {"vote":"success"}.'
      : null,
    attempt > 0
      ? zh
        ? '上次返回无效。请只输出合法 JSON：{"vote":"success"} 或 {"vote":"fail"}，不要其他文字。'
        : 'Previous response was invalid. Return ONLY valid JSON: {"vote":"success"} or {"vote":"fail"}. No other text.'
      : null,
    'Return JSON only: {"vote":"success"} or {"vote":"fail"}.',
  ]
    .filter(Boolean)
    .join('\n');
}

function extractSpeech(raw: string): string | null {
  const json = extractJsonObject(raw);
  if (typeof json?.speech === 'string' && json.speech.trim()) return json.speech.trim();

  const trimmed = raw
    .trim()
    .replace(/^```(?:json|text)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  const quotedValue = trimmed.match(/["']speech["']\s*:\s*"((?:\\.|[^"])*)"/i)?.[1];
  if (quotedValue) {
    try {
      return JSON.parse(`"${quotedValue}"`).trim() || null;
    } catch {
      return quotedValue.trim() || null;
    }
  }
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return null;
  const plain = trimmed
    .replace(/^(?:speech|发言)\s*[:：]\s*/i, '')
    .replace(/^["']|["']$/g, '')
    .trim();
  return plain || null;
}

function scrubAvalonDialogueBubble(
  bubble: string,
  speakerName: string,
  lang: AppLanguage,
  relaxed = false
): string | null {
  let out = sanitizeDialogueLine(bubble, lang, speakerName, bubble.length);
  const banned = lang === 'zh' ? AVALON_BANNED_DIALOGUE_ZH : AVALON_BANNED_DIALOGUE_EN;
  for (const phrase of banned) {
    if (!phrase) continue;
    if (out.toLowerCase().includes(phrase.toLowerCase())) {
      out = out.split(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')).join('');
    }
  }
  out = out.replace(/\s{2,}/g, ' ').trim();
  const minLen = relaxed ? 2 : 4;
  if (out.length < minLen) return null;
  if (looksLikeInternalReasoning(out)) return null;
  const maxLen = lang === 'zh' ? 72 : 140;
  if (out.length > maxLen) return null;
  return out;
}

function scrubAvalonDialogueBubbles(
  bubble: string,
  speakerName: string,
  lang: AppLanguage,
  relaxed = false
): string[] {
  const strict = scrubAvalonDialogueBubble(bubble, speakerName, lang, false);
  if (strict) return [strict];
  if (!relaxed) return [];

  const sentences = splitAvalonSpeechSentences(bubble);
  const out: string[] = [];
  for (const sentence of sentences) {
    const scrubbed = scrubAvalonDialogueBubble(sentence, speakerName, lang, true);
    if (scrubbed) out.push(scrubbed);
  }
  return out.slice(0, 4);
}

function extractSpeechFieldAsStrings(raw: string): string[] | null {
  const json = extractJsonObject(raw);
  if (!json) return null;
  const speech = json.speech;
  if (typeof speech === 'string' && speech.trim()) return [speech.trim()];
  if (!Array.isArray(speech)) return null;
  const lines = speech
    .filter((item): item is string => typeof item === 'string')
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : null;
}

function parseAvalonSpeechBubbles(
  raw: string,
  speakerName: string,
  lang: AppLanguage,
  relaxed = false
): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (!relaxed && rawLooksLikeReasoningDump(trimmed)) return [];

  const fromSpeechField = extractSpeechFieldAsStrings(trimmed);
  if (fromSpeechField) {
    const out: string[] = [];
    for (const bubble of fromSpeechField) {
      out.push(...scrubAvalonDialogueBubbles(bubble, speakerName, lang, relaxed));
    }
    return out.slice(0, 4);
  }

  const tryJsonArray = (): string[] => {
    const flattened = flattenJsonSpeechBubbles(parseJsonArraySpeech(raw));
    const out: string[] = [];
    for (const bubble of flattened) {
      out.push(...scrubAvalonDialogueBubbles(bubble, speakerName, lang, relaxed));
    }
    return out.slice(0, 4);
  };

  if (looksLikeJsonStringArray(trimmed) || /^\s*\[/.test(stripSpeechCodeFences(trimmed)) || trimmed.includes('[')) {
    const fromArray = tryJsonArray();
    if (fromArray.length > 0) return fromArray;
  }

  if (!relaxed) return [];
  return tryJsonArray();
}

/** Parse speech field or legacy JSON array; never salvage plain-text reasoning dumps. */
function extractAvalonTableSpeechBubbles(
  raw: string,
  opts: {
    speakerName: string;
    lang: AppLanguage;
  },
  relaxed = false
): string[] {
  if (!relaxed && rawLooksLikeReasoningDump(raw)) return [];
  const bubbles = parseAvalonSpeechBubbles(raw, opts.speakerName, opts.lang, relaxed);
  return bubbles.filter(Boolean);
}

function extractSpeechFromJsonOnly(raw: string): string | null {
  const json = extractJsonObject(raw);
  if (typeof json?.speech === 'string' && json.speech.trim()) return json.speech.trim();

  const trimmed = raw
    .trim()
    .replace(/^```(?:json|text)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  const quotedValue = trimmed.match(/["']speech["']\s*:\s*"((?:\\.|[^"])*)"/i)?.[1];
  if (quotedValue) {
    try {
      return JSON.parse(`"${quotedValue}"`).trim() || null;
    } catch {
      return quotedValue.trim() || null;
    }
  }
  return null;
}

export async function requestAvalonTeam(
  input: AvalonModelBase & {
    candidates: readonly AvalonModelCandidate[];
    teamSize: number;
  }
): Promise<AvalonPlayerId[] | null> {
  const json = await requestJson(
    input,
    [
      'Choose the proposed quest team.',
      `Private knowledge: ${roleKnowledgeBlock(input.knowledge)}`,
      `Public state: ${publicStateBlock(input.state)}`,
      `Legal candidates: ${JSON.stringify(input.candidates)}`,
      `Return exactly ${input.teamSize} unique candidate IDs.`,
      'Return JSON only: {"teamIds":["id", "..."]}.',
    ].join('\n')
  );
  const ids = json?.teamIds;
  if (!Array.isArray(ids) || ids.length !== input.teamSize) return null;
  const allowed = new Set(input.candidates.map((candidate) => candidate.id));
  const result = ids.filter((id): id is string => typeof id === 'string' && allowed.has(id));
  return result.length === input.teamSize && new Set(result).size === result.length ? result : null;
}

export async function requestAvalonProposalVote(
  input: AvalonModelBase & { playerNamesById?: Readonly<Record<string, string>> }
): Promise<AvalonProposalVote | null> {
  return requestJsonUntilValid(
    input,
    (attempt) => buildProposalVoteTask(input, attempt),
    (json) => (json?.vote === 'approve' || json?.vote === 'reject' ? json.vote : null)
  );
}

export async function requestAvalonMissionVote(
  input: AvalonModelBase
): Promise<AvalonMissionVote | null> {
  return requestJsonUntilValid(
    input,
    (attempt) => buildMissionVoteTask(input, attempt),
    (json) => {
      if (json?.vote !== 'success' && json?.vote !== 'fail') return null;
      if (input.knowledge.viewerFaction === 'good' && json.vote === 'fail') return null;
      return json.vote;
    }
  );
}

export async function requestAvalonAssassinationTarget(
  input: AvalonModelBase & {
    candidates: readonly AvalonModelCandidate[];
  }
): Promise<AvalonPlayerId | null> {
  const json = await requestJson(
    input,
    [
      'You are the Assassin. Choose the legal candidate most likely to be Merlin from public behavior. Do not assume any undisclosed role.',
      `Private knowledge: ${roleKnowledgeBlock(input.knowledge)}`,
      `Public state: ${publicStateBlock(input.state)}`,
      `Legal targets: ${JSON.stringify(input.candidates)}`,
      'Return JSON only: {"targetId":"id"}.',
    ].join('\n'),
    100
  );
  const targetId = json?.targetId;
  return typeof targetId === 'string' &&
    input.candidates.some((candidate) => candidate.id === targetId)
    ? targetId
    : null;
}

export type AvalonSpeechResult = {
  bubbles: readonly string[] | null;
  failReason?: string;
};

export async function requestAvalonSpeech(
  input: AvalonModelBase & {
    purpose: 'beforeTeamVote' | 'afterMission' | 'evilDiscussion';
    leaderName: string;
    playerNamesById?: Readonly<Record<string, string>>;
    speechTurnOrder?: AvalonSpeechTurnOrder;
  }
): Promise<AvalonSpeechResult> {
  const namesById = input.playerNamesById ?? {};
  const speechInput = { ...input, namesById };
  const speechOpts = {
    speakerName: input.actor.name,
    lang: input.lang,
  };

  const passes: ReadonlyArray<{ reason: AvalonSpeechRetryReason; relaxed: boolean }> = [
    { reason: null, relaxed: false },
    { reason: 'echo', relaxed: false },
    { reason: 'meta', relaxed: false },
    { reason: 'required', relaxed: false },
    { reason: 'format', relaxed: false },
    { reason: 'format', relaxed: true },
  ];

  let lastRaw: string | null = null;
  let lastEcho = false;
  for (let attempt = 0; attempt < passes.length; attempt++) {
    const delayMs = SPEECH_PARSE_RETRY_DELAYS_MS[attempt] ?? 0;
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    const pass = passes[attempt]!;
    const retryReason =
      pass.reason === 'echo' && !lastEcho ? null : pass.reason;
    const raw = await requestRaw(
      input,
      avalonSpeechTask({ ...speechInput, speechTurnOrder: input.speechTurnOrder }, retryReason),
      160,
      true,
      0.1
    );
    if (raw) lastRaw = raw;
    const bubbles = raw
      ? extractAvalonTableSpeechBubbles(raw, speechOpts, pass.relaxed)
      : [];
    if (bubbles.length > 0) {
      const { roundSpeechesInOrder } = avalonRoundSpeechTranscript(
        input.state,
        input.actor.name,
        input.speechTurnOrder
      );
      if (
        !pass.relaxed &&
        roundSpeechesInOrder.length > 0 &&
        avalonSpeechEchoesOthers(bubbles, roundSpeechesInOrder, input.actor.name)
      ) {
        lastEcho = true;
        if (__DEV__) {
          console.warn(`[avalon-ai] ${input.actor.name} speech echoed prior lines — retrying`);
        }
        continue;
      }
      return { bubbles };
    }
    if (__DEV__) {
      console.warn(
        `[avalon-ai] ${input.actor.name} speech parse empty (attempt ${attempt + 1}/${passes.length}, relaxed=${pass.relaxed})`,
        raw?.slice(0, 200)
      );
    }
  }

  const failReason =
    input.lang === 'zh'
      ? lastRaw
        ? `${input.actor.name} 发言在多次重试后仍无法解析`
        : `${input.actor.name} 发言请求失败`
      : lastRaw
        ? `${input.actor.name} speech unparseable after retries`
        : `${input.actor.name} speech request failed`;
  return { bubbles: null, failReason };
}

export async function requestAvalonPeerReview(
  input: AvalonModelBase & {
    targetName: string;
    targetRole: string;
    targetFaction: 'good' | 'evil';
    reviewerFaction: 'good' | 'evil';
    winner: 'good' | 'evil';
    revealedRoles: readonly { name: string; role: string; faction: 'good' | 'evil' }[];
  }
): Promise<string | null> {
  const raw = await requestRaw(
    input,
    [
      'The game is over. Give one concise, in-character peer review of the human player.',
      `Human target: ${JSON.stringify({ name: input.targetName, role: input.targetRole, faction: input.targetFaction })}`,
      `Your faction: ${input.reviewerFaction}. Winning faction: ${input.winner}.`,
      `All revealed roles: ${JSON.stringify(input.revealedRoles)}`,
      `Complete structured game history: ${publicStateBlock(input.state)}`,
      'Base the review on the human player’s actual proposals, teams, votes, speeches, and mission outcomes.',
      'Keep team-proposal rejection distinct from mission failure.',
      input.lang === 'zh'
        ? '只写一句自然的简体中文点评，不超过45个汉字。'
        : 'Write one natural review sentence, at most 30 words.',
      'Return JSON only: {"speech":"..."}.',
    ].join('\n'),
    120
  );
  if (!raw) return null;
  const speech = extractSpeech(raw);
  return speech ? speech.slice(0, input.lang === 'zh' ? 90 : 220) : null;
}
