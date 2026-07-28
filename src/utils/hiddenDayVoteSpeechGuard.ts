/**
 * Hard guard: daytime secret-ballot games must never surface per-voter exile mappings in speech.
 * Wolf night knife coordination is unrelated — only scrub *daytime hidden ballot* phrasing here.
 */
import type { AppLanguage } from '../i18n/appStrings';

function pick<T>(arr: readonly T[], seed: number, salt: number): T {
  return arr[(Math.abs(seed) + salt) % arr.length]!;
}

/** Heuristic: lines that assert a specific voter→exile target mapping not visible on a secret ballot table. */
const LEAK_PATTERNS_ZH: readonly RegExp[] = [
  /票型\s*指向/,
  /票型指向过/,
  /(?:票型|票形)[^。！？\n]{0,12}(?:显示|说明|反映|暴露|证明|告诉|能看出|看得出|很清楚)/,
  /(?:看到|看见|查看|复盘|对照|分析|观察|掌握|记得|追)[^。！？\n]{0,12}(?:票型|票形|投票记录|投票情况)/,
  /(?:从|根据|结合)[^。！？\n]{0,6}(?:票型|票形|投票记录|投票情况)[^。！？\n]{0,12}(?:看|判断|推|说明|分析|复盘)/,
  /(?:警长投票|放逐投票|上一轮|上轮|刚才|之前|那一票)[^。！？\n]{0,20}(?:投给|投了|票给|跟票|换票|改票|同票)/,
  /[^，。！？\n]{1,12}(?:跟了|跟着|随了)[^，。！？\n]{0,6}(?:票|投票)/,
  /上一轮[^\n。]{0,12}票型/,
  /我记得[^\n。]{0,16}(?:上一轮|上局)?[^\n。]{0,8}票/,
  /谁\s*投\s*了\s*谁/,
  /投票\s*记录[^\n。]{0,8}指向/,
  /voterId|voteByVoter|ballotMap/i,
];

const LEAK_PATTERNS_EN: readonly RegExp[] = [
  /\bvoting\s+toward\b/i,
  /\bon\s+record\b.*\bvot/i,
  /\bwho\s+voted\s+for\s+whom\b/i,
  /\bexact\s+ballot\b/i,
  /\bballot\s+map\b/i,
  /\b(?:see|saw|seen|view|inspect|review|track|tracked|analy[sz]e)[^.!?\n]{0,18}\b(?:vote\s*pattern|ballot|voting\s+record)s?\b/i,
  /\b(?:vote\s*pattern|ballots?|votes?)[^.!?\n]{0,16}\b(?:show|shows|showed|prove|proves|proved|reveal|reveals|revealed|tell|tells|told)\b/i,
  /\b(?:from|according\s+to|based\s+on)\s+(?:the\s+)?(?:vote\s*pattern|ballots?|voting\s+record)s?\b/i,
  /\b(?:last\s+round|sheriff\s+vote|exile\s+vote|earlier)[^.!?\n]{0,24}\b(?:voted\s+for|followed|switched|changed\s+(?:their\s+)?vote|co-voted)\b/i,
  /\b[^.!?\n]{1,20}\bvoted\s+for\s+[^.!?\n]{1,20}\b/i,
  /voteByVoter|ballotMap/i,
];

export function lineLooksLikeHiddenDaytimeBallotLeak(text: string, lang: AppLanguage): boolean {
  const t = text.trim();
  if (t.length < 4) return false;
  const patterns = lang === 'zh' ? LEAK_PATTERNS_ZH : LEAK_PATTERNS_EN;
  return patterns.some((re) => re.test(t));
}

/**
 * If the line asserts hidden daytime ballot facts, rewrite to a public-table impression (not a generic “过麦”).
 */
export function scrubHiddenDaytimeBallotLine(
  text: string,
  lang: AppLanguage,
  focusName: string,
  seed: number
): string {
  const trimmed = text.trim();
  if (!lineLooksLikeHiddenDaytimeBallotLeak(trimmed, lang)) return trimmed;
  const fn = focusName.trim() || (lang === 'zh' ? '那个人' : 'that seat');
  if (lang === 'zh') {
    return pick(
      [
        `我不拿“暗票”当铁证，这轮先听${fn}麦上怎么自洽。`,
        `公开信息还不够硬，我对${fn}更多是语气与节奏上的不舒服，想当面追问。`,
        `我不想装作全知视角：对${fn}我有坎儿，但得靠麦上内容对齐，不靠脑补票阵。`,
      ],
      seed,
      1
    );
  }
  return pick(
    [
      `I will not pretend I saw a secret ballot—this round I want ${fn} to make their thread consistent out loud.`,
      `Public info is still thin; my heat on ${fn} is tone and pacing, not a spreadsheet read.`,
      `No omniscient narration from me—I have a hinge on ${fn}, but it has to cash out in what we all heard.`,
    ],
    seed,
    2
  );
}

export function scrubHiddenDaytimeBallotLines(
  lines: readonly string[],
  lang: AppLanguage,
  focusName: string,
  seed: number
): string[] {
  const out: string[] = [];
  let i = 0;
  for (const ln of lines) {
    const s = scrubHiddenDaytimeBallotLine(ln, lang, focusName, seed + i * 17);
    if (s.length >= 6) out.push(s);
    i += 1;
  }
  return out;
}
