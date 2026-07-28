import type { AppLanguage } from '../i18n/appStrings';
import type { SpeechChannel } from './types';

let llmFailReporter: ((detail: string) => void) | null = null;

/** GameRoomScreen registers this to surface LLM errors in the public log. */
export function setLlmFailReporter(fn: ((detail: string) => void) | null): void {
  llmFailReporter = fn;
}

export function reportLlmFail(detail: string): void {
  llmFailReporter?.(detail);
}

/** When LLM fails after retry — generic pass, no pre-scripted persona fallback. */
export function llmSpeechFailureLine(lang: AppLanguage, channel: SpeechChannel = 'discussion'): string {
  if (lang === 'zh') {
    if (channel === 'lastwords') return '……';
    return '…（过麦）';
  }
  if (channel === 'lastwords') return '……';
  return '… (passed)';
}
