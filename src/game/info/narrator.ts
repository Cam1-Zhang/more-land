/**
 * wolfcha 信息系统 — 旁白可见性分级。
 * Public = 全员日志；Role = 仅特定身份 AI / 对应角色 UI；player_me = 仅人类玩家 UI。
 */
export type NarratorVisibility =
  | 'public'
  | 'wolf_team'
  | 'witch'
  | 'seer'
  | 'guard'
  | 'player_me';

export type NarratorKind =
  | 'GAME_START'
  | 'NIGHT_START'
  | 'NIGHT_WOLF_ACTION'
  | 'NIGHT_WOLF_BEAUTY_CHARM'
  | 'NIGHT_WITCH_ACTION'
  | 'NIGHT_SEER_ACTION'
  | 'NIGHT_GUARD_ACTION'
  | 'NIGHT_RESOLVE'
  | 'DAY_START'
  | 'DAY_DISCUSSION'
  | 'DAY_VOTE'
  | 'KNIGHT_DUEL'
  | 'HUNTER_SHOOT'
  | 'IDIOT_REVEAL'
  | 'WOLF_BEAUTY_FOLLOW'
  | 'GAME_END'
  | 'SPEECH'
  | 'OTHER';

export type NarratorLine = {
  zh: string;
  en: string;
  kind: NarratorKind;
  visibility: NarratorVisibility;
};

export type BilingualLine = { zh: string; en: string };

export type LogObserver = { id: string; role: string };

export function toPublicBilingual(line: NarratorLine): BilingualLine {
  return { zh: line.zh, en: line.en };
}

export function isLineVisibleToRole(line: NarratorLine, role: string): boolean {
  if (line.visibility === 'public') return true;
  if (line.visibility === 'player_me') return false;
  if (line.visibility === 'wolf_team') {
    return role === 'Werewolf' || role === 'WolfBeauty';
  }
  if (line.visibility === 'witch') return role === 'Witch';
  if (line.visibility === 'seer') return role === 'Seer';
  if (line.visibility === 'guard') return role === 'Guard';
  return false;
}

/** UI / AI 统一可见性：player_me 仅 id === 'me' 的人类 UI 可见。 */
export function isLineVisibleToObserver(line: NarratorLine, observer: LogObserver): boolean {
  if (line.visibility === 'player_me') return observer.id === 'me';
  return isLineVisibleToRole(line, observer.role);
}

export function narratorLineText(line: NarratorLine, lang: 'zh' | 'en'): string {
  return lang === 'zh' ? line.zh : line.en;
}

export function isFullNarratorLine(value: unknown): value is NarratorLine {
  return (
    !!value &&
    typeof value === 'object' &&
    'zh' in value &&
    'en' in value &&
    'visibility' in value &&
    'kind' in value
  );
}

/** 将已本地化字符串或双语行转为带可见性元数据的旁白行。 */
export function makeNarratorLine(
  textOrBilingual: string | BilingualLine,
  visibility: NarratorVisibility,
  kind: NarratorKind = 'OTHER'
): NarratorLine {
  if (typeof textOrBilingual === 'string') {
    return { zh: textOrBilingual, en: textOrBilingual, visibility, kind };
  }
  return { ...textOrBilingual, visibility, kind };
}

export function coalesceNarratorLine(
  input: string | BilingualLine | NarratorLine,
  visibility: NarratorVisibility = 'public',
  kind: NarratorKind = 'OTHER'
): NarratorLine {
  if (isFullNarratorLine(input)) return input;
  return makeNarratorLine(input, visibility, kind);
}

/** 追加旁白行（双通道日志源）。 */
export function addNarratorLine(
  store: { lines: NarratorLine[] },
  input: string | BilingualLine | NarratorLine,
  visibility: NarratorVisibility = 'public',
  kind: NarratorKind = 'OTHER'
): NarratorLine {
  const line = coalesceNarratorLine(input, visibility, kind);
  store.lines.push(line);
  return line;
}

export function speechNarratorLine(
  speakerName: string,
  speech: string,
  lang: 'zh' | 'en'
): NarratorLine {
  const sep = lang === 'zh' ? '：' : ': ';
  const prefixed = `${speakerName}${sep}${speech}`;
  return {
    zh: prefixed,
    en: prefixed,
    visibility: 'public',
    kind: 'SPEECH',
  };
}
