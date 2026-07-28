/**
 * 用 OpenAI Images API 按参考图风格生成 48 个选人用小人大图（需 OPENAI_API_KEY）。
 * 生成后运行 npm run build:picker-chibi 可再压成卡片尺寸，或直接用生成图替换 chibi/{id}.png。
 *
 * Usage:
 *   npm run gen:picker-chibi
 *   npm run gen:picker-chibi -- --only=1,2,3 --skip-existing
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AICharacter } from '../src/types';
import { CHARACTERS } from '../src/data/mockData';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'characters', 'chibi', 'generated-src');

const SERIES_STYLE = [
  '16-bit Stardew Valley style pixel art character sprite, single character only.',
  'Chibi super-deformed proportions: large head, tiny body, front-facing neutral stand pose.',
  'Thick dark pixel outline, simple dot eyes with one white highlight pixel, minimal nose and mouth.',
  'Full body visible, feet on a small circular patch of green grass with soft drop shadow.',
  'Transparent background (alpha), no UI card, no text, no star icon, no name labels.',
  'Limited vibrant palette, clean readable pixels, game roster portrait asset.',
].join(' ');

function parseArgs(argv: string[]) {
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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildPrompt(c: AICharacter): string {
  return [
    SERIES_STYLE,
    `Character: ${c.name}.`,
    `Age ${c.age}, gender ${c.gender}.`,
    `Personality and outfit mood: ${c.personality}. ${c.description}`,
    'Match a cozy werewolf-party cast; distinct silhouette and hair color from other roster members.',
  ].join(' ');
}

async function generateOne(
  apiKey: string,
  model: string,
  size: string,
  quality: string,
  prompt: string
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
      background: 'transparent',
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

async function main() {
  const { dryRun, only, delayMs, skipExisting } = parseArgs(process.argv.slice(2));
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1';
  const size = process.env.OPENAI_IMAGE_SIZE ?? '1024x1024';
  const quality = process.env.OPENAI_IMAGE_QUALITY ?? 'medium';

  fs.mkdirSync(OUT_DIR, { recursive: true });

  let list = [...CHARACTERS];
  if (only) list = list.filter((c) => only.has(c.id));

  if (!apiKey && !dryRun) {
    console.error('Missing OPENAI_API_KEY. Use --dry-run or npm run build:picker-chibi for offline sprites.');
    process.exit(1);
  }

  console.log(`gen:picker-chibi model=${model} n=${list.length} dryRun=${dryRun}`);

  for (const c of list) {
    const outPath = path.join(OUT_DIR, `${c.id}.png`);
    if (skipExisting && fs.existsSync(outPath)) {
      console.log('skip', c.id, c.name);
      continue;
    }
    const prompt = buildPrompt(c);
    if (dryRun) {
      console.log(`\n--- ${c.id} ${c.name} ---\n${prompt}\n`);
      continue;
    }
    console.log('generate', c.id, c.name);
    const buf = await generateOne(apiKey!, model, size, quality, prompt);
    fs.writeFileSync(outPath, buf);
    if (delayMs > 0) await sleep(delayMs);
  }

  if (!dryRun) {
    console.log(`Done. Copy or post-process from ${OUT_DIR}, then npm run build:picker-chibi`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
