# Fixed-view hall scene

Open **探索 → 进入木屋** to preview the scene. It reconstructs the existing
`assets/game-room/background_day.jpg` as separate room, table, chair and seated-character
layers. The exploration preview remains available. Werewolf and Avalon matches now use the same
layered room, with the selected roster assigned in the existing game seat order.

## Layout and seating

- `src/constants/hallScene.ts` defines a shared 1024×576 reference space, table bounds,
  6/12 seat arrangements, inward-facing directions and seat swapping.
- `HallRoomScene` scales every layer with the same factor. Far chairs/characters render
  behind the table; near chairs/characters render in front. The complete near-side
  chair back, including its top rail, renders over the sitter. Sprite alpha retains
  the gaps between slats; hair cannot paint over solid wood.
- Side-facing AI sprites are positioned by their hip contact with the cushion:
  12 reference pixels upward and 6 pixels forward toward the table. Front/back poses
  and the human's front-facing custom avatar retain their existing placement.
- `HallSceneScreen` starts with Toby and Momo seated. Select a character, then click a
  chair to move them. Occupied destinations swap the two occupants.
- **对照原图** compares the original composition; **查看空房** hides the independent props;
  **重新入座** restores the two initial occupants and their brief arrival animation.

## Art pipeline

Generated with built-in image_gen from the existing room and exploration sprite references.
Prompts are in `assets/hall/generation-prompts.json`. Original outputs are kept in
`assets/hall/source/`. `scripts/prepare-hall-assets.mjs` only crops, aligns and resizes those
images for rendering, preserving their alpha channel. Seated sprites retain 64×96 pixels
per frame to preserve the eye detail fixed in the exploration scene.

Run the layout checks with `node --import tsx scripts/test-hall-scene.ts`.

## Match integration

- All 48 AI characters have four seated directions. Toby and Momo retain their approved
  individual sheets; the other 46 are normalized from six generated roster atlases.
- `assets/hall/roster/manifest.json` records identity order; `prompts.json` contains the
  built-in image_gen prompts. `scripts/prepare-hall-roster.mjs group source` crops and
  normalizes each character without changing the original outputs in `source/`.
- `assignHallSeats` preserves game roster order and keeps eliminated players in place.
  Character identity selects artwork; it never selects the seat number or game role.
- Match framing uses the original full-screen `contain` size, centered vertically
  and translated horizontally by the existing frozen 9% screen-width offset.
  `MatchHallRoomScene` measures the screen layer, not the smaller left HUD column.
  The room retains that transform. Match tables, chairs, characters and seat targets
  are 90% of their reference size, anchored around the table center (447, 337).
  This keeps the table center and sitter/chair alignment fixed. The house preview
  retains its original size. Transparent HUD containers pass seat clicks
  through while the header and right panel retain their own interactions.
  Night lighting dims the artwork, leaving status labels and controls legible.
- The existing Werewolf target-selection rules and Avalon proposal/assassination handlers
  remain in their respective screens. Names, numbers, speaking/sticker indicators,
  team selections, death state and permitted role badges are scene overlays.
- Human seats retain the user's custom avatar. Exploration remains the Toby/Momo meadow
  and the original two-person house preview with seat swapping.

## Front-hand correction

Momo and Daisy use `momo-seated-v2.png` and `roster/7-v2.png`. Their front-facing
hands rest on their thighs near the knees, matching the other sitters. The other
three frames are copied unchanged from each normalized atlas. Reproduce these with
`node scripts/prepare-hall-hand-fix.mjs` after normalizing the roster.
The edit prompt is saved in `assets/hall/roster/hand-fix-prompt.json`.

The corrected hand assets are `momo-seated-v3.png` and `roster/7-v3.png`.
At the user's request, `node scripts/fix-hall-hand-pixels.mjs` replaces the dark
marks inside their front-facing hands with adjacent skin tones (6 Momo pixels,
8 Daisy pixels). Every other pixel, including alpha and other directions, is
unchanged. Run this after the front-hand preparation step above.

## Unified head/body proportions

Toby and Momo keep their approved individual sheets. The remaining 46 characters
use `assets/hall/proportions/{id}.png`, edited with built-in image_gen against
Toby/Momo references to reduce the oversized heads and give the torso more room.
Each sprite retains its four seated directions, identity, clothes and skin-filled
hands. Sources are saved in `assets/hall/proportions/source/`; generation briefs
and prompts are in `assets/hall/proportions/prompts.json`.

Normalize each generated atlas with:
`node scripts/prepare-hall-roster.mjs GROUP SOURCE assets/hall/proportions`.
The shared 64×96 frame, foot baseline, 56×84 display size and chair offsets remain
unchanged. There is no age-based scaling; that requested change was cancelled.

## Shared character size

The current correction uses Toby and Momo as both proportion and size references,
not a uniform percentage reduction of every head. Edited atlases and the exact
built-in image generation prompt are retained in `assets/hall/uniform/`.
Toby and Momo continue to use their individually approved sheets.

Normalize these atlases with
`node scripts/prepare-hall-roster.mjs GROUP SOURCE assets/hall/uniform --uniform-height`.
Each of the other 46 characters now has an 84-pixel visible seated silhouette in
every direction, centered horizontally in an 80×96 frame with the feet at y=92.
The extra transparent width accommodates robes and Ghost without shrinking their
height. The renderer uses the same 84/96 pixel scale as the original 64×96 sheets
and centers the wider frame on the same seat anchor.
The earlier normalizer fitted all four views using the tallest one, which made
some side/back views noticeably shorter. The new mode preserves aspect ratio and
rejects any silhouette too wide for the frame instead of squeezing it. Scene
positions, chair offsets and the shared 90% match furniture scale are unchanged.

## Pixel style correction

The active roster is `assets/hall/pixel/{id}.png`. The previous uniform set still
looked like smoothly shaded illustrations despite matching height, so the 46
characters were redrawn with built-in image generation using Toby/Momo as the
primary style reference. The exact prompt and export settings are saved in
`assets/hall/pixel/prompts.json`; edited source atlases are in `pixel/source/`.

Export with `node scripts/prepare-hall-roster.mjs GROUP SOURCE assets/hall/pixel --uniform-height --pixel-grid`.
The pixel mode samples each generated figure at 42px seated height, uses at most
32 colors per frame without dithering, hardens transparency, and enlarges exactly
2× using nearest-neighbor. This makes the pixel grid part of the image rather
than relying solely on CSS image-rendering. The final 84px silhouette, 80×96 frame,
feet baseline, seat centers and body aspect ratios are retained. Toby and Momo
remain unchanged, as do the room and furniture geometry.

## Current art direction: valley proportions, original identities

The latest user direction supersedes the Toby/Momo-only style reference: all 48
seated sprites now use `assets/hall/valley/`, including Toby and Momo. Stardew Valley
NPCs are a proportion/pixel-technique reference only. The original roster remains
the identity reference: preserve hair silhouettes/colors, face traits, clothes,
accessories, age and species. No characters or costumes from Stardew are used.

The prompt set and reference link are in `valley/prompts.json`; accepted source
atlases are in `valley/source/`. Identity-drifting prototypes were not integrated.
Run the same exporter with `--uniform-height --pixel-grid --pixel-step=1 --include-references`.
The current export samples directly at 84px visible height on a 1px grid, keeping
the eye whites and pupils from the accepted source. The previous 42px intermediate
discarded these small facial features. The 32-color palette, binary alpha, frame
dimensions, centered seat anchor, and foot baseline remain unchanged.
All 48 atlases use 80×96 cells (160×192 sheets), 84px visible seated height and
y=92 feet, rendered at the same pixel scale and centered on the same seat anchors.
The original Toby/Momo sheets and previous sets remain available for comparison.
Exploration's walking sheets, portraits, room, table and chairs are unchanged.

## Character QA — 2026-11-12

Reviewed all 48 characters in four seated directions, 48 × 16 walking frames,
and the six personal avatars' seated and walking poses. Enlarged inspection
covered eye separation, directional identity, hands/limbs, clipping and pixel
style. Walking and seated proportions were compared at the same pixel scale.
Simple solid pixel eyes remain valid; glasses, Ghost, Old Fox and God Eye retain
their own facial designs rather than receiving a blanket eye-white edit.

Mike (17) had a real identity error: both seated profiles omitted his facial hair.
The active registry now uses `valley/17-v2.png`, imported from a built-in imagegen
correction. Both profiles now have his brown moustache/beard; front and back are
pixel-identical to `17.png`. The original atlas remains unchanged. The source,
exact prompt and import command are in `assets/hall/valley/qa-fixes/`.
Reproduce with `node scripts/prepare-hall-mike-beard.mjs`.

Local browser checks covered four-way movement, arrival/stop, front/side/back
seating, seat changes, table and chair-back occlusion. The personal-avatar,
hall, exploration and six Mistbell suites passed, and Expo Web export succeeded.
Whole-project TypeScript still reports existing errors outside these sprite
modules; this is not a claim of a clean project-wide type check.
