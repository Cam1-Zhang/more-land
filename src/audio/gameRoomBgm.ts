import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { getHubBgmEnabledSync } from './hubBgmPref';

/**
 * 对局内循环 BGM（ConcernedApe - Winter (Ancient)）。
 * 与狼嚎分层：嚎叫时短暂压低本轨音量，避免盖住狼刀音效。
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires -- Metro asset
const GAME_ROOM_BGM_ASSET = require('../../assets/audio/concerned-ape-winter-ancient.mp3');

const NORMAL_VOL = 0.36;
const DUCK_VOL = 0.08;

let sound: Audio.Sound | null = null;
let loadPromise: Promise<Audio.Sound | null> | null = null;
let sessionConfigured = false;

async function ensureSession(): Promise<void> {
  if (sessionConfigured) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
    sessionConfigured = true;
  } catch {
    /* Web 等环境可能部分字段无效 */
  }
}

async function ensureSound(): Promise<Audio.Sound | null> {
  if (sound) return sound;
  if (loadPromise) return await loadPromise;
  loadPromise = (async () => {
    try {
      await ensureSession();
      const { sound: s } = await Audio.Sound.createAsync(GAME_ROOM_BGM_ASSET, {
        shouldPlay: false,
        isLooping: true,
        volume: NORMAL_VOL,
      });
      sound = s;
      return s;
    } catch (e) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[gameRoomBgm] load failed', e);
      }
      sound = null;
      return null;
    } finally {
      loadPromise = null;
    }
  })();
  return await loadPromise;
}

/** Download room BGM while still on CharacterSelect so enter-game is not silent/waiting. */
export async function preloadGameRoomBgm(): Promise<void> {
  if (!getHubBgmEnabledSync()) return;
  await ensureSound();
}

export async function startGameRoomBgm(): Promise<void> {
  if (!getHubBgmEnabledSync()) return;
  const s = await ensureSound();
  if (!s) return;
  try {
    const st = await s.getStatusAsync();
    if (st.isLoaded && !st.isPlaying) {
      await s.setVolumeAsync(NORMAL_VOL);
      await s.playAsync();
    }
  } catch {
    /* ignore */
  }
}

export async function stopGameRoomBgm(): Promise<void> {
  if (!sound) return;
  try {
    await sound.stopAsync();
    await sound.unloadAsync();
  } catch {
    /* ignore */
  }
  sound = null;
}

export async function duckGameRoomBgmForHowl(): Promise<void> {
  if (!sound) return;
  try {
    const st = await sound.getStatusAsync();
    if (st.isLoaded) await sound.setVolumeAsync(DUCK_VOL);
  } catch {
    /* ignore */
  }
}

export async function unduckGameRoomBgm(): Promise<void> {
  if (!sound) return;
  try {
    const st = await sound.getStatusAsync();
    if (st.isLoaded) await sound.setVolumeAsync(NORMAL_VOL);
  } catch {
    /* ignore */
  }
}
