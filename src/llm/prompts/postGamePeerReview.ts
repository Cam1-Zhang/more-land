import type { AppLanguage } from '../../i18n/appStrings';
import type { AISpeechCharacter } from '../types';
import type { PromptResult } from '../types';

export type PostGamePeerReviewSide = 'teammate' | 'opponent';

export type PostGamePeerReviewPromptInput = {
  lang: AppLanguage;
  reviewer: AISpeechCharacter;
  reviewerRole: string;
  reviewerRoleLabel: string;
  targetName: string;
  targetRole: string;
  targetRoleLabel: string;
  side: PostGamePeerReviewSide;
  winner: 'good' | 'wolf';
  /** Whether the reviewer's faction won (not just "teammate" label). */
  reviewerFactionWon: boolean;
  boardLabel: string;
  publicLogs: string[];
  targetSpeechLines: string[];
  /** Post-game revealed roles / witch poison ledger — authoritative for reviews. */
  revealedFactsBlock: string;
};

export function buildPostGamePeerReviewPrompt(input: PostGamePeerReviewPromptInput): PromptResult {
  const {
    lang,
    reviewer,
    reviewerRole,
    reviewerRoleLabel,
    targetName,
    targetRole,
    targetRoleLabel,
    side,
    winner,
    reviewerFactionWon,
    boardLabel,
    publicLogs,
    targetSpeechLines,
    revealedFactsBlock,
  } = input;

  const sideLabel =
    lang === 'zh'
      ? side === 'teammate'
        ? '队友（同阵营）'
        : '对手（敌对阵营）'
      : side === 'teammate'
        ? 'teammate (same faction)'
        : 'opponent (rival faction)';

  const winnerLabel =
    lang === 'zh'
      ? winner === 'good'
        ? '好人阵营获胜'
        : '狼人阵营获胜'
      : winner === 'good'
        ? 'good team won'
        : 'werewolf team won';

  const reviewerOutcomeLabel =
    lang === 'zh'
      ? reviewerFactionWon
        ? '你与评价对象同属的阵营本局已获胜'
        : '你与评价对象同属的阵营本局已落败'
      : reviewerFactionWon
        ? 'Your faction (same as the subject) won this match'
        : 'Your faction (same as the subject) lost this match';

  const outcomeConstraint =
    lang === 'zh'
      ? reviewerFactionWon
        ? '禁止写「输了」「可惜没赢」「我们输了」等与落败矛盾的表述。'
        : '禁止写「赢了」「还好赢了」「得亏赢了」「幸亏赢了」「咱赢了」等与获胜矛盾的表述。'
      : reviewerFactionWon
        ? "Do not imply your side lost (no \"we lost\", \"too bad we didn't win\")."
        : 'Do not imply your side won (no "we won", "glad we won", "lucky we won").';

  const speechBlock =
    targetSpeechLines.length > 0
      ? targetSpeechLines.slice(-12).join('\n')
      : lang === 'zh'
        ? '（本局几乎无公开发言记录）'
        : '(almost no public speech on record)';

  const logTail = publicLogs.slice(-48).join('\n');

  if (lang === 'zh') {
    return {
      system: `你是狼人杀玩家「${reviewer.name}」，性格：${reviewer.personality}。本局已结束，身份已公开。请用第一人称，以${sideLabel}的口吻，根据该局真实表现与发言，给「${targetName}」写一句赛后评价（仅一句，15～45 字，口语化，可带一点你的性格，不要列点、不要 JSON、不要引号包裹）。评价内容必须与下方「阵营结局」一致，不得臆造相反胜负。若涉及女巫毒药，只能依据「本局真相」中的毒药记录判断毒杀对象阵营，不得把毒杀狼人说成毒队友，也不得把毒杀好人说成毒对了狼。`,
      user: [
        `板型：${boardLabel}`,
        `全局结果：${winnerLabel}`,
        `阵营结局：${reviewerOutcomeLabel}`,
        `胜负措辞：${outcomeConstraint}`,
        `你的身份：${reviewerRoleLabel}（${reviewerRole}）`,
        `评价对象：${targetName}，身份 ${targetRoleLabel}（${targetRole}）`,
        `关系：${sideLabel}`,
        '',
        revealedFactsBlock,
        '',
        `【${targetName} 本局公开发言摘录】`,
        speechBlock,
        '',
        '【本局公开事件与发言记录（节选，不含死因与毒药细节）】',
        logTail,
      ].join('\n'),
      temperature: 0.65,
      maxTokens: 96,
    };
  }

  return {
    system: `You are werewolf player "${reviewer.name}" (${reviewer.personality}). The match ended; all roles are revealed. In first person, as their ${sideLabel}, write ONE post-game line about "${targetName}" (15–45 words, conversational, in character; no bullets, no JSON, no wrapping quotes). The line MUST match the faction outcome below — never claim your side won if it lost, or lost if it won. For witch poison, use ONLY the poison ledger in "Revealed facts" — never call a wolf poison "friendly fire" or a good poison "hitting a wolf".`,
    user: [
      `Board: ${boardLabel}`,
      `Global outcome: ${winnerLabel}`,
      `Your faction: ${reviewerOutcomeLabel}`,
      `Wording rule: ${outcomeConstraint}`,
      `Your role: ${reviewerRoleLabel} (${reviewerRole})`,
      `Subject: ${targetName}, role ${targetRoleLabel} (${targetRole})`,
      `Relation: ${sideLabel}`,
      '',
      revealedFactsBlock,
      '',
      `[${targetName}'s public speech excerpts]`,
      speechBlock,
      '',
      '[Public log excerpt (no death causes or poison details)]',
      logTail,
    ].join('\n'),
    temperature: 0.65,
    maxTokens: 96,
  };
}
