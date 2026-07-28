import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { HOME_BG_LIGHTS_STORAGE_KEY, HOME_BG_MODE_STORAGE_KEY } from '../i18n/appStrings';

export type HomeBgMode = 'day' | 'night';
export type HomeBgLights = 'on' | 'off';

export type HomeHubScene = {
  mode: HomeBgMode;
  lights: HomeBgLights;
};

export const DEFAULT_HOME_HUB_SCENE: HomeHubScene = { mode: 'day', lights: 'off' };

export function parseHomeBgMode(stored: string | null | undefined): HomeBgMode {
  return stored === 'night' ? 'night' : 'day';
}

export function parseHomeBgLights(stored: string | null | undefined): HomeBgLights {
  return stored === 'on' ? 'on' : 'off';
}

export async function readHomeBgMode(): Promise<HomeBgMode> {
  if (Platform.OS === 'web') return DEFAULT_HOME_HUB_SCENE.mode;
  const v = await AsyncStorage.getItem(HOME_BG_MODE_STORAGE_KEY);
  return parseHomeBgMode(v);
}

export async function writeHomeBgMode(mode: HomeBgMode): Promise<void> {
  await AsyncStorage.setItem(HOME_BG_MODE_STORAGE_KEY, mode);
}

export async function readHomeBgLights(): Promise<HomeBgLights> {
  if (Platform.OS === 'web') return DEFAULT_HOME_HUB_SCENE.lights;
  const v = await AsyncStorage.getItem(HOME_BG_LIGHTS_STORAGE_KEY);
  return parseHomeBgLights(v);
}

export async function writeHomeBgLights(lights: HomeBgLights): Promise<void> {
  await AsyncStorage.setItem(HOME_BG_LIGHTS_STORAGE_KEY, lights);
}

export async function readHomeHubScene(): Promise<HomeHubScene> {
  const [mode, lights] = await Promise.all([readHomeBgMode(), readHomeBgLights()]);
  return { mode, lights };
}

export async function writeHomeHubScene(scene: HomeHubScene): Promise<void> {
  await Promise.all([writeHomeBgMode(scene.mode), writeHomeBgLights(scene.lights)]);
}
