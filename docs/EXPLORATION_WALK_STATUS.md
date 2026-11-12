# Exploration walking roster

All 48 AI characters now have four-direction walking sheets in the Exploration meadow. Personal player presets are not included.

- Toby/Momo use their original walking pixels with transparent horizontal padding only.
- Other characters were generated individually using Toby/Momo walking sheets as pose and proportion templates; seated art supplied character identity, hair and clothes.
- Each sheet has 4 directions × 4 frames, 80×96 source cells (40×48 logical), maximum visible height 80px and a fixed feet baseline at 88px. A single scale per sheet preserves relative proportions between poses.
- Pixel rendering and integer camera coordinates keep movement sharp.
- Atlas import detects transparent gutters instead of assuming perfectly equal generated cells, preventing fragments of the preceding row from appearing above heads. The final opaque foot pixel anchors each frame to the same baseline after resampling.
- OldFox's fourth leftward frame uses the matching rightward stride mirrored at render time to correct a generated facing error.
- Character search/selection, click-to-walk, WASD/arrow keys, touch direction buttons, camera following and companion wandering are enabled.
- Existing meadow and cabin entry remain available.

## Validation

Run: node scripts/test-exploration.mjs

The checks cover all 48 IDs / 768 frames, clipping, feet alignment, different stride frames, original Toby/Momo visible pixels, movement direction/arrival/bounds and camera bounds. This is not an automated artistic-proportion judgment; generated sheets were also visually reviewed against their templates.

Project-wide TypeScript checking still reports pre-existing errors outside the Exploration files.

Existing personal-avatar and hall-scene regression checks also pass.

## Source assets

Accepted generated originals are stored as assets/exploration/roster/source/{id}-walk.png (IDs 3–48). Import with scripts/prepare-exploration-character.mjs ID PATH.

The early multi-character batches (3-4-5-6.png and any batch generation metadata) were rejected and are not used by the live registry. Keep them separate from the accepted single-character originals.
