/**
 * Parse wolfcha-style JSON string array speech responses.
 * Models often wrap output in markdown fences or emit slightly invalid JSON;
 * we prefer splitting into chat bubbles over showing raw `["…","…"]` in UI.
 */

function normalizeJsonLikeText(s: string): string {
  return s
    .replace(/\uFEFF/g, '')
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\uFF3B\uFF3D]/g, (c) => (c === '\uFF3B' ? '[' : ']'));
}

function stripCodeFences(s: string): string {
  let t = s.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/im.exec(t);
  if (fenced) return fenced[1]!.trim();
  t = t.replace(/^```(?:json)?\s*/i, '');
  t = t.replace(/\s*```+$/g, '');
  return t.trim();
}

/** True when text looks like a JSON string array, not natural dialogue. */
export function looksLikeJsonStringArray(s: string): boolean {
  const t = stripCodeFences(normalizeJsonLikeText(s.trim()));
  const lb = t.indexOf('[');
  if (lb < 0) return false;
  const tail = t.slice(lb);
  const quoteCount = (tail.match(/"/g) ?? []).length;
  if (quoteCount < 2) return false;
  return (
    /"\s*,\s*"/.test(tail) ||
    tail.includes('","') ||
    quoteCount >= 4 ||
    (tail.startsWith('[') && /^\s*"/.test(tail.slice(1)))
  );
}

function decodeJsonStringLiteral(inner: string): string {
  try {
    return JSON.parse(`[${JSON.stringify(inner)}]`)[0] as string;
  } catch {
    return inner.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
  }
}

function cleanBubbleText(s: string): string {
  return stripCodeFences(s)
    .replace(/^```+$/g, '')
    .trim();
}

/** Bracket-match `[...]` while respecting double-quoted strings. */
function extractJsonArraySlice(s: string): string | null {
  const lb = s.indexOf('[');
  if (lb < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = lb; i < s.length; i++) {
    const c = s[i]!;
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === '\\') {
        escape = true;
        continue;
      }
      if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) return s.slice(lb, i + 1);
    }
  }
  return null;
}

function tryParseJsonArray(slice: string): unknown[] | null {
  const attempts = [
    slice,
    slice.replace(/,\s*]/g, ']'),
    slice.replace(/,\s*}/g, '}'),
  ];
  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* next */
    }
  }
  return null;
}

/** Scan `[...]` and collect double-quoted string literals (works when JSON.parse fails). */
function tokenizeJsonArrayStrings(s: string): string[] {
  const normalized = normalizeJsonLikeText(stripCodeFences(s));
  const lb = normalized.indexOf('[');
  if (lb < 0) return [];

  const out: string[] = [];
  let inString = false;
  let escape = false;
  let buf = '';

  for (let i = lb + 1; i < normalized.length; i++) {
    const c = normalized[i]!;
    if (inString) {
      if (escape) {
        buf += c;
        escape = false;
        continue;
      }
      if (c === '\\') {
        escape = true;
        continue;
      }
      if (c === '"') {
        const decoded = cleanBubbleText(decodeJsonStringLiteral(buf));
        if (decoded.length > 0) out.push(decoded);
        buf = '';
        inString = false;
        continue;
      }
      buf += c;
      continue;
    }
    if (c === '"') {
      inString = true;
      buf = '';
      continue;
    }
    if (c === ']') break;
  }

  return out;
}

/** Pull `"..."` elements via regex (secondary fallback). */
function extractQuotedStringsFromArrayLike(s: string): string[] {
  const fromScan = tokenizeJsonArrayStrings(s);
  if (fromScan.length > 0) return fromScan;

  const normalized = normalizeJsonLikeText(stripCodeFences(s));
  const slice = extractJsonArraySlice(normalized) ?? normalized;
  if (!slice.includes('"')) return [];

  const out: string[] = [];
  const re = /"((?:\\.|[^"\\])*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(slice)) !== null) {
    const decoded = cleanBubbleText(decodeJsonStringLiteral(m[1]!));
    if (decoded.length > 0) out.push(decoded);
  }
  return out;
}

function unwrapChatObjectFields(obj: Record<string, unknown>): string | null {
  for (const k of ['content', 'text', 'message', 'speech', 'reply', 'output']) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return null;
}

function coerceArrayItemsToStrings(parsed: unknown[]): string[] {
  const bubbles: string[] = [];
  for (const item of parsed) {
    if (typeof item === 'string') {
      const inner = cleanBubbleText(item);
      if (!inner) continue;
      if (looksLikeJsonStringArray(inner)) {
        const nested = parseJsonArraySpeech(inner);
        if (nested.length > 0) {
          bubbles.push(...nested);
          continue;
        }
      }
      bubbles.push(inner);
      continue;
    }
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const fromObj = unwrapChatObjectFields(item as Record<string, unknown>);
      if (fromObj) {
        const inner = cleanBubbleText(fromObj);
        if (inner.length > 0) bubbles.push(inner);
      }
    }
  }
  return bubbles;
}

export function parseJsonArraySpeech(text: string): string[] {
  const trimmed = normalizeJsonLikeText(text.trim());
  if (!trimmed) return [];

  const body = stripCodeFences(trimmed);
  const slice = extractJsonArraySlice(body) ?? (body.includes('[') ? body.slice(body.indexOf('[')) : null);

  if (slice) {
    const parsedArr = tryParseJsonArray(slice);
    if (parsedArr) {
      const fromJson = coerceArrayItemsToStrings(parsedArr);
      if (fromJson.length > 0) return fromJson;
    }

    const fromQuotes = extractQuotedStringsFromArrayLike(slice);
    if (fromQuotes.length > 0) return fromQuotes;
  }

  if (looksLikeJsonStringArray(body) || body.includes('[')) {
    const rescued = extractQuotedStringsFromArrayLike(body);
    if (rescued.length > 0) return rescued;
    return [];
  }

  const single = cleanBubbleText(body);
  if (!single) return [];
  if (looksLikeJsonStringArray(single)) {
    const rescued = extractQuotedStringsFromArrayLike(single);
    if (rescued.length > 0) return rescued;
    return [];
  }
  return [single];
}

/** Split any bubble that still embeds a full JSON array (parse miss safety net). */
export function flattenJsonSpeechBubbles(bubbles: string[]): string[] {
  const out: string[] = [];
  for (const b of bubbles) {
    const t = b.trim();
    if (!t) continue;
    if (looksLikeJsonStringArray(t) || (t.startsWith('[') && t.includes('"'))) {
      const parsed = parseJsonArraySpeech(t);
      if (parsed.length > 1) {
        out.push(...parsed);
        continue;
      }
      if (parsed.length === 1 && !looksLikeJsonStringArray(parsed[0]!)) {
        out.push(parsed[0]!);
        continue;
      }
      const quoted = extractQuotedStringsFromArrayLike(t);
      if (quoted.length > 0) {
        out.push(...quoted);
        continue;
      }
      if (__DEV__) console.warn('[speechParse] could not split JSON bubble:', t.slice(0, 120));
      continue;
    }
    out.push(t);
  }
  return out;
}

/** Last-line defense: expand LLM / pipeline output into per-sentence bubbles. */
export function expandSpeechBubbleParts(bubbles: readonly string[]): string[] {
  const merged = flattenJsonSpeechBubbles(
    bubbles.flatMap((b) => {
      const t = b.trim();
      if (!t) return [];
      if (looksLikeJsonStringArray(t) || (t.startsWith('[') && t.includes('"'))) {
        const parsed = parseJsonArraySpeech(t);
        return parsed.length > 0 ? parsed : [];
      }
      return [t];
    })
  );
  return merged.filter((s) => s.length > 0 && !looksLikeJsonStringArray(s));
}
