/** Helpers for validating AI speech against public table logs. */

export function playerHasPublicSpeech(logs: readonly string[], displayName: string): boolean {
  if (!displayName) return false;
  const prefix1 = `${displayName}:`;
  const prefix2 = `${displayName}：`;
  return logs.some((l) => l.startsWith(prefix1) || l.startsWith(prefix2));
}
