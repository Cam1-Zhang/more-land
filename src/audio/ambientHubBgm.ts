import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { getHubBgmEnabledSync } from './hubBgmPref';

/**
 * Hub 各页共用的一首环境 BGM（对局内另由 `gameRoomBgm` 播 Winter 曲目，共用同一开关 key）。
 * 资源：`assets/audio/concerned-ape-stardew-valley-overture.mp3`（ConcernedApe · Stardew Valley Overture）。
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires -- Metro asset
const HUB_BGM_ASSET = require('../../assets/audio/concerned-ape-stardew-valley-overture.mp3');

/** 除对局外各栈页；对局用 `GameRoom` + `gameRoomBgm`。 */
const AMBIENT_ROUTE_NAMES = new Set([
  'Home',
  'Settings',
  'CharacterSelect',
  'Tutorial',
  'TeamLobby',
]);

let sound: Audio.Sound | null = null;
let loadPromise: Promise<Audio.Sound | null> | null = null;
let audioModeConfigured = false;

async function configureAudioMode(): Promise<void> {
  if (audioModeConfigured) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    audioModeConfigured = true;
  } catch {
    /* Web 或部分环境可能不支持全部字段 */
  }
}

async function ensureSound(): Promise<Audio.Sound | null> {
  if (sound) return sound;
  if (loadPromise) return await loadPromise;
  loadPromise = (async () => {
    try {
      await configureAudioMode();
      const { sound: s } = await Audio.Sound.createAsync(HUB_BGM_ASSET, {
        shouldPlay: false,
        isLooping: true,
        volume: 0.55,
      });
      sound = s;
      return s;
    } catch (e) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[ambientHubBgm] load failed', e);
      }
      sound = null;
      return null;
    } finally {
      loadPromise = null;
    }
  })();
  return await loadPromise;
}

/** Download + decode hub BGM without playing (so music is ready when sync starts). */
export async function preloadAmbientHubBgm(): Promise<void> {
  if (!getHubBgmEnabledSync()) return;
  await ensureSound();
}

/**
 * 根据当前栈顶路由名与用户开关同步播放：Hub 各页（含设置）且用户未关音乐时播放；
 * 在这些页之间切换时保持同一 Sound 实例，不 seek、不 unload，故不会从头重播。进入对局则暂停本轨。
 */
export async function syncAmbientHubBgm(
  routeName: string | undefined,
  userWantsMusic: boolean = true
): Promise<void> {
  const inZone = routeName != null && AMBIENT_ROUTE_NAMES.has(routeName);
  const shouldPlay = inZone && userWantsMusic && getHubBgmEnabledSync();

  // Do not create the Sound merely to pause it. Besides unnecessary work,
  // createAsync downloads the whole ~6 MB track on web even when music is off
  // or the user has already entered a game route.
  if (!shouldPlay && !sound) return;

  const s = await ensureSound();
  if (!s) return;

  try {
    const status = await s.getStatusAsync();
    if (!status.isLoaded) return;

    if (shouldPlay) {
      if (!status.isPlaying) {
        await s.playAsync();
      }
    } else if (status.isPlaying) {
      await s.pauseAsync();
    }
  } catch (e) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[ambientHubBgm] sync', e);
    }
  }
}

export function isAmbientHubRoute(routeName: string | undefined): boolean {
  return routeName != null && AMBIENT_ROUTE_NAMES.has(routeName);
}

export async function unloadAmbientHubBgm(): Promise<void> {
  if (!sound) return;
  try {
    await sound.stopAsync();
    await sound.unloadAsync();
  } catch {
    /* ignore */
  }
  sound = null;
  audioModeConfigured = false;
}
