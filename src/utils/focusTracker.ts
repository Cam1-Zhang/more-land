/**
 * Heuristic "room focus" from public logs — not oracle truth.
 * Feeds attention so AIs can diverge from a single synchronized topic.
 */
import type { AppLanguage } from '../i18n/appStrings';
import { bodyDirectlyAccusesTarget, bodyDirectlyDefendsTarget } from './speechAccusation';

export type DiscussionAccusationEdge = {
  accuserDisplay: string;
  targetDisplay: string;
};

export type DiscussionDefenseHint = {
  defenderDisplay: string;
  protectedDisplay: string;
};

export type DiscussionFocusSnapshot = {
  previousSpeakerName: string | null;
  /** Recent mic order (newest last), deduped */
  recentSpeakerQueue: string[];
  /** Names that dominate raw mention frequency in the tail window */
  roomEchoLeaderNames: string[];
  /** Lines that look emotionally heated */
  emotionallyHotNames: string[];
  accusationEdges: DiscussionAccusationEdge[];
  softDefenseHints: DiscussionDefenseHint[];
  /** Names in lines that look vote-heavy */
  voteHeatNames: string[];
};

const PLAYER_LINE_RE = /^([^:：\n]{1,24})[:：]\s*(.+)$/;

function tailWindow(history: readonly string[], maxLines: number): string[] {
  if (history.length === 0) return [];
  return history.slice(-maxLines);
}

function extractSpeaker(line: string): string | null {
  const m = line.match(PLAYER_LINE_RE);
  if (!m) return null;
  const name = m[1]!.trim();
  if (/^(系统|法官|System|Moderator|Host)/i.test(name)) return null;
  return name;
}

function extractBody(line: string): string {
  const m = line.match(PLAYER_LINE_RE);
  return m ? m[2]!.trim() : line;
}

function isEmotionallyHot(body: string, lang: AppLanguage): boolean {
  const bangs = (body.match(/!/g) ?? []).length;
  const qs = (body.match(/\?|？/g) ?? []).length;
  if (bangs >= 2 || qs >= 4) return true;
  if (lang === 'zh' && body.length >= 90 && (bangs >= 1 || qs >= 2)) return true;
  if (lang !== 'zh' && body.length >= 160 && /\b(WHY|WHAT|STOP|NO)\b/i.test(body)) return true;
  return false;
}

function isVoteHot(body: string, lang: AppLanguage): boolean {
  if (lang === 'zh') return /票|投|点|出|归|冲票|跟票|压票|弃票/.test(body);
  return /\b(vote|ballot|exile|lynch|wagon|bandwagon)\b/i.test(body);
}

function countMentions(name: string, lines: readonly string[]): number {
  let n = 0;
  for (const ln of lines) {
    if (ln.includes(name)) n += 1;
  }
  return n;
}

/**
 * Build a lightweight snapshot of what the *room* is staring at lately.
 */
export function buildDiscussionFocusSnapshot(
  history: readonly string[],
  aliveDisplayNames: readonly string[],
  lang: AppLanguage,
  opts?: { tailLines?: number }
): DiscussionFocusSnapshot {
  const tail = tailWindow(history, opts?.tailLines ?? 34);
  const names = aliveDisplayNames.filter((n) => n.trim().length > 0);
  const nameSet = new Set(names);

  const recentSpeakerQueue: string[] = [];
  let previousSpeakerName: string | null = null;
  for (const ln of tail) {
    const sp = extractSpeaker(ln);
    if (!sp || !nameSet.has(sp)) continue;
    previousSpeakerName = sp;
    if (recentSpeakerQueue[recentSpeakerQueue.length - 1] !== sp) {
      recentSpeakerQueue.push(sp);
    }
  }

  const freq = new Map<string, number>();
  for (const n of names) freq.set(n, countMentions(n, tail));
  const roomEchoLeaderNames = [...names]
    .sort((a, b) => (freq.get(b) ?? 0) - (freq.get(a) ?? 0))
    .filter((n) => (freq.get(n) ?? 0) >= 2)
    .slice(0, 4);

  const emotionallyHotNames: string[] = [];
  const voteHeatNames: string[] = [];
  const accusationEdges: DiscussionAccusationEdge[] = [];
  const softDefenseHints: DiscussionDefenseHint[] = [];

  for (const ln of tail) {
    const sp = extractSpeaker(ln);
    if (!sp || !nameSet.has(sp)) continue;
    const body = extractBody(ln);
    if (isEmotionallyHot(body, lang) && !emotionallyHotNames.includes(sp)) emotionallyHotNames.push(sp);
    if (isVoteHot(body, lang)) {
      for (const n of names) {
        if (n !== sp && body.includes(n) && !voteHeatNames.includes(n)) voteHeatNames.push(n);
      }
    }
    for (const n of names) {
      if (n === sp || !body.includes(n)) continue;
      if (bodyDirectlyAccusesTarget(body, n, lang)) {
        accusationEdges.push({ accuserDisplay: sp, targetDisplay: n });
      } else if (bodyDirectlyDefendsTarget(body, n, lang)) {
        softDefenseHints.push({ defenderDisplay: sp, protectedDisplay: n });
      }
    }
  }

  return {
    previousSpeakerName,
    recentSpeakerQueue,
    roomEchoLeaderNames,
    emotionallyHotNames: emotionallyHotNames.slice(0, 4),
    accusationEdges: accusationEdges.slice(-12),
    softDefenseHints: softDefenseHints.slice(-10),
    voteHeatNames: voteHeatNames.slice(0, 5),
  };
}
