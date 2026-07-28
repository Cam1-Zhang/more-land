#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const input = process.argv[2];
const outputDir = process.argv[3] ?? 'public/assets/avatar/body';

if (!input) {
  console.error('Usage: node scripts/slice-avatar-body-sheet.mjs <sprite-sheet.png> [output-dir]');
  process.exit(1);
}

const COLS = 6;
const ROWS = 2;
const ROW_PREFIX = ['male', 'female'];

function isCheckerboardBackground(r, g, b, a) {
  if (a === 0) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max - min;
  return max >= 232 && min >= 226 && saturation <= 8;
}

function transparentFloodFillEdgeBackground(raw, width, height) {
  const channels = 4;
  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = [];

  function enqueue(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    const off = idx * channels;
    if (!isCheckerboardBackground(raw[off], raw[off + 1], raw[off + 2], raw[off + 3])) return;
    visited[idx] = 1;
    queue.push(idx);
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  for (let head = 0; head < queue.length; head += 1) {
    const idx = queue[head];
    const x = idx % width;
    const y = Math.floor(idx / width);
    const off = idx * channels;
    raw[off + 3] = 0;
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  return raw;
}

async function main() {
  const meta = await sharp(input).metadata();
  if (!meta.width || !meta.height) {
    throw new Error(`Cannot read dimensions from ${input}`);
  }

  await fs.mkdir(outputDir, { recursive: true });

  for (let row = 0; row < ROWS; row += 1) {
    const top = Math.round((row * meta.height) / ROWS);
    const bottom = Math.round(((row + 1) * meta.height) / ROWS);
    const height = bottom - top;

    for (let col = 0; col < COLS; col += 1) {
      const left = Math.round((col * meta.width) / COLS);
      const right = Math.round(((col + 1) * meta.width) / COLS);
      const width = right - left;
      const tone = String(col + 1).padStart(2, '0');
      const outFile = path.join(outputDir, `${ROW_PREFIX[row]}_skin_${tone}.png`);

      const { data, info } = await sharp(input)
        .extract({ left, top, width, height })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const transparent = transparentFloodFillEdgeBackground(
        Buffer.from(data),
        info.width,
        info.height
      );

      await sharp(transparent, {
        raw: { width: info.width, height: info.height, channels: 4 },
      })
        .png()
        .toFile(outFile);

      console.log(`wrote ${outFile}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
