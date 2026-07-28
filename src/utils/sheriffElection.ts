import type { DifficultyType } from '../types';
import type { RoomPlayer } from './nightResolver';
import type { AIBehaviorProfile } from '../data/aiBehaviorProfiles';

function hashStr(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function diffRank(d: DifficultyType): number {
  switch (d) {
    case 'Novice':
      return 0;
    case 'Easy':
      return 1;
    case 'Medium':
      return 2;
    case 'Hard':
      return 3;
    default:
      return 0;
  }
}

function isWolf(role: string): boolean {
  return role === 'Werewolf' || role === 'WolfBeauty';
}

function applyPersonaToSheriffThreshold(
  base: number,
  role: string,
  profile: AIBehaviorProfile | undefined
): number {
  if (!profile) return base;
  let t = base;
  const leadershipBoost = (profile.leadership / 100) * (profile.confidence / 100);
  t *= 0.55 + 0.45 * (0.35 + leadershipBoost * 0.65);
  if (profile.caution > 80) t *= 0.52;
  if (profile.leadership < 22 && profile.confidence < 28) t *= 0.62;
  if (isWolf(role) && profile.bluffChance > 0.35) t = Math.min(0.98, t * 1.45);
  if (profile.survivalInstinct > 88 && profile.leadership < 30) t *= 0.75;
  return Math.min(0.98, Math.max(0.04, t));
}

/** AI 是否上警：预言家高概率；狼偏高；其他随难度 + persona */
export function aiRunsForSheriff(
  role: string,
  difficulty: DifficultyType,
  id: string,
  gameNonce: string,
  profile?: AIBehaviorProfile
): boolean {
  const seed = hashStr(`${gameNonce}|sheriff|${id}|${role}`) % 1000;
  const r = seed / 1000;
  const dr = diffRank(difficulty);
  let threshold: number;
  if (role === 'Seer') threshold = 0.93;
  else if (isWolf(role)) threshold = 0.78 + dr * 0.04;
  else if (role === 'Witch' || role === 'Hunter' || role === 'Guard' || role === 'Knight') threshold = 0.22 + dr * 0.06;
  else if (role === 'Idiot') threshold = 0.18 + dr * 0.05;
  else threshold = 0.12 + dr * 0.08;
  threshold = applyPersonaToSheriffThreshold(threshold, role, profile);
  return r < threshold;
}

/** 未上警玩家投票选警长：略偏向投真预言家；失败时随机 */
export function pickSheriffVoteForAi(
  voterId: string,
  candidates: string[],
  players: RoomPlayer[],
  gameNonce: string
): string {
  const voter = players.find((p) => p.id === voterId);
  const seerCandidates = candidates.filter((id) => players.find((p) => p.id === id)?.role === 'Seer');
  const wolfCandidates = candidates.filter((id) => {
    const r = players.find((p) => p.id === id)?.role;
    return r === 'Werewolf' || r === 'WolfBeauty';
  });
  const seed = hashStr(`${gameNonce}|sheriffvote|${voterId}`) % 1000;
  const r = seed / 1000;

  if (voter && isWolf(voter.role) && wolfCandidates.length > 0 && r < 0.55) {
    return wolfCandidates[seed % wolfCandidates.length]!;
  }
  if (voter?.role === 'Seer' && seerCandidates.length === 1) {
    return seerCandidates[0]!;
  }
  if (seerCandidates.length === 1 && r < 0.42) return seerCandidates[0]!;
  if (seerCandidates.length > 1 && r < 0.28) return seerCandidates[seed % seerCandidates.length]!;
  return candidates[seed % candidates.length]!;
}
