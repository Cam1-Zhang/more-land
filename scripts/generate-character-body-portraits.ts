/**
 * 按 mockData 年龄/性别/性格批量生成统一像素风全身立绘（透明 PNG）。
 *
 *   export OPENAI_API_KEY="sk-..."
 *   npm run gen:body-portraits
 *   npm run gen:body-portraits -- --only=1,2 --skip-existing
 *   npm run build:bust-avatars   # 从立绘裁半身头像
 *
 * Env: OPENAI_IMAGE_MODEL (default gpt-image-1), OPENAI_IMAGE_SIZE (default 1024x1536),
 *      OPENAI_IMAGE_QUALITY (default medium)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { CHARACTERS } from '../src/data/mockData';
import {
  buildBodyPortraitPrompt,
  openAiGeneratePng,
  parseCharacterArtArgs,
  repoBodyFileName,
  sleep,
} from './lib/characterArtShared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const GEN_SRC = path.join(ROOT, 'assets', 'characters', 'body', 'generated-src');
const NAMED_DIR = path.join(ROOT, 'assets', 'characters', 'body', 'named');
const BODY_NUM_DIR = path.join(ROOT, 'assets', 'characters', 'body');

/** 导出到 named / 编号回退时的目标高度（保持透明） */
const DEPLOY_MAX_H = 1024;

async function deployBodyPng(srcBuffer: Buffer, name: string, index: number): Promise<void> {
  const trimmed = await sharp(srcBuffer).trim({ threshold: 10 }).png().toBuffer();
  const meta = await sharp(trimmed).metadata();
  const h = meta.height ?? DEPLOY_MAX_H;
  const pipeline =
    h > DEPLOY_MAX_H
      ? sharp(trimmed).resize({ height: DEPLOY_MAX_H, kernel: sharp.kernel.nearest })
      : sharp(trimmed);
  const png = await pipeline.png().toBuffer();

  fs.mkdirSync(NAMED_DIR, { recursive: true });
  await sharp(png).toFile(path.join(NAMED_DIR, repoBodyFileName(name)));
  await sharp(png).toFile(path.join(BODY_NUM_DIR, `${index + 1}.png`));
}

async function main() {
  const { dryRun, only, delayMs, skipExisting } = parseCharacterArtArgs(process.argv.slice(2));
  const apiKey =
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim() ||
    '';
  const model = process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1';
  const size = process.env.OPENAI_IMAGE_SIZE ?? '1024x1536';
  const quality = process.env.OPENAI_IMAGE_QUALITY ?? 'medium';

  fs.mkdirSync(GEN_SRC, { recursive: true });

  let list = [...CHARACTERS];
  if (only) list = list.filter((c) => only.has(c.id));

  if (!apiKey && !dryRun) {
    console.error('Missing OPENAI_API_KEY. Use --dry-run to preview prompts.');
    process.exit(1);
  }

  console.log(
    `gen:body-portraits model=${model} size=${size} n=${list.length} dryRun=${dryRun}`
  );

  for (let i = 0; i < list.length; i++) {
    const c = list[i]!;
    const index = CHARACTERS.findIndex((x) => x.id === c.id);
    const genPath = path.join(GEN_SRC, `${c.id}.png`);
    const namedPath = path.join(NAMED_DIR, repoBodyFileName(c.name));

    if (skipExisting && fs.existsSync(namedPath)) {
      console.log(`skip existing ${c.id} ${c.name}`);
      continue;
    }

    const prompt = buildBodyPortraitPrompt(c);
    if (dryRun) {
      console.log(`\n--- ${c.id} ${c.name} ---\n${prompt}\n`);
      continue;
    }

    console.log(`generating ${c.id} ${c.name}...`);
    const raw = await openAiGeneratePng(apiKey!, model, size, quality, prompt, 'transparent');
    fs.writeFileSync(genPath, raw);
    await deployBodyPng(raw, c.name, index >= 0 ? index : i);
    console.log(`  -> ${namedPath}`);
    if (delayMs > 0) await sleep(delayMs);
  }

  if (!dryRun) {
    console.log('Done. Run: npm run build:bust-avatars');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
