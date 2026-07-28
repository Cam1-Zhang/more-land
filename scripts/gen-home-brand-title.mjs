#!/usr/bin/env node
/**
 * 导出主页像素标题 PNG（透明底）。使用 Zpix 渲染 SVG → sharp。
 *   npm run gen:home-brand-title
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const fontPath = path.join(root, 'assets/fonts/Zpix.ttf');
const outPath = path.join(root, 'assets/homeBrandTitle.png');

const TEXT = 'AI WEREWOLF VALLEY';
const W = 1024;
const H = 120;
const FONT_SIZE = 52;

const fontB64 = fs.readFileSync(fontPath).toString('base64');
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <style>
      @font-face {
        font-family: 'Zpix';
        src: url('data:font/truetype;charset=utf-8;base64,${fontB64}') format('truetype');
      }
    </style>
  </defs>
  <g transform="translate(512 78) scale(1 1.2) translate(-512 -78)">
    <text
      x="512"
      y="78"
      text-anchor="middle"
      font-family="Zpix, monospace"
      font-size="${FONT_SIZE}"
      letter-spacing="5"
      fill="#1a1208"
      stroke="#fffef8"
      stroke-width="4"
      paint-order="stroke fill"
    >${TEXT}</text>
  </g>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(outPath);
const meta = await sharp(outPath).metadata();
console.log(`Wrote ${outPath} (${meta.width}×${meta.height}, alpha=${meta.hasAlpha})`);
