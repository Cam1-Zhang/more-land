#!/usr/bin/env node
/**
 * **立绘投放（默认）**：可选 **RESTORE_SRC** 从 Cursor 拷 `Name-<uuid>.png` → `named/`；**不修改像素**。
 * 产品要求：角色 PNG **仅保留原始 alpha**；禁止自动 matte / 色键成品、禁止把 JPG 当正式立绘、禁止白底或黑底填充。
 * 正式资源须为 **最终 RGBA PNG**。本脚本色键路径**不得**用于已正确的透明 PNG；仅在你明确要救「假 PNG / JPEG」时设 `ALLOW_MATTE=1`（仍属有损，非产品路径）。
 *
 * **仅拷贝（推荐）**：
 *   RESTORE_SRC="$HOME/.cursor/projects/<项目>/assets" npm run fix:named-alpha
 *   规则：`God_Eye`→`God Eye.png`，`Old_Fox`→`Old Fox.png`，`Prof.Mori`→`Prof. Mori.png`；
 *   支持 `Name-uuid.png` 与 `Name_<ts>___-uuid.png`；忽略 `__…`、`char_01…`、`image…`。
 *
 * **（慎用）色键抠图**：
 *   ALLOW_MATTE=1 npm run fix:named-alpha
 *   ALLOW_MATTE=1 npm run fix:named-alpha:force   # 含 FORCE，叠白底再抠，更伤原图
 *   可调 TOL、TOL_LIGHT、HEAL_PASSES、MODE=global。
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Jimp } from 'jimp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const NAMED_DIR = path.join(ROOT, 'assets', 'characters', 'body', 'named');

const TOL = Number(process.env.TOL ?? 8);
const MODE = process.env.MODE === 'global' ? 'global' : 'flood';
const HEAL_PASSES = Number(process.env.HEAL_PASSES ?? 4);
const HEAL_NEIGHBORS = Number(process.env.HEAL_NEIGHBORS ?? 5);
const FORCE = process.env.FORCE === '1' || process.env.FORCE === 'true';

/** Cursor `Prof.Mori-….png` → 仓库 `Prof. Mori.png` */
const CURSOR_PREFIX_TO_REPO = {
  God_Eye: 'God Eye.png',
  Old_Fox: 'Old Fox.png',
  'Prof.Mori': 'Prof. Mori.png',
};

function cursorPrefixToRepoFile(prefix) {
  if (CURSOR_PREFIX_TO_REPO[prefix]) return CURSOR_PREFIX_TO_REPO[prefix];
  return `${prefix}.png`;
}

/** 匹配 `Name-uuid.png`（uuid 为 8-4-4-4-12）；Name 可含 `.`（如 Prof.Mori） */
const CURSOR_FILE_RE =
  /^(.+?)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.png$/i;

/** 匹配 `Name_<timestamp>___-uuid.png`（Cursor 批量导出） */
const CURSOR_FILE_RE_TIMESTAMP =
  /^(.+?)_\d+___-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.png$/i;

const CURSOR_CHARACTER_PREFIX_RE = /^[A-Za-z][A-Za-z0-9_.]*$/;

/** 排除 Cursor 截图 `__2026-…-uuid.png`；排除 `char_01` 等编号素材、`image` 杂项 */
function isRestorableCursorPrefix(prefix) {
  if (!CURSOR_CHARACTER_PREFIX_RE.test(prefix)) return false;
  if (/^char_\d+$/i.test(prefix)) return false;
  if (prefix.toLowerCase() === 'image') return false;
  return true;
}

async function restoreFromCursor(srcDir) {
  const files = await fs.readdir(srcDir);
  /** @type {Map<string, { full: string; mtimeMs: number }>} */
  const best = new Map();
  for (const f of files) {
    const m = f.match(CURSOR_FILE_RE_TIMESTAMP) ?? f.match(CURSOR_FILE_RE);
    if (!m) continue;
    let prefix = m[1];
    if (!isRestorableCursorPrefix(prefix)) continue;
    const repoFile = cursorPrefixToRepoFile(prefix);
    const full = path.join(srcDir, f);
    const st = await fs.stat(full);
    const prev = best.get(repoFile);
    if (!prev || st.mtimeMs > prev.mtimeMs) best.set(repoFile, { full, mtimeMs: st.mtimeMs });
  }
  for (const [repoFile, { full }] of [...best.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const dst = path.join(NAMED_DIR, repoFile);
    await fs.copyFile(full, dst);
    console.log('restore:', repoFile, '<-', path.basename(full));
  }
  console.log('restore done.', best.size, 'files');
}

function getRgb(data, w, x, y) {
  const i = (y * w + x) * 4;
  return { r: data[i], g: data[i + 1], b: data[i + 2] };
}

function pngHasTransparency(data, w, h) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] < 255) return true;
    }
  }
  return false;
}

function applyGlobalKey(data, w, h, useKey, tol) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (
        Math.abs(r - useKey.r) <= tol &&
        Math.abs(g - useKey.g) <= tol &&
        Math.abs(b - useKey.b) <= tol
      ) {
        data[i + 3] = 0;
      } else {
        data[i + 3] = 255;
      }
    }
  }
}

function medianOf4(a, b, c, d) {
  const v = [a, b, c, d].sort((x, y) => x - y);
  return Math.round((v[1] + v[2]) / 2);
}

/** 四角各通道取中位数，抗单角被前景压住 */
function cornerMedianKey(corners) {
  return {
    r: medianOf4(corners[0].r, corners[1].r, corners[2].r, corners[3].r),
    g: medianOf4(corners[0].g, corners[1].g, corners[2].g, corners[3].g),
    b: medianOf4(corners[0].b, corners[1].b, corners[2].b, corners[3].b),
  };
}

function luminance3(c) {
  return c.r + c.g + c.b;
}

/**
 * 沿画布边缘密集采样，用「偏亮或偏暗的一截」估计衬底（避免四角黑边把 key 锁成 0 误吃身体里的深色）。
 * avg 高：取最亮 ~35% 边缘点平均；avg 低：取最暗 ~35% 平均。
 */
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
  if (samples.length === 0) return { r: 255, g: 255, b: 255 };
  const L = samples.map(luminance3);
  const avg = L.reduce((a, b) => a + b, 0) / L.length;
  const sorted = samples
    .map((c, i) => ({ c, l: L[i] }))
    .sort((a, b) => a.l - b.l);
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

/**
 * 与背景同色、且从画布边缘 4-连通可达 → 透明 (1)
 * @returns {Uint8Array} length w*h, 1=transparent 0=opaque
 */
function buildEdgeFloodTransparentMask(data, w, h, useKey, tol) {
  const mask = new Uint8Array(w * h);
  const stack = [];

  const bgLike = (x, y) => {
    const i = (y * w + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    return (
      Math.abs(r - useKey.r) <= tol &&
      Math.abs(g - useKey.g) <= tol &&
      Math.abs(b - useKey.b) <= tol
    );
  };

  function tryPush(x, y) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const idx = y * w + x;
    if (mask[idx]) return;
    if (!bgLike(x, y)) return;
    mask[idx] = 1;
    stack.push(x, y);
  }

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

/**
 * 透明像素周围若多为不透明，改回不透明（打断 JPEG/抗锯齿形成的细色桥）
 */
function healTransparentIntrusion(tmask, w, h, passes, minOpaqueNeighbors) {
  let work = new Uint8Array(tmask);
  for (let p = 0; p < passes; p++) {
    const next = new Uint8Array(work);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (work[idx] === 0) continue;
        let opaqueNeighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (work[(y + dy) * w + (x + dx)] === 0) opaqueNeighbors++;
          }
        }
        if (opaqueNeighbors >= minOpaqueNeighbors) next[idx] = 0;
      }
    }
    work = next;
  }
  return work;
}

/** 不接触画布边的透明连通块视为「体内误抠」，整块填回不透明 */
function fillInteriorTransparentBlobs(tmask, w, h) {
  const seen = new Uint8Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (!tmask[start] || seen[start]) continue;
    const comp = [];
    const q = [start];
    let touchesBorder = false;
    seen[start] = 1;
    let qi = 0;
    while (qi < q.length) {
      const cur = q[qi++];
      const x = cur % w;
      const y = (cur / w) | 0;
      comp.push(cur);
      if (x === 0 || x === w - 1 || y === 0 || y === h - 1) touchesBorder = true;
      if (x > 0) {
        const nb = cur - 1;
        if (tmask[nb] && !seen[nb]) {
          seen[nb] = 1;
          q.push(nb);
        }
      }
      if (x + 1 < w) {
        const nb = cur + 1;
        if (tmask[nb] && !seen[nb]) {
          seen[nb] = 1;
          q.push(nb);
        }
      }
      if (y > 0) {
        const nb = cur - w;
        if (tmask[nb] && !seen[nb]) {
          seen[nb] = 1;
          q.push(nb);
        }
      }
      if (y + 1 < h) {
        const nb = cur + w;
        if (tmask[nb] && !seen[nb]) {
          seen[nb] = 1;
          q.push(nb);
        }
      }
    }
    if (!touchesBorder) {
      for (const idx of comp) tmask[idx] = 0;
    }
  }
}

function applyTransparentMaskToAlpha(data, tmask, w, h) {
  for (let i = 0; i < w * h; i++) {
    const pi = i * 4;
    data[pi + 3] = tmask[i] ? 0 : 255;
  }
}

/** 按「直乘 alpha」叠到白底再写回不透明，便于在已有透明 PNG 上强制重抠（FORCE=1） */
function flattenStraightRgbOnWhite(data, w, h) {
  for (let i = 0; i < w * h; i++) {
    const pi = i * 4;
    const a = data[pi + 3] / 255;
    const r = data[pi];
    const g = data[pi + 1];
    const b = data[pi + 2];
    data[pi] = Math.round(r * a + 255 * (1 - a));
    data[pi + 1] = Math.round(g * a + 255 * (1 - a));
    data[pi + 2] = Math.round(b * a + 255 * (1 - a));
    data[pi + 3] = 255;
  }
}

async function processFile(filePath) {
  const buf = await fs.readFile(filePath);
  const b0 = buf[0];
  const b1 = buf[1];
  const b2 = buf[2];
  const b3 = buf[3];
  const isPng = b0 === 0x89 && b1 === 0x50 && b2 === 0x4e;
  const isJpeg = b0 === 0xff && b1 === 0xd8 && b2 === 0xff;
  const isWebp =
    b0 === 0x52 &&
    b1 === 0x49 &&
    b2 === 0x46 &&
    b3 === 0x46 &&
    buf.length >= 12 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50;

  if (isWebp) {
    console.log('skip (WebP):', path.basename(filePath));
    return;
  }

  if (!isJpeg && !isPng) {
    console.log('skip (unknown sig):', path.basename(filePath));
    return;
  }

  const image = await Jimp.read(buf);
  const { width: w, height: h, data } = image.bitmap;

  if (isPng && pngHasTransparency(data, w, h) && !FORCE) {
    console.log('skip (PNG + alpha):', path.basename(filePath));
    return;
  }

  if (FORCE) {
    flattenStraightRgbOnWhite(data, w, h);
  }

  const corners = [
    getRgb(data, w, 0, 0),
    getRgb(data, w, w - 1, 0),
    getRgb(data, w, 0, h - 1),
    getRgb(data, w, w - 1, h - 1),
  ];
  const useKey = edgeDominantBackgroundKey(data, w, h);
  const cornerMed = cornerMedianKey(corners);
  const spread = Math.max(
    ...corners.map((c) =>
      Math.max(Math.abs(c.r - cornerMed.r), Math.abs(c.g - cornerMed.g), Math.abs(c.b - cornerMed.b))
    )
  );
  if (spread > 40) {
    console.log('warn: corner spread vs median key', spread, path.basename(filePath));
  }
  const dk = Math.max(
    Math.abs(useKey.r - cornerMed.r),
    Math.abs(useKey.g - cornerMed.g),
    Math.abs(useKey.b - cornerMed.b)
  );
  if (dk > 55) {
    console.log('info: edge key vs corner-median', useKey, cornerMed, path.basename(filePath));
  }

  const keyLum = useKey.r + useKey.g + useKey.b;
  const TOL_LIGHT = Number(process.env.TOL_LIGHT ?? 6);
  const effTol = keyLum >= 720 ? Math.min(TOL, TOL_LIGHT) : TOL;

  if (MODE === 'global') {
    applyGlobalKey(data, w, h, useKey, effTol);
  } else {
    let tmask = buildEdgeFloodTransparentMask(data, w, h, useKey, effTol);
    tmask = healTransparentIntrusion(tmask, w, h, HEAL_PASSES, HEAL_NEIGHBORS);
    fillInteriorTransparentBlobs(tmask, w, h);
    applyTransparentMaskToAlpha(data, tmask, w, h);
  }

  await image.write(filePath);
  console.log(
    'ok:',
    path.basename(filePath),
    'key=',
    useKey,
    'TOL=',
    effTol,
    effTol !== TOL ? `(cap from ${TOL})` : '',
    MODE,
    `heal=${HEAL_PASSES}/${HEAL_NEIGHBORS}`,
    isJpeg ? '(was JPEG)' : '',
    FORCE ? '(FORCE)' : ''
  );
}

const restoreSrc = process.env.RESTORE_SRC;
if (restoreSrc) {
  await restoreFromCursor(path.resolve(restoreSrc));
}

const allowMatte =
  process.env.ALLOW_MATTE === '1' || process.env.ALLOW_MATTE === 'true';
if (!allowMatte) {
  console.log(
    'Matting 已跳过（默认关闭）。请直接使用带 Alpha 的最终 PNG；勿对成品立绘跑色键。',
    restoreSrc ? '（若已设置 RESTORE_SRC，拷贝已完成。）' : ''
  );
  if (!restoreSrc) {
    console.log('仅拷贝：RESTORE_SRC="<Cursor assets 路径>" npm run fix:named-alpha');
  }
  process.exit(0);
}

const entries = await fs.readdir(NAMED_DIR);
const pngs = entries.filter((f) => f.toLowerCase().endsWith('.png'));
for (const f of pngs.sort()) {
  await processFile(path.join(NAMED_DIR, f));
}
console.log('done.', pngs.length, 'files (ALLOW_MATTE=1)');
console.log(
  '---\nApp 里立绘没变：多半是 Metro 缓存。请停掉 dev server 后执行  npx expo start -c  再进选人/房间。'
);
