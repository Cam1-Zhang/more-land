/**
 * Persona (character identity) outranks difficulty for voice / social style.
 * Difficulty nudges reasoning consistency, manipulation reads, and structural depth — not "who they are".
 */
import type { AppLanguage } from '../i18n/appStrings';
import type { DifficultyType } from '../types';
import type { AIBehaviorProfile } from '../data/aiBehaviorProfiles';

export function diffRankFromType(d: DifficultyType): number {
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

/** Caps wolf “table acting” sophistication for local templates / prompts (0–3 scale). */
export function wolfTableActingCeiling(difficulty: DifficultyType): number {
  switch (difficulty) {
    case 'Novice':
      return 1;
    case 'Easy':
      return 1;
    case 'Medium':
      return 2;
    case 'Hard':
      return 3;
    default:
      return 1;
  }
}

/** Extra structural reasoning (vote notes, long chains) — Hard unlocks; strong persona can unlock without Hard. */
export function shouldAugmentStructuralReasoning(
  profile: AIBehaviorProfile,
  difficulty: DifficultyType
): boolean {
  if (difficulty === 'Hard') return true;
  if (profile.reasoningDepth >= 8) return true;
  if (profile.deception >= 85 && profile.logic >= 68) return true;
  if (profile.memoryDepth >= 16 && profile.logic >= 70) return true;
  return false;
}

export function buildDifficultySecondaryGuide(lang: AppLanguage, diff: DifficultyType): string {
  if (lang === 'zh') {
    return (
      `【难度（次要）】${diff}：只调「想得多深、多稳、多会藏锋」，不调社交底色。` +
      'Novice 可更碎、更飘、更不闭合；Hard 更可核对、更少自相矛盾，但语气仍必须服从人设（圆滑/冲/怂/戏谑等）。'
    );
  }
  return (
    `[Difficulty — secondary] ${diff}: adjusts how tight/consistent/deep your reads are—not your social mask. ` +
    'Novice may be messier; Hard may be sharper internally, but tone/rhythm must still match [Persona].'
  );
}

/**
 * Builds wolfcha-style <hidden_communication_profile> + <hidden_player_mind> XML blocks.
 *
 * Instead of a bullet-list of abstract instructions, we produce natural language descriptions
 * across 8 communication dimensions + 6 psychological dimensions — exactly the approach used
 * in the wolfcha reference project. These are passed as hidden context so the LLM *naturally
 * embodies* the character rather than following explicit directives.
 *
 * Key addition vs previous version: `mistakePattern` — the character's typical wrong reads.
 * This is what makes AI feel human: every player should have realistic, consistent flaws.
 */
export function buildCharacterBehaviorGuide(
  lang: AppLanguage,
  profile: AIBehaviorProfile,
  diff: DifficultyType,
  role: string
): string {
  const dr = diffRankFromType(diff);
  const isWolf = role === 'Werewolf' || role === 'WolfBeauty';
  const isSeer = role === 'Seer';

  // Difficulty-capped effective values
  const eLogic   = Math.round(profile.logic        * (dr === 0 ? 0.4 : dr === 1 ? 0.65 : dr === 2 ? 0.85 : 1));
  const eDecep   = Math.round(profile.deception    * (dr === 0 ? 0.35 : dr === 1 ? 0.6  : dr === 2 ? 0.82 : 1));
  const eMem     = Math.round(profile.memoryDepth  * (dr === 0 ? 0.4  : dr === 1 ? 0.6  : 1));
  const eReason  = Math.round(profile.reasoningDepth * (dr === 0 ? 0.35 : dr === 1 ? 0.55 : 1));

  if (lang === 'zh') {
    // --- hidden_communication_profile fields ---

    // werewolfExperience
    const exp =
      (eReason <= 1 && eLogic < 25) ? '对狼人杀理解有限，靠直觉和感情判断，不会系统性分析局面' :
      (eReason >= 6 && eLogic >= 65) ? '经验丰富，熟悉票型和逻辑验证，习惯追踪多人发言的一致性' :
      '知道基本套路，能识别简单矛盾，但不擅长串联复杂关系';

    // vocabularyStyle
    const vocab =
      eLogic >= 70 ? '发言结构化，使用"票型""对跳""金水/查杀""归票"等术语，逻辑词密度高' :
      profile.emotionality >= 70 ? '情绪词汇多，语气直白，会说"感觉不对""太奇怪了"，术语用得少' :
      '口语化，用词随意，偶尔带"感觉""好像""这个人不对劲"等模糊表达';

    // reasoningStyle
    const reasoning =
      (eReason >= 6 && eLogic >= 65) ? '关注票型收益、发言前后矛盾和归票模式，会跨轮次串联信息找不一致点' :
      eLogic >= 40 ? '注意发言前后的矛盾，会留意谁在认领逻辑线、谁在反打' :
      '最先注意情绪和气场，谁让自己觉得不舒服就怀疑谁，不太看数据';

    // speechLengthHabit
    const length =
      (profile.sociability >= 70 && profile.emotionality >= 60) ? '通常话多，情绪激动时更难收；被追问会展开解释，但未必说清楚' :
      profile.confidence <= 25 ? '发言简短，不确定时更是点到为止，宁可少说不愿引起注意' :
      (eLogic >= 60 && profile.confidence >= 60) ? '发言结构紧凑，中等长度，论点清晰，不废话' :
      '发言长短随情绪波动，有时三两句带过，有时展开讲很多';

    // pressureStyle
    const pressure =
      profile.emotionality >= 70 ? '被点名会立刻情绪化，语气急促或委屈，容易显得慌乱' :
      profile.aggression >= 70 ? '立刻反打，把压力转移给质疑者，语气变硬，不回避冲突' :
      profile.caution >= 70 ? '保持冷静，选择性解释，偏好用"我已经说过了"来收尾，不轻易展开' :
      '解释一下自己的立场，但态度不那么坚定，容易越解释越让人觉得心虚';

    // uncertaintyStyle
    const uncertainty =
      (profile.caution >= 65 && profile.voteChangeResistance <= 50) ? '经常用"可能""先观察一下""说不定"来推迟站边，喜欢留退路' :
      profile.confidence >= 75 ? '几乎不表达不确定，判断说出口就是确定的，很少用模糊语气' :
      '在关键判断上会补一句保留意见，但不会频繁用模糊语气来保护自己';

    // mistakePattern — the most important field for making AI feel human
    const mistake =
      profile.emotionality >= 70 ? '容易被情绪好的人带偏，把主动表态的人默认当好人，质疑自己的人默认当狼' :
      eLogic < 30 ? '经常用错误的前提得出看似合理的结论，有时候记错谁说了什么' :
      profile.followMajorityChance >= 80 ? '跟着大部队走之后发现错了，但不太会主动承认和纠正' :
      profile.randomness >= 65 ? '有时会突然改变判断，给出跳跃性结论，连自己都说不清为什么' :
      profile.voteChangeResistance >= 80 ? '认定一个人后很难松口，即使出现反证也可能选择性忽视' :
      '偶尔会因为信息不足而做出仓促的判断，之后很难收回';

    // wolfDeceptionStyle — only matters when wolf
    const wolfDec = isWolf ? (
      eDecep >= 65 ? '主动扮演热心好人，分析局势，把帮凶行为包装成逻辑，能在压力下维持一致的好人视角' :
      eDecep >= 35 ? '用保守姿态躲过大部分怀疑，尽量少发言、不主动引起注意，偶尔搭顺风车推人' :
      '伪装不稳，被追问容易前后矛盾，更多靠沉默或短句来掩盖，容易显得防御'
    ) : null;

    // Seer addon
    const seerAdd = isSeer ? (
      eLogic >= 60 ? '预言家：报验配合具体理由，主动预测对跳风险，引导好人推理线。' :
      '预言家：报验结果，但分析可能不深入，对跳时容易慌乱。'
    ) : null;

    // --- hidden_player_mind fields ---

    // courage
    const courage =
      profile.aggression >= 70 ? '敢独排众议、反打、硬推，不怕公开冒险' :
      profile.aggression <= 25 ? '几乎不敢反打或独排众议，跟大部队走最安全' :
      '有时敢表态，但遇到强烈反对会犹豫，不会一直硬顶';

    // memoryBias
    const memBias =
      eMem >= 10 ? '记录票型和发言变化，能精确引用多天的细节和矛盾' :
      eMem <= 2 ? '基本只记得最近1-2条发言，早期信息很快淡忘' :
      eLogic >= 60 ? '更记得逻辑矛盾和身份声明，不太记票型细节' :
      profile.emotionality >= 65 ? '更记得谁的语气让自己不舒服，不太记具体的逻辑链' :
      '记忆偏中等，关键发言记得住，细节有时混淆';

    // suspicionThreshold
    const suspicion =
      profile.voteChangeResistance <= 25 ? '一条线索就能让他改变立场，很容易被带节奏或说服' :
      profile.voteChangeResistance >= 75 ? '需要多条强证据才会改口，立场一旦锁定就很稳' :
      '需要两三条比较硬的理由才愿意改站边，中等说服难度';

    // selfProtection
    const selfProt =
      profile.aggression >= 65 ? '被攻击会立刻反打，把压力推给对方，偶尔过于激进' :
      profile.caution >= 70 ? '被攻击会冷静解释，尽量用逻辑收场，不喜欢情绪化争论' :
      profile.emotionality >= 70 ? '被攻击容易激动或委屈，会解释很多但未必说清楚' :
      '被攻击时先解释立场，然后寻求其他人支持，不擅长独自硬抗';

    // logicDepth
    const logicDepth =
      (eReason >= 6 && eLogic >= 65) ? '能串联多名玩家的发言和票型关系，找最优解' :
      eLogic >= 40 ? '能抓到单点矛盾，但串联多人关系时容易漏掉一些线索' :
      '只能注意到最明显的矛盾，不太会从多角度交叉分析';

    // tablePresence
    const presence =
      (profile.leadership >= 65 || profile.sociability >= 70) ? '占据话语主导，习惯给出方向，桌上存在感强' :
      profile.speakFrequency <= 30 ? '发言不多，等待时机，关键时刻才开口，平时潜水' :
      profile.emotionality >= 70 ? '情绪主导发言频率，平时中等，被刺激了会突然话多' :
      '中等存在感，不抢话头也不沉默，按顺序发言';

    const commProfile = [
      `- 游戏理解：${exp}`,
      `- 词汇习惯：${vocab}`,
      `- 推理方式：${reasoning}`,
      `- 发言长短：${length}`,
      `- 压力反应：${pressure}`,
      `- 不确定性：${uncertainty}`,
      `- 常见误判：${mistake}`,
      ...(wolfDec ? [`- 拿狼伪装：${wolfDec}`] : []),
      ...(seerAdd ? [`- 预言家特点：${seerAdd}`] : []),
    ].join('\n');

    const playerMind = [
      `- 胆量：${courage}`,
      `- 记忆偏好：${memBias}`,
      `- 怀疑阈值：${suspicion}`,
      `- 自保倾向：${selfProt}`,
      `- 逻辑水平：${logicDepth}`,
      `- 桌面存在感：${presence}`,
    ].join('\n');

    const diffLine =
      diff === 'Novice' ? '整体是新手水平：判断经常不准，容易被牵着走，不要试图表现得老练' :
      diff === 'Easy'   ? '还在学习阶段：偶尔犯可理解的失误，有时被带跑' :
      diff === 'Medium' ? '中等水平：大部分判断说得过去，偶尔漏洞，整体稳定' :
                          '老手水平：发言前后一致、有具体依据、知道什么时候发力、什么时候收着';

    return (
      `<hidden_communication_profile>\n` +
      `以下信息只用于塑造你的狼人杀水平和发言质感，不要向其他玩家说出这些标签。\n` +
      `${commProfile}\n` +
      `</hidden_communication_profile>\n\n` +
      `<hidden_player_mind>\n` +
      `以下是你稳定的玩家心智，只用于塑造你如何判断、站边、改口、承压和发言，不要向其他玩家说出这些标签。\n` +
      `${playerMind}\n` +
      `</hidden_player_mind>\n\n` +
      `【难度参考】${diffLine}。`
    );
  }

  // ---- English ----
  const exp =
    (eReason <= 1 && eLogic < 25) ? 'Limited game understanding; relies on gut feel, not systematic analysis' :
    (eReason >= 6 && eLogic >= 65) ? 'Experienced; tracks vote patterns and claim consistency across rounds' :
    'Knows basic patterns; catches simple contradictions but struggles to chain complex reads';

  const vocab =
    eLogic >= 70 ? 'Structured; uses terminology like "vote swing", "counter-claim", "golden/wolf check"' :
    profile.emotionality >= 70 ? 'Emotional; lots of "feels wrong", "definitely sketch" — low on jargon' :
    'Casual and imprecise; uses hedging words like "feels like" and "maybe"';

  const reasoning =
    (eReason >= 6 && eLogic >= 65) ? 'Tracks vote utility, claim consistency, flip-flops across days' :
    eLogic >= 40 ? 'Notices direct contradictions and who is steering reads' :
    'Mostly vibes — suspects whoever makes them uncomfortable emotionally';

  const length =
    (profile.sociability >= 70 && profile.emotionality >= 60) ? 'Tends to ramble; gets longer under pressure without necessarily clarifying' :
    profile.confidence <= 25 ? 'Short by default; says less when unsure to avoid drawing attention' :
    (eLogic >= 60 && profile.confidence >= 60) ? 'Compact and structured; medium length with clear points' :
    'Inconsistent length — sometimes brief, sometimes expansive depending on mood';

  const pressure =
    profile.emotionality >= 70 ? 'Gets flustered when accused; speech speeds up or sounds defensive' :
    profile.aggression >= 70 ? 'Immediately counter-attacks; shifts pressure to the accuser' :
    profile.caution >= 70 ? 'Stays calm; selectively explains; prefers closing with "I already said this"' :
    'Explains their stance but without conviction; tends to dig the hole deeper';

  const uncertainty =
    (profile.caution >= 65 && profile.voteChangeResistance <= 50) ? 'Frequently uses "maybe", "let me watch a bit more", "probably" to delay committing' :
    profile.confidence >= 75 ? 'Almost never hedges; states reads firmly when they make them' :
    'Adds a caveat on important reads but does not hedge constantly';

  const mistake =
    profile.emotionality >= 70 ? 'Gets swayed by confident-seeming people; defaults to trusting vocal players and suspecting anyone who targets them' :
    eLogic < 30 ? 'Often builds sound-looking conclusions on wrong premises; sometimes misremembers who said what' :
    profile.followMajorityChance >= 80 ? 'Goes with the crowd and rarely admits the mistake afterwards' :
    profile.randomness >= 65 ? 'Occasionally makes surprising jumps that even they cannot fully justify' :
    profile.voteChangeResistance >= 80 ? 'Locks in on someone and ignores counter-evidence once committed' :
    'Sometimes makes hasty reads when information is thin and struggles to walk them back';

  const wolfDecEn = isWolf ? (
    eDecep >= 65 ? 'Maintains a consistent good-person angle; actively builds credibility and frames kills as logical choices' :
    eDecep >= 35 ? 'Stays low-profile; tries not to stand out; opportunistically pushes others' :
    'Cover is shaky; contradicts under pressure or goes quiet, coming off as defensive'
  ) : null;

  const seerAddEn = isSeer ? (
    eLogic >= 60 ? 'Seer: precise reports with reasoning; anticipates counter-claims and guides town logic.' :
    'Seer: reports checks but analysis is shallow; can panic when counter-claimed.'
  ) : null;

  const courage =
    profile.aggression >= 70 ? 'Willing to hold minority positions, counter-attack, and push reads publicly' :
    profile.aggression <= 25 ? 'Prefers going with the majority; avoids public confrontation' :
    'Sometimes takes a stand but backs down when strongly opposed';

  const memBias =
    eMem >= 10 ? 'Tracks vote patterns and claim changes across days; quotes specific details accurately' :
    eMem <= 2 ? 'Essentially only remembers the last 1-2 speeches; earlier info fades fast' :
    eLogic >= 60 ? 'Better at remembering logical contradictions and identity claims than ballot specifics' :
    'Average memory; gets key speeches right but mixes up details';

  const suspicion =
    profile.voteChangeResistance <= 25 ? 'One strong argument can flip their stance; easily redirected' :
    profile.voteChangeResistance >= 75 ? 'Needs multiple hard pieces of evidence; very hard to move once locked' :
    'Needs two or three decent reasons before changing sides';

  const selfProt =
    profile.aggression >= 65 ? 'Counter-attacks immediately; deflects pressure aggressively' :
    profile.caution >= 70 ? 'Calmly explains with logic; avoids emotional arguments' :
    profile.emotionality >= 70 ? 'Gets visibly upset; over-explains without necessarily convincing' :
    'Explains first, then looks for allies; does not do well defending solo';

  const logicDepth =
    (eReason >= 6 && eLogic >= 65) ? 'Can chain reads across multiple players and vote patterns' :
    eLogic >= 40 ? 'Catches individual contradictions but misses complex multi-player webs' :
    'Only spots the most obvious inconsistencies; limited cross-analysis';

  const presence =
    (profile.leadership >= 65 || profile.sociability >= 70) ? 'Strong table presence; often sets the agenda' :
    profile.speakFrequency <= 30 ? 'Quiet until a key moment; tends to lurk then make a decisive move' :
    'Moderate; not dominant but not absent either';

  const commProfileEn = [
    `- Werewolf experience: ${exp}`,
    `- Vocabulary: ${vocab}`,
    `- Reasoning style: ${reasoning}`,
    `- Speech length: ${length}`,
    `- Under pressure: ${pressure}`,
    `- Uncertainty: ${uncertainty}`,
    `- Common mistake: ${mistake}`,
    ...(wolfDecEn ? [`- Wolf cover: ${wolfDecEn}`] : []),
    ...(seerAddEn ? [`- Seer trait: ${seerAddEn}`] : []),
  ].join('\n');

  const playerMindEn = [
    `- Courage: ${courage}`,
    `- Memory bias: ${memBias}`,
    `- Suspicion threshold: ${suspicion}`,
    `- Self-protection: ${selfProt}`,
    `- Logic depth: ${logicDepth}`,
    `- Table presence: ${presence}`,
  ].join('\n');

  const diffLineEn =
    diff === 'Novice' ? 'Novice overall: reads are often off, easily led astray, should not try to seem experienced' :
    diff === 'Easy'   ? 'Learning: makes understandable mistakes, sometimes dragged off track' :
    diff === 'Medium' ? 'Competent: mostly sound reads, occasional gaps, generally stable' :
                        'Veteran: consistent, evidence-backed, knows when to press and when to hold';

  return (
    `<hidden_communication_profile>\n` +
    `Use this only to shape your Werewolf skill level and speech texture. Do not state these labels to other players.\n` +
    `${commProfileEn}\n` +
    `</hidden_communication_profile>\n\n` +
    `<hidden_player_mind>\n` +
    `Use this as your stable player psychology. It shapes how you judge, take sides, change reads, handle pressure, and speak. Do not state it to other players.\n` +
    `${playerMindEn}\n` +
    `</hidden_player_mind>\n\n` +
    `[Difficulty] ${diffLineEn}.`
  );
}
