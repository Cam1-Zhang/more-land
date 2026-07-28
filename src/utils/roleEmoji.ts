/** 板子身份 emoji：圆桌座位与开局身份卡共用。 */
export function roleEmojiForRole(role: string): string {
  switch (role) {
    case 'Villager':
      return '🧑‍🌾';
    case 'Knight':
      return '⚔️';
    case 'Seer':
      return '🔮';
    case 'Witch':
      return '🧙‍♀️';
    case 'Hunter':
      return '🔫';
    case 'Idiot':
      return '🤪';
    case 'Guard':
      return '🛡️';
    case 'Werewolf':
      return '🐺';
    case 'WolfBeauty':
      return '💋🐺';
    case 'Merlin':
      return '🧙‍♂️';
    case 'Percival':
      return '⚔️';
    case 'LoyalServant':
      return '🏰';
    case 'Assassin':
      return '🗡️';
    case 'Morgana':
      return '🧙‍♀️';
    case 'Mordred':
      return '👑';
    case 'Oberon':
      return '🌘';
    default:
      return '👤';
  }
}
