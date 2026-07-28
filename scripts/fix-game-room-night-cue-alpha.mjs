#!/usr/bin/env node
/**
 * 夜间睁眼立绘：JPEG / 黑底假 PNG → 真 RGBA PNG（边缘 flood 抠图）。
 * 若已是透明 PNG 则跳过。
 *
 *   node scripts/fix-game-room-night-cue-alpha.mjs
 *   FORCE=1 node scripts/fix-game-room-night-cue-alpha.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Jimp } from 'jimp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CUE_DIR = path.join(__dirname, '..', 'assets', 'gameRoom', 'nightCue');
const TOL = Number(process.env.TOL ?? 14);
const FORCE = process.env.FORCE === '1';

function getRgb(data, w, x, y) {
  const i = (y * w + x) * 4;
  return { r: data[i], g: data[i + 1], b: data[i + 2] };
}

function pngHasTransparency(data, w, h) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] < 250) return true;
    }
  }
  return false;
}

function edgeDominantBackgroundKey(data, w, h) {
  const step = Math.max(1, Math.min(8, Math.floor(Math.min(w, h) / 96)));
  const samples = [];
  for (let x = 0; x < w; x += step) {
    samples.push(getRgb(data, w, x, 0));
    samples.push(getRgb(data, w, x, h - 1));
  }
  for (let y = 0; y < h; y += step) {
    samples.push(getRgb(data, w, 0, y));
    samples.push(getRgb(data, w, w - 1, y));
  }
  const L = samples.map((c) => c.r + c.g + c.b);
  const avg = L.reduce((a, b) => a + b, 0) / (L.length || 1);
  const sorted = samples.map((c, i) => ({ c, l: L[i] })).sort((a, b) => a.l - b.l);
  const n = sorted.length;
  const frac = 0.35;
  const segment =
    avg > 400
      ? sorted.slice(Math.max(0, Math.floor(n * (1 - frac))), n)
      : sorted.slice(0, Math.ceil(n * frac));
  let r = 0;
  let g = 0;
  let b = 0;
  for (const { c } of segment) {
    r += c.r;
    g += c.g;
    b += c.b;
  }
  const m = segment.length || 1;
  return { r: Math.round(r / m), g: Math.round(g / m), b: Math.round(b / m) };
}

function buildEdgeFloodTransparentMask(data, w, h, useKey, tol) {
  const mask = new Uint8Array(w * h);
  const stack = [];
  const bgLike = (x, y) => {
    const i = (y * w + x) * 4;
    return (
      Math.abs(data[i] - useKey.r) <= tol &&
      Math.abs(data[i + 1] - useKey.g) <= tol &&
      Math.abs(data[i + 2] - useKey.b) <= tol
    );
  };
  const tryPush = (x, y) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const idx = y * w + x;
    if (mask[idx] || !bgLike(x, y)) return;
    mask[idx] = 1;
    stack.push(x, y);
  };
  for (let x = 0; x < w; x++) {
    tryPush(x, 0);
    tryPush(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    tryPush(0, y);
    tryPush(w - 1, y);
  }
  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    tryPush(x + 1, y);
    tryPush(x - 1, y);
    tryPush(x, y + 1);
    tryPush(x, y - 1);
  }
  return mask;
}

function applyMask(data, tmask, w, h) {
  for (let i = 0; i < w * h; i++) {
    data[i * 4 + 3] = tmask[i] ? 0 : 255;
  }
}

async function processOne(filePath) {
  const image = await Jimp.read(await fs.readFile(filePath));
  const { width: w, height: h, data } = image.bitmap;
  if (pngHasTransparency(data, w, h) && !FORCE) {
    console.log('skip (has alpha):', path.basename(filePath));
    return;
  }
  const key = edgeDominantBackgroundKey(data, w, h);
  const tmask = buildEdgeFloodTransparentMask(data, w, h, key, TOL);
  applyMask(data, tmask, w, h);
  await image.write(filePath);
  console.log('ok:', path.basename(filePath), 'key=', key);
}

const names = ['guard', 'wolves', 'seer', 'witch'];
for (const name of names) {
  await processOne(path.join(CUE_DIR, `${name}.png`));
}
