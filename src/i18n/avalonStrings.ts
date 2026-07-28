import type { AppLanguage } from './appStrings';

export const avalonCopy: Record<AppLanguage, {
  title: string;
  subtitle: string;
  quest: string;
  questTeam: (count: number) => string;
  twoFails: string;
  missionSuccess: string;
  missionFail: string;
  pending: string;
  nightPhase: string;
  nightCommands: readonly [string, string, string, string, string];
  nightHints: readonly [string, string, string, string, string];
  daybreak: string;
  enterDay: string;
  discussion: string;
  discussionPrompt: string;
  currentSpeaker: (name: string) => string;
  speechPlaceholder: string;
  pass: string;
  speak: string;
  aiThinking: string;
  roundTable: string;
  proposal: string;
  teamVote: string;
  voteResult: string;
  missionVote: string;
  assassination: string;
  ended: string;
  leader: string;
  onTeam: string;
  you: string;
  attempt: (current: number) => string;
  selectTeam: (selected: number, required: number) => string;
  confirmTeam: string;
  aiProposed: (leader: string, names: string, attempt: number) => string;
  proposedTeam: string;
  leaderAutoApprove: (leader: string) => string;
  teamVoteWaiting: string;
  approve: string;
  reject: string;
  approveCount: (approve: number, reject: number) => string;
  proposalPassed: string;
  proposalRejected: string;
  fiveRejectionsMissionFail: string;
  continue: string;
  waitingMission: string;
  playSuccess: string;
  playFail: string;
  revealMission: string;
  missionOutcomeSuccess: string;
  missionOutcomeFail: string;
  nextQuest: string;
  enterAssassinationPhase: string;
  evilDiscussionStart: string;
  evilDiscussionEnd: string;
  evilDiscussionTimer: (time: string) => string;
  evilDiscussionPrompt: string;
  evilDiscussionWaiting: string;
  selectAssassination: string;
  confirmAssassination: string;
  witnessAssassination: string;
  assassinationPick: (seatNumber: number, name: string) => string;
  assassinationReveal: (seatNumber: number, name: string, role: string, success: boolean) => string;
  goodVictory: string;
  evilVictory: string;
  merlinHit: (name: string) => string;
  merlinSafe: (target: string, merlin: string) => string;
  fiveRejects: string;
  threeFails: string;
  roleReveal: string;
  roles: string;
  returnHome: string;
  playAgain: string;
  leaveTitle: string;
  leaveBody: string;
  cancel: string;
  leave: string;
  privateIntelNone: string;
  privateIntelMerlin: (names: string) => string;
  privateIntelPercival: (names: string) => string;
  privateIntelEvil: (names: string) => string;
  privateIntelOberon: string;
  logTitle: string;
}> = {
  zh: {
    title: '阿瓦隆 · 王者之剑',
    subtitle: '10 人经典局',
    quest: '任务',
    questTeam: (count) => `${count} 人出征`,
    twoFails: '需 2 张失败',
    missionSuccess: '成功',
    missionFail: '失败',
    pending: '未开始',
    nightPhase: '开局身份确认',
    nightCommands: [
      '全体玩家闭眼，双手放在桌面',
      '坏人睁眼：除奥伯伦外，所有坏人互相确认队友；确认后闭眼',
      '梅林睁眼：除莫德雷德外，所有坏人举手；梅林看完闭眼',
      '派西维尔睁眼：梅林、莫甘娜举手；派西维尔看完闭眼',
      '天亮，所有人睁眼，正式进入白天任务环节',
    ],
    nightHints: [
      '这是整局唯一一次闭眼身份确认。',
      '奥伯伦不睁眼，也不认识其他坏人。',
      '梅林能看见刺客、莫甘娜和奥伯伦，但看不见莫德雷德。',
      '派西维尔只能看见两名候选，无法分辨谁是梅林。',
      '之后每轮直接讨论、组队、表决和执行任务，不再闭眼。',
    ],
    daybreak: '主持人：天亮，所有人睁眼，正式进入白天任务环节。',
    enterDay: '天亮，开始讨论',
    discussion: '圆桌发言',
    discussionPrompt: '全员依次发表对本轮组队的看法，发言结束后由队长提案。',
    currentSpeaker: (name) => `当前发言：${name}`,
    speechPlaceholder: '输入你的发言…',
    pass: '过麦',
    speak: '发送发言',
    aiThinking: '对方正在组织发言…',
    roundTable: '亚瑟圆桌',
    proposal: '组建任务队伍',
    teamVote: '圆桌表决',
    voteResult: '表决结果',
    missionVote: '执行任务',
    assassination: '刺杀梅林',
    ended: '对局结束',
    leader: '队长',
    onTeam: '任务成员',
    you: '你',
    attempt: (current) => `本任务第 ${current}/5 次队长组队`,
    selectTeam: (selected, required) => `已选 ${selected}/${required} 人`,
    confirmTeam: '确认队伍',
    aiProposed: (leader, names, attempt) =>
      `${leader} 提议（本任务第 ${attempt}/5 次队长组队）由 ${names} 执行任务。`,
    proposedTeam: '本次任务队伍',
    leaderAutoApprove: (leader) => `${leader}（队长）已自动投赞成，其余玩家表决中…`,
    teamVoteWaiting: '其他玩家正在表决…',
    approve: '赞成',
    reject: '反对',
    approveCount: (approve, reject) => `赞成 ${approve} · 反对 ${reject}`,
    proposalPassed: '提案通过，任务开始。',
    proposalRejected: '提案未通过，队长顺时针移交。',
    fiveRejectionsMissionFail: '连续五次组队未通过，本轮任务直接判定失败。',
    continue: '继续',
    waitingMission: '任务成员将匿名提交成功或失败。',
    playSuccess: '提交成功',
    playFail: '提交失败',
    revealMission: '揭晓任务结果',
    missionOutcomeSuccess: '任务成功。',
    missionOutcomeFail: '任务失败。',
    nextQuest: '进入下一轮',
    enterAssassinationPhase: '好人阵营已累计完成三场任务，现在进入刺杀阶段。',
    evilDiscussionStart: '现在坏人阵营可以自由发言，共同讨论梅林身份，限时两分钟。',
    evilDiscussionEnd: '发言结束，刺客请选择要刺杀的玩家。',
    evilDiscussionTimer: (time) => `坏人讨论 · 剩余 ${time}`,
    evilDiscussionPrompt: '坏人阵营正在公开讨论梅林身份。',
    evilDiscussionWaiting: '等待其他坏人发言…',
    selectAssassination: '刺客请选择要刺杀的玩家。',
    confirmAssassination: '确认刺杀',
    witnessAssassination: '见证最后刺杀',
    assassinationPick: (seatNumber, name) => `刺客选择刺杀${seatNumber}号玩家${name}`,
    assassinationReveal: (seatNumber, name, role, success) =>
      `${seatNumber}号玩家${name}身份为${role}，刺杀${success ? '成功' : '失败'}！`,
    goodVictory: '亚瑟阵营获胜',
    evilVictory: '莫德雷德阵营获胜',
    merlinHit: (name) => `刺客命中梅林：${name}。邪恶逆转获胜。`,
    merlinSafe: (target, merlin) => `刺客误杀 ${target}，梅林 ${merlin} 幸存。`,
    fiveRejects: '连续五次提案被否决，邪恶阵营获胜。',
    threeFails: '三次任务失败，邪恶阵营获胜。',
    roleReveal: '身份已确认，圆桌议事开始。',
    roles: '最终身份',
    returnHome: '返回主页',
    playAgain: '再来一局',
    leaveTitle: '离开本局？',
    leaveBody: '当前进度不会保留。确定返回主页吗？',
    cancel: '继续游戏',
    leave: '离开',
    privateIntelNone: '你没有额外的开局情报。请从组队与投票中判断阵营。',
    privateIntelMerlin: (names) => `你看见这些邪恶玩家：${names}。其中不包含莫德雷德，且身份彼此不可区分。`,
    privateIntelPercival: (names) => `你看见两名“梅林候选”：${names}。其中一人是梅林，另一人是莫甘娜。`,
    privateIntelEvil: (names) => `你确认的邪恶同伴：${names}。奥伯伦不在彼此的视野中。`,
    privateIntelOberon: '你是孤立的邪恶角色：你不知道其他邪恶玩家，他们也不知道你。',
    logTitle: '圆桌纪要',
  },
  en: {
    title: 'Avalon · The King\'s Sword',
    subtitle: 'Classic 10-player game',
    quest: 'Quest',
    questTeam: (count) => `${count} adventurers`,
    twoFails: '2 fails required',
    missionSuccess: 'Success',
    missionFail: 'Failed',
    pending: 'Pending',
    nightPhase: 'Opening information',
    nightCommands: [
      'Everyone close your eyes and place both hands on the table.',
      'Evil, except Oberon, open your eyes and identify one another; then close your eyes.',
      'Merlin, open your eyes. All Evil except Mordred raise a hand; Merlin then closes their eyes.',
      'Percival, open your eyes. Merlin and Morgana raise a hand; Percival then closes their eyes.',
      'Dawn breaks. Everyone opens their eyes and the daytime quest phase begins.',
    ],
    nightHints: [
      'This is the only information night in the entire game.',
      'Oberon neither wakes nor knows the other Evil players.',
      'Merlin sees Assassin, Morgana, and Oberon, but not Mordred.',
      'Percival sees two candidates but cannot distinguish Merlin from Morgana.',
      'Later rounds go directly through discussion, proposal, vote, and quest—without another night.',
    ],
    daybreak: 'Moderator: Dawn breaks. Everyone opens their eyes and the daytime quest phase begins.',
    enterDay: 'Begin daytime discussion',
    discussion: 'Round Table discussion',
    discussionPrompt: 'Everyone speaks before the Leader proposes a quest team.',
    currentSpeaker: (name) => `Speaking now: ${name}`,
    speechPlaceholder: 'Type your speech…',
    pass: 'Pass',
    speak: 'Send',
    aiThinking: 'The player is preparing their statement…',
    roundTable: 'Arthur’s Round Table',
    proposal: 'Build a quest team',
    teamVote: 'Table vote',
    voteResult: 'Vote result',
    missionVote: 'Run the quest',
    assassination: 'Assassinate Merlin',
    ended: 'Game over',
    leader: 'Leader',
    onTeam: 'Quest team',
    you: 'You',
    attempt: (current) => `Team pick ${current}/5 this quest`,
    selectTeam: (selected, required) => `${selected}/${required} selected`,
    confirmTeam: 'Confirm team',
    aiProposed: (leader, names, attempt) =>
      `${leader} proposes (team pick ${attempt}/5 this quest) ${names} for the quest.`,
    proposedTeam: 'Proposed team',
    leaderAutoApprove: (leader) => `${leader} (Leader) auto-approves; other players are voting…`,
    teamVoteWaiting: 'Other players are voting…',
    approve: 'Approve',
    reject: 'Reject',
    approveCount: (approve, reject) => `${approve} approve · ${reject} reject`,
    proposalPassed: 'The proposal passes. The quest begins.',
    proposalRejected: 'The proposal is rejected. Leadership passes clockwise.',
    fiveRejectionsMissionFail: 'Five teams were rejected. This quest is scored as failed.',
    continue: 'Continue',
    waitingMission: 'Quest members secretly submit Success or Fail.',
    playSuccess: 'Play Success',
    playFail: 'Play Fail',
    revealMission: 'Reveal quest result',
    missionOutcomeSuccess: 'Quest succeeds.',
    missionOutcomeFail: 'Quest fails.',
    nextQuest: 'Next quest',
    enterAssassinationPhase: 'Good has completed three quests. The assassination phase begins.',
    evilDiscussionStart: 'Evil may speak openly for two minutes to discuss who Merlin is.',
    evilDiscussionEnd: 'Discussion ends. The Assassin must choose a target.',
    evilDiscussionTimer: (time) => `Evil discussion · ${time} left`,
    evilDiscussionPrompt: 'Evil players are openly debating Merlin\'s identity.',
    evilDiscussionWaiting: 'Waiting for other Evil players to speak…',
    selectAssassination: 'Assassin, choose a player to strike.',
    confirmAssassination: 'Confirm assassination',
    witnessAssassination: 'Witness the assassination',
    assassinationPick: (seatNumber, name) => `The Assassin strikes Player ${seatNumber} ${name}`,
    assassinationReveal: (seatNumber, name, role, success) =>
      `Player ${seatNumber} ${name} is ${role}. Assassination ${success ? 'succeeded' : 'failed'}!`,
    goodVictory: 'Arthur\'s servants win',
    evilVictory: 'Mordred\'s minions win',
    merlinHit: (name) => `The Assassin found Merlin: ${name}. Evil steals the victory.`,
    merlinSafe: (target, merlin) => `The Assassin struck ${target}; Merlin ${merlin} survives.`,
    fiveRejects: 'Five proposals were rejected. Evil wins.',
    threeFails: 'Three quests failed. Evil wins.',
    roleReveal: 'Roles confirmed. The Round Table convenes.',
    roles: 'Final roles',
    returnHome: 'Return home',
    playAgain: 'Play again',
    leaveTitle: 'Leave this game?',
    leaveBody: 'Current progress will not be saved. Return home?',
    cancel: 'Keep playing',
    leave: 'Leave',
    privateIntelNone: 'You have no extra opening information. Read the proposals and votes carefully.',
    privateIntelMerlin: (names) => `You see these agents of evil: ${names}. Mordred is hidden, and their exact roles are unknown.`,
    privateIntelPercival: (names) => `You see two Merlin candidates: ${names}. One is Merlin; the other is Morgana.`,
    privateIntelEvil: (names) => `Known evil allies: ${names}. Oberon is hidden from the evil team.`,
    privateIntelOberon: 'You are isolated: you know no other evil players, and they do not know you.',
    logTitle: 'Round Table notes',
  },
};
