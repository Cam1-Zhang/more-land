import type { AICharacter } from '../../src/types';

export function parseCharacterArtArgs(argv: string[]) {
  const dryRun = argv.includes('--dry-run');
  let only: Set<string> | null = null;
  let delayMs = 1500;
  let skipExisting = false;
  for (const a of argv) {
    if (a.startsWith('--only=')) {
      only = new Set(
        a
          .slice('--only='.length)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      );
    }
    if (a.startsWith('--delay-ms=')) {
      delayMs = Math.max(0, Number(a.slice('--delay-ms='.length)) || 0);
    }
    if (a === '--skip-existing') skipExisting = true;
  }
  return { dryRun, only, delayMs, skipExisting };
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function repoBodyFileName(characterName: string): string {
  return `${characterName}.png`;
}

export function genderPresentation(gender: AICharacter['gender']): string {
  if (gender === 'Female') return 'female-presenting';
  if (gender === 'Non-binary') return 'androgynous / non-binary presenting';
  return 'male-presenting';
}

export function ageBand(age: number): string {
  if (age < 22) return 'young adult (late teens to early twenties)';
  if (age < 30) return 'young adult (mid twenties)';
  if (age < 45) return 'adult (thirties to early forties)';
  if (age < 60) return 'mature adult (forties to fifties)';
  return 'older adult (sixties plus, gray hair or wrinkles appropriate)';
}

/** 48 人统一像素立绘系列风格（全身、透明底） */
export const BODY_PORTRAIT_SERIES_STYLE = [
  'Stardew Valley inspired 16-bit pixel art character sprite, ONE character only, full body head to shoes.',
  'Unified roster style for a cozy werewolf party game: thick dark pixel outlines, limited warm pastel palette, soft cel shading, crisp readable pixels.',
  'Front-facing neutral standing pose, arms relaxed, feet visible, balanced silhouette.',
  'Fully transparent background (alpha), no floor shadow, no grass patch, no text, no UI frame, no watermark.',
  'Distinct hair color and outfit silhouette from other cast members; simple cozy modern-fantasy clothing.',
].join(' ');

export function buildBodyPortraitPrompt(c: AICharacter): string {
  return [
    BODY_PORTRAIT_SERIES_STYLE,
    `Character name: ${c.name}.`,
    `Age: ${c.age} years old — ${ageBand(c.age)}.`,
    `Gender presentation: ${genderPresentation(c.gender)}.`,
    `Personality (expression and outfit hint): ${c.personality}.`,
    `Mood: ${c.description}`,
    `Difficulty tone: ${c.difficulty}.`,
    'Expression readable at small mobile size; friendly game asset, not photorealistic.',
  ].join(' ');
}

export async function openAiGeneratePng(
  apiKey: string,
  model: string,
  size: string,
  quality: string,
  prompt: string,
  background: 'transparent' | 'opaque'
): Promise<Buffer> {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size,
      quality,
      moderation: 'low',
      background,
      output_format: 'png',
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI images error ${res.status}: ${raw.slice(0, 2000)}`);
  }
  const json = JSON.parse(raw) as { data?: Array<{ b64_json?: string }> };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error(`No b64_json: ${raw.slice(0, 500)}`);
  return Buffer.from(b64, 'base64');
}
