#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUT_ROOT = 'public/assets/avatar';

const SHEETS = [
  {
    input: '/Users/xinge.zhang/Desktop/body-sheet.png',
    category: 'body',
    cols: 6,
    rows: 2,
    filename: (row, _index, col) => `${row === 0 ? 'male' : 'female'}_skin_${pad2(col + 1)}.png`,
  },
  {
    input: '/Users/xinge.zhang/Desktop/male-hair-sheet.png',
    category: 'hair',
    cols: 4,
    rows: 2,
    filename: (_row, index) => `male_hair_${pad2(index + 1)}.png`,
  },
  {
    input: '/Users/xinge.zhang/Desktop/female-hair-sheet.png',
    category: 'hair',
    cols: 4,
    rows: 2,
    filename: (_row, index) => `female_hair_${pad2(index + 1)}.png`,
  },
  {
    input: '/Users/xinge.zhang/Desktop/male-tops-sheet.png',
    category: 'tops',
    cols: 4,
    rows: 2,
    filename: (_row, index) => `male_top_${pad2(index + 1)}.png`,
  },
  {
    input: '/Users/xinge.zhang/Desktop/female-tops-sheet.png',
    category: 'tops',
    cols: 4,
    rows: 2,
    filename: (_row, index) => `female_top_${pad2(index + 1)}.png`,
  },
  {
    input: '/Users/xinge.zhang/Desktop/male-bottoms-sheet.png',
    category: 'bottoms',
    cols: 4,
    rows: 2,
    filename: (_row, index) => `male_bottom_${pad2(index + 1)}.png`,
  },
  {
    input: '/Users/xinge.zhang/Desktop/female-bottoms-sheet.png',
    category: 'bottoms',
    cols: 4,
    rows: 2,
    filename: (_row, index) => `female_bottom_${pad2(index + 1)}.png`,
  },
  {
    input: '/Users/xinge.zhang/Desktop/male-shoes-sheet.png',
    category: 'shoes',
    cols: 6,
    rows: 1,
    filename: (_row, index) => `male_shoes_${pad2(index + 1)}.png`,
  },
  {
    input: '/Users/xinge.zhang/Desktop/female-shoes-sheet.png',
    category: 'shoes',
    cols: 6,
    rows: 1,
    filename: (_row, index) => `female_shoes_${pad2(index + 1)}.png`,
  },
  {
    input: '/Users/xinge.zhang/Desktop/male-accessories-sheet.png',
    category: 'accessories',
    cols: 5,
    rows: 2,
    filename: (_row, index) => `male_accessory_${pad2(index + 1)}.png`,
  },
  {
    input: '/Users/xinge.zhang/Desktop/female-accessories-sheet.png',
    category: 'accessories',
    cols: 5,
    rows: 2,
    filename: (_row, index) => `female_accessory_${pad2(index + 1)}.png`,
  },
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

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

async function sliceSheet(spec) {
  const meta = await sharp(spec.input).metadata();
  if (!meta.width || !meta.height) throw new Error(`Cannot read dimensions from ${spec.input}`);

  const outputDir = path.join(OUT_ROOT, spec.category);
  await fs.mkdir(outputDir, { recursive: true });

  for (let row = 0; row < spec.rows; row += 1) {
    const top = Math.round((row * meta.height) / spec.rows);
    const bottom = Math.round(((row + 1) * meta.height) / spec.rows);
    const height = bottom - top;

    for (let col = 0; col < spec.cols; col += 1) {
      const left = Math.round((col * meta.width) / spec.cols);
      const right = Math.round(((col + 1) * meta.width) / spec.cols);
      const width = right - left;
      const index = row * spec.cols + col;
      const outFile = path.join(outputDir, spec.filename(row, index, col));

      const { data, info } = await sharp(spec.input)
        .extract({ left, top, width, height })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const transparent = transparentFloodFillEdgeBackground(Buffer.from(data), info.width, info.height);

      await sharp(transparent, {
        raw: { width: info.width, height: info.height, channels: 4 },
      })
        .png()
        .toFile(outFile);

      console.log(`wrote ${outFile}`);
    }
  }
}

async function writeNoneAccessory() {
  const outputDir = path.join(OUT_ROOT, 'accessories');
  await fs.mkdir(outputDir, { recursive: true });
  await sharp({
    create: {
      width: 296,
      height: 444,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toFile(path.join(outputDir, 'none.png'));
  console.log(`wrote ${path.join(outputDir, 'none.png')}`);
}

async function main() {
  for (const spec of SHEETS) {
    await sliceSheet(spec);
  }
  await writeNoneAccessory();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
