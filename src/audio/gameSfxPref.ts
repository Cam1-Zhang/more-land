import AsyncStorage from '@react-native-async-storage/async-storage';
import { GAME_SFX_ENABLED_KEY } from '../constants/userProfileKeys';

let cachedEnabled: boolean | null = null;

/** 默认开启；读一次后走内存缓存供播报/音效同步判断。 */
export function getGameSfxEnabledSync(): boolean {
  return cachedEnabled !== false;
}

export async function readGameSfxEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(GAME_SFX_ENABLED_KEY);
  cachedEnabled = v !== 'false';
  return cachedEnabled;
}

export async function writeGameSfxEnabled(enabled: boolean): Promise<void> {
  cachedEnabled = enabled;
  await AsyncStorage.setItem(GAME_SFX_ENABLED_KEY, enabled ? 'true' : 'false');
}
