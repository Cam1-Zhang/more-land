import sharp from 'sharp';
import { mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';

// Usage: node scripts/prepare-exploration-sprites.mjs <Toby sheet> <Momo sheet>
// Keep 2x detail for the logical 32x48 cell: 1x drops eye whites/pupils.
// The renderer still displays the same logical size with nearest-neighbor sampling.
const cellWidth = 64, cellHeight = 96, footBaseline = 88;
const destination = path.resolve('assets/exploration');
await mkdir(destination, { recursive: true });
for (const [index, name] of ['toby', 'momo'].entries()) {
  const source = process.argv[index + 2];
  if (!source) throw new Error(`Missing ${name} source sheet`);
  await copyFile(source, path.join(destination, `${name}-source.png`));
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bounds = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      let left = info.width, top = info.height, right = 0, bottom = 0;
      for (let y = Math.floor(row * info.height / 4); y < Math.floor((row + 1) * info.height / 4); y++) {
        for (let x = Math.floor(col * info.width / 4); x < Math.floor((col + 1) * info.width / 4); x++) {
          if (data[(y * info.width + x) * 4 + 3] < 128) continue;
          left = Math.min(left, x); right = Math.max(right, x);
          top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
      }
      if (right < left) throw new Error(`Empty frame: ${name} ${row}/${col}`);
      bounds.push({ left, top, width: right - left + 1, height: bottom - top + 1 });
    }
  }
  const scale = Math.min(80 / Math.max(...bounds.map(b => b.height)), 56 / Math.max(...bounds.map(b => b.width)));
  const frames = await Promise.all(bounds.map(async (box, i) => {
    const width = Math.round(box.width * scale), height = Math.round(box.height * scale);
    return {
      input: await sharp(source).extract(box).resize(width, height, { kernel: 'nearest' }).png().toBuffer(),
      left: (i % 4) * cellWidth + Math.floor((cellWidth - width) / 2),
      top: Math.floor(i / 4) * cellHeight + footBaseline - height,
    };
  }));
  await sharp({ create: { width: cellWidth * 4, height: cellHeight * 4, channels: 4, background: '#00000000' } })
    .composite(frames).png().toFile(path.join(destination, `${name}-walk-v2.png`));
  console.log(`${name}: 16 frames, 64×96 pixels per logical 32×48 cell, transparent PNG`);
}
