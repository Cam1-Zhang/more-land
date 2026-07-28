import { Audio } from 'expo-av';
import type { AppLanguage } from '../i18n/appStrings';
import { getGameSfxEnabledSync } from './gameSfxPref';
import { duckGameRoomBgmForHowl, unduckGameRoomBgm } from './gameRoomBgm';

export type AvalonOpeningCueStep = 0 | 1 | 2 | 3 | 4;

// eslint-disable-next-line @typescript-eslint/no-var-requires -- Metro asset
const ASSETS_ZH: Record<AvalonOpeningCueStep, number> = {
  0: require('../../assets/audio/narrator/zh/avalon/allPlayersClose.mp3'),
  1: require('../../assets/audio/narrator/zh/avalon/evilOpen.mp3'),
  2: require('../../assets/audio/narrator/zh/avalon/merlinOpen.mp3'),
  3: require('../../assets/audio/narrator/zh/avalon/percivalOpen.mp3'),
  4: require('../../assets/audio/narrator/zh/avalon/dayBreak.mp3'),
};

let activeSound: Audio.Sound | null = null;

export async function stopAvalonOpeningCue(): Promise<void> {
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

export async function playAvalonOpeningCue(
  step: AvalonOpeningCueStep,
  lang: AppLanguage
): Promise<void> {
  if (lang !== 'zh' || !getGameSfxEnabledSync()) return;

  await stopAvalonOpeningCue();
  await duckGameRoomBgmForHowl();

  try {
    const { sound } = await Audio.Sound.createAsync(ASSETS_ZH[step], {
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
      console.warn('[avalonNarratorCue] play failed', step, error);
    }
  }
}
