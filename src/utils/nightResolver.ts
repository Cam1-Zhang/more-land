/**
 * 12 人预女猎白 / 狼美人·骑士（预女守卫骑士）夜间结算：
 * 行动收集顺序（wolfcha）：[守卫] → 狼 → [狼美人魅惑] → 女巫 → 预言家 → 天亮 resolveStandardNight。
 * 守卫：守中与狼刀同目标则狼刀无效；同目标又吃解药则「守救冲突」该玩家仍出局。
 * 女巫：每夜三选一（仅解药 / 仅毒药 / 都不用），不可同夜又救又毒；若入参冲突则丢弃毒药选择。
 * 女巫首夜（本局第一次天亮结算对应 nightNumber===1）中刀可自救；第二夜及以后中刀不可自救。
 * 双死：狼刀 A + 毒 B 则 A、B 同夜出局；女巫本夜中刀时若已撒毒，毒药仍生效，可与狼刀一并结算（女巫 + 被毒者可双死）。
 */

/** 出局方式（仅 isAlive=false 时用于 UI）；白痴翻牌仍存活不设此字段 */
export type PlayerOutReason =
  | 'wolf_night'
  | 'poison_night'
  | 'both_night'
  | 'exile_day'
  | 'hunter_gun'
  /** 狼美人出局后，被魅惑者殉情 */
  | 'wolf_beauty_charm'
  /** 骑士决斗出局 */
  | 'knight_duel'
  /** @deprecated 历史对局；App 已不再支持白天狼人自爆 */
  | 'wolf_self_destruct';

export type RoomPlayer = {
  id: string;
  name: string;
  role: string;
  isAlive: boolean;
  isAI: boolean;
  idiotFlipUsed?: boolean;
  /** 白痴翻牌后等为 false；未定义视为可投票 */
  canVote?: boolean;
  /** 被白狼王自爆带走等：猎人不能开枪（将来扩展） */
  cannotUseHunterGun?: boolean;
  /** 存活时：被哪位狼美人魅惑（狼美人骑士板） */
  charmedByWolfBeautyId?: string;
  /** 骑士是否已发动决斗（一局一次） */
  knightDuelUsed?: boolean;
  /** 最近一次出局原因（仅死亡后用于文案） */
  outReason?: PlayerOutReason;
};

export type WitchNightState = {
  hasAntidote: boolean;
  hasPoison: boolean;
};

export type BilingualLine = { zh: string; en: string };

/** 夜间出局原因（用于猎人能否开枪等） */
export type NightDeathCause = 'wolf' | 'poison' | 'both';

export type NightPlayerChoices = {
  wolfKillTargetId: string;
  witchUsesAntidote: boolean;
  witchPoisonTargetId: string | null;
  seerInspectTargetId: string | null;
  /** 狼美人·骑士板：守卫本夜目标；null 表示未守 / 无守卫 */
  guardTargetId?: string | null;
};

function normalizeWitchChoices(c: NightPlayerChoices): NightPlayerChoices {
  if (c.witchUsesAntidote && c.witchPoisonTargetId) {
    return { ...c, witchPoisonTargetId: null };
  }
  return c;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function isWolfTeam(role: string): boolean {
  return role === 'Werewolf' || role === 'WolfBeauty';
}

function nameById(players: RoomPlayer[], id: string): string {
  return players.find((p) => p.id === id)?.name ?? id;
}

export type StandardNightOutcome = {
  players: RoomPlayer[];
  witch: WitchNightState;
  lines: BilingualLine[];
  deathDetails: { id: string; cause: NightDeathCause }[];
};

export function resolveStandardNight(
  players: RoomPlayer[],
  opts: {
    nightNumber: number;
    witch: WitchNightState;
    choices: NightPlayerChoices;
  }
): StandardNightOutcome {
  const lines: BilingualLine[] = [];
  const next = players.map((p) => ({ ...p }));
  const alive = () => next.filter((p) => p.isAlive);

  const wolves = alive().filter((p) => isWolfTeam(p.role));
  const goodSide = alive().filter((p) => !isWolfTeam(p.role));

  let witchNext: WitchNightState = { ...opts.witch };
  const choices = normalizeWitchChoices(opts.choices);

  if (wolves.length === 0 || goodSide.length === 0) {
    lines.push({
      zh: '法官：阵营不完整，跳过本夜结算。',
      en: 'Moderator: Incomplete teams—night skipped.',
    });
    return { players: next, witch: witchNext, lines, deathDetails: [] };
  }

  let wolfTarget =
    goodSide.find((p) => p.id === choices.wolfKillTargetId) ?? pickRandom(goodSide);

  const knifeTargetId = wolfTarget.id;
  const guardTargetId = choices.guardTargetId ?? null;
  const guardBlocks = guardTargetId != null && guardTargetId === knifeTargetId;

  const witch = alive().find((p) => p.role === 'Witch');
  let witchWantsSave = false;
  /** 与 GameRoom 一致：首次天亮结算 nightNumber 为 1，对应整局「首夜」 */
  const witchMaySelfAntidote = opts.nightNumber <= 1;

  if (witch && witchNext.hasAntidote) {
    if (knifeTargetId === witch.id) {
      if (witchMaySelfAntidote) witchWantsSave = choices.witchUsesAntidote;
    } else {
      witchWantsSave = choices.witchUsesAntidote;
    }
  }

  let wolfKillId: string | null = knifeTargetId;
  if (guardBlocks && witchWantsSave) {
    wolfKillId = knifeTargetId;
  } else if (guardBlocks) {
    wolfKillId = null;
  } else if (witchWantsSave) {
    wolfKillId = null;
  }

  if (witchWantsSave && witchNext.hasAntidote) {
    witchNext = { ...witchNext, hasAntidote: false };
  }

  let poisonId: string | null = choices.witchPoisonTargetId;
  if (poisonId) {
    const victim = alive().find((p) => p.id === poisonId);
    if (!witch || !witchNext.hasPoison || !victim || victim.id === witch.id) {
      poisonId = null;
    } else {
      witchNext = { ...witchNext, hasPoison: false };
    }
  }

  const deathCause = new Map<string, 'wolf' | 'poison' | 'both'>();
  if (wolfKillId) deathCause.set(wolfKillId, 'wolf');
  if (poisonId) {
    if (deathCause.has(poisonId)) deathCause.set(poisonId, 'both');
    else deathCause.set(poisonId, 'poison');
  }

  const deathDetails: { id: string; cause: NightDeathCause }[] = [];
  for (const id of deathCause.keys()) {
    const pl = next.find((p) => p.id === id);
    if (pl) pl.isAlive = false;
    const c = deathCause.get(id)!;
    deathDetails.push({ id, cause: c });
  }

  if (deathCause.size === 0) {
    lines.push({
      zh: '天亮。昨晚平安夜。',
      en: 'Day breaks. Last night was peaceful—no one died.',
    });
  } else {
    const namesZh = [...deathCause.keys()].map((id) => nameById(players, id));
    const namesEn = namesZh;
    lines.push({
      zh:
        deathCause.size >= 2
          ? `天亮。昨晚出局：${namesZh.join('、')}。`
          : `天亮。昨晚【${namesZh[0]}】出局。`,
      en:
        deathCause.size >= 2
          ? `Day breaks. Last night eliminated: ${namesEn.join(', ')}.`
          : `Day breaks. Last night [${namesEn[0]}] was eliminated.`,
    });
  }

  return { players: next, witch: witchNext, lines, deathDetails };
}
