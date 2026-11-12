# 场景生成记录

工具：内置 imagegen。没有使用 CLI、API key 或外部图片素材。地图原图均为 1536×1024，渲染使用 nearest-neighbor／pixelated；工作区文件是生成结果的完整拷贝。

## 山谷最终稿

保存：`assets/mistbell/valley-pixel.png`

输入参考：首张生成的同构图草稿，角色不在场景图片内；此次只改变画风，保留地标布局。

> Use case: style-transfer. Edit this map into TRUE LOW RESOLUTION PIXEL ART suitable for the same game as 16x32 pixel walking sprites. Preserve EXACT SAME landscape layout and all landmark positions: farmhouse lower left, six soil plots, village clock central, observatory upper left, old cabin top middle, tunnel top right, bridge lower right. Render as if native resolution is 384x256 then enlarged 4x nearest-neighbor: VERY LARGE visible square pixels, hard staircase edges, flat limited 32-color palette, 2 or 3 tone shading only, NO antialiasing, NO soft gradients, NO painterly detail, NO tiny texture, NO realistic mountains, NO brushstrokes. Simple charming top-down SNES farming RPG map with tile-based orthogonal building geometry, simplified chunky round trees and grassy paths. Calm spring moss greens, ochre roofs, turquoise river. Remove distant landscape horizon: game terrain fills screen, no sky. NO text, NO people, NO UI. This must look like a playable pixel game, not concept illustration.

## 地下水渠

保存：`assets/mistbell/canal-pixel.png`

> Use case: stylized-concept. Production 2D pixel-art game background for a cozy supernatural farming mystery. Wide 1536x1024 underground old stone waterworks, strict top-down 3/4 SNES RPG pixel map, NO people, NO text, NO UI. Three connected walkable chambers across the map: left entry steps with tool crates and a maintenance ledger; middle large chamber with three rusty bronze water valves on a dry stone walkway, turquoise channels flowing around it and wooden footbridges; upper-right an uncanny closed old WOODEN DOOR in a solid stone wall surrounded by a little pale blue mist, nowhere to physically lead; lower-right collapsed sluice with a tiny silver metal nameplate on the ground. Wide visibly safe traversable walkways connect all chambers. Warm amber wall lanterns, deep teal water and muted slate stone, gently mysterious, never gory. TRUE CHUNKY PIXEL ART, 384x256 native-looking pixel clusters enlarged4x nearest, hard stepped edges, clear tile grid, 32 color limited palette, simple 2-3 tone shading. No painterly realism or smooth gradients. Match moss-green/honey-wood pixel valley map in same game, full map edge-to-edge no framing.


## 三阶段作物（内置 imagegen，透明背景）

源文件：`assets/mistbell/crops-source.png`。游戏图集：`assets/mistbell/crops.png`。

Use case: stylized-concept. Asset type: transparent pixel-art crop sprite sheet for a cozy SNES farming game. Exactly THREE isolated small turnip plants in a horizontal row, aligned to the same ground baseline, three equally spaced square cells. Left: newly planted tiny two-leaf seedling. Middle: growing turnip plant with five larger green leaves, no visible root yet. Right: harvest-ready round creamy white turnip with purple shoulders and healthy green leaves. No soil, no pots, no shadows, no ground, NO letters, NO numbers, no grid, no border, no characters. Genuine fully transparent background. Strict hand-pixelled low-resolution art, each plant appears as if drawn inside a 24x24 native pixel cell then upscaled nearest neighbor. Big crisp square pixels and stair-step edges, no smoothing or gradients. Limited 12-color palette, dark green outline, moss green and pale lime leaves, cream/purple turnip. All plants centered in their own equally sized cell with generous transparent margins, do not touch. Intended for overlay on an existing pixel farm map.

## Local rooms, player walking and tools — 2026-10-09

Generated with the built-in imagegen tool, then packed with nearest-neighbor resampling and binary alpha for game rendering. Room source/output mapping: `assets/mistbell/local-art-manifest.json`. Original generated sprites are retained under `assets/mistbell/player/source`; packed output is 320×384 (4×4 cells, feet aligned). Tools source is `assets/mistbell/tools-source.png`; packed output is `tools.png` (3×2 cells of 32px).

Room prompt base:
“ONE LOCAL ROOM at character scale, NOT a town world map, not a diorama, not isometric. Strict orthographic top-down oblique 16-bit farming-game camera, tiles aligned horizontally/vertically like Stardew Valley, native pixel resolution 384x256 upscaled nearest neighbor. Chunky clear square pixels, limited palette, no painterly blur, no gradients, no text, no labels, no UI, absolutely NO characters. Architecture stays upper third with broad open empty walkable foreground.” Each room specified its actual farmhouse/well, clock/shop, river/bridge, bar/tables, forest resources, cabin photo, telescope, canal map, three valves, wooden door or nameplate layout.

Corrected personal walking prompt: transparent 4×4 walk atlas; row front/left/right/back, columns neutral/left step/neutral/right step. Same exact appearance and outfit from `assets/avatar-creator/personal/avatars.png`, explicitly describing the relevant character (orange-haired boy in cream cardigan and blue shorts; brown short-haired man in beige blazer and black trousers; long black/red-haired girl in black/red sailor outfit; long brown-haired girl in cream knit and blue skirt). Generous transparent gutters; no sitting, scenery, labels or shadows; clear pixels and uniform feet baseline. The original incorrect identity generations were replaced before delivery.

Tool prompt:
“Make a TRANSPARENT sprite atlas of EXACTLY SIX farming RPG inventory items in a regular 3 columns by 2 rows grid with wide clear transparent gutters. Each cell contains ONE isolated item centered, same scale. Reading order: row1 col1 a brown wooden-handled steel HOE with horizontal steel blade at top, handle upright; row1 col2 a tan cloth SEED POUCH with a sprout symbol; row1 col3 a BLUE METAL WATERING CAN, spout pointing right; row2 col1 a wooden-handled steel AXE, handle upright, axe blade at top; row2 col2 a wooden-handled steel PICKAXE, handle upright, pointed steel head at top; row2 col3 a small brown gardening GLOVE palm. True crisp 16-bit farming sim pixel art, native items roughly 24x28 pixels, nearest-neighbor enlarged, no blur, no gradients, no text, no numerals, no ground shadows, no people, no UI or borders. All tools fully within their cells and no touching between neighboring items. Coherent muted warm brown, silver grey, sky blue, cream palette.”


## Independent forest resources — 2026-10-10

Built-in imagegen, input `scenes/forest.png`, output `scenes/forest-clean.png`:

Edit this pixel RPG forest background, preserving the EXACT camera, 1536x1024 composition, existing tree border, paths at top and bottom and pixel palette. Remove ALL loose rocks, boulders, fallen logs and collectible herb clusters from the WALKABLE CENTRAL MEADOW; replace them with the same plain mottled grass. Remove the big central rock, fallen log left of center, large herb plant right of center, and small loose stones on the walkable ground. Keep the bordering forest trees, small decorative flowers, and paths. ALSO create a small 60-pixel-wide dirt opening through the RIGHT tree border at y=620 pixels (60 percent height) so a player can exit right. No characters, no tools, no labels, no UI. True sharp square pixel art, no smoothing. This is a clean background where separate resource sprites will be placed at runtime.

Built-in imagegen with transparent background, `resources-source.png` packed by `scripts/prepare-mistbell-resources.mjs` into six 64px cells in `resources.png` using nearest-neighbour scaling, binary alpha and a restricted palette:

Create a transparent sprite atlas for a cozy top-down 16-bit pixel farming RPG. EXACTLY SIX separate resource objects in a regular 3-column by 2-row grid, with big transparent gutters. Read left-to-right: row 1 small grey loose stone, medium grey rock with fine natural seams, LARGE grey boulder with distinct angular faces; row 2 small fallen wood branch/log, LARGE cut tree stump with roots, leafy green medicinal herb clump. No soil tile beneath objects, only objects, no text, no labels, no UI, no characters. Top-down oblique farming game camera, crisp chunky square pixels. Muted grey and moss green rocks, warm brown wood. Native approximate 32x32 pixels per item, nearest neighbor enlarged, no blur, no gradients. Largest boulder about twice the physical footprint of small stone, but all objects contained wholly in their own equal sized cell. Transparent background including gutters.
