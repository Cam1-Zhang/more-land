/** 简单字符串哈希，用于稳定但随内容变化的随机 */
function simpleHash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const POOLS = {
  positive: ['😊', '🙂', '👍', '🫡', '✨'],
  tense: ['😨', '😤', '👀', '‼️', '💢'],
  think: ['🤔', '🤨', '😏', '💭', '🧐'],
  chill: ['🙃', '😶', '💤', '🫥', '😅'],
  neutral: ['💬', '🔥', '🧊', '😀', '🙂'],
};

function pick<T>(arr: T[], seed: number, salt: number): T {
  return arr[(seed + salt) % arr.length]!;
}

/**
 * 根据发言内容低概率附加一个表情；多数轮次不展示，避免「每人固定一个表情」。
 */
export function pickSpeechReaction(speech: string, playerId: string): string | null {
  const h = simpleHash(speech + '|' + playerId);
  // 约 24% 轮次会尝试挂表情；其中再按关键词细分池子
  if (h % 100 >= 24) return null;

  const s = speech;
  const sub = h % 1000;

  if (/金水|好人面|相信|站边好人|好人牌/.test(s)) return pick(POOLS.positive, sub, 1);
  if (/查杀|狼人|悍跳|狼坑|听杀/.test(s)) return pick(POOLS.tense, sub, 2);
  if (/怀疑|不对|容错|划水|表水|听感/.test(s)) return pick(POOLS.think, sub, 3);
  if (/过|没什么|不知道|再听|下一轮/.test(s)) return pick(POOLS.chill, sub, 4);

  if (/clear|town|villager|trust|good side|not wolf/i.test(s)) return pick(POOLS.positive, sub, 6);
  if (/wolf|fake seer|suspicious|push vote|eliminate/i.test(s)) return pick(POOLS.tense, sub, 7);
  if (/not sure|listen|next round|pass|skip/i.test(s)) return pick(POOLS.chill, sub, 8);

  return pick(POOLS.neutral, sub, 5);
}
