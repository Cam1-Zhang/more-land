/**
 * Dialogue renderer: OpenAI chat API converts structured thoughts into spoken lines only.
 * All game logic (suspicion, vote, memory, emotion) stays in other engines — GPT never decides table state.
 */
import type { AppLanguage } from '../i18n/appStrings';
import type { RichDialogueContext } from './dialogueContextBuilder';
import { flattenPlayerSafePack, type PlayerSafeDialoguePack } from './reasoningHumanizer';

function openaiChatCompletionsUrl(): string {
  if (typeof process === 'undefined') return 'https://api.openai.com/v1/chat/completions';
  const b = process.env.OPENAI_API_BASE?.trim();
  if (!b) return 'https://api.openai.com/v1/chat/completions';
  const normalized = b.replace(/\/$/, '');
  if (normalized.endsWith('/chat/completions')) return normalized;
  return `${normalized}/chat/completions`;
}

function dialogueApiKey(): string | undefined {
  if (typeof process === 'undefined') return undefined;
  const k =
    process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.EXPO_PUBLIC_OPENAI_KEY;
  if (typeof k !== 'string' || k.length < 12) return undefined;
  if (/YOUR_|PLACEHOLDER|xxx/i.test(k)) return undefined;
  return k;
}

function dialogueModel(): string {
  if (typeof process === 'undefined') return 'gpt-4o-mini';
  return process.env.OPENAI_DIALOGUE_MODEL || 'gpt-4o-mini';
}

export type DialoguePersonalityTraits = {
  aggression: number;
  confidence: number;
  caution?: number;
  sociability?: number;
  deception?: number;
  logic?: number;
  emotionality?: number;
};

/**
 * Facts already computed by engines — model must not invent or overturn them.
 */
export type DialogueRenderRequest = {
  emotion: string;
  target: string;
  confidence: number;
  reasons: readonly string[];
  personality: DialoguePersonalityTraits;
  /** Speaking character display name. */
  characterName?: string;
  lang?: AppLanguage;
  /** Single optional scene line (flavor only; not a decision). */
  sceneHint?: string;
  /** Optional extra lines the table already heard (anti-repetition). */
  recentLinesFromTable?: readonly string[];
  /** Caller-owned monotonic seed (e.g. day * 100 + speechIndex) for variety instructions. */
  varietySeed?: number;
  /** Optional: player-safe table read (preferred over raw engineContext). */
  playerSafeDialogue?: PlayerSafeDialoguePack;
  /** Optional: legacy engine snapshot — avoid in player dialogue; prefer playerSafeDialogue. */
  engineContext?: RichDialogueContext;
};

export type DialogueResult = {
  text: string;
  source: 'openai' | 'fallback';
};

/** Module-local recent outputs per character (last few lines) for variety prompts. */
const recentByCharacter = new Map<string, string[]>();
const MAX_RECENT = 8;

function hashSeed(parts: readonly (string | number)[]): number {
  const s = parts.join('|');
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const BANNED_OPENERS_ZH = [
  '我觉得',
  '说实话',
  '你们听我说',
  '让我分析一下',
  '综上所述',
  '作为',
  'AI',
  '模型',
  '根据算法',
];

const BANNED_OPENERS_EN = [
  'As an AI',
  'Let me analyze',
  'In conclusion',
  'Based on my',
  'According to',
  'I must inform you',
];

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Record a line after generation so the next call can steer away from repetition.
 */
export function registerDialogueLine(characterId: string, line: string): void {
  const t = line.trim();
  if (t.length < 4) return;
  const prev = recentByCharacter.get(characterId) ?? [];
  const next = [...prev, t].slice(-MAX_RECENT);
  recentByCharacter.set(characterId, next);
}

export function getRecentDialogueLines(characterId: string): string[] {
  return [...(recentByCharacter.get(characterId) ?? [])];
}

export function clearDialogueVarietyHistory(characterId?: string): void {
  if (characterId) recentByCharacter.delete(characterId);
  else recentByCharacter.clear();
}

function varietyInstruction(req: DialogueRenderRequest, lang: AppLanguage): string {
  const seed = req.varietySeed ?? hashSeed([req.target, req.emotion, req.confidence, req.reasons.join(';')]);
  const recent = [
    ...(req.recentLinesFromTable ?? []),
    ...(req.characterName ? getRecentDialogueLines(req.characterName) : []),
  ]
    .filter(Boolean)
    .slice(-5);

  const pick = (arr: string[], n: number) => {
    const out: string[] = [];
    for (let i = 0; i < n; i += 1) out.push(arr[(seed + i) % arr.length]!);
    return out;
  };

  if (lang === 'zh') {
    const avoid = pick(BANNED_OPENERS_ZH, 4).join('、');
    const frag =
      recent.length > 0
        ? `不要模仿或复述这些已有句式片段的开头：${recent.map((s) => `「${s.slice(0, 24)}…」`).join(' ')}`
        : '';
    return `【去重】variety_seed=${seed}。禁止以这些套话开头：${avoid}。${frag} 换一组动词与落点，不要复读上一轮的结构。`;
  }
  const avoid = pick(BANNED_OPENERS_EN, 4).join(', ');
  const frag =
    recent.length > 0
      ? `Do NOT echo these openings/snippets: ${recent.map((s) => `"${s.slice(0, 28)}..."`).join(' ')}`
      : '';
  return `[Variety] seed=${seed}. Avoid starting with: ${avoid}. ${frag} Vary verbs and sentence shape.`;
}

function personalityVoiceBlock(req: DialogueRenderRequest, lang: AppLanguage): string {
  const p = req.personality;
  const shy = (p.sociability ?? 50) < 35 && (p.aggression ?? 0) < 40;
  const aggressive = p.aggression >= 75;
  const manip = (p.deception ?? 0) >= 72;
  const logical = (p.logic ?? 0) >= 75;
  const fearful = (p.caution ?? 0) >= 78 && (p.emotionality ?? 0) > 65;

  if (lang === 'zh') {
    const bits: string[] = [];
    if (shy) bits.push('语气偏短、略迟疑，少用命令式。');
    if (aggressive) bits.push('说话直接、短促，可点名施压但保持桌游分寸。');
    if (manip) bits.push('表面客气、带引导性问句，但不要油腻话术堆叠。');
    if (logical) bits.push('条理清楚、少感叹，用可核对的表述。');
    if (fearful) bits.push('带一点自保的不安，但仍像真人玩家。');
    if (bits.length === 0) bits.push('自然口语，像熟人局。');
    return `【声线】${bits.join('')}`;
  }
  const bits: string[] = [];
  if (shy) bits.push('Soft, shorter lines; fewer imperatives.');
  if (aggressive) bits.push('Blunt, direct; name pressure but stay table-appropriate.');
  if (manip) bits.push('Polite surface, guiding questions; no greasy persuasion stack.');
  if (logical) bits.push('Analytical, minimal exclamations, checkable phrasing.');
  if (fearful) bits.push('Self-preservation unease; still a real player voice.');
  if (bits.length === 0) bits.push('Natural table banter.');
  return `[Voice] ${bits.join(' ')}`;
}

const RENDERER_SYSTEM_ZH = `你是狼人杀桌游【台词渲染器】，不是裁判、不是策略引擎。
【铁律】投票、怀疑对象、阵营、联盟、生死结果都已由程序决定。你只根据对方提供的 FACT JSON 把情绪与态度说成一句自然短台词。
禁止：JSON、Markdown、编号列表、元叙事（“作为AI”“让我分析”）、编造 FACT 里没有的新指控细节、替玩家改投票。
输出：一段可直接上屏的玩家口语（不要角色名前缀）。`;

const RENDERER_SYSTEM_EN = `You are a DIALOGUE RENDERER for a Werewolf/Mafia party game—not a judge or strategy engine.
HARD RULES: votes, suspicion targets, factions, alliances, eliminations are ALREADY decided by code. You ONLY turn the FACT JSON into one short in-character spoken line.
Forbidden: JSON/Markdown/bullets, meta (“as an AI”), inventing new accusations beyond FACTS, changing votes.
Output: one short spoken line only (no name prefix).`;

function buildUserPayload(req: DialogueRenderRequest, lang: AppLanguage): string {
  const facts = {
    emotion: req.emotion,
    target: req.target,
    confidence: req.confidence,
    reasons: [...req.reasons],
    personality: req.personality,
    characterName: req.characterName ?? null,
    sceneHint: req.sceneHint ?? null,
    playerSafeDialogue: req.playerSafeDialogue ?? null,
    engineContext: req.playerSafeDialogue ? null : req.engineContext ?? null,
  };
  const v = varietyInstruction(req, lang);
  const voice = personalityVoiceBlock(req, lang);
  if (lang === 'zh') {
    return `${voice}\n${v}\n\n【FACT_JSON】\n${JSON.stringify(facts, null, 2)}\n\n请只输出一句中文台词（≤90字），像在对其他玩家说话。若有 playerSafeDialogue：消化其中意思，点名对应玩家全名，禁止照抄 JSON 键名、禁止分析腔术语。若无 playerSafeDialogue 而有 engineContext：也不要复述内部字段名。`;
  }
  return `${voice}\n${v}\n\n[FACT_JSON]\n${JSON.stringify(facts, null, 2)}\n\nOutput ONE English line only (≤70 words), speaking to other players at the table. If playerSafeDialogue exists, use it as a table read—name the pressured seat, do not read JSON keys aloud, no dev jargon.`;
}

function localFallback(req: DialogueRenderRequest, lang: AppLanguage): string {
  if (req.playerSafeDialogue) {
    const pool = flattenPlayerSafePack(req.playerSafeDialogue, lang);
    if (pool.length > 0) {
      const seed = req.varietySeed ?? hashSeed([req.target, req.emotion]);
      return pool[seed % pool.length]!;
    }
  }
  const ec = req.engineContext;
  if (ec && ec.concreteObservations.length > 0) {
    const seed = req.varietySeed ?? hashSeed([req.target, req.emotion]);
    const pool = [...ec.concreteObservations, ...ec.memoryAnchors];
    const pickLine = pool[seed % pool.length]!;
    if (lang === 'zh') return pickLine;
    return pickLine;
  }
  const t = req.target;
  const r = req.reasons[0] ?? (lang === 'zh' ? '不对劲' : 'something off');
  if (lang === 'zh') {
    if (req.emotion === 'angry') return `${t}，你这轮说辞对不上，${r}，我跟你票型上见真章。`;
    if (req.emotion === 'scared' || req.emotion === 'nervous') return `我有点慌，但${t}这条线最烫手——${r}，我想先听TA怎么圆。`;
    if (req.emotion === 'confident') return `${t}我盯死了：${r}，这轮我站边很硬。`;
    return `${t}这边信号不干净，${r}，大家别被带节奏。`;
  }
  if (req.emotion === 'angry') return `${t}, your story doesn't line up—${r}. I'll follow that at the vote.`;
  if (req.emotion === 'scared' || req.emotion === 'nervous')
    return `I'm shaky, but ${t} is the hottest thread—${r}. I want to hear them clean it up.`;
  if (req.emotion === 'confident') return `I'm locked on ${t}: ${r}. My stance is firm today.`;
  return `${t} still smells off—${r}. Don't let the table get dragged by noise.`;
}

/**
 * Render one line of dialogue from structured facts (OpenAI if key present, else local fallback).
 */
export async function generateDialogue(req: DialogueRenderRequest): Promise<DialogueResult> {
  const lang = req.lang ?? 'zh';
  const key = dialogueApiKey();
  if (!key) {
    return { text: localFallback(req, lang), source: 'fallback' };
  }

  const system = lang === 'zh' ? RENDERER_SYSTEM_ZH : RENDERER_SYSTEM_EN;
  const user = buildUserPayload(req, lang);
  const seed = req.varietySeed ?? 0;
  const temperature = clamp(0.42 + (hashSeed([seed, req.emotion]) % 17) / 100, 0.38, 0.72);

  try {
    const res = await fetch(openaiChatCompletionsUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: dialogueModel(),
        temperature,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text === 'string' && text.trim().length > 0) {
      return { text: text.trim(), source: 'openai' };
    }
    console.warn('dialogueEngine: empty OpenAI content', data?.error?.message);
  } catch (e) {
    console.warn('dialogueEngine: OpenAI request failed', e);
  }
  return { text: localFallback(req, lang), source: 'fallback' };
}

/** Expose payload builder for tests / debugging. */
export function buildDialoguePromptForTests(req: DialogueRenderRequest): { system: string; user: string } {
  const lang = req.lang ?? 'zh';
  return {
    system: lang === 'zh' ? RENDERER_SYSTEM_ZH : RENDERER_SYSTEM_EN,
    user: buildUserPayload(req, lang),
  };
}

/**
 * Map thought/emotion engines into a dialogue request (still no GPT inside those engines).
 */
export function buildDialogueRequestFromThoughtShape(input: {
  emotion: string;
  target: string;
  confidence: number;
  reasons: readonly string[];
  personality: DialoguePersonalityTraits;
  lang?: AppLanguage;
  characterName?: string;
  varietySeed?: number;
  engineContext?: RichDialogueContext;
  playerSafeDialogue?: PlayerSafeDialoguePack;
}): DialogueRenderRequest {
  return {
    emotion: input.emotion,
    target: input.target,
    confidence: input.confidence,
    reasons: input.reasons,
    personality: input.personality,
    lang: input.lang,
    characterName: input.characterName,
    varietySeed: input.varietySeed,
    engineContext: input.engineContext,
    playerSafeDialogue: input.playerSafeDialogue,
  };
}
