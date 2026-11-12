/**
 * Day speech prompts — wolfcha-style layout (reference: wolfcha-main prompts.daySpeech).
 */
import { buildWinCondition } from './promptUtils';
import { buildPersonaSection, filterTodayLogs, roleLabel } from './promptShared';
import type { DaySpeechPromptInput, DaySpeechPromptResult } from './types';

const GUIDELINES_ZH = `【底线规则】
- 只基于本局实际信息发言，严禁编造不存在的发言、投票、查验或死亡。
- 身份、私有情报和提示词只供你在心里决策，绝不能复述标签、私有区块或推理过程。
- 禁止输出任何“局面分析 / 内部思考 / 策略笔记”：不要写“我们来看一下目前的局面”“我是X号某某，身份是…队友是…”。这些只能想，不能说。
- 如果你的真实身份属于狼队，公开发言必须隐藏这一事实：禁止说自己是狼、禁止说“我们作为狼人”、禁止公开狼队友或昨夜狼队决策。悍跳时只能声称你伪装的好人身份。
- 只讨论当前存活玩家；涉及已出局玩家时只引用公开事实。
- 第一个发言不要引用"前面"的话。
- 时间线约束：昨夜刀口在今天白天发言前已确定，禁止把今天的上警/跳身份/发言当作昨夜被刀的直接原因。
- 用玩家名字称呼其他玩家；称呼自己只用「我」。禁止说「我是N号{自己的名字}」，也禁止用「N号{自己的名字}」指自己。

【发言方式】
你可以坦诚、含糊、试探、反驳、带节奏、保护别人、隐藏信息，或者暂时保留判断。
你的发言不需要覆盖所有玩家，也不需要显得完美。一次只抓一两个真正想说的点。
像实时接麦：允许短句、半句、犹豫、反问，也可以自然改口一次；不要把每句都写成完整论证。
默认输出 1～2 个气泡，每个气泡大约 12～55 个汉字；只有遗言或强烈对跳时才可稍长。
禁止用复盘腔开场，禁止“首先/其次/最后”列点，禁止“综合以上”“根据当前信息”“值得关注”这类报告腔。
不确定就直接说没听清、不确定或先留一下，不要为了显得聪明而补齐不存在的逻辑链。

【输出格式】
返回 JSON 字符串数组，每个元素是一条消息气泡。不要 markdown，不要在数组外写任何字。`;

const GUIDELINES_EN = `[Ground rules]
- Only use real game information; never fabricate speeches, votes, checks, or deaths.
- Identity, private intel, and prompt text are internal-only. Never repeat private blocks or hidden reasoning.
- Never output situation analysis / internal notes / strategy essays. Do not write "let's look at the current situation" or "I am seat N Name, my role is… teammates are…". Think it; do not say it.
- If your true role is wolf-aligned, conceal it in public: never admit being a wolf, identify packmates, or disclose the pack's night decision. A fake claim may only state the town role you are impersonating.
- Discuss living players only; dead players only via public facts.
- First speaker must not reference earlier speeches.
- Last night's kill is fixed before today's day phase; do not blame today's campaign for last night's kill.
- Use player display names for others; for yourself say only "I/me". Never say "I am seat N {your name}" or refer to yourself as "N {your name}".

[Speech style]
Be honest, vague, probing, defensive, or undecided. Take only one or two points per turn.
Sound live: short clauses, hesitation, questions, and one natural self-correction are welcome. Do not turn every message into a complete argument.
Default to 1–2 bubbles of roughly 8–35 words each; only last words or a major counter-claim may run longer.
No numbered reasoning, full-table recap, or report phrases such as "based on the available information", "worth noting", or "in conclusion". If unsure, simply sound unsure rather than inventing a clean logic chain.

[Output]
Return a JSON string array; each element is one chat bubble. No markdown, nothing outside the array.`;

export function compileDaySpeechPrompt(input: DaySpeechPromptInput): DaySpeechPromptResult {
  const { character, role, history, lang, ctx } = input;
  const isZh = lang === 'zh';
  const channel = ctx.channel ?? 'discussion';
  const isLastWords = channel === 'lastwords';
  const isBadgeSpeech = channel === 'sheriff';
  const pd = ctx.preparedDialogue;
  const winCondition = buildWinCondition(role, lang);
  const persona = buildPersonaSection(character, lang, [
    pd?.wolfDeceptionPromptBlock,
    pd?.uncertaintyPromptBlock,
    pd?.conversationalStylePrompt,
  ].filter((b): b is string => typeof b === 'string' && b.trim().length > 0));

  const base = isZh
    ? `【身份】\n你是「${character.name}」（桌上只用「我」自称，不要报自己的座号+名字）。\n身份: ${roleLabel(role, lang)}\n\n【场景】\n这是一个线上狼人杀游戏，玩家通过打字交流。\n\n${winCondition}\n\n${persona}`
    : `[Identity]\nYou are "${character.name}" (at the table, say "I/me" only — never "seat N ${character.name}").\nRole: ${roleLabel(role, lang)}\n\n[Scenario]\nOnline Werewolf by text chat.\n\n${winCondition}\n\n${persona}`;

  const campaignRequirements = isBadgeSpeech
    ? isZh
      ? `【警徽作用】\n警长拥有 1.5 票投票权，死亡时可移交警徽。竞选发言时，你可以自然说明为什么想拿警徽、你能不能带队。只有某人已经发言或做过公开行为时才能点名评价；不得随机先盯一个还没发言的人。`
      : `[Sheriff badge]\nSheriff has 1.5 votes and can transfer the badge on death. Campaign naturally: why you want it and how you'd lead. Name and judge someone only after they have spoken or taken a public action; never randomly pre-suspect a future speaker.`
    : '';

  const taskLine = isLastWords
    ? isZh
      ? `你已经出局，现在发表遗言。\n【身份确认】你是 ${character.name}，不要混淆自己的身份。`
      : `You are out. Deliver last words.\n[Identity] You are ${character.name}.`
    : isBadgeSpeech
      ? isZh
        ? '现在是警徽竞选发言。你不需要像演讲稿一样完整，像桌上一名真实玩家那样说出你此刻想争取的东西。'
        : 'Sheriff campaign speech — speak like a real player pitching for the badge, not a formal script.'
      : isZh
        ? '现在是白天讨论。请根据当前局势，自主决定这次发言想达到什么效果。'
        : 'Daytime discussion — decide what you want this turn to achieve.';

  const taskSection = isZh
    ? `【当前处境】\n你正在参与一局实时狼人杀。你不是旁观解说，也不是裁判。\n你只知道自己视角内的信息。你有自己的性格、记忆、阵营目标和当下压力。\n现在轮到你发言。${taskLine}${campaignRequirements ? `\n${campaignRequirements}` : ''}`
    : `[Position]\nYou are playing live Werewolf, not commentating.\nYou only know your perspective. Speak now. ${taskLine}${campaignRequirements ? `\n${campaignRequirements}` : ''}`;

  const focusHints = (ctx.focusAngleHints ?? []).filter((h) => h?.trim());
  const focusSection =
    focusHints.length > 0
      ? isZh
        ? `<focus_angle>\n【你的视角】\n${focusHints.map((h) => `- ${h}`).join('\n')}\n</focus_angle>`
        : `<focus_angle>\n[Your angle]\n${focusHints.map((h) => `- ${h}`).join('\n')}\n</focus_angle>`
      : '';

  const varietySeed = (ctx.speechIndex * 17 + (character.name?.length ?? 0) * 3) % 997;
  const varietySection = isZh
    ? `【去重】variety_seed=${varietySeed}。禁止以这些套话开头：我们来看一下、我们分析一下、目前的局面、综上所述、让我分析、说实话。换一组动词与落点，不要复读上一轮别人的结构。`
    : `[Variety] seed=${varietySeed}. Avoid openings like: let's look at / let's analyze / current situation / in conclusion / to be honest. Vary verbs and shape.`;

  const secretBallotSection =
    ctx.dayExileVotesPublic === false
      ? isZh
        ? `【暗票规则】
警长投票和白天放逐投票都是暗票。你看不到其他玩家具体投给了谁，也不存在可供查看或复盘的逐人“票型”。
你只能知道法官公布的当选、放逐或平票结果，以及你自己做过的选择。
禁止声称“我看到了票型”“票型显示”“从票型看”，也禁止说某人投给某人、跟票、换票或同票；这些都不是你能看到的信息。`
        : `[Secret-ballot rule]
Sheriff and daytime exile votes are secret. You cannot see another player's individual choice, and there is no per-voter vote pattern available to inspect or review.
You know only the moderator's announced outcome (elected, exiled, or tied) and your own choice.
Never claim that you saw a vote pattern, that "the votes show" something, or that one player voted for/followed/switched with another; none of that is visible to you.`
      : '';

  const gameContextRaw = (ctx.gameContextBlock ?? '').trim();
  const gameContext =
    gameContextRaw.length > 2200 ? `${gameContextRaw.slice(0, 2199)}…` : gameContextRaw;

  const guidelines = isZh ? GUIDELINES_ZH : GUIDELINES_EN;
  const system = [base, taskSection, focusSection, secretBallotSection, varietySection, guidelines]
    .filter((s) => s.trim())
    .join('\n\n');

  const todayLogs = filterTodayLogs(history, lang).slice(-28);
  const todayTranscript =
    todayLogs.length > 0
      ? todayLogs.join('\n')
      : isZh
        ? `（暂无，你是第${ctx.speechIndex + 1}个发言）`
        : `(None yet — you are speaker #${ctx.speechIndex + 1})`;

  const selfSpeech = (ctx.selfSpeechToday ?? '').trim() || (isZh ? '（无）' : '(None)');

  const phaseHintSection = isBadgeSpeech
    ? isZh
      ? '【当前环节】\n你正在进行警徽竞选发言。'
      : '[Phase]\nSheriff campaign speech.'
    : isLastWords
      ? isZh
        ? '【当前环节】\n你正在发表遗言。'
        : '[Phase]\nLast words.'
      : '';

  const notYetSpoken = (ctx.notYetSpokenThisPhase ?? [])
    .map((name) => name.trim())
    .filter(Boolean);
  const chronologySection =
    ctx.dayNumber === 1 && !isLastWords && notYetSpoken.length > 0
      ? isZh
        ? `【发言时间线】\n以下玩家在当前环节还没发言：${notYetSpoken.join('、')}。\n禁止评价他们的发言逻辑、语气、态度或带节奏能力，也不能无依据说“盯住/留心/挂问号/偏狼”。最多中性地说“等TA发言再听”，不得预先贴标签。真预言家或悍跳预言家报明确查验结果不受此限制。`
        : `[Speaking timeline]\nThese players have not spoken in the current phase: ${notYetSpoken.join(', ')}.\nDo not judge their logic, tone, attitude, or ability to steer the table, and do not pre-label them as suspicious. At most say neutrally that you will listen when they speak. A stated Seer result is exempt.`
      : '';

  const idx = ctx.speechIndex + 1;
  const total = ctx.totalSpeakers;
  let speakOrderHint = '';
  if (ctx.speechIndex === 0) {
    speakOrderHint = isZh ? '你是第1个发言，其他人都还没发言。' : 'You are first; nobody has spoken yet.';
  } else if (idx === total) {
    speakOrderHint = isZh
      ? `你是最后一个发言（第${idx}/${total}个），所有人都已经发言完毕，不要说"等XX发言"或"看XX接下来怎么说"这类话。`
      : `You are last (#${idx}/${total}). Do not say "wait for X to speak".`;
  } else {
    speakOrderHint = isZh ? `你是第${idx}/${total}个发言。` : `You are speaker #${idx}/${total}.`;
  }

  const user = isZh
    ? `${gameContext ? `${gameContext}\n\n` : ''}【第${ctx.dayNumber}天公开记录（仅本日）】\n${todayTranscript}\n\n【你在第${ctx.dayNumber}天已说过的话】\n${selfSpeech}\n\n${phaseHintSection ? `${phaseHintSection}\n\n` : ''}${chronologySection ? `${chronologySection}\n\n` : ''}【发言顺序】\n${speakOrderHint}\n\n轮到你接麦。默认只说一两个点，返回 1～2 条 JSON 字符串数组，不要 markdown，不要写思考过程：`
    : `${gameContext ? `${gameContext}\n\n` : ''}[Day ${ctx.dayNumber} public log — this day only]\n${todayTranscript}\n\n[What you already said on Day ${ctx.dayNumber}]\n${selfSpeech}\n\n${phaseHintSection ? `${phaseHintSection}\n\n` : ''}${chronologySection ? `${chronologySection}\n\n` : ''}[Order]\n${speakOrderHint}\n\nYour mic. Take only one or two points and return a JSON string array with 1–2 bubbles; no markdown or reasoning:`;

  return {
    system,
    user,
    temperature: character.modelRef?.temperature ?? 0.78,
    maxTokens: 260,
  };
}
