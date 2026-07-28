import type { AppLanguage } from '../../i18n/appStrings';
import type { RoomPlayer } from '../../utils/nightResolver';
import {
  applyLegacyStringFilters,
  isModeratorCeremonyHeadline,
  type LogFilterOptions,
} from './logFilter';
import {
  isLineVisibleToObserver,
  narratorLineText,
  type LogObserver,
  type NarratorKind,
  type NarratorLine,
} from './narrator';

export type PublicEventKind = 'sheriff' | 'night' | 'day' | 'end' | 'other';

export type PublicEventRow = {
  key: string;
  day: number;
  text: string;
  kind: PublicEventKind;
};

export type PublicEventSection = {
  day: number;
  dayLabel: string;
  items: PublicEventRow[];
};

export type PublicEventsTimeline = {
  /** 当前警徽持有者（与第几天无关，单独展示） */
  currentSheriff: PublicEventRow | null;
  sections: PublicEventSection[];
};

function stripModeratorPrefix(text: string): string {
  return text
    .trim()
    .replace(/^法官：/, '')
    .replace(/^Moderator:\s*/i, '')
    .replace(/^系统：/, '')
    .replace(/^System:\s*/i, '');
}

/** 公开事件 Tab：不含发言、仪式睁眼/闭眼、私有提示。 */
export function isPublicEventNarratorLine(line: NarratorLine, lang: AppLanguage): boolean {
  if (line.kind === 'SPEECH') return false;
  if (line.visibility !== 'public') return false;
  if (isModeratorCeremonyHeadline(line)) return false;

  const t = narratorLineText(line, lang);
  if (line.kind === 'GAME_END') return true;
  if (
    line.kind === 'HUNTER_SHOOT' ||
    line.kind === 'KNIGHT_DUEL' ||
    line.kind === 'IDIOT_REVEAL' ||
    line.kind === 'WOLF_BEAUTY_FOLLOW'
  ) {
    return true;
  }
  if (line.kind === 'NIGHT_RESOLVE') {
    return /昨晚|Last night|peaceful|平安夜|eliminated|出局/i.test(t);
  }

  if (/遗言|请睁眼|请闭眼|轮到你|讨论开始|房间就绪|上警玩家按顺序|警下玩家投票|想要竞选警长/i.test(t)) {
    return false;
  }
  if (
    /放逐|当选警长|警徽|流局|阵营获胜|好人阵营|狼人阵营|开枪|决斗|殉情|白痴翻牌|无人出局|不设警长/i.test(t)
  ) {
    return true;
  }
  return false;
}

function eventKindFromLine(line: NarratorLine, text: string): PublicEventKind {
  if (line.kind === 'GAME_END') return 'end';
  if (line.kind === 'NIGHT_RESOLVE' || /昨晚|平安夜|peaceful/i.test(text)) return 'night';
  if (/警长|Sheriff/i.test(text)) return 'sheriff';
  if (/放逐|exile|决斗|开枪|白痴/i.test(text)) return 'day';
  return 'other';
}

function formatPublicEventText(raw: string, lang: AppLanguage, kind: NarratorKind): string {
  let t = stripModeratorPrefix(raw);
  if (lang === 'zh') {
    if (/平安夜/.test(t)) return '夜晚：平安夜';
    const oneDead = t.match(/昨晚【([^】]+)】出局/);
    if (oneDead) return `夜晚：${oneDead[1]} 死亡`;
    const multiDead = t.match(/昨晚出局：(.+)。/);
    if (multiDead) {
      return `夜晚：${multiDead[1]!.replace(/、/g, ' ')} 死亡`;
    }
    const exile = t.match(/【([^】]+)】得票最高，被放逐出局/);
    if (exile) return `白天：${exile[1]} 被放逐`;
    const exileTie = t.match(/最高票平票/);
    if (exileTie) return '白天：平票，无人放逐';
    if (/好人阵营获胜/.test(t)) return '游戏结束：好人阵营胜利';
    if (/狼人阵营获胜/.test(t)) return '游戏结束：狼人阵营胜利';
    if (/当选警长/.test(t)) {
      const m = t.match(/【([^】]+)】当选警长/);
      if (m) return `警长：${m[1]} 当选`;
    }
    if (/警徽移交/.test(t)) {
      const m = t.match(/警徽移交【([^】]+)】/);
      if (m) return `警长：警徽移交给 ${m[1]}`;
    }
    if (/猎人开枪带走/.test(t)) {
      const m = t.match(/带走【([^】]+)】/);
      if (m) return `白天：猎人带走 ${m[1]}`;
    }
    if (t.startsWith('天亮。')) {
      return t.replace(/^天亮。\s*/, '').replace(/。$/, '') || t;
    }
  } else {
    if (/peaceful/i.test(t)) return 'Night: peaceful';
    if (/eliminated/i.test(t)) {
      const m = t.match(/eliminated:\s*(.+)\./i) ?? t.match(/\[(.+?)\] was eliminated/i);
      if (m) return `Night: ${m[1]} died`;
    }
    if (/exile/i.test(t) && /highest/i.test(t)) {
      const m = t.match(/\[([^\]]+)\]/);
      if (m) return `Day: ${m[1]} exiled`;
    }
    if (/Good wins|good camp/i.test(t)) return 'Game over: Good wins';
    if (/Wolves win|wolf camp/i.test(t)) return 'Game over: Werewolves win';
    if (/is sheriff/i.test(t)) {
      const m = t.match(/^(.+?) is sheriff/i);
      if (m) return `Sheriff: ${m[1]}`;
    }
  }
  return t;
}

export function seatDisplayLabel(
  playerId: string,
  players: readonly RoomPlayer[],
  seatOrder: readonly string[],
  lang: AppLanguage
): string {
  const p = players.find((x) => x.id === playerId);
  if (!p) return playerId;
  const idx = seatOrder.indexOf(playerId);
  const no = idx >= 0 ? idx + 1 : '?';
  return lang === 'zh' ? `${no}号 ${p.name}` : `#${no} ${p.name}`;
}

export function buildPublicEventSections(
  lines: readonly NarratorLine[],
  observer: LogObserver,
  opts: LogFilterOptions,
  ctx: {
    players: readonly RoomPlayer[];
    seatOrder: readonly string[];
    sheriffId: string | null;
  }
): PublicEventsTimeline {
  const lang = opts.lang;
  const items: PublicEventRow[] = [];
  let day = 1;
  let i = 0;

  for (const line of lines) {
    if (!isLineVisibleToObserver(line, observer)) continue;
    if (!isPublicEventNarratorLine(line, lang)) continue;
    const raw = narratorLineText(line, lang);
    const legacy = applyLegacyStringFilters(raw, observer, opts);
    if (legacy === null) continue;

    const text = formatPublicEventText(legacy, lang, line.kind);
    const kind = eventKindFromLine(line, text);
    items.push({
      key: `evt-${i++}`,
      day,
      text,
      kind,
    });
    if (line.kind === 'NIGHT_RESOLVE' && /昨晚|Last night|peaceful|平安夜|eliminated|出局/i.test(raw)) {
      day += 1;
    }
  }

  let currentSheriff: PublicEventRow | null = null;
  if (ctx.sheriffId) {
    const seat = seatDisplayLabel(ctx.sheriffId, ctx.players, ctx.seatOrder, lang);
    const sheriffText =
      lang === 'zh' ? `当前警长：${seat}` : `Sheriff: ${seat}`;
    currentSheriff = {
      key: 'evt-sheriff-current',
      day: 0,
      text: sheriffText,
      kind: 'sheriff',
    };
  }

  const byDay = new Map<number, PublicEventRow[]>();
  for (const row of items) {
    const list = byDay.get(row.day) ?? [];
    list.push(row);
    byDay.set(row.day, list);
  }

  const sections = [...byDay.keys()]
    .sort((a, b) => a - b)
    .map((d) => ({
      day: d,
      dayLabel: lang === 'zh' ? `第${d}天` : `Day ${d}`,
      items: byDay.get(d)!,
    }));

  return { currentSheriff, sections };
}
