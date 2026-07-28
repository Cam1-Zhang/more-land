import Constants from 'expo-constants';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { Platform } from 'react-native';
import { getAssignedCharacterVoiceCast } from '../constants/characterVoiceCasting';
import { CHARACTERS } from '../data/mockData';
import type { AppLanguage } from '../i18n/appStrings';
import { getAiVoiceEnabledSync, subscribeAiVoiceEnabled } from '../audio/aiVoicePref';
import type { EmotionLabel } from './emotionEngine';

export type AiVoiceProfile = {
  age?: number;
  gender?: 'Male' | 'Female' | 'Non-binary' | string;
  lang: AppLanguage;
  /** Prefer English mockData personality so zh/en UI copy does not change casting. */
  personality?: string;
  emotion?: EmotionLabel;
  characterId?: string;
  characterName?: string;
};

export type PreparedAiSpeech = {
  cacheKey: string;
  mimeType: string;
  dataUri: string;
  blob?: Blob;
};

export type AiSpeechPlayback = {
  durationMs: number | null;
  finished: Promise<void>;
};

type CachedAudio = {
  mimeType: string;
  dataUri: string;
  blob?: Blob;
  durationMs?: number;
};

type WebAudioEl = {
  src: string;
  duration: number;
  onended: ((this: WebAudioEl, ev: Event) => unknown) | null;
  onerror: ((this: WebAudioEl, ev: Event) => unknown) | null;
  onloadedmetadata: ((this: WebAudioEl, ev: Event) => unknown) | null;
  play: () => Promise<void>;
  pause: () => void;
  removeAttribute: (name: string) => void;
  load: () => void;
};

type HtmlAudioConstructor = new () => WebAudioEl;

let activeSound: Audio.Sound | null = null;
let activeHtmlAudio: WebAudioEl | null = null;
let activeObjectUrl: string | null = null;
let generation = 0;
const audioCache = new Map<string, CachedAudio>();
const inFlight = new Map<string, Promise<CachedAudio | null>>();

subscribeAiVoiceEnabled((enabled) => {
  if (!enabled) void stopAiSpeech();
});

function miniMaxEmotion(emotion?: EmotionLabel): string {
  if (emotion === 'angry') return 'angry';
  if (emotion === 'scared' || emotion === 'nervous' || emotion === 'desperate') return 'fearful';
  if (emotion === 'confident') return 'happy';
  return 'calm';
}

/** Resolve gallery cast id: prefer characterId, else match by English name. */
function resolveCharacterCastId(profile: AiVoiceProfile): string | undefined {
  if (profile.characterId) {
    const byId = getAssignedCharacterVoiceCast(profile.characterId, profile.lang);
    if (byId) return profile.characterId;
  }
  const name = (profile.characterName || '').trim().toLowerCase();
  if (!name) return undefined;
  const hit = CHARACTERS.find((c) => c.name.toLowerCase() === name);
  return hit?.id;
}

/**
 * In-game TTS must match the frozen gallery casting table exactly
 * (same voiceId / pitch / speed). Do not emotion-morph the cast shape.
 */
function resolveVoiceAndShape(profile: AiVoiceProfile): {
  voiceId: string;
  speed: number;
  pitch: number;
} {
  const castId = resolveCharacterCastId(profile);
  if (castId) {
    const cast = getAssignedCharacterVoiceCast(castId, profile.lang);
    if (cast) {
      return {
        voiceId: cast.voiceId,
        speed: cast.speed,
        pitch: cast.pitch,
      };
    }
  }

  const female = String(profile.gender || '').toLowerCase().startsWith('f');
  const voiceId =
    profile.lang === 'en'
      ? female
        ? 'English_Graceful_Lady'
        : 'English_Trustworthy_Man'
      : female
        ? 'Chinese (Mandarin)_IntellectualGirl'
        : 'Chinese (Mandarin)_Reliable_Executive';
  return { voiceId, speed: 1, pitch: 0 };
}

/**
 * Resolve POST URL for MiniMax TTS proxy.
 * Prefer EXPO_PUBLIC_MINIMAX_TTS_URL; on web fall back to same-origin `/tts`.
 */
function ttsRequestUrl(): string | null {
  const fromEnv = (process.env.EXPO_PUBLIC_MINIMAX_TTS_URL || '').trim();
  const fromExtra = String(Constants.expoConfig?.extra?.minimaxTtsUrl || '').trim();
  const configured = (fromEnv || fromExtra).replace(/\/$/, '');
  if (configured) {
    return /\/tts$/i.test(configured) ? configured : `${configured}/tts`;
  }
  if (Platform.OS === 'web') {
    const basePath = String(
      (Constants.expoConfig as { experiments?: { baseUrl?: string } } | null)?.experiments
        ?.baseUrl ||
        process.env.EXPO_PUBLIC_BASE_PATH ||
        ''
    )
      .trim()
      .replace(/\/$/, '');
    return `${basePath}/tts` || '/tts';
  }
  return null;
}

function ttsAvailable(): boolean {
  return ttsRequestUrl() != null;
}

function cacheKeyFor(text: string, profile: AiVoiceProfile): string {
  const { voiceId, speed, pitch } = resolveVoiceAndShape(profile);
  // Gallery casts are auditioned at calm; keep in-game identical.
  const emotion = resolveCharacterCastId(profile) ? 'calm' : miniMaxEmotion(profile.emotion);
  return `${voiceId}|${emotion}|${speed}|${pitch}|${text}`;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function trimCache(): void {
  while (audioCache.size > 80) {
    const oldest = audioCache.keys().next().value;
    if (oldest == null) break;
    audioCache.delete(oldest);
  }
}

function HtmlAudioCtor(): HtmlAudioConstructor | undefined {
  return (globalThis as { Audio?: HtmlAudioConstructor }).Audio;
}

async function fetchAndCache(text: string, profile: AiVoiceProfile): Promise<CachedAudio | null> {
  if (!getAiVoiceEnabledSync()) return null;
  const endpoint = ttsRequestUrl();
  if (!endpoint) return null;
  const { voiceId, speed, pitch } = resolveVoiceAndShape(profile);
  // Locked gallery casts: same voiceId/pitch/speed/emotion as character select audition.
  const emotion = resolveCharacterCastId(profile) ? 'calm' : miniMaxEmotion(profile.emotion);
  const key = cacheKeyFor(text, profile);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceId, emotion, speed, pitch }),
  });
  if (!response.ok) throw new Error(`tts_http_${response.status}`);
  const data = await response.json();
  if (typeof data?.audioBase64 !== 'string' || !data.audioBase64) throw new Error('tts_audio_missing');
  const mimeType = typeof data.mimeType === 'string' && data.mimeType ? data.mimeType : 'audio/mpeg';
  const dataUri = `data:${mimeType};base64,${data.audioBase64}`;
  const cached: CachedAudio = { mimeType, dataUri };
  if (Platform.OS === 'web') {
    try {
      const bytes = base64ToUint8Array(data.audioBase64);
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      cached.blob = new Blob([copy.buffer], { type: mimeType });
    } catch {
      /* keep dataUri fallback */
    }
  }
  audioCache.set(key, cached);
  trimCache();
  return cached;
}

async function ensureReady(text: string, profile: AiVoiceProfile): Promise<CachedAudio | null> {
  if (!getAiVoiceEnabledSync() || !ttsAvailable()) return null;
  const key = cacheKeyFor(text, profile);
  const hit = audioCache.get(key);
  if (hit) return hit;
  const pending = inFlight.get(key);
  if (pending) return pending;
  const promise = fetchAndCache(text, profile)
    .catch((error) => {
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[aiVoice]', error);
      return null;
    })
    .finally(() => {
      inFlight.delete(key);
    });
  inFlight.set(key, promise);
  return promise;
}

async function stopActivePlayback(): Promise<void> {
  try {
    if (activeHtmlAudio) {
      const el = activeHtmlAudio;
      activeHtmlAudio = null;
      el.onended = null;
      el.onerror = null;
      el.onloadedmetadata = null;
      el.pause();
      el.removeAttribute('src');
      el.load();
    }
  } catch {
    /* noop */
  }
  if (activeObjectUrl) {
    try {
      URL.revokeObjectURL(activeObjectUrl);
    } catch {
      /* noop */
    }
    activeObjectUrl = null;
  }
  try {
    if (activeSound) {
      const sound = activeSound;
      activeSound = null;
      await sound.stopAsync().catch(() => undefined);
      await sound.unloadAsync().catch(() => undefined);
    }
  } catch {
    /* noop */
  }
}

/** 先取回整段音频；调用方可在音频就绪后再同步启动字幕。 */
export async function prepareAiUtterance(
  text: string,
  profile: AiVoiceProfile
): Promise<PreparedAiSpeech | null> {
  const normalized = text.trim();
  if (!normalized || !getAiVoiceEnabledSync() || !ttsAvailable()) return null;
  try {
    const cached = await ensureReady(normalized, profile);
    if (!cached) return null;
    return {
      cacheKey: cacheKeyFor(normalized, profile),
      mimeType: cached.mimeType,
      dataUri: cached.dataUri,
      blob: cached.blob,
    };
  } catch (error) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[aiVoice:prepare]', error);
    return null;
  }
}

/** 启动已准备好的音频；返回时声音已经开始，字幕可立刻同步启动。 */
export async function startPreparedAiUtterance(
  prepared: PreparedAiSpeech
): Promise<AiSpeechPlayback | null> {
  if (!getAiVoiceEnabledSync()) return null;
  const myGeneration = generation;
  try {
    const HtmlAudio = HtmlAudioCtor();
    if (Platform.OS === 'web' && HtmlAudio && prepared.blob) {
      const url = URL.createObjectURL(prepared.blob);
      if (generation !== myGeneration) {
        URL.revokeObjectURL(url);
        return null;
      }
      activeObjectUrl = url;
      const audio = new HtmlAudio();
      activeHtmlAudio = audio;

      let finish!: () => void;
      let settled = false;
      const rawFinished = new Promise<void>((resolve) => {
        finish = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
      });

      let durationMs: number | null =
        typeof audioCache.get(prepared.cacheKey)?.durationMs === 'number'
          ? audioCache.get(prepared.cacheKey)!.durationMs!
          : null;

      audio.onloadedmetadata = () => {
        const sec = Number.isFinite(audio.duration) ? audio.duration : 0;
        if (sec > 0) {
          durationMs = Math.round(sec * 1000);
          const existing = audioCache.get(prepared.cacheKey);
          if (existing) audioCache.set(prepared.cacheKey, { ...existing, durationMs });
        }
      };
      audio.onended = () => finish();
      audio.onerror = () => finish();
      audio.src = url;
      await audio.play().catch(() => finish());

      const finished = rawFinished.finally(() => {
        if (activeHtmlAudio === audio) activeHtmlAudio = null;
        if (activeObjectUrl === url) {
          URL.revokeObjectURL(url);
          activeObjectUrl = null;
        }
      });
      return { durationMs, finished };
    }

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
    });
    const { sound, status } = await Audio.Sound.createAsync(
      { uri: prepared.dataUri },
      { shouldPlay: false, volume: 1 }
    );
    if (generation !== myGeneration) {
      await sound.unloadAsync().catch(() => undefined);
      return null;
    }

    activeSound = sound;
    let finish!: () => void;
    let settled = false;
    const rawFinished = new Promise<void>((resolve) => {
      finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
    });
    sound.setOnPlaybackStatusUpdate((next) => {
      if (!next.isLoaded || next.didJustFinish) finish();
    });
    await sound.playAsync().catch(() => finish());

    const durationMs =
      status.isLoaded && typeof status.durationMillis === 'number' ? status.durationMillis : null;
    const finished = rawFinished.finally(async () => {
      await sound.unloadAsync().catch(() => undefined);
      if (activeSound === sound) activeSound = null;
    });
    return { durationMs, finished };
  } catch (error) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[aiVoice:play]', error);
    return null;
  }
}

/** 打断当前朗读 */
export async function stopAiSpeech(): Promise<void> {
  generation += 1;
  await stopActivePlayback();
}

/** Fire-and-forget speak (Avalon seat bubbles). Prefer prepare/start for subtitle sync. */
export function speakAiUtterance(text: string, profile: AiVoiceProfile): void {
  const normalized = text.trim();
  if (!normalized || !getAiVoiceEnabledSync() || !ttsAvailable()) return;
  void (async () => {
    const prepared = await prepareAiUtterance(normalized, profile);
    if (!prepared) return;
    await startPreparedAiUtterance(prepared);
  })().catch(() => undefined);
}

/** Test helper: which MiniMax voice_id a profile resolves to. */
export function resolveAiVoiceIdForTests(profile: AiVoiceProfile): string {
  return resolveVoiceAndShape(profile).voiceId;
}

export function isAiVoiceConfigured(): boolean {
  return ttsAvailable();
}
