import { normalizedLlmProvider } from './providerEnv';

let ollamaChain: Promise<unknown> = Promise.resolve();

/**
 * Ollama serves one generation at a time on most machines. Parallel seat calls
 * (votes, speeches) time out and fall back to template lines without this gate.
 */
export function runSerializedOllamaTask<T>(task: () => Promise<T>): Promise<T> {
  if (normalizedLlmProvider() !== 'ollama') return task();
  const run = ollamaChain.then(task, task);
  ollamaChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}
