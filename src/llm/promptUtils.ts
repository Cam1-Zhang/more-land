import type { AppLanguage } from '../i18n/appStrings';

/** Role-specific win condition — mirrors wolfcha promptUtils.winCondition */
export function buildWinCondition(role: string, lang: AppLanguage): string {
  if (lang === 'zh') {
    switch (role) {
      case 'Werewolf':
      case 'WolfBeauty':
        return '阵营目标：消灭好人阵营，让狼人活到游戏结束。';
      case 'Seer':
        return '阵营目标：验明玩家身份，帮好人阵营找出并投票放逐狼人。';
      case 'Witch':
        return '阵营目标：合理使用解药和毒药，辅助好人阵营获胜。';
      case 'Guard':
        return '阵营目标：守护关键好人，阻止狼人刀口成功，帮好人阵营获胜。';
      case 'Knight':
        return '阵营目标：白天可决斗一名玩家一次——对方是狼则其出局，对方是好人则你出局。';
      case 'Hunter':
        return '阵营目标：辅助好人阵营，必要时开枪带走狼人玩家。';
      case 'Idiot':
        return '阵营目标：白天投票被放逐后免死，继续辅助好人阵营获胜。';
      default:
        return '阵营目标：发现狼人，通过推理和投票帮助好人阵营获胜。';
    }
  }
  switch (role) {
    case 'Werewolf':
    case 'WolfBeauty':
      return 'Win condition: eliminate the town faction; keep wolves alive until the end.';
    case 'Seer':
      return 'Win condition: check players, share findings, help town vote out wolves.';
    case 'Witch':
      return 'Win condition: use save/poison wisely to help town win.';
    case 'Guard':
      return 'Win condition: protect key town players from night kills.';
    case 'Knight':
      return 'Win condition: once per game, duel one player—wolf dies if guilty, you die if town.';
    case 'Hunter':
      return 'Win condition: help town; shoot a wolf if eliminated.';
    case 'Idiot':
      return 'Win condition: survive a day-vote elimination; keep supporting town.';
    default:
      return 'Win condition: find wolves through reasoning and voting.';
  }
}

export function buildMessagesFromPrompt(prompt: { system: string; user: string }) {
  return [
    { role: 'system' as const, content: prompt.system },
    { role: 'user' as const, content: prompt.user },
  ];
}
