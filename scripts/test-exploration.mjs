import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import sharp from 'sharp';

const code = ts.transpileModule(await readFile('src/constants/explorationWorld.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { createExplorers, stepExplorer, explorationCamera, clampWalkPoint, walkingCell } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const registration = await readFile('src/constants/explorationSprites.ts', 'utf8');
const ids = [...registration.matchAll(/'(\d+)': require/g)].map(match => match[1]);
assert.deepEqual([...ids].sort((a, b) => Number(a) - Number(b)), Array.from({ length: 48 }, (_, i) => String(i + 1)), 'Every AI character must have walking art');
assert.deepEqual(walkingCell('45', 'left', 3), { column: 3, row: 2, mirrored: true });
assert.deepEqual(walkingCell('45', 'right', 3), { column: 3, row: 2, mirrored: false });
const actors = createExplorers(ids);
assert.equal(Object.keys(actors).length, ids.length);
for (const actor of Object.values(actors)) assert.deepEqual(clampWalkPoint(actor), { x: actor.x, y: actor.y });
const start = { x: 300, y: 300, facing: 'down', frame: 0 };
for (const [direction, goal] of Object.entries({ left: { x: 290, y: 300 }, right: { x: 310, y: 300 }, up: { x: 300, y: 290 }, down: { x: 300, y: 310 } })) {
  assert.equal(stepExplorer(start, goal, 2, 140).facing, direction);
  assert.deepEqual(stepExplorer(start, goal, 50, 140), { ...goal, facing: direction, frame: 0 });
}
assert.equal(stepExplorer(start, { x: 500, y: 300 }, 2, 140).frame, 1);
assert.equal(stepExplorer(start, { x: 500, y: 300 }, 2, 420).frame, 3);
assert.deepEqual(clampWalkPoint({ x: -200, y: 3000 }), { x: 28, y: 616 });
assert.deepEqual(explorationCamera({ x: 0, y: 0 }, { width: 1000, height: 600 }, 2), { x: 0, y: 0 });
assert.deepEqual(explorationCamera({ x: 960, y: 640 }, { width: 1000, height: 600 }, 2), { x: 920, y: 680 });
assert.deepEqual(explorationCamera(start, { width: 3000, height: 3000 }, 2), { x: 0, y: 0 });

for (const id of ids) {
  const path = `assets/exploration/roster/${id}.png`;
  const metadata = await sharp(path).metadata();
  assert.deepEqual([metadata.width, metadata.height], [320, 384], `${id}: atlas dimensions`);
  const hashes = [];
  for (let i = 0; i < 16; i++) {
    const frame = await sharp(path).extract({ left: i % 4 * 80, top: Math.floor(i / 4) * 96, width: 80, height: 96 }).ensureAlpha().raw().toBuffer();
    let count = 0, bottom = -1, top = 96;
    for (let y = 0; y < 96; y++) for (let x = 0; x < 80; x++) if (frame[(y * 80 + x) * 4 + 3]) {
      count++; bottom = Math.max(bottom, y); top = Math.min(top, y);
      assert.ok(x > 0 && x < 79, `${id}/${i}: horizontal clipping`);
    }
    assert.ok(count > 100, `${id}/${i}: empty frame`);
    assert.equal(bottom, 87, `${id}/${i}: feet must stay on the ground`);
    assert.ok(bottom - top + 1 <= 80, `${id}/${i}: oversized character`);
    hashes.push(createHash('sha256').update(frame).digest('hex'));
    if (id === '1' || id === '2') {
      const original = await sharp(`assets/exploration/${id === '1' ? 'toby' : 'momo'}-walk-v2.png`).extract({ left: i % 4 * 64, top: Math.floor(i / 4) * 96, width: 64, height: 96 }).ensureAlpha().raw().toBuffer();
      const padded = await sharp(path).extract({ left: i % 4 * 80 + 8, top: Math.floor(i / 4) * 96, width: 64, height: 96 }).ensureAlpha().raw().toBuffer();
      for (let p = 0; p < original.length; p += 4) {
        assert.equal(original[p + 3], padded[p + 3], `${id}/${i}: original alpha changed`);
        if (original[p + 3]) assert.ok(original.subarray(p, p + 3).equals(padded.subarray(p, p + 3)), `${id}/${i}: original visible pixels changed`);
      }
    }
  }
  for (let row = 0; row < 4; row++) assert.notEqual(hashes[row * 4 + 1], hashes[row * 4 + 3], `${id}: identical strides in direction ${row}`);
}
console.log(`Exploration passed: ${ids.length} sheets, ${ids.length * 16} frames; movement, camera, ground alignment and original art preserved.`);
