import AsyncStorage from '@react-native-async-storage/async-storage';
import { AI_VOICE_ENABLED_KEY } from '../constants/userProfileKeys';

let cachedEnabled: boolean | null = null;
const listeners = new Set<(enabled: boolean) => void>();

/** 偏好读取完成前视为关闭，确保不会在启动瞬间误发起计费 TTS 请求。 */
export function getAiVoiceEnabledSync(): boolean {
  return cachedEnabled === true;
}

export function subscribeAiVoiceEnabled(listener: (enabled: boolean) => void): () => void {
  listeners.add(listener);
  if (cachedEnabled !== null) listener(cachedEnabled);
  return () => listeners.delete(listener);
}

export async function readAiVoiceEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(AI_VOICE_ENABLED_KEY);
  cachedEnabled = value === 'true';
  return cachedEnabled;
}

export async function writeAiVoiceEnabled(enabled: boolean): Promise<void> {
  cachedEnabled = enabled;
  await AsyncStorage.setItem(AI_VOICE_ENABLED_KEY, enabled ? 'true' : 'false');
  for (const listener of listeners) listener(enabled);
}

void readAiVoiceEnabled();
