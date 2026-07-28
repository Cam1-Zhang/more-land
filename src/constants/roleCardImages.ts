import type { ImageSourcePropType } from 'react-native';

/**
 * `assets/roles/*.jpg`：像素风身份立绘（开局身份卡、教程、结算卡面共用）。
 * 文件名即角色：狼人杀身份与阿瓦隆身份共用同一套卡面资源映射。
 */
export type RoleCardImageKey =
  | 'Villager'
  | 'Knight'
  | 'Witch'
  | 'Seer'
  | 'Hunter'
  | 'Guard'
  | 'Werewolf'
  | 'WolfBeauty'
  | 'Idiot'
  | 'Merlin'
  | 'Percival'
  | 'LoyalServant'
  | 'Assassin'
  | 'Morgana'
  | 'Mordred'
  | 'Oberon';

export const ROLE_CARD_IMAGES: Record<RoleCardImageKey, ImageSourcePropType> = {
  Villager: require('../../assets/roles/villager.jpg'),
  Knight: require('../../assets/roles/knight.jpg'),
  Witch: require('../../assets/roles/witch.jpg'),
  Seer: require('../../assets/roles/seer.jpg'),
  Hunter: require('../../assets/roles/hunter.jpg'),
  Guard: require('../../assets/roles/guard.jpg'),
  Werewolf: require('../../assets/roles/werewolf.jpg'),
  WolfBeauty: require('../../assets/roles/wolfbeauty.jpg'),
  Idiot: require('../../assets/roles/idiot.jpg'),
  Merlin: require('../../assets/roles/merlin.jpg'),
  Percival: require('../../assets/roles/percival.jpg'),
  LoyalServant: require('../../assets/roles/loyalservant.jpg'),
  Assassin: require('../../assets/roles/assassin.jpg'),
  Morgana: require('../../assets/roles/morgana.jpg'),
  Mordred: require('../../assets/roles/mordred.jpg'),
  Oberon: require('../../assets/roles/oberon.jpg'),
};

/** 10 人阿瓦隆的 4 名忠臣各使用一张独立卡面，身份规则与文案保持一致。 */
export const LOYAL_SERVANT_CARD_IMAGES: readonly ImageSourcePropType[] = [
  ROLE_CARD_IMAGES.LoyalServant,
  require('../../assets/roles/loyalservant2.jpg'),
  require('../../assets/roles/loyalservant3.jpg'),
  require('../../assets/roles/loyalservant4.jpg'),
];
