import assert from 'node:assert/strict';
import sharp from 'sharp';

// Only import imagegen's two corrected profiles. Keep the accepted front/back
// pixels intact, so a localized identity fix cannot redraw the other poses.
const original = 'assets/hall/valley/17.png';
const source = 'assets/hall/valley/qa-fixes/source/mike-seated-beard.png';
const output = 'assets/hall/valley/17-v2.png';
const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const cellWidth = Math.floor(info.width / 2), cellHeight = Math.floor(info.height / 2);
const frames = [];
for (let i = 0; i < 4; i++) {
  const left = i % 2 * 80, top = Math.floor(i / 2) * 96;
  if (i === 0 || i === 3) {
    frames.push({ input: await sharp(original).extract({ left, top, width: 80, height: 96 }).png().toBuffer(), left, top });
    continue;
  }
  const x0 = i % 2 * cellWidth, y0 = Math.floor(i / 2) * cellHeight;
  let xMin = info.width, yMin = info.height, xMax = -1, yMax = -1;
  const x1 = i % 2 ? info.width : cellWidth, y1 = i >= 2 ? info.height : cellHeight;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (data[(y * info.width + x) * 4 + 3] < 128) continue;
    xMin = Math.min(xMin, x); yMin = Math.min(yMin, y);
    xMax = Math.max(xMax, x); yMax = Math.max(yMax, y);
  }
  assert.ok(xMax >= xMin && yMax >= yMin, `Missing profile ${i}`);
  const box = { left: xMin, top: yMin, width: xMax - xMin + 1, height: yMax - yMin + 1 };
  const width = Math.round(box.width * 84 / box.height / 2) * 2;
  assert.ok(width > 0 && width < 80, 'Profile must fit without squeezing');
  const frame = await sharp(source).extract(box).resize(width, 84, { kernel: 'nearest' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let p = 3; p < frame.data.length; p += 4) frame.data[p] = frame.data[p] >= 128 ? 255 : 0;
  const input = await sharp(frame.data, { raw: frame.info }).png({ palette: true, colours: 32, dither: 0 }).toBuffer();
  frames.push({ input, left: left + Math.floor((80 - width) / 2), top: top + 8 });
}
await sharp({ create: { width: 160, height: 192, channels: 4, background: '#00000000' } }).composite(frames).png().toFile(output);
for (const i of [0, 3]) {
  const box = { left: i % 2 * 80, top: Math.floor(i / 2) * 96, width: 80, height: 96 };
  const before = await sharp(original).extract(box).ensureAlpha().raw().toBuffer();
  const after = await sharp(output).extract(box).ensureAlpha().raw().toBuffer();
  assert.ok(before.equals(after), `Unchanged pose ${i} must remain pixel-identical`);
}
console.log('Imported Mike beard profiles; front/back pixels preserved exactly.');
