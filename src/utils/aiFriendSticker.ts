import type { RoomStickerId } from '../data/roomStickers';
import type { EmotionLabel } from './emotionEngine';

/**
 * 约定顺序：生气、微笑、哭泣、大笑、点赞、无语（与贴纸资源一致）
 */
export const AI_FRIEND_STICKER_ORDER: readonly RoomStickerId[] = [
  'husky_angry',
  'husky_smile',
  'husky_cry',
  'husky_laugh',
  'husky_thumb',
  'husky_dots',
] as const;

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function pickNeutral(seed: number): RoomStickerId {
  /* 中性轮次：偏微笑、无语、点赞，少生气 */
  const pool: RoomStickerId[] = [
    'husky_smile',
    'husky_dots',
    'husky_thumb',
    'husky_laugh',
    'husky_smile',
    'husky_dots',
  ];
  return pool[seed % pool.length]!;
}

/**
 * 根据本轮发言内容推断情绪，低概率返回对应表情包；多数轮次返回 null。
 */
export function pickAiFriendSticker(
  speech: string,
  playerId: string,
  opts?: {
    personality?: string;
    emotion?: EmotionLabel;
    stress?: number;
    emotionality?: number;
    sociability?: number;
  }
): RoomStickerId | null {
  const personality = opts?.personality ?? '';
  const emotion = opts?.emotion ?? 'calm';
  const stress = Math.max(0, Math.min(100, opts?.stress ?? 12));
  const emotionality = Math.max(0, Math.min(100, opts?.emotionality ?? 40));
  const sociability = Math.max(0, Math.min(100, opts?.sociability ?? 45));
  const h = hash(`${speech}|${playerId}|friendSticker|${personality}|${emotion}|${stress}`);

  const emotionChance: Record<EmotionLabel, number> = {
    calm: 6,
    nervous: 15,
    angry: 24,
    confident: 13,
    scared: 18,
    desperate: 23,
    suspicious: 11,
  };
  let sendChance = emotionChance[emotion] + emotionality * 0.055 + sociability * 0.025;
  if (stress >= 70) sendChance += 5;
  if (/Joke|Chatty|Cheerful|Social|Loud/i.test(personality)) sendChance += 5;
  if (/Silent|Stoic|Cold|Shy|Timid/i.test(personality)) sendChance -= 5;
  sendChance = Math.max(4, Math.min(34, Math.round(sendChance)));
  if (h % 100 >= sendChance) return null;

  const s = speech;
  const tie = h % 10000;

  if (/哈哈|呵呵|笑死|太逗|搞笑|吃瓜|磕到了|233|lol|haha|rofl/i.test(s)) return 'husky_laugh';
  if (/哭|难过|对不起|遗憾|唉|惨|心碎|不舍|sad|sorry|regret/i.test(s)) return 'husky_cry';
  if (/查杀|狼人|悍跳|听杀|不信|怼|胡说|愤怒|气死|荒谬|离谱|栽赃/i.test(s))
    return 'husky_angry';
  if (/\bwolf\b|fake seer|eliminate|fake claim|suspicious push|must vote/i.test(s))
    return 'husky_angry';

  if (/金水|好人面|相信|站边|跟票|认同|铁好|保你|clear town|trust|vouch/i.test(s)) {
    return tie % 2 === 0 ? 'husky_thumb' : 'husky_smile';
  }

  if (/怀疑|不对|容错|表水|听感|再想想|maybe|not sure|hesitate/i.test(s)) {
    return tie % 3 === 0 ? 'husky_smile' : 'husky_dots';
  }

  if (/过|没什么|不知道|再听|下一轮|划水|沉默|随便|pass|skip|nothing/i.test(s))
    return 'husky_dots';

  if (/Aggressive|Impulsive|Hot/i.test(personality) && tie % 4 === 0) return 'husky_angry';
  if (/Cheerful|Warm|Friendly/i.test(personality) && tie % 3 === 0) return 'husky_laugh';
  if (/Melancholy|Timid/i.test(personality) && tie % 4 === 0) return 'husky_cry';

  switch (emotion) {
    case 'angry':
      return 'husky_angry';
    case 'scared':
    case 'desperate':
      return tie % 3 === 0 ? 'husky_dots' : 'husky_cry';
    case 'nervous':
      return tie % 4 === 0 ? 'husky_cry' : 'husky_dots';
    case 'confident':
      return tie % 3 === 0 ? 'husky_smile' : 'husky_thumb';
    case 'suspicious':
      return tie % 4 === 0 ? 'husky_angry' : 'husky_dots';
    case 'calm':
    default:
      break;
  }

  return pickNeutral(tie);
}
