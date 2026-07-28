#!/usr/bin/env node
/**
 * Batch re-encode every *.png under assets/ as truecolor RGBA PNG (PNG32-style),
 * preserving alpha. Sharp decodes by content, so JPEG-in-.png files are fixed.
 * Use `scripts/convert-assets-png32-imagemagick.sh` when ImageMagick is available.
 */
import { readdir } from 'fs/promises';
import { rename, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const assetsDir = join(root, 'assets');

/** @param {string} dir */
async function* walkPng(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walkPng(p);
    else if (e.isFile() && /\.png$/i.test(e.name)) yield p;
  }
}

let ok = 0;
let fail = 0;
for await (const abs of walkPng(assetsDir)) {
  const tmp = `${abs}.tmp.${process.pid}.png`;
  try {
    await sharp(abs, { failOn: 'none', animated: true, limitInputPixels: false })
      .ensureAlpha()
      .png({
        palette: false,
        compressionLevel: 9,
        effort: 10,
      })
      .toFile(tmp);
    await rename(tmp, abs);
    ok += 1;
  } catch (e) {
    fail += 1;
    console.error(`FAIL ${abs}:`, e);
    try {
      await unlink(tmp);
    } catch {
      /* ignore */
    }
  }
}
console.log(`png32-rgba: ok=${ok} fail=${fail}`);
