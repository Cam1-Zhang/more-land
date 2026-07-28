import type { AppLanguage } from '../i18n/appStrings';
import { roleIdentityTitles } from '../i18n/roleCardCopy';
import type { AICharacter } from '../types';
import { buildPostGamePeerReviewPrompt, type PostGamePeerReviewSide } from '../llm/prompts/postGamePeerReview';
import { llmChatPrompt } from '../llm/runAction';
import type { ModelRef } from '../types';
import { isWolfTeam, type RoomPlayer } from './nightResolver';
import {
  buildPostGameRevealedFactsBlock,
  witchPoisonTargetsWereAllGood,
  witchPoisonTargetsWereAllWolves,
  type WitchPoisonRecord,
} from './postGameRevealedFacts';

export type { WitchPoisonRecord };

export type { PostGamePeerReviewSide };

export type PeerReviewCell = {
  key: string;
  targetId: string;
  targetName: string;
  targetRole: string;
  reviewerId: string;
  reviewerName: string;
  side: PostGamePeerReviewSide;
  status: 'pending' | 'ready';
  text: string;
};

export function peerReviewCellKey(targetId: string, reviewerId: string): string {
  return `${targetId}|${reviewerId}`;
}

/** One AI → one line about the human player (wolfcha-style, not full N×N matrix). */
export function buildPeerReviewPlan(players: readonly RoomPlayer[]): Array<{
  target: RoomPlayer;
  reviewer: RoomPlayer;
  side: PostGamePeerReviewSide;
}> {
  const human = players.find((p) => p.id === 'me');
  if (!human) return [];

  const pairs: Array<{
    target: RoomPlayer;
    reviewer: RoomPlayer;
    side: PostGamePeerReviewSide;
  }> = [];
  for (const reviewer of players) {
    if (!reviewer.isAI) continue;
    const side: PostGamePeerReviewSide =
      isWolfTeam(reviewer.role) === isWolfTeam(human.role) ? 'teammate' : 'opponent';
    pairs.push({ target: human, reviewer, side });
  }
  return pairs;
}

export function initialPeerReviewCells(
  plan: ReturnType<typeof buildPeerReviewPlan>
): PeerReviewCell[] {
  return plan.map(({ target, reviewer, side }) => ({
    key: peerReviewCellKey(target.id, reviewer.id),
    targetId: target.id,
    targetName: target.name,
    targetRole: target.role,
    reviewerId: reviewer.id,
    reviewerName: reviewer.name,
    side,
    status: 'pending',
    text: '',
  }));
}

export function extractPlayerSpeechLines(logs: readonly string[], playerName: string): string[] {
  if (!playerName) return [];
  const prefix1 = `${playerName}:`;
  const prefix2 = `${playerName}：`;
  return logs.filter((l) => l.startsWith(prefix1) || l.startsWith(prefix2));
}

function roleLabel(lang: AppLanguage, role: string): string {
  return roleIdentityTitles[lang][role] ?? role;
}

export function reviewerFactionWon(winner: 'good' | 'wolf', reviewerRole: string): boolean {
  return isWolfTeam(reviewerRole) === (winner === 'wolf');
}

const ZH_WIN_CLAIM =
  /(?:还好|幸亏|幸好|得亏).{0,8}?赢了|(?:我们|咱们|咱|大家).{0,6}?赢了|这局赢了|这把赢了|赢了[！。]?$|赢了[，、]|获胜|取得胜利|拿下这局|拿下这把|扛住了/;
const ZH_LOSS_CLAIM =
  /(?:可惜|遗憾).{0,6}?(?:输|没赢)|(?:我们|咱们|咱).{0,6}?(?:输|没赢|输了)|这局输了|这把输了|输了[！。]?$|没扛住|凉了|崩了|寄了/;

const EN_WIN_CLAIM =
  /\b(?:we|our team|our side|us)\s+(?:won|win|victory|prevailed)\b|\bglad\s+we\s+won\b|\blucky\s+we\s+won\b/i;
const EN_LOSS_CLAIM =
  /\b(?:we|our team|our side|us)\s+(?:lost|lose)\b|\btoo\s+bad\s+we\s+(?:lost|didn't\s+win)\b/i;

const ZH_POISONED_TEAMMATE =
  /毒(?:了|到|死|杀)?(?:队友|自己人|好人|平民|神职|同伴)|误毒|毒错|把(?:队友|自己人|好人)|毒在(?:好人|队友)|泼错毒|毒杀(?:队友|自己人)/;
const ZH_POISONED_WOLF =
  /毒(?:了|到|死|杀)?狼|毒对|毒得好|毒得准|泼对|毒杀狼/;

const EN_POISONED_TEAMMATE =
  /\bpoison(?:ed)?\s+(?:our|a)\s+(?:teammate|ally|good|town)|friendly\s+fire|wrong\s+target.*poison/i;
const EN_POISONED_WOLF =
  /\bpoison(?:ed)?\s+(?:a\s+)?wolf|good\s+poison|nailed\s+the\s+wolf/i;

function reviewClaimsWrongWitchPoison(
  line: string,
  lang: AppLanguage,
  target: RoomPlayer,
  witchPoisonRecords: readonly WitchPoisonRecord[],
  players: readonly RoomPlayer[]
): boolean {
  if (target.role !== 'Witch') return false;
  const records = witchPoisonRecords.filter((r) => r.witchId === target.id);
  if (records.length === 0) return false;
  if (witchPoisonTargetsWereAllWolves(target.id, records, players)) {
    return lang === 'zh' ? ZH_POISONED_TEAMMATE.test(line) : EN_POISONED_TEAMMATE.test(line);
  }
  if (witchPoisonTargetsWereAllGood(target.id, records, players)) {
    return lang === 'zh' ? ZH_POISONED_WOLF.test(line) : EN_POISONED_WOLF.test(line);
  }
  return false;
}

function reviewClaimsWrongOutcome(
  line: string,
  lang: AppLanguage,
  reviewerFactionWonFlag: boolean
): boolean {
  if (!line) return false;
  if (lang === 'zh') {
    return reviewerFactionWonFlag ? ZH_LOSS_CLAIM.test(line) : ZH_WIN_CLAIM.test(line);
  }
  return reviewerFactionWonFlag ? EN_LOSS_CLAIM.test(line) : EN_WIN_CLAIM.test(line);
}

function sanitizeReviewLine(raw: string): string {
  let s = raw.trim();
  if (!s) return '';
  if (s.startsWith('```')) {
    s = s.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();
  }
  s = s.replace(/^["'「『]+|["'」』]+$/g, '').trim();
  s = s.replace(/\s+/g, ' ');
  const firstLine = s.split(/[\n\r]+/)[0]?.trim() ?? '';
  if (firstLine.length > 80) return `${firstLine.slice(0, 77)}…`;
  return firstLine;
}

export function fallbackPeerReviewText(
  lang: AppLanguage,
  targetName: string,
  side: PostGamePeerReviewSide,
  reviewerFactionWonFlag: boolean
): string {
  if (lang === 'zh') {
    if (side === 'teammate') {
      return reviewerFactionWonFlag
        ? `说实话，${targetName} 这把和我们配合得还行。`
        : `唉，这把我们没扛住，${targetName} 那几下确实让人头疼。`;
    }
    return reviewerFactionWonFlag
      ? `${targetName} 这把挺难缠的，还好我们这边拿下了。`
      : `${targetName} 这把打得挺硬的，我以后得防着点。`;
  }
  if (side === 'teammate') {
    return reviewerFactionWonFlag
      ? `Honestly, ${targetName} played fine on our side this round.`
      : `Tough loss—we didn't hold the line, and ${targetName} didn't make it easier.`;
  }
  return reviewerFactionWonFlag
    ? `${targetName} was sharp, but we still pulled it off.`
    : `${targetName} was sharp this game—I will remember that.`;
}

export async function fetchPostGamePeerReview(params: {
  lang: AppLanguage;
  reviewer: AICharacter;
  reviewerRole: string;
  modelRef?: ModelRef;
  target: RoomPlayer;
  side: PostGamePeerReviewSide;
  winner: 'good' | 'wolf';
  boardLabel: string;
  publicLogs: string[];
  revealedFactsBlock: string;
  witchPoisonRecords: readonly WitchPoisonRecord[];
  allPlayers: readonly RoomPlayer[];
}): Promise<string> {
  const {
    lang,
    reviewer,
    reviewerRole,
    modelRef,
    target,
    side,
    winner,
    boardLabel,
    publicLogs,
    revealedFactsBlock,
    witchPoisonRecords,
    allPlayers,
  } = params;
  const reviewerFactionWonFlag = reviewerFactionWon(winner, reviewerRole);
  const prompt = buildPostGamePeerReviewPrompt({
    lang,
    reviewer: {
      id: reviewer.id,
      name: reviewer.name,
      personality: reviewer.personality,
      personalityDescription: reviewer.description,
      difficulty: reviewer.difficulty,
      modelRef,
    },
    reviewerRole,
    reviewerRoleLabel: roleLabel(lang, reviewerRole),
    targetName: target.name,
    targetRole: target.role,
    targetRoleLabel: roleLabel(lang, target.role),
    side,
    winner,
    reviewerFactionWon: reviewerFactionWonFlag,
    boardLabel,
    publicLogs,
    targetSpeechLines: extractPlayerSpeechLines(publicLogs, target.name),
    revealedFactsBlock,
  });
  const raw = await llmChatPrompt(modelRef, prompt);
  const line = sanitizeReviewLine(raw ?? '');
  if (
    line &&
    !reviewClaimsWrongOutcome(line, lang, reviewerFactionWonFlag) &&
    !reviewClaimsWrongWitchPoison(line, lang, target, witchPoisonRecords, allPlayers)
  ) {
    return line;
  }
  if (line && __DEV__) {
    console.warn('[postGamePeerReview] fact mismatch — using fallback:', line);
  }
  return fallbackPeerReviewText(lang, target.name, side, reviewerFactionWonFlag);
}

async function mapPool<T>(items: readonly T[], concurrency: number, fn: (item: T) => Promise<void>) {
  if (items.length === 0) return;
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const i = index++;
      await fn(items[i]!);
    }
  });
  await Promise.all(workers);
}

export async function runPostGamePeerReviewGeneration(params: {
  lang: AppLanguage;
  players: readonly RoomPlayer[];
  winner: 'good' | 'wolf';
  boardLabel: string;
  publicLogs: readonly string[];
  witchPoisonRecords: readonly WitchPoisonRecord[];
  charactersById: ReadonlyMap<string, AICharacter>;
  modelRefById: ReadonlyMap<string, ModelRef>;
  onCellReady: (key: string, text: string) => void;
  isCancelled: () => boolean;
}): Promise<void> {
  const revealedFactsBlock = buildPostGameRevealedFactsBlock(
    params.lang,
    params.players,
    params.witchPoisonRecords
  );
  const plan = buildPeerReviewPlan(params.players);
  await mapPool(plan, 3, async ({ target, reviewer, side }) => {
    if (params.isCancelled()) return;
    const char = params.charactersById.get(reviewer.id);
    const reviewerFactionWonFlag = reviewerFactionWon(params.winner, reviewer.role);
    if (!char) {
      params.onCellReady(
        peerReviewCellKey(target.id, reviewer.id),
        fallbackPeerReviewText(params.lang, target.name, side, reviewerFactionWonFlag)
      );
      return;
    }
    try {
      const text = await fetchPostGamePeerReview({
        lang: params.lang,
        reviewer: char,
        reviewerRole: reviewer.role,
        modelRef: params.modelRefById.get(reviewer.id),
        target,
        side,
        winner: params.winner,
        boardLabel: params.boardLabel,
        publicLogs: [...params.publicLogs],
        revealedFactsBlock,
        witchPoisonRecords: params.witchPoisonRecords,
        allPlayers: params.players,
      });
      if (!params.isCancelled()) {
        params.onCellReady(peerReviewCellKey(target.id, reviewer.id), text);
      }
    } catch (e) {
      if (__DEV__) console.warn('[postGamePeerReview] generation failed:', e);
      if (!params.isCancelled()) {
        params.onCellReady(
          peerReviewCellKey(target.id, reviewer.id),
          fallbackPeerReviewText(params.lang, target.name, side, reviewerFactionWonFlag)
        );
      }
    }
  });
}

export function sortPlayerIdsForReviews(
  playerIds: readonly string[],
  seatOrder: readonly string[]
): string[] {
  const orderIndex = new Map(seatOrder.map((id, i) => [id, i]));
  return [...playerIds].sort((a, b) => {
    if (a === 'me') return -1;
    if (b === 'me') return 1;
    const ia = orderIndex.get(a) ?? 999;
    const ib = orderIndex.get(b) ?? 999;
    return ia - ib;
  });
}

export type GroupedPeerReviews = {
  targetId: string;
  targetName: string;
  targetRole: string;
  teammate: PeerReviewCell[];
  opponent: PeerReviewCell[];
};

export function groupPeerReviewsByTarget(
  cells: readonly PeerReviewCell[],
  playerOrder: readonly string[]
): GroupedPeerReviews[] {
  const byTarget = new Map<string, GroupedPeerReviews>();
  for (const cell of cells) {
    let group = byTarget.get(cell.targetId);
    if (!group) {
      group = {
        targetId: cell.targetId,
        targetName: cell.targetName,
        targetRole: cell.targetRole,
        teammate: [],
        opponent: [],
      };
      byTarget.set(cell.targetId, group);
    }
    if (cell.side === 'teammate') group.teammate.push(cell);
    else group.opponent.push(cell);
  }
  const sortCells = (list: PeerReviewCell[]) =>
    [...list].sort((a, b) => a.reviewerName.localeCompare(b.reviewerName, 'zh'));
  return sortPlayerIdsForReviews([...byTarget.keys()], playerOrder).map((id) => {
    const g = byTarget.get(id)!;
    return {
      ...g,
      teammate: sortCells(g.teammate),
      opponent: sortCells(g.opponent),
    };
  });
}
