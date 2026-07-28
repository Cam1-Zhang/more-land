import { Audio } from 'expo-av';
import type { AppLanguage } from '../i18n/appStrings';
import { getGameSfxEnabledSync } from './gameSfxPref';
import { duckGameRoomBgmForHowl, unduckGameRoomBgm } from './gameRoomBgm';

export type VictoryCueKey = 'good' | 'wolf' | 'avalonEvil';

// eslint-disable-next-line @typescript-eslint/no-var-requires -- Metro asset
const ASSETS_ZH: Record<VictoryCueKey, number> = {
  good: require('../../assets/audio/narrator/zh/goodVictory.mp3'),
  wolf: require('../../assets/audio/narrator/zh/wolfVictory.mp3'),
  avalonEvil: require('../../assets/audio/narrator/zh/avalon/evilVictory.mp3'),
};

let activeSound: Audio.Sound | null = null;

export async function stopVictoryCue(): Promise<void> {
  if (!activeSound) return;
  const sound = activeSound;
  activeSound = null;
  try {
    await sound.stopAsync();
    await sound.unloadAsync();
  } catch {
    // The sound may already have finished and unloaded.
  }
  await unduckGameRoomBgm();
}

export async function playVictoryCue(key: VictoryCueKey, lang: AppLanguage): Promise<void> {
  if (lang !== 'zh' || !getGameSfxEnabledSync()) return;

  await stopVictoryCue();
  await duckGameRoomBgmForHowl();

  try {
    const { sound } = await Audio.Sound.createAsync(ASSETS_ZH[key], {
      shouldPlay: true,
      isLooping: false,
      volume: 0.95,
    });
    activeSound = sound;

    await new Promise<void>((resolve) => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        if (activeSound === sound) activeSound = null;
        void sound.unloadAsync();
        void unduckGameRoomBgm();
        resolve();
      };
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) finish();
      });
    });
  } catch (error) {
    activeSound = null;
    await unduckGameRoomBgm();
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[victoryCue] play failed', key, error);
    }
  }
}
