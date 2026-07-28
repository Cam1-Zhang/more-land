import type { ImageSourcePropType } from 'react-native';
import { getCharacterPickerPortraitById } from './characterBodyImages';

/** 图鉴详情弹窗：角色场景插画（横版），与 `mockData` 角色 id 一一对应 */
const GALLERY_SCENE_BY_ID: Partial<Record<string, ImageSourcePropType>> = {
  '1': require('../../assets/characters/gallery/named/Toby.png'),
  '2': require('../../assets/characters/gallery/named/Momo.png'),
  '3': require('../../assets/characters/gallery/named/Jack.png'),
  '4': require('../../assets/characters/gallery/named/Lily.png'),
  '5': require('../../assets/characters/gallery/named/Ben.png'),
  '6': require('../../assets/characters/gallery/named/Frank.png'),
  '7': require('../../assets/characters/gallery/named/Daisy.png'),
  '8': require('../../assets/characters/gallery/named/Sam.png'),
  '9': require('../../assets/characters/gallery/named/Alice.png'),
  '10': require('../../assets/characters/gallery/named/Tom.png'),
  '11': require('../../assets/characters/gallery/named/Luna.png'),
  '12': require('../../assets/characters/gallery/named/Peter.png'),
  '13': require('../../assets/characters/gallery/named/Zack.png'),
  '14': require('../../assets/characters/gallery/named/Rose.png'),
  '15': require('../../assets/characters/gallery/named/Devin.png'),
  '16': require('../../assets/characters/gallery/named/Sarah.png'),
  '17': require('../../assets/characters/gallery/named/Mike.png'),
  '18': require('../../assets/characters/gallery/named/Chloe.png'),
  '19': require('../../assets/characters/gallery/named/Gary.png'),
  '20': require('../../assets/characters/gallery/named/Mia.png'),
  '21': require('../../assets/characters/gallery/named/Leo.png'),
  '22': require('../../assets/characters/gallery/named/Ivy.png'),
  '23': require('../../assets/characters/gallery/named/Hank.png'),
  '24': require('../../assets/characters/gallery/named/Jill.png'),
  '25': require('../../assets/characters/gallery/named/Frost.png'),
  '26': require('../../assets/characters/gallery/named/Oscar.png'),
  '27': require('../../assets/characters/gallery/named/Elena.png'),
  '28': require('../../assets/characters/gallery/named/Mage.png'),
  '29': require('../../assets/characters/gallery/named/Victor.png'),
  '30': require('../../assets/characters/gallery/named/Sofia.png'),
  '31': require('../../assets/characters/gallery/named/Dante.png'),
  '32': require('../../assets/characters/gallery/named/Rita.png'),
  '33': require('../../assets/characters/gallery/named/Xander.png'),
  '34': require('../../assets/characters/gallery/named/Nora.png'),
  '35': require('../../assets/characters/gallery/named/Julian.png'),
  '36': require('../../assets/characters/gallery/named/Clara.png'),
  '37': require('../../assets/characters/gallery/named/Prof. Mori.png'),
  '38': require('../../assets/characters/gallery/named/Widow.png'),
  '39': require('../../assets/characters/gallery/named/Kaspar.png'),
  '40': require('../../assets/characters/gallery/named/Vesper.png'),
  '41': require('../../assets/characters/gallery/named/Socrates.png'),
  '42': require('../../assets/characters/gallery/named/Ada.png'),
  '43': require('../../assets/characters/gallery/named/Ghost.png'),
  '44': require('../../assets/characters/gallery/named/Kaiser.png'),
  '45': require('../../assets/characters/gallery/named/Old Fox.png'),
  '46': require('../../assets/characters/gallery/named/Ambassador.png'),
  '47': require('../../assets/characters/gallery/named/Justice.png'),
  '48': require('../../assets/characters/gallery/named/God Eye.png'),
};

/** 图鉴点开后的详情卡主图：场景插画优先，缺图时回退立绘 */
export function getCharacterGalleryDetailImageById(characterId: string): ImageSourcePropType {
  return GALLERY_SCENE_BY_ID[characterId] ?? getCharacterPickerPortraitById(characterId);
}
