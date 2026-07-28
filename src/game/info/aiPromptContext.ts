import type { AppLanguage } from '../../i18n/appStrings';
import { isWolfTeam, type RoomPlayer, type WitchNightState } from '../../utils/nightResolver';
import type { VoteHistoryEntry, WolfchaGamePhase } from '../types';

export type SeerCheckRecord = {
  nightNumber: number;
  targetName: string;
  isWolf: boolean;
};

export type AiPromptContextInput = {
  observer: RoomPlayer;
  allPlayers: readonly RoomPlayer[];
  tableOrder: readonly string[];
  dayNumber: number;
  phase: WolfchaGamePhase;
  sheriffId: string | null;
  wolfPackIds: readonly string[] | null;
  lang: AppLanguage;
  seerChecks?: readonly SeerCheckRecord[];
  witchState?: WitchNightState;
  witchKnifeTargetName?: string | null;
  knightDuelUsed?: boolean;
  guardLastTargetName?: string | null;
  voteHistory?: readonly VoteHistoryEntry[];
  dayExileVotesPublic?: boolean;
};

function seatNo(tableOrder: readonly string[], id: string): number {
  const idx = tableOrder.indexOf(id);
  return idx >= 0 ? idx + 1 : 0;
}

function formatPhaseLabel(phase: WolfchaGamePhase, lang: AppLanguage): string {
  if (lang === 'zh') {
    switch (phase) {
      case 'DAY_SPEECH':
        return '白天讨论';
      case 'DAY_VOTE':
        return '白天投票';
      case 'KNIGHT_DUEL':
        return '骑士决斗';
      case 'SHERIFF_SIGNUP':
        return '警长竞选';
      case 'SHERIFF_SPEECH':
        return '警上发言';
      case 'SHERIFF_VOTE':
        return '警长投票';
      case 'NIGHT_START':
      case 'NIGHT_WOLF_ACTION':
      case 'NIGHT_WITCH_ACTION':
      case 'NIGHT_SEER_ACTION':
        return '夜晚';
      default:
        return phase;
    }
  }
  switch (phase) {
    case 'DAY_SPEECH':
      return 'Day discussion';
    case 'DAY_VOTE':
      return 'Day vote';
    case 'KNIGHT_DUEL':
      return 'Knight duel';
    case 'SHERIFF_SIGNUP':
      return 'Sheriff signup';
    case 'SHERIFF_SPEECH':
      return 'Sheriff speeches';
    case 'SHERIFF_VOTE':
      return 'Sheriff vote';
    default:
      return phase;
  }
}

function formatVoteHistoryBlock(input: AiPromptContextInput): string {
  const { observer, voteHistory, dayExileVotesPublic, allPlayers, tableOrder, lang } = input;
  if (!voteHistory || voteHistory.length === 0) return '';

  const nameById = (id: string) => allPlayers.find((p) => p.id === id)?.name ?? id;
  const seat = (id: string) => {
    const idx = tableOrder.indexOf(id);
    return idx >= 0 ? idx + 1 : 0;
  };

  const visible = voteHistory.filter((v) => {
    /** 警长竞选始终暗票：不向 AI 暴露「谁投了谁」。 */
    if (v.kind === 'sheriff') return false;
    if (dayExileVotesPublic === true) return true;
    /** 白天放逐暗票：仅本人可见自己的投票记录。 */
    return v.voterId === observer.id;
  });
  if (visible.length === 0) return '';

  const rows = visible.slice(-24).map((v) => {
    const voterSeat = seat(v.voterId);
    const targetSeat = seat(v.targetId);
    const voterName = nameById(v.voterId);
    const targetName = nameById(v.targetId);
    const kindLabel =
      v.kind === 'sheriff'
        ? lang === 'zh'
          ? '警长'
          : 'Sheriff'
        : lang === 'zh'
          ? '放逐'
          : 'Exile';
    return lang === 'zh'
      ? `第${v.day}天·${kindLabel}：${voterSeat}号${voterName} → ${targetSeat}号${targetName}`
      : `Day ${v.day} · ${kindLabel}: #${voterSeat} ${voterName} → #${targetSeat} ${targetName}`;
  });

  return lang === 'zh'
    ? `\n\n<票型记录>\n${rows.join('\n')}\n</票型记录>`
    : `\n\n<vote_history>\n${rows.join('\n')}\n</vote_history>`;
}

function buildRolePrivateBlock(input: AiPromptContextInput): string {
  const {
    observer,
    lang,
    allPlayers,
    tableOrder,
    wolfPackIds,
    seerChecks,
    witchState,
    witchKnifeTargetName,
    knightDuelUsed,
    guardLastTargetName,
  } = input;
  const blocks: string[] = [];

  if (wolfPackIds && wolfPackIds.length > 0 && isWolfTeam(observer.role)) {
    const allies = wolfPackIds
      .filter((id) => id !== observer.id)
      .map((id) => {
        const ally = allPlayers.find((p) => p.id === id);
        if (!ally) return null;
        const seat = seatNo(tableOrder, ally.id);
        return lang === 'zh'
          ? `${seat}号${ally.name}${ally.isAlive ? '' : '（已出局）'}`
          : `#${seat} ${ally.name}${ally.isAlive ? '' : ' (out)'}`;
      })
      .filter(Boolean);
    blocks.push(
      lang === 'zh'
        ? `<狼队私有>\n狼队友：${allies.length > 0 ? allies.join('、') : '无存活队友'}\n</狼队私有>`
        : `<wolf_private>\nWolf allies: ${allies.length > 0 ? allies.join(', ') : 'none alive'}\n</wolf_private>`
    );
  }

  if (observer.role === 'Witch' && witchState) {
    const knifeLine = witchState.hasAntidote
      ? witchKnifeTargetName ??
        (lang === 'zh' ? '（本夜刀口未产生）' : '(no wolf strike target this night yet)')
      : lang === 'zh'
        ? '（解药已用尽，不知刀口）'
        : '(antidote used — kill target unknown)';
    blocks.push(
      lang === 'zh'
        ? `<女巫私有>\n解药：${witchState.hasAntidote ? '未用' : '已用'}\n毒药：${witchState.hasPoison ? '未用' : '已用'}\n本夜刀口：${knifeLine}\n</女巫私有>`
        : `<witch_private>\nAntidote: ${witchState.hasAntidote ? 'available' : 'used'}\nPoison: ${witchState.hasPoison ? 'available' : 'used'}\nTonight's kill: ${knifeLine}\n</witch_private>`
    );
  }

  if (observer.role === 'Seer' && seerChecks && seerChecks.length > 0) {
    const rows = seerChecks.map((c) =>
      lang === 'zh'
        ? `第${c.nightNumber}夜：【${c.targetName}】→ ${c.isWolf ? '狼' : '好人'}`
        : `Night ${c.nightNumber}: [${c.targetName}] → ${c.isWolf ? 'wolf' : 'good'}`
    );
    blocks.push(
      lang === 'zh'
        ? `<预言家私有>\n查验记录：\n${rows.join('\n')}\n</预言家私有>`
        : `<seer_private>\nCheck history:\n${rows.join('\n')}\n</seer_private>`
    );
  }

  if (observer.role === 'Knight' && knightDuelUsed !== undefined) {
    blocks.push(
      lang === 'zh'
        ? `<骑士私有>\n决斗：${knightDuelUsed ? '已使用' : '未使用（整局一次）'}\n</骑士私有>`
        : `<knight_private>\nDuel: ${knightDuelUsed ? 'used' : 'available (once per game)'}\n</knight_private>`
    );
  }

  if (observer.role === 'Idiot') {
    blocks.push(
      lang === 'zh'
        ? `<白痴私有>\n已翻牌：${observer.idiotFlipUsed ? '是' : '否'}\n可投票：${observer.canVote !== false ? '是' : '否'}\n</白痴私有>`
        : `<idiot_private>\nRevealed: ${observer.idiotFlipUsed ? 'yes' : 'no'}\nCan vote: ${observer.canVote !== false ? 'yes' : 'no'}\n</idiot_private>`
    );
  }

  if (observer.role === 'Guard') {
    const last =
      guardLastTargetName ??
      (lang === 'zh' ? '（首夜尚无记录）' : '(no prior guard yet)');
    blocks.push(
      lang === 'zh'
        ? `<守卫私有>\n上一晚守护目标：${last}\n</守卫私有>`
        : `<guard_private>\nLast guard target: ${last}\n</guard_private>`
    );
  }

  return blocks.length > 0 ? `\n\n${blocks.join('\n\n')}` : '';
}

export function buildAiPromptContext(input: AiPromptContextInput): string {
  const { observer, allPlayers, tableOrder, dayNumber, phase, sheriffId, lang } = input;
  const alive = allPlayers.filter((p) => p.isAlive);
  const dead = allPlayers.filter((p) => !p.isAlive);

  const aliveList = alive
    .map((p) => {
      const seat = seatNo(tableOrder, p.id);
      const isYou = p.id === observer.id;
      const isSheriff = p.id === sheriffId;
      const sheriffMark = isSheriff ? (lang === 'zh' ? '【警长】' : ' [Sheriff]') : '';
      if (isYou) {
        // Avoid "4号 Luna（你）" teaching the model to say "4号Luna" about itself.
        return lang === 'zh'
          ? `你（${p.name}，${seat}号）${sheriffMark}`
          : `you (${p.name}, #${seat})${sheriffMark}`;
      }
      return lang === 'zh' ? `${seat}号 ${p.name}${sheriffMark}` : `#${seat} ${p.name}${sheriffMark}`;
    })
    .join('\n');

  const deadList =
    dead.length > 0
      ? dead
          .map((p) => {
            const seat = seatNo(tableOrder, p.id);
            return lang === 'zh' ? `${seat}号 ${p.name}（出局）` : `#${seat} ${p.name} (out)`;
          })
          .join(', ')
      : lang === 'zh'
        ? '暂无'
        : 'none';

  const sheriffName = sheriffId
    ? (allPlayers.find((p) => p.id === sheriffId)?.name ?? (lang === 'zh' ? '未知' : 'unknown'))
    : lang === 'zh'
      ? '未产生'
      : 'none';

  const phaseLabel = formatPhaseLabel(phase, lang);
  const privateBlock = buildRolePrivateBlock(input);
  const voteBlock = formatVoteHistoryBlock(input);

  const dayRhythmBlock =
    dayNumber === 1
      ? lang === 'zh'
        ? `\n\n<第一天节奏>\n流程：昨夜结果公示 → 警长竞选（上警发言+投票）→ 白天讨论（时间很紧）→ 放逐投票。\n公开信息以上警发言、昨夜刀口/死亡为主；第一天不必像后期那样对每位出局者做长篇复盘。\n若有人今日被放逐，场上往往还来不及充分讨论其发言——这是正常的。\n</第一天节奏>`
        : `\n\n<day_one_rhythm>\nFlow: last-night result → sheriff election (campaign + vote) → short day discussion → exile vote.\nPublic info is mainly campaign speeches and last night's kill; day one is NOT a full post-mortem round like later days.\nIf someone is exiled today, the table often had little time to discuss them — that is normal.\n</day_one_rhythm>`
      : '';

  return lang === 'zh'
    ? `<当前局面>\n第${dayNumber}天 · ${phaseLabel}\n\n存活玩家（${alive.length}人）：\n${aliveList}\n\n出局玩家：${deadList}\n警长：${sheriffName}\n</当前局面>${dayRhythmBlock}${privateBlock}${voteBlock}`
    : `<game_state>\nDay ${dayNumber} · ${phaseLabel}\n\nAlive (${alive.length}):\n${aliveList}\n\nEliminated: ${deadList}\nSheriff: ${sheriffName}\n</game_state>${dayRhythmBlock}${privateBlock}${voteBlock}`;
}

export function uiDayPhaseToWolfcha(phase: string, nightSeg: string | null): WolfchaGamePhase {
  switch (phase) {
    case 'DISCUSSION':
      return 'DAY_SPEECH';
    case 'VOTING':
      return 'DAY_VOTE';
    case 'KNIGHT_DUEL':
      return 'KNIGHT_DUEL';
    case 'SHERIFF_SIGNUP':
      return 'SHERIFF_SIGNUP';
    case 'SHERIFF_SPEECH':
      return 'SHERIFF_SPEECH';
    case 'SHERIFF_VOTE':
      return 'SHERIFF_VOTE';
    case 'NIGHT':
      if (nightSeg === 'guard') return 'NIGHT_GUARD_ACTION';
      if (nightSeg === 'wolves') return 'NIGHT_WOLF_ACTION';
      if (nightSeg === 'wolf_beauty') return 'NIGHT_WOLF_BEAUTY_CHARM';
      if (nightSeg === 'witch') return 'NIGHT_WITCH_ACTION';
      if (nightSeg === 'seer') return 'NIGHT_SEER_ACTION';
      return 'NIGHT_START';
    default:
      return 'LOBBY';
  }
}
