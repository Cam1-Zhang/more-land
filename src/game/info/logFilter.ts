import type { AppLanguage } from '../../i18n/appStrings';
import { isWolfTeam } from '../../utils/nightResolver';
import type { RoomPlayer } from '../../utils/nightResolver';
import { lineLooksLikeHiddenDaytimeBallotLeak } from '../../utils/hiddenDayVoteSpeechGuard';
import {
  isLineVisibleToObserver,
  narratorLineText,
  type LogObserver,
  type NarratorLine,
} from './narrator';

export type LogFilterOptions = {
  lang: AppLanguage;
  dayExileVotesPublic?: boolean;
};

const WOLF_TEAM_ONLY_ZH: readonly RegExp[] = [
  /狼美人本夜已魅惑/,
  /狼队投票多数刀口/,
  /狼队可见/,
  /狼队友/,
  /<狼队私有>/,
];

const WOLF_TEAM_ONLY_EN: readonly RegExp[] = [
  /Wolf Beauty charmed/i,
  /wolves voted.*kill on/i,
  /wolves see this/i,
  /wolf allies/i,
  /<wolf_private>/i,
];

const WITCH_PRIVATE_ZH: readonly RegExp[] = [
  /今晚刀口[是为]/,
  /中刀，你使用解药/,
  /中刀，你选择不救/,
  /已无解药可救/,
  /是否使用毒药/,
  /本夜未使用毒药/,
  /统一击杀目标/,
  /刀口指向/,
];

const WITCH_PRIVATE_EN: readonly RegExp[] = [
  /Wolf target tonight/i,
  /was attacked.*[Aa]ntidote/i,
  /did not use the antidote/i,
  /no antidote/i,
  /poison used on/i,
  /no poison tonight/i,
  /chose a kill.*target/i,
  /main kill on/i,
];

const HIDDEN_NIGHT_ACTION_ZH: readonly RegExp[] = [
  /预言家请睁眼，选择一名玩家查验/,
  /查验结果仅预言家本人知晓/,
  /预言家请验人/,
];

const HIDDEN_NIGHT_ACTION_EN: readonly RegExp[] = [
  /Seer, open your eyes and choose a check/i,
  /result is private/i,
  /Seer, pick a check/i,
];

const DEATH_CAUSE_LEAK_ZH: readonly RegExp[] = [
  /（狼刀）/,
  /（毒杀）/,
  /（狼刀 \+ 毒杀）/,
  /狼刀与毒药已按顺序结算/,
];

const DEATH_CAUSE_LEAK_EN: readonly RegExp[] = [
  /\(wolf kill\)/i,
  /\(poisoned\)/i,
  /\(wolf \+ poison\)/i,
  /wolf strike then poison/i,
];

function lineMatchesAny(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

/** 夜段仪式「请睁眼/闭眼」— 全员可见，勿按身份过滤 */
function isPublicNightCeremonyAnnounce(line: string, lang: AppLanguage): boolean {
  const t = line.trim();
  if (lang === 'zh') {
    return /^(狼人|预言家|女巫|守卫|狼美人)请(睁眼|闭眼)。?$/.test(t);
  }
  return /^(Werewolves|Seer|Witch|Guard|Wolf Beauty), (open|close) your eyes\.?$/i.test(t);
}

function sanitizeDeathCauseForAi(text: string, lang: AppLanguage): string {
  if (lang === 'zh') {
    return text
      .replace(/（狼刀 \+ 毒杀）/g, '')
      .replace(/（狼刀）/g, '')
      .replace(/（毒杀）/g, '')
      .replace(/狼刀与毒药已按顺序结算后统一公布）：/g, '）：')
      .replace(/双死（[^）]*）/g, '多人出局');
  }
  return text
    .replace(/ \(wolf \+ poison\)/gi, '')
    .replace(/ \(wolf kill\)/gi, '')
    .replace(/ \(poisoned\)/gi, '')
    .replace(
      /Double elimination last night \(wolf strike then poison, announced together\):/gi,
      'Last night eliminated:'
    );
}

export function applyLegacyStringFilters(
  line: string,
  observer: Pick<RoomPlayer, 'role'>,
  opts: LogFilterOptions
): string | null {
  const lang = opts.lang;
  const isWolf = isWolfTeam(observer.role);
  const isWitch = observer.role === 'Witch';
  const isSeer = observer.role === 'Seer';

  if (isPublicNightCeremonyAnnounce(line, lang)) {
    return line;
  }

  if (!isWolf && lineMatchesAny(line, lang === 'zh' ? WOLF_TEAM_ONLY_ZH : WOLF_TEAM_ONLY_EN)) {
    return null;
  }
  if (!isWitch && lineMatchesAny(line, lang === 'zh' ? WITCH_PRIVATE_ZH : WITCH_PRIVATE_EN)) {
    return null;
  }
  if (!isSeer && lineMatchesAny(line, lang === 'zh' ? HIDDEN_NIGHT_ACTION_ZH : HIDDEN_NIGHT_ACTION_EN)) {
    return null;
  }

  let sanitized = line;
  if (lineMatchesAny(line, lang === 'zh' ? DEATH_CAUSE_LEAK_ZH : DEATH_CAUSE_LEAK_EN)) {
    sanitized = sanitizeDeathCauseForAi(line, lang);
  }

  if (opts.dayExileVotesPublic === false && lineLooksLikeHiddenDaytimeBallotLeak(sanitized, lang)) {
    return null;
  }

  return sanitized;
}

/** 结构化旁白 → 某观察者可见的展示字符串（人类 UI 与 AI 共用）。 */
export function filterNarratorLinesForObserver(
  lines: readonly NarratorLine[],
  observer: LogObserver,
  opts: LogFilterOptions
): string[] {
  const lang = opts.lang;
  const out: string[] = [];
  for (const line of lines) {
    if (!isLineVisibleToObserver(line, observer)) continue;
    let text = narratorLineText(line, lang);
    const legacy = applyLegacyStringFilters(text, observer, opts);
    if (legacy === null) continue;
    text = legacy;
    out.push(text);
  }
  return out;
}

export function recentNarratorLogsForObserver(
  observer: LogObserver,
  lines: readonly NarratorLine[],
  opts: LogFilterOptions,
  limit = 40
): string[] {
  return filterNarratorLinesForObserver(lines, observer, opts).slice(-limit);
}

/** Filter shared log for one AI observer — information isolation (legacy string logs). */
export function filterLogsForAiObserver(
  observer: Pick<RoomPlayer, 'id' | 'role'>,
  logs: readonly string[],
  opts: LogFilterOptions
): string[] {
  const out: string[] = [];
  for (const raw of logs) {
    const line = raw.trim();
    if (!line) continue;
    const kept = applyLegacyStringFilters(line, observer, opts);
    if (kept !== null) out.push(kept);
  }
  return out;
}

export function recentPublicLogsForAi(
  observer: Pick<RoomPlayer, 'id' | 'role'>,
  logs: readonly string[],
  opts: LogFilterOptions,
  limit = 40
): string[] {
  return filterLogsForAiObserver(observer, logs, opts).slice(-limit);
}

/** AI 历史：优先结构化旁白，与 UI 同一套可见性规则。 */
export function recentNarratorLogsForAi(
  observer: Pick<RoomPlayer, 'id' | 'role'>,
  lines: readonly NarratorLine[],
  opts: LogFilterOptions,
  limit = 40
): string[] {
  return recentNarratorLogsForObserver(observer, lines, opts, limit);
}

/**
 * Current daytime information starts at the first dawn-resolution line after the latest
 * NIGHT_START. This keeps prior days out of blocks labelled "today" while retaining the
 * current dawn result, sheriff campaign, discussion, and exile result.
 */
export function narratorLinesForCurrentDay(lines: readonly NarratorLine[]): NarratorLine[] {
  if (lines.length === 0) return [];
  let cycleStart = 0;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (lines[i]?.kind === 'NIGHT_START') {
      cycleStart = i;
      break;
    }
  }
  let dayStart = cycleStart;
  for (let i = cycleStart; i < lines.length; i += 1) {
    if (lines[i]?.kind === 'NIGHT_RESOLVE') {
      dayStart = i;
      break;
    }
  }
  return lines.slice(dayStart);
}

export function recentCurrentDayNarratorLogsForAi(
  observer: Pick<RoomPlayer, 'id' | 'role'>,
  lines: readonly NarratorLine[],
  opts: LogFilterOptions,
  limit = 40
): string[] {
  return recentNarratorLogsForObserver(observer, narratorLinesForCurrentDay(lines), opts, limit);
}

export function currentDayPublicNarratorLogStrings(
  lines: readonly NarratorLine[],
  lang: AppLanguage,
  limit = 80
): string[] {
  return publicNarratorLogStrings(narratorLinesForCurrentDay(lines), lang, limit);
}

/** 仅 public 发言等全员可见行（记忆引擎等）。 */
export function publicNarratorLogStrings(
  lines: readonly NarratorLine[],
  lang: AppLanguage,
  limit = 80
): string[] {
  return lines
    .filter((l) => l.visibility === 'public')
    .map((l) => narratorLineText(l, lang))
    .slice(-limit);
}

export type UiVisibleLogSplit = {
  /** 右侧牛皮纸发言流：玩家发言 + 法官/系统播报（含放逐、警长、胜负等；事件 Tab 为同内容的按天整理） */
  speechLogs: string[];
  /** @deprecated 仅保留类型兼容；顶栏请用 latestModeratorHeadline */
  broadcastLogs: string[];
};

const MODERATOR_CEREMONY_KINDS: ReadonlySet<NarratorLine['kind']> = new Set([
  'NIGHT_START',
  'NIGHT_WOLF_ACTION',
  'NIGHT_GUARD_ACTION',
  'NIGHT_SEER_ACTION',
  'NIGHT_WITCH_ACTION',
  'NIGHT_WOLF_BEAUTY_CHARM',
]);

/** 顶栏仪式播报：入夜、各身份睁眼/闭眼、天亮请睁眼、天亮死讯摘要（全员可见，与 AI 信息隔离无关）。 */
export function isModeratorCeremonyHeadline(line: NarratorLine): boolean {
  if (MODERATOR_CEREMONY_KINDS.has(line.kind)) return true;
  if (line.kind !== 'NIGHT_RESOLVE') return false;
  if (line.zh.startsWith('天亮。') || line.zh === '天亮请睁眼') return true;
  if (line.en.startsWith('Day breaks. Last night') || line.en === 'Day breaks. Open your eyes.') {
    return true;
  }
  return false;
}

/** 顶栏当前一句：取最新仪式旁白，不受角色 visibility 限制。 */
export function latestModeratorHeadline(
  lines: readonly NarratorLine[],
  lang: AppLanguage
): string {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;
    if (!isModeratorCeremonyHeadline(line)) continue;
    return narratorLineText(line, lang);
  }
  return '';
}

/** 牛皮纸日志：法官 / 系统 / 仪式播报（保留左侧竖杠并缩进）。 */
export function isModeratorOrSystemLogLine(text: string, lang: AppLanguage): boolean {
  const t = text.trimStart();
  if (lang === 'zh') {
    if (t.startsWith('法官：') || t.startsWith('系统：')) return true;
    if (/^第\d+夜/.test(t) || t === '天亮请睁眼' || t.startsWith('天亮。')) return true;
    if (/请睁眼/.test(t) || /请闭眼/.test(t)) return true;
    return false;
  }
  if (/^Moderator:/i.test(t) || /^System:/i.test(t)) return true;
  if (/open your eyes/i.test(t) || /close your eyes/i.test(t)) return true;
  if (/^Night \d+\./i.test(t) || t === 'Day breaks. Open your eyes.') return true;
  if (t.startsWith('Day breaks. Last night')) return true;
  return false;
}

/** 顶栏展示：去掉「法官：/Moderator:」与句号（不改牛皮纸与旁白源）。 */
export function formatTopBarModeratorHeadline(text: string): string {
  let s = text.trim();
  if (!s) return s;
  s = s.replace(/^法官：/, '').replace(/^Moderator:\s*/i, '');
  return s.replace(/[。.．]/g, '').trim();
}

/** 人类牛皮纸：与旧顶栏一致，仪式播报全员可见（不受狼/女巫等 visibility 限制）。 */
function isVisibleInHumanUiLog(line: NarratorLine, observer: LogObserver): boolean {
  return isLineVisibleToObserver(line, observer) || isModeratorCeremonyHeadline(line);
}

/** 人类 UI：发言与法官/系统播报分栏展示。 */
export function splitVisibleLogsForUi(
  observer: LogObserver,
  lines: readonly NarratorLine[],
  opts: LogFilterOptions,
  limits: { speech?: number; broadcast?: number } = {}
): UiVisibleLogSplit {
  const speechLimit = limits.speech ?? 80;
  const speech: string[] = [];
  const broadcast: string[] = [];
  for (const line of lines) {
    if (!isVisibleInHumanUiLog(line, observer)) continue;
    let text = narratorLineText(line, opts.lang);
    const legacy = applyLegacyStringFilters(text, observer, opts);
    if (legacy === null) continue;
    text = legacy;
    if (line.kind === 'SPEECH') {
      speech.push(text);
    } else {
      speech.push(text);
      broadcast.push(text);
    }
  }
  return {
    speechLogs: speech.slice(-speechLimit),
    broadcastLogs: broadcast.slice(-(limits.broadcast ?? 24)),
  };
}
