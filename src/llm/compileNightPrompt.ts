/**
 * Night-action prompts — wolf / seer / witch / wolf beauty / knight.
 */
import { buildWinCondition } from './promptUtils';
import { buildPersonaSection, filterTodayLogs, formatCandidateOptions } from './promptShared';
import type {
  KnightDuelPromptInput,
  NightSeerCheckPromptInput,
  NightWitchActionPromptInput,
  NightWolfBeautyCharmPromptInput,
  NightWolfKillPromptInput,
  PromptResult,
} from './types';

export function compileWolfKillPrompt(input: NightWolfKillPromptInput): PromptResult {
  const { actor, lang, candidates, history, nightNumber, packMateNames, packVotesSoFar, sheriffName } =
    input;
  const isZh = lang === 'zh';
  const options = formatCandidateOptions(candidates, lang);
  const jsonFormat = JSON.stringify({ target: candidates[0]?.name ?? 'Name' });
  const packLine =
    packMateNames && packMateNames.length > 0
      ? isZh
        ? `狼队友: ${packMateNames.join('、')}`
        : `Pack: ${packMateNames.join(', ')}`
      : '';
  const packVotes =
    packVotesSoFar && packVotesSoFar.length > 0
      ? isZh
        ? `【队友意向】\n${packVotesSoFar.map((v) => `- ${v.voterName} 想杀: ${v.targetName}`).join('\n')}`
        : `[Pack votes]\n${packVotesSoFar.map((v) => `- ${v.voterName} → ${v.targetName}`).join('\n')}`
      : '';
  const sheriffLine = sheriffName
    ? isZh
      ? `【警长】${sheriffName}`
      : `[Sheriff] ${sheriffName}`
    : '';

  const system = isZh
    ? `【身份】\n你是「${actor.name}」\n身份: 狼人\n\n${buildWinCondition('Werewolf', lang)}\n\n${buildPersonaSection(actor, lang)}\n\n【狼人技能】\n每晚狼人集体决定击杀一名玩家。\n\n【任务】\n选择一名玩家击杀。\n${packVotes}\n\n可选: ${options}`
    : `[Identity]\n"${actor.name}" — Werewolf\n\n${buildWinCondition('Werewolf', lang)}\n\n${buildPersonaSection(actor, lang)}\n\n[Wolf kill]\nPick one player to kill.\n${packVotes}\n\nOptions: ${options}`;

  const logs = filterTodayLogs(history, lang).slice(-30).join('\n') || (isZh ? '（无）' : '(None)');
  const user = isZh
    ? `第 ${nightNumber} 夜。\n${packLine}\n${sheriffLine}\n\n【公开信息】\n${logs}\n\n你们要杀谁？\n\n【格式】\n${jsonFormat}\n\ntarget 必须与可选名单中的名字完全一致。`
    : `Night ${nightNumber}.\n${packLine}\n${sheriffLine}\n\n[Public log]\n${logs}\n\nKill target?\n\n[Format]\n${jsonFormat}`;

  return { system, user, temperature: actor.modelRef?.temperature ?? 0.35, maxTokens: 64 };
}

export function compileSeerCheckPrompt(input: NightSeerCheckPromptInput): PromptResult {
  const { actor, lang, candidates, history, nightNumber } = input;
  const isZh = lang === 'zh';
  const options = formatCandidateOptions(candidates, lang);
  const jsonFormat = JSON.stringify({ target: candidates[0]?.name ?? 'Name' });

  const system = isZh
    ? `【身份】\n你是「${actor.name}」\n身份: 预言家\n\n${buildWinCondition('Seer', lang)}\n\n${buildPersonaSection(actor, lang)}\n\n【预言家技能】\n每晚可查验一名玩家的身份。\n\n可选: ${options}`
    : `[Identity]\n"${actor.name}" — Seer\n\n${buildWinCondition('Seer', lang)}\n\n${buildPersonaSection(actor, lang)}\n\n[Seer check]\nPick one player.\n\nOptions: ${options}`;

  const logs = filterTodayLogs(history, lang).slice(-30).join('\n') || (isZh ? '（无）' : '(None)');
  const user = isZh
    ? `第 ${nightNumber} 夜。\n\n【公开信息】\n${logs}\n\n你要查验谁？\n\n【格式】\n${jsonFormat}`
    : `Night ${nightNumber}.\n\n[Log]\n${logs}\n\nCheck who?\n\n[Format]\n${jsonFormat}`;

  return { system, user, temperature: actor.modelRef?.temperature ?? 0.35, maxTokens: 64 };
}

export function compileWitchActionPrompt(input: NightWitchActionPromptInput): PromptResult {
  const {
    actor,
    lang,
    poisonCandidates,
    history,
    nightNumber,
    hasAntidote,
    hasPoison,
    knifeVictimName,
    knifeVictimId,
    witchId,
    isFirstNight,
  } = input;
  const isZh = lang === 'zh';
  const saveAllowed = hasAntidote && !!knifeVictimId && (knifeVictimId !== witchId || isFirstNight);
  const poisonList = formatCandidateOptions(poisonCandidates, lang);
  const tonightKnifeZh = hasAntidote
    ? knifeVictimName
      ? `刀口 ${knifeVictimName}`
      : '无刀口感知'
    : '解药已用尽，不知刀口';
  const tonightKnifeEn = hasAntidote
    ? knifeVictimName ?? 'kill target unknown yet'
    : 'antidote used — kill target unknown';

  const system = isZh
    ? `【身份】\n你是「${actor.name}」\n身份: 女巫\n\n${buildWinCondition('Witch', lang)}\n\n${buildPersonaSection(actor, lang)}\n\n【女巫技能】\n解药救人、毒药杀人，每晚最多用一瓶。\n\n【药水】解药${hasAntidote ? '有' : '无'} | 毒药${hasPoison ? '有' : '无'}\n【今晚】${tonightKnifeZh}`
    : `[Identity]\n"${actor.name}" — Witch\n\n${buildWinCondition('Witch', lang)}\n\n${buildPersonaSection(actor, lang)}\n\n[Potions] save=${hasAntidote} poison=${hasPoison}\n[Tonight] ${tonightKnifeEn}`;

  const options = [
    saveAllowed ? '{"action":"save"}' : null,
    hasPoison ? '{"action":"poison","target":"显示名"}' : null,
    '{"action":"pass"}',
  ]
    .filter(Boolean)
    .join('\n');

  const logs = filterTodayLogs(history, lang).slice(-24).join('\n') || (isZh ? '（无）' : '(None)');
  const user = isZh
    ? `第 ${nightNumber} 夜。\n\n【可选】\n${options}${hasPoison ? `\n\n可毒: ${poisonList}` : ''}\n\n【公开信息】\n${logs}\n\n你要怎么做？严格返回 JSON。`
    : `Night ${nightNumber}.\n\n[Options]\n${options}${hasPoison ? `\n\nPoison targets: ${poisonList}` : ''}\n\n[Log]\n${logs}\n\nReturn JSON only.`;

  return { system, user, temperature: actor.modelRef?.temperature ?? 0.35, maxTokens: 72 };
}

export function compileWolfBeautyCharmPrompt(input: NightWolfBeautyCharmPromptInput): PromptResult {
  const { actor, lang, candidates, history, nightNumber } = input;
  const isZh = lang === 'zh';
  const options = formatCandidateOptions(candidates, lang);
  const jsonFormat = JSON.stringify({ target: candidates[0]?.name ?? 'Name' });

  const system = isZh
    ? `【身份】\n你是「${actor.name}」\n身份: 狼美人\n\n${buildWinCondition('WolfBeauty', lang)}\n\n${buildPersonaSection(actor, lang)}\n\n【任务】\n魅惑一名好人。\n\n可选: ${options}`
    : `[Identity]\n"${actor.name}" — Wolf Beauty\n\n${buildWinCondition('WolfBeauty', lang)}\n\n${buildPersonaSection(actor, lang)}\n\n[Charm]\nPick one good player.\n\nOptions: ${options}`;

  const logs = filterTodayLogs(history, lang).slice(-24).join('\n') || (isZh ? '（无）' : '(None)');
  const user = isZh
    ? `第 ${nightNumber} 夜。\n\n【公开信息】\n${logs}\n\n【格式】\n${jsonFormat}`
    : `Night ${nightNumber}.\n\n[Log]\n${logs}\n\n[Format]\n${jsonFormat}`;

  return { system, user, temperature: actor.modelRef?.temperature ?? 0.35, maxTokens: 64 };
}

export function compileKnightDuelPrompt(input: KnightDuelPromptInput): PromptResult {
  const { actor, lang, candidates, history, dayNumber } = input;
  const isZh = lang === 'zh';
  const options = formatCandidateOptions(candidates, lang);
  const jsonFormat = '{"useSkill":true,"target":"显示名"}';
  const passFmt = '{"useSkill":false}';

  const system = isZh
    ? `【身份】\n你是「${actor.name}」\n身份: 骑士\n\n${buildWinCondition('Knight', lang)}\n\n${buildPersonaSection(actor, lang)}\n\n【骑士技能】\n整局可决斗一次。狼死或你死。\n\n可选: ${options}`
    : `[Identity]\n"${actor.name}" — Knight\n\n${buildWinCondition('Knight', lang)}\n\n${buildPersonaSection(actor, lang)}\n\n[Duel] Once per game.\n\nOptions: ${options}`;

  const logs = filterTodayLogs(history, lang).slice(-30).join('\n') || (isZh ? '（无）' : '(None)');
  const user = isZh
    ? `第 ${dayNumber} 天。\n\n【讨论】\n${logs}\n\n是否决斗？\n决斗: ${jsonFormat}\n不决斗: ${passFmt}`
    : `Day ${dayNumber}.\n\n[Discussion]\n${logs}\n\nDuel? ${jsonFormat} or ${passFmt}`;

  return { system, user, temperature: actor.modelRef?.temperature ?? 0.35, maxTokens: 72 };
}
