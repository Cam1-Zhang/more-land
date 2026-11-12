import type { ImageSourcePropType } from 'react-native';

// Four seated directions per character: down/left/right/up, in a 2 × 2 atlas.
const SPRITES: Record<string, ImageSourcePropType> = {
  '1': require('../../assets/hall/valley/1.png'),
  '2': require('../../assets/hall/valley/2.png'),
  '3': require('../../assets/hall/valley/3.png'),
  '4': require('../../assets/hall/valley/4.png'),
  '5': require('../../assets/hall/valley/5.png'),
  '6': require('../../assets/hall/valley/6.png'),
  '7': require('../../assets/hall/valley/7.png'),
  '8': require('../../assets/hall/valley/8.png'),
  '9': require('../../assets/hall/valley/9.png'),
  '10': require('../../assets/hall/valley/10.png'),
  '11': require('../../assets/hall/valley/11.png'),
  '12': require('../../assets/hall/valley/12.png'),
  '13': require('../../assets/hall/valley/13.png'),
  '14': require('../../assets/hall/valley/14.png'),
  '15': require('../../assets/hall/valley/15.png'),
  '16': require('../../assets/hall/valley/16.png'),
  '17': require('../../assets/hall/valley/17-v2.png'),
  '18': require('../../assets/hall/valley/18.png'),
  '19': require('../../assets/hall/valley/19.png'),
  '20': require('../../assets/hall/valley/20.png'),
  '21': require('../../assets/hall/valley/21.png'),
  '22': require('../../assets/hall/valley/22.png'),
  '23': require('../../assets/hall/valley/23.png'),
  '24': require('../../assets/hall/valley/24.png'),
  '25': require('../../assets/hall/valley/25.png'),
  '26': require('../../assets/hall/valley/26.png'),
  '27': require('../../assets/hall/valley/27.png'),
  '28': require('../../assets/hall/valley/28.png'),
  '29': require('../../assets/hall/valley/29.png'),
  '30': require('../../assets/hall/valley/30.png'),
  '31': require('../../assets/hall/valley/31.png'),
  '32': require('../../assets/hall/valley/32.png'),
  '33': require('../../assets/hall/valley/33.png'),
  '34': require('../../assets/hall/valley/34.png'),
  '35': require('../../assets/hall/valley/35.png'),
  '36': require('../../assets/hall/valley/36.png'),
  '37': require('../../assets/hall/valley/37.png'),
  '38': require('../../assets/hall/valley/38.png'),
  '39': require('../../assets/hall/valley/39.png'),
  '40': require('../../assets/hall/valley/40.png'),
  '41': require('../../assets/hall/valley/41.png'),
  '42': require('../../assets/hall/valley/42.png'),
  '43': require('../../assets/hall/valley/43.png'),
  '44': require('../../assets/hall/valley/44.png'),
  '45': require('../../assets/hall/valley/45.png'),
  '46': require('../../assets/hall/valley/46.png'),
  '47': require('../../assets/hall/valley/47.png'),
  '48': require('../../assets/hall/valley/48.png'),
};

export function getHallCharacterSprite(id: string): ImageSourcePropType | undefined {
  return SPRITES[id === 'toby' ? '1' : id === 'momo' ? '2' : id];
}

// Wider transparent cells preserve robes and Ghost's silhouette at the same
// pixel scale and visible height as Toby/Momo, without squeezing the artwork.
export function getHallCharacterFrameWidth(_id: string): number {
  return 80;
}
