/**
 * Vote prompts — exile + sheriff election (wolfcha-style layout).
 */
import { buildWinCondition } from './promptUtils';
import { buildPersonaSection, filterTodayLogs, formatCandidateOptions, roleLabel } from './promptShared';
import type { ExileVotePromptInput, PromptResult, SheriffVotePromptInput } from './types';

function compileVoteCore(
  input: ExileVotePromptInput | SheriffVotePromptInput,
  kind: 'exile' | 'sheriff'
): PromptResult {
  const { voter, role, lang, history, candidates, dayNumber } = input;
  const isZh = lang === 'zh';
  const winCondition = buildWinCondition(role, lang);
  const persona = buildPersonaSection(voter, lang);
  const options = formatCandidateOptions(candidates, lang);
  const voteJsonFormat = JSON.stringify({
    vote: candidates[0]?.name ?? 'PlayerName',
    reason: isZh ? '一句话说明投票依据' : 'One-line reason',
  });

  const base = isZh
    ? `【身份】\n你是「${voter.name}」\n身份: ${roleLabel(role, lang)}\n\n${winCondition}\n\n${persona}`
    : `[Identity]\nYou are "${voter.name}"\nRole: ${roleLabel(role, lang)}\n\n${winCondition}\n\n${persona}`;

  const task =
    kind === 'exile'
      ? isZh
        ? `【投票规则】\n每位玩家投票选择一名嫌疑人处决。得票最多者出局。\n\n【任务】\n选择一名玩家处决。必须基于你的阵营目标、公开查验、身份声明、对跳关系和归票信息判断。\n\n可选: ${options}`
        : `[Vote rules]\nExile vote — pick one suspect.\n\n[Task]\nVote based on role goal, claims, and public info.\n\nOptions: ${options}`
      : isZh
        ? `【警徽评选】\n只能从候选人里选择一名获得警徽。\n\n可选: ${options}`
        : `[Sheriff election]\nPick one candidate for the badge.\n\nOptions: ${options}`;

  const system = `${base}\n\n${task}`;
  const todayTranscript =
    filterTodayLogs(history, lang).join('\n') || (isZh ? '（无）' : '(None)');

  const user = isZh
    ? `【对局】约第 ${dayNumber} 天${kind === 'exile' ? '放逐投票' : '警长投票'}。\n\n【投票前请先在心里核对】\n- 本日讨论里是否有人跳预言家、报金水或查杀。\n- 是否有警长或你认为可信的人明确归票。\n- 你的投票要和自己的阵营目标、已知信息保持一致。\n\n【本日讨论记录】\n${todayTranscript}\n\n你投谁？\n\n【格式】\n严格返回 JSON 对象，不要代码块，不要多余文字：\n${voteJsonFormat}\n\nvote 的值必须与上面可选名单中的玩家名字完全一致。`
    : `[Game] ~day ${dayNumber} ${kind === 'exile' ? 'exile vote' : 'sheriff vote'}.\n\n[Today's log]\n${todayTranscript}\n\nWho do you vote?\n\n[Format]\nJSON only:\n${voteJsonFormat}\n\n"vote" must match a candidate display name exactly.`;

  return {
    system,
    user,
    temperature: voter.modelRef?.temperature ?? 0.35,
    maxTokens: 64,
  };
}

export function compileExileVotePrompt(input: ExileVotePromptInput): PromptResult {
  return compileVoteCore(input, 'exile');
}

export function compileSheriffVotePrompt(input: SheriffVotePromptInput): PromptResult {
  return compileVoteCore(input, 'sheriff');
}
