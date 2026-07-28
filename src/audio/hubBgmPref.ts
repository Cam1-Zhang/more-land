import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { HUB_BGM_ENABLED_KEY } from '../constants/userProfileKeys';

let cachedEnabled: boolean | null = null;
const listeners = new Set<(enabled: boolean) => void>();

/** 未读完偏好前视为关闭，避免各页默认 true 误播 BGM。 */
export function getHubBgmEnabledSync(): boolean {
  return cachedEnabled === true;
}

export function subscribeHubBgmEnabled(listener: (enabled: boolean) => void): () => void {
  listeners.add(listener);
  if (cachedEnabled !== null) {
    listener(cachedEnabled);
  }
  return () => {
    listeners.delete(listener);
  };
}

function notify(enabled: boolean): void {
  for (const listener of listeners) {
    listener(enabled);
  }
}

/** Web defaults off so cold visits skip the ~5.7 MB overture until the user enables it. */
function parseHubBgmEnabled(raw: string | null): boolean {
  if (Platform.OS === 'web') return raw === 'true';
  return raw !== 'false';
}

export async function readHubBgmEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(HUB_BGM_ENABLED_KEY);
  cachedEnabled = parseHubBgmEnabled(v);
  return cachedEnabled;
}

/** 写入偏好、通知订阅方，并同步 Hub / 对局 BGM（全应用共用同一开关）。 */
export async function applyHubBgmEnabled(
  enabled: boolean,
  routeName?: string
): Promise<void> {
  cachedEnabled = enabled;
  await AsyncStorage.setItem(HUB_BGM_ENABLED_KEY, enabled ? 'true' : 'false');
  notify(enabled);
  // Dynamic import keeps the large MP3 modules out of the navigator first graph.
  const [{ syncAmbientHubBgm }, { stopGameRoomBgm }] = await Promise.all([
    import('./ambientHubBgm'),
    import('./gameRoomBgm'),
  ]);
  void syncAmbientHubBgm(routeName, enabled);
  if (!enabled) {
    void stopGameRoomBgm();
  }
}

void readHubBgmEnabled();
