import sharp from 'sharp';

// User-approved local pixel correction: the dark marks INSIDE the fists are
// skin, not holes. Only these front-frame pixels change; contours stay intact.
const corrections = [
  {
    input: 'assets/hall/momo-seated-v2.png', output: 'assets/hall/momo-seated-v3.png',
    pixels: [[24, 68, '#f8bd84'], [24, 69, '#ecab6b'],
      [38, 68, '#f7bc87'], [39, 68, '#f7bc87'],
      [38, 69, '#ebad76'], [39, 69, '#ebad76']],
  },
  {
    input: 'assets/hall/roster/7-v2.png', output: 'assets/hall/roster/7-v3.png',
    pixels: [[24, 68, '#fabb84'], [25, 68, '#f9c291'],
      [24, 69, '#f5ae6e'], [25, 69, '#f5ae6e'],
      [38, 68, '#fbc08e'], [39, 68, '#f8be8c'],
      [38, 69, '#f7af6b'], [39, 69, '#fabc82']],
  },
];

for (const { input, output, pixels } of corrections) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const [x, y, color] of pixels) {
    const offset = (y * info.width + x) * 4;
    const rgb = color.slice(1).match(/../g).map(value => parseInt(value, 16));
    for (let channel = 0; channel < 3; channel++) data[offset + channel] = rgb[channel];
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(output);
  console.log(`${output}: corrected ${pixels.length} hand-interior pixels`);
}
