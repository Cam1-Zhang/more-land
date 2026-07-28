export const GAME_SESSION_STORAGE_KEY = 'ai_werewolf_active_match_v1';

export type GameSessionMode = 'avalon' | 'werewolf';

type StoredGameSession = {
  version: 1;
  mode: GameSessionMode;
  matchNonce: number;
  savedAt: number;
  payload: unknown;
};

export function isGameSessionPersistSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function saveGameSession(
  mode: GameSessionMode,
  matchNonce: number,
  payload: unknown
): void {
  if (!isGameSessionPersistSupported()) return;
  try {
    const record: StoredGameSession = {
      version: 1,
      mode,
      matchNonce,
      savedAt: Date.now(),
      payload,
    };
    window.sessionStorage.setItem(GAME_SESSION_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // sessionStorage may be full or blocked.
  }
}

export function loadGameSession<T>(
  mode: GameSessionMode,
  matchNonce: number
): T | null {
  if (!isGameSessionPersistSupported()) return null;
  try {
    const raw = window.sessionStorage.getItem(GAME_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredGameSession;
    if (parsed.version !== 1) return null;
    if (parsed.mode !== mode) return null;
    if (parsed.matchNonce !== matchNonce) return null;
    return parsed.payload as T;
  } catch {
    return null;
  }
}

export function clearGameSession(): void {
  if (!isGameSessionPersistSupported()) return;
  try {
    window.sessionStorage.removeItem(GAME_SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}
