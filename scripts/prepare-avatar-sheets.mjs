#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SHEETS = [
  ['body-sheet.png', '/Users/xinge.zhang/Desktop/body-sheet.png'],
  ['male-hair-sheet.png', '/Users/xinge.zhang/Desktop/male-hair-sheet.png'],
  ['female-hair-sheet.png', '/Users/xinge.zhang/Desktop/female-hair-sheet.png'],
  ['male-tops-sheet.png', '/Users/xinge.zhang/Desktop/male-tops-sheet.png'],
  ['female-tops-sheet.png', '/Users/xinge.zhang/Desktop/female-tops-sheet.png'],
  ['male-bottoms-sheet.png', '/Users/xinge.zhang/Desktop/male-bottoms-sheet.png'],
  ['female-bottoms-sheet.png', '/Users/xinge.zhang/Desktop/female-bottoms-sheet.png'],
  ['male-shoes-sheet.png', '/Users/xinge.zhang/Desktop/male-shoes-sheet.png'],
  ['female-shoes-sheet.png', '/Users/xinge.zhang/Desktop/female-shoes-sheet.png'],
  ['male-accessories-sheet.png', '/Users/xinge.zhang/Desktop/male-accessories-sheet.png'],
  ['female-accessories-sheet.png', '/Users/xinge.zhang/Desktop/female-accessories-sheet.png'],
];

const OUT_DIR = 'public/assets/avatar';

function isCheckerboardBackground(r, g, b, a) {
  if (a === 0) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max >= 232 && min >= 226 && max - min <= 8;
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

async function cleanSheet([outName, input]) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const transparent = transparentFloodFillEdgeBackground(Buffer.from(data), info.width, info.height);
  const outFile = path.join(OUT_DIR, outName);
  await sharp(transparent, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(outFile);
  console.log(`wrote ${outFile}`);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  for (const sheet of SHEETS) {
    await cleanSheet(sheet);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
