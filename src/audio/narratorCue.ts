import { Audio } from 'expo-av';
import { nightSegmentHasOpenCloseBroadcast } from '../game/phaseConfig';
import type { NightSegmentId } from '../game/types';
import type { AppLanguage } from '../i18n/appStrings';
import { getGameSfxEnabledSync } from './gameSfxPref';
import { duckGameRoomBgmForHowl, unduckGameRoomBgm } from './gameRoomBgm';

type NarratorAssetKey =
  | 'nightFall'
  | 'dayBreak'
  | 'wolfWake'
  | 'wolfClose'
  | 'guardWake'
  | 'guardClose'
  | 'seerWake'
  | 'seerClose'
  | 'witchWake'
  | 'witchClose';

// eslint-disable-next-line @typescript-eslint/no-var-requires -- Metro asset
const ASSETS_ZH: Record<NarratorAssetKey, number> = {
  nightFall: require('../../assets/audio/narrator/zh/nightFall.mp3'),
  dayBreak: require('../../assets/audio/narrator/zh/dayBreak.mp3'),
  wolfWake: require('../../assets/audio/narrator/zh/wolfWake.mp3'),
  wolfClose: require('../../assets/audio/narrator/zh/wolfClose.mp3'),
  guardWake: require('../../assets/audio/narrator/zh/guardWake.mp3'),
  guardClose: require('../../assets/audio/narrator/zh/guardClose.mp3'),
  seerWake: require('../../assets/audio/narrator/zh/seerWake.mp3'),
  seerClose: require('../../assets/audio/narrator/zh/seerClose.mp3'),
  witchWake: require('../../assets/audio/narrator/zh/witchWake.mp3'),
  witchClose: require('../../assets/audio/narrator/zh/witchClose.mp3'),
};

const SEGMENT_WAKE: Partial<Record<NightSegmentId, NarratorAssetKey>> = {
  wolves: 'wolfWake',
  guard: 'guardWake',
  seer: 'seerWake',
  witch: 'witchWake',
};

const SEGMENT_CLOSE: Partial<Record<NightSegmentId, NarratorAssetKey>> = {
  wolves: 'wolfClose',
  guard: 'guardClose',
  seer: 'seerClose',
  witch: 'witchClose',
};

let activeSound: Audio.Sound | null = null;

export async function stopNarratorCue(): Promise<void> {
  if (!activeSound) return;
  const s = activeSound;
  activeSound = null;
  try {
    await s.stopAsync();
    await s.unloadAsync();
  } catch {
    /* ignore */
  }
}

export type NarratorCuePlayOptions = {
  /** 语音真正开始播放时触发（无中文音频时立即触发），用于顶栏文案与昼夜背景同步 */
  onPlaybackStart?: () => void;
};

async function playNarratorAsset(
  key: NarratorAssetKey,
  lang: AppLanguage,
  opts?: NarratorCuePlayOptions
): Promise<void> {
  const fireStart = () => opts?.onPlaybackStart?.();

  if (!getGameSfxEnabledSync()) {
    fireStart();
    return;
  }

  if (lang !== 'zh') {
    fireStart();
    return;
  }

  await stopNarratorCue();
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
      let started = false;
      const markStarted = () => {
        if (started) return;
        started = true;
        fireStart();
      };
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(startFallback);
        void unduckGameRoomBgm();
        if (activeSound === sound) activeSound = null;
        void sound.unloadAsync();
        resolve();
      };
      const startFallback = setTimeout(() => markStarted(), 150);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.isPlaying) markStarted();
        if (status.didJustFinish) finish();
      });
      void sound.getStatusAsync().then((status) => {
        if (status.isLoaded && status.isPlaying) markStarted();
      });
    });
  } catch (e) {
    fireStart();
    void unduckGameRoomBgm();
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[narratorCue] play failed', key, e);
    }
  }
}

/** 「天黑请闭眼」— 入夜前播放，播完再继续流程。 */
export function playNightFallCue(lang: AppLanguage, opts?: NarratorCuePlayOptions): Promise<void> {
  return playNarratorAsset('nightFall', lang, opts);
}

/** 「天亮了，请睁眼」— 天亮结算前播放。 */
export function playDayBreakCue(lang: AppLanguage, opts?: NarratorCuePlayOptions): Promise<void> {
  return playNarratorAsset('dayBreak', lang, opts);
}

/** 夜段「请睁眼 / 请闭眼」语音（狼美人待补，跳过）。 */
export function playNightSegmentCue(
  segment: NightSegmentId,
  phase: 'wake' | 'close',
  lang: AppLanguage,
  opts?: NarratorCuePlayOptions
): Promise<void> {
  if (!nightSegmentHasOpenCloseBroadcast(segment)) {
    opts?.onPlaybackStart?.();
    return Promise.resolve();
  }
  const key = phase === 'wake' ? SEGMENT_WAKE[segment] : SEGMENT_CLOSE[segment];
  if (!key) {
    opts?.onPlaybackStart?.();
    return Promise.resolve();
  }
  return playNarratorAsset(key, lang, opts);
}
