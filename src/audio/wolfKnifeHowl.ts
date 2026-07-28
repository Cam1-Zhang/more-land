import { Audio } from 'expo-av';
import { getGameSfxEnabledSync } from './gameSfxPref';
import { duckGameRoomBgmForHowl, unduckGameRoomBgm } from './gameRoomBgm';

/** 狼人夜「狼刀投票」阶段：每次进入该段播一次，不循环 */
// eslint-disable-next-line @typescript-eslint/no-var-requires -- Metro asset
const WOLF_HOWL_ASSET = require('../../assets/audio/wolf-howl-knife.mp3');

let lastHowlNightIndex: number | null = null;

/** 新对局 / 重置房间时调用，避免沿用上局的「已播」标记 */
export function resetWolfKnifeHowlNightGate(): void {
  lastHowlNightIndex = null;
}

/**
 * 与 `nightCountRef` 对齐：每完成一次天亮结算后 +1；第一夜狼段为 0。
 * 同一 `nightIndex` 只播一次（防止 effect 重跑重复播）。
 */
export async function playWolfKnifeHowlIfNewNight(nightIndex: number): Promise<void> {
  if (lastHowlNightIndex === nightIndex) return;
  lastHowlNightIndex = nightIndex;
  if (!getGameSfxEnabledSync()) return;
  await duckGameRoomBgmForHowl();
  try {
    const { sound } = await Audio.Sound.createAsync(WOLF_HOWL_ASSET, {
      shouldPlay: true,
      isLooping: false,
      volume: 0.88,
    });
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      void unduckGameRoomBgm();
      void sound.unloadAsync();
    };
    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) return;
      if (status.didJustFinish) finish();
    });
  } catch (e) {
    void unduckGameRoomBgm();
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[wolfKnifeHowl] play failed', e);
    }
  }
}
