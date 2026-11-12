import sharp from 'sharp';
import { mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';

// node scripts/prepare-hall-assets.mjs room table chairs tobySeated momoSeated
const folder = path.resolve('assets/hall');
await mkdir(path.join(folder, 'source'), { recursive: true });
const keys = ['room', 'table', 'chairs', 'toby-seated', 'momo-seated'];
for (const [i, key] of keys.entries()) {
  const input = process.argv[i + 2];
  if (!input) throw new Error(`Missing ${key} source`);
  await copyFile(input, path.join(folder, 'source', `${key}.png`));
  if (key === 'room') {
    await sharp(input).resize(1024, 576, { fit: 'fill', kernel: 'nearest' }).png().toFile(path.join(folder, 'room.png'));
    continue;
  }
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cols = key === 'table' ? 1 : 2;
  const boxes = [];
  for (let row = 0; row < cols; row++) for (let col = 0; col < cols; col++) {
    let left = info.width, top = info.height, right = 0, bottom = 0;
    for (let y = Math.floor(row * info.height / cols); y < Math.floor((row + 1) * info.height / cols); y++) {
      for (let x = Math.floor(col * info.width / cols); x < Math.floor((col + 1) * info.width / cols); x++) {
        if (data[(y * info.width + x) * 4 + 3] < 128) continue;
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
    if (right < left) throw new Error(`Empty ${key} cell ${row},${col}`);
    boxes.push({ left, top, width: right - left + 1, height: bottom - top + 1 });
  }
  if (key === 'table') {
    await sharp(input).extract(boxes[0]).resize({ width: 864, kernel: 'nearest' }).png().toFile(path.join(folder, 'table.png'));
    continue;
  }
  const scale = Math.min(84 / Math.max(...boxes.map(box => box.height)), 58 / Math.max(...boxes.map(box => box.width)));
  const frames = await Promise.all(boxes.map(async (box, index) => {
    const width = Math.round(box.width * scale), height = Math.round(box.height * scale);
    return {
      input: await sharp(input).extract(box).resize(width, height, { kernel: 'nearest' }).png().toBuffer(),
      left: index % 2 * 64 + Math.floor((64 - width) / 2), top: Math.floor(index / 2) * 96 + 92 - height,
    };
  }));
  await sharp({ create: { width: 128, height: 192, channels: 4, background: '#00000000' } })
    .composite(frames).png().toFile(path.join(folder, `${key}.png`));
}
console.log('Prepared room, table, four chair directions, and two seated character sheets.');
