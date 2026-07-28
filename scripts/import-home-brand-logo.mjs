#!/usr/bin/env node
/**
 * 主页 LOGO：只拷贝你本地的透明 PNG，不做色键/抠图。
 * 聊天里发的图会变成 JPEG（无 Alpha），不能用那条链路。
 *
 *   HOME_BRAND_LOGO_SRC=/path/to/logo.png npm run import:home-brand-logo
 * 或直接拖文件到 assets/homeBrandLogo.png 后执行 npm run import:home-brand-logo -- assets/homeBrandLogo.png 做校验。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dest = path.join(root, 'assets', 'homeBrandLogo.png');

const src = process.argv[2] || process.env.HOME_BRAND_LOGO_SRC;
if (!src) {
  console.error('请指定透明 PNG 路径，例如：');
  console.error('  HOME_BRAND_LOGO_SRC=~/Downloads/logo.png npm run import:home-brand-logo');
  process.exit(1);
}
const abs = path.resolve(src);
if (!fs.existsSync(abs)) {
  console.error('文件不存在:', abs);
  process.exit(1);
}

const meta = await sharp(abs).metadata();
if (meta.format === 'jpeg' || meta.format === 'jpg') {
  console.error('这是 JPEG，没有透明通道。请用设计稿导出的 PNG，不要依赖聊天附件。');
  process.exit(1);
}
if (!meta.hasAlpha) {
  console.error('PNG 没有 Alpha 通道，无法作为透明 LOGO 使用。');
  process.exit(1);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(abs, dest);
console.log(
  `已原样写入 assets/homeBrandLogo.png（${meta.width}×${meta.height}，${meta.format}，有 Alpha）`
);
console.log('若界面未更新：npx expo start -c');
