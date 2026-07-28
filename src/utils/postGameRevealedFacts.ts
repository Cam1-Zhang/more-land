import type { AppLanguage } from '../i18n/appStrings';
import { roleIdentityTitles } from '../i18n/roleCardCopy';
import { isWolfTeam, type RoomPlayer } from './nightResolver';

export type WitchPoisonRecord = {
  nightNumber: number;
  witchId: string;
  witchName: string;
  targetId: string;
  targetName: string;
};

function roleLabel(lang: AppLanguage, role: string): string {
  return roleIdentityTitles[lang][role] ?? role;
}

function factionLabel(lang: AppLanguage, role: string): string {
  if (lang === 'zh') return isWolfTeam(role) ? '狼人阵营' : '好人阵营';
  return isWolfTeam(role) ? 'werewolf team' : 'good team';
}

function outReasonLabel(lang: AppLanguage, reason: RoomPlayer['outReason']): string {
  if (!reason) return lang === 'zh' ? '出局' : 'out';
  const mapZh: Record<string, string> = {
    wolf_night: '狼刀',
    poison_night: '毒杀',
    both_night: '狼刀+毒杀',
    exile_day: '放逐',
    hunter_gun: '猎枪',
    wolf_beauty_charm: '殉情',
    knight_duel: '决斗',
    wolf_self_destruct: '自爆',
  };
  const mapEn: Record<string, string> = {
    wolf_night: 'wolf kill',
    poison_night: 'poison',
    both_night: 'wolf+poison',
    exile_day: 'exile',
    hunter_gun: 'hunter shot',
    wolf_beauty_charm: 'charm martyr',
    knight_duel: 'knight duel',
    wolf_self_destruct: 'self-destruct',
  };
  return lang === 'zh' ? (mapZh[reason] ?? reason) : (mapEn[reason] ?? reason);
}

/** Post-game only: full roles + witch poison ledger for peer reviews. */
export function buildPostGameRevealedFactsBlock(
  lang: AppLanguage,
  players: readonly RoomPlayer[],
  witchPoisonRecords: readonly WitchPoisonRecord[]
): string {
  const rosterLines = players.map((p) => {
    const role = roleLabel(lang, p.role);
    if (lang === 'zh') {
      return p.isAlive
        ? `${p.name}：${role}（存活）`
        : `${p.name}：${role}（已出局·${outReasonLabel(lang, p.outReason)}）`;
    }
    return p.isAlive
      ? `${p.name}: ${role} (alive)`
      : `${p.name}: ${role} (out · ${outReasonLabel(lang, p.outReason)})`;
  });

  const poisonLines = witchPoisonRecords.map((r) => {
    const victim = players.find((p) => p.id === r.targetId);
    const victimRole = victim ? roleLabel(lang, victim.role) : '?';
    const victimFaction = victim ? factionLabel(lang, victim.role) : '?';
    if (lang === 'zh') {
      return `第 ${r.nightNumber} 夜：女巫「${r.witchName}」使用毒药毒杀「${r.targetName}」（身份 ${victimRole}，${victimFaction}）`;
    }
    return `Night ${r.nightNumber}: Witch "${r.witchName}" poisoned "${r.targetName}" (role ${victimRole}, ${victimFaction})`;
  });

  if (lang === 'zh') {
    const parts = [
      '【身份公示（评价必须以此为准，勿与公开讨论中的猜测混淆）】',
      rosterLines.join('\n'),
    ];
    if (poisonLines.length > 0) {
      parts.push('【女巫毒药记录（已发生事实）】', poisonLines.join('\n'));
    } else {
      parts.push('【女巫毒药】本局未使用毒药或无毒杀结算记录。');
    }
    return parts.join('\n');
  }

  const parts = [
    '[Revealed roles — reviews MUST follow this, not table speculation]',
    rosterLines.join('\n'),
  ];
  if (poisonLines.length > 0) {
    parts.push('[Witch poison ledger (facts)]', poisonLines.join('\n'));
  } else {
    parts.push('[Witch poison] No poison was used or recorded this match.');
  }
  return parts.join('\n');
}

export function witchPoisonTargetsWereAllWolves(
  witchId: string,
  records: readonly WitchPoisonRecord[],
  players: readonly RoomPlayer[]
): boolean {
  const hits = records.filter((r) => r.witchId === witchId);
  if (hits.length === 0) return false;
  return hits.every((r) => {
    const p = players.find((x) => x.id === r.targetId);
    return p != null && isWolfTeam(p.role);
  });
}

export function witchPoisonTargetsWereAllGood(
  witchId: string,
  records: readonly WitchPoisonRecord[],
  players: readonly RoomPlayer[]
): boolean {
  const hits = records.filter((r) => r.witchId === witchId);
  if (hits.length === 0) return false;
  return hits.every((r) => {
    const p = players.find((x) => x.id === r.targetId);
    return p != null && !isWolfTeam(p.role);
  });
}
