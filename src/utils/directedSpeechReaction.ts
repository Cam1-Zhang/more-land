import type { AppLanguage } from '../i18n/appStrings';
import type { AIBehaviorProfile } from '../data/aiBehaviorProfiles';

export type DirectedSpeechIntent =
  | 'affection'
  | 'praise'
  | 'insult'
  | 'question'
  | 'greeting'
  | 'game_pressure'
  | 'general';

export type DirectedSpeechReaction = {
  speakerName: string;
  body: string;
  intent: DirectedSpeechIntent;
};

export type BystanderSpeechReaction = DirectedSpeechReaction & {
  targetName: string;
};

function parsePlayerLine(line: string): { speakerName: string; body: string } | null {
  const m = line.match(/^([^:：\n]{1,24})[:：]\s*(.+)$/);
  if (!m) return null;
  const speakerName = m[1]!.trim();
  const body = m[2]!.trim();
  if (!speakerName || !body) return null;
  if (/^(系统|法官|System|Moderator)/i.test(speakerName)) return null;
  return { speakerName, body };
}

function classifyIntent(body: string, lang: AppLanguage): DirectedSpeechIntent {
  if (lang === 'zh') {
    if (/喜欢你|爱你|爱上|暗恋|心动|表白|在一起|做我(男|女)朋友|嫁给|娶你/.test(body)) return 'affection';
    if (/可爱|漂亮|好看|帅|厉害|牛|聪明|声音好听|真棒|喜欢.{0,8}(发言|性格)/.test(body)) return 'praise';
    if (/傻逼|蠢|废物|垃圾|菜|会不会玩|滚|闭嘴|讨厌你|恶心/.test(body)) return 'insult';
    if (/\?|？|吗|嘛|呢|怎么|为什么|为啥|是不是|能不能|可不可以/.test(body)) return 'question';
    if (/你好|嗨|哈喽|早上好|晚上好|在吗|打个招呼/.test(body)) return 'greeting';
    if (/狼人|狼坑|查杀|金水|银水|悍跳|票你|出你|踩你|站边|身份/.test(body)) return 'game_pressure';
    return 'general';
  }
  if (/\b(love you|like you|crush on you|date me|marry me)\b/i.test(body)) return 'affection';
  if (/\b(cute|pretty|beautiful|handsome|smart|brilliant|great|amazing)\b/i.test(body)) return 'praise';
  if (/\b(idiot|stupid|trash|garbage|shut up|hate you|can't play|cannot play)\b/i.test(body)) return 'insult';
  if (/\?|\b(why|how|what|who|when|where|can you|do you|are you)\b/i.test(body)) return 'question';
  if (/\b(hello|hey|hi|good morning|good evening|you there)\b/i.test(body)) return 'greeting';
  if (/\b(wolf|werewolf|seer|vote|exile|sus|suspicious|claim)\b/i.test(body)) return 'game_pressure';
  return 'general';
}

/**
 * Finds the newest human line aimed at this character since the character last
 * spoke. This makes a directed interaction fire once instead of every turn.
 */
export function findLatestUnansweredDirectedSpeech(input: {
  logs: readonly string[];
  targetName: string;
  humanPlayerName: string;
  lang: AppLanguage;
}): DirectedSpeechReaction | null {
  const { logs, targetName, humanPlayerName, lang } = input;
  if (!targetName || !humanPlayerName) return null;

  let lastTargetSpeechIndex = -1;
  for (let i = logs.length - 1; i >= 0; i -= 1) {
    const parsed = parsePlayerLine(logs[i]!);
    if (parsed?.speakerName === targetName) {
      lastTargetSpeechIndex = i;
      break;
    }
  }

  for (let i = logs.length - 1; i > lastTargetSpeechIndex; i -= 1) {
    const parsed = parsePlayerLine(logs[i]!);
    if (!parsed || parsed.speakerName !== humanPlayerName) continue;
    if (!parsed.body.includes(targetName)) continue;
    return {
      speakerName: parsed.speakerName,
      body: parsed.body.slice(0, 160),
      intent: classifyIntent(parsed.body, lang),
    };
  }
  return null;
}

export function directedSpeechPromptHint(
  reaction: DirectedSpeechReaction,
  lang: AppLanguage
): string {
  if (lang === 'zh') {
    const intentLabel: Record<DirectedSpeechIntent, string> = {
      affection: '示好或表白',
      praise: '夸奖',
      insult: '挑衅或骂你',
      question: '向你提问',
      greeting: '向你打招呼',
      game_pressure: '针对你的游戏发言',
      general: '直接和你说话',
    };
    return `【必须接话】${reaction.speakerName}刚才${intentLabel[reaction.intent]}：“${reaction.body}”。先用符合你性格的一小句直接回应这句话，再自然回到本局讨论；不要装没听见，不要复述整句，也不要把私人互动硬当成狼人证据。`;
  }
  return `[Must respond] ${reaction.speakerName} just addressed you (${reaction.intent}): “${reaction.body}”. Briefly answer in character first, then return naturally to the game. Do not ignore it, quote it in full, or treat personal banter as alignment evidence.`;
}

function stablePercent(parts: readonly string[]): number {
  let h = 2166136261;
  for (const ch of parts.join('|')) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100;
}

/** Latest human-to-someone-else social moment this observer has not spoken after. */
export function findLatestUnansweredBystanderSpeech(input: {
  logs: readonly string[];
  observerName: string;
  humanPlayerName: string;
  characterNames: readonly string[];
  lang: AppLanguage;
}): BystanderSpeechReaction | null {
  const { logs, observerName, humanPlayerName, characterNames, lang } = input;
  let lastObserverSpeechIndex = -1;
  for (let i = logs.length - 1; i >= 0; i -= 1) {
    if (parsePlayerLine(logs[i]!)?.speakerName === observerName) {
      lastObserverSpeechIndex = i;
      break;
    }
  }

  const possibleTargets = characterNames
    .filter((name) => name && name !== observerName)
    .sort((a, b) => b.length - a.length);
  for (let i = logs.length - 1; i > lastObserverSpeechIndex; i -= 1) {
    const parsed = parsePlayerLine(logs[i]!);
    if (!parsed || parsed.speakerName !== humanPlayerName) continue;
    const targetName = possibleTargets.find((name) => parsed.body.includes(name));
    if (!targetName) continue;
    const intent = classifyIntent(parsed.body, lang);
    // Ordinary wolf reads already have a stronger, evidence-backed reaction path.
    if (intent === 'game_pressure') continue;
    return {
      speakerName: parsed.speakerName,
      body: parsed.body.slice(0, 160),
      intent,
      targetName,
    };
  }
  return null;
}

/** Personality-weighted choice: lively seats gossip; guarded/quiet seats mostly move on. */
export function shouldReactAsBystander(input: {
  observerId: string;
  personalityLabel: string;
  profile: AIBehaviorProfile;
  reaction: BystanderSpeechReaction;
}): boolean {
  const { observerId, personalityLabel, profile, reaction } = input;
  const label = personalityLabel.toLowerCase();
  let chance =
    6 +
    profile.sociability * 0.42 +
    profile.randomness * 0.16 +
    profile.emotionality * 0.1 -
    profile.caution * 0.12;
  if (/chatty|joke|social|charismatic|loud|好奇|话多|社交|搞笑|外向/.test(label)) chance += 18;
  if (/silent|stoic|cold|shy|timid|quiet|寡言|沉默|冷淡|胆怯|内向/.test(label)) chance -= 24;
  if (reaction.intent === 'affection' || reaction.intent === 'insult') chance += 8;
  chance = Math.max(4, Math.min(72, Math.round(chance)));
  return stablePercent([observerId, reaction.speakerName, reaction.targetName, reaction.body]) < chance;
}

export function bystanderSpeechPromptHint(
  reaction: BystanderSpeechReaction,
  lang: AppLanguage
): string {
  if (lang === 'zh') {
    return `【旁观吃瓜】你刚听到${reaction.speakerName}对${reaction.targetName}说：“${reaction.body}”。按你的性格，你这次想顺嘴接一下：可以起哄、笑、吐槽、替人解围或冷淡点评，但只占一小句，别抢当事人的回应，也别把这种私人互动硬当成狼人证据；随后回到本局讨论。`;
  }
  return `[Bystander moment] You heard ${reaction.speakerName} say to ${reaction.targetName}: “${reaction.body}”. Your personality makes you chime in this time: tease, laugh, defuse, or make one dry comment. Keep it to a small beat, do not answer for the target, and do not treat banter as alignment evidence; then return to the game.`;
}
