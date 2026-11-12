# Mistbell Valley · 首年可玩版本

入口：首页 → 探索。既有原野和 48 人自由走路保留在「原野自由散步」，对局木屋保留原入口。

## 家庭与家具（2026-10-13）

- 48 人分配到 24 户：16 户家庭、8 户独居，名单见 [家庭与住所](家庭与住所.md)。32 条亲属关系属于本次新增设定；28 组社交联系、6 位可攻略角色保留。
- 家庭共用厨房和起居室，成年亲属有自己的卧室，夫妻共用主卧；逐户设计 24 张独立平面图，墙体、家具坐标及房间布局均按户设置。Ghost 没有床和厨房。
- 床仅查看，不能在任何居民家借宿；睡眠与过夜仅在玩家农舍。
- 家具按图设置碰撞和点击区域，先走近再互动。椅子显示既有坐姿，移动时起身；休息 10 分钟，每日前 3 次各恢复 8 体力。厨房消耗自己 1 份蔬菜制作热汤，每户每天一次，恢复 20 体力。桌子、书架、相册可阅读并记入手记；衣柜、壁炉可查看。
- 新增 12 段家庭日常，连同原 4 段邻里片段，共 16 段。未公开的旧事仍由原剧情门槛控制。
- 旧宿舍地址自动迁回对应街区，保留日期、物品、关系与故事进度。

## 当前玩法

- 一张完整像素山谷地图和一张地下水渠地图，共 47 个可进入场景（17 户外、6 公共室内、24 户住宅）。总地图与实际场景共用图片；走到边界自动进入相邻场景。
- 14 章、41 个事件、16 条线索。开场邀请 → 邻里生活 → 倒影异常 → 两声钟 → 守谷会旧事 → 水利调查 → 没有幕后坏人 → 不可能的木门 → Ghost 的记忆 → 六支修复小队 → 庆典 → “欢迎回来”。
- Ghost 从一开始就是公开的幽灵居民；不替他编造生前名字，不把陌生存在确定为敌人，保留故事的不确定性。
- 地图居民复用既有行走图，沿所在地点小范围走动；每天轮换部分户外居民，其他居民仍可在当地列表里交谈。Ghost 有自己的铃影小屋，白天常在桥边，同行伙伴不重复显示。
- 农舍、石桥和酒馆可歇脚等到 19:00；只推进当天时间，不跳日期、不让作物提前成熟。地图区分白天、黄昏、夜晚和雨天；夜间剧情使用临时场景光线，关闭阅读后回到当前游戏时间。
- 6 块田：播种、浇水、两次有水的过夜后成熟、收获。雨天自动满足水分；未浇水不长大，也不枯萎。田地可以在地图直接点击，使用生成素材显示幼苗、长叶、成熟三阶段，收获后清空。
- 木材／石料／草药有不同大小与耐久，采完消失，过夜按可用位置重新生成；体力、面包、免费睡眠；钓鱼浮标小游戏及慢速模式。
- 种子和面包购买、收获出售、每日公告栏委托。
- 48 位居民各有日常对白，傍晚回家或按朋友关系聚会。每日问候、每日送礼、好感、同行伙伴选择。
- 手记中查看目标、已获得的线索和已完成的事件。对话读完才写入进度，中途关闭可以重新读。
- 四季日历，每季 28 天；剧情有日期门槛。农舍可选择度过平静的日子到下一章日期，不必重复睡几十次。
- 三闸谜题与补给消耗：北渠→农田、中渠→泄洪、旧渠→保留。错误配置不会吞掉材料。
- 年末结束后，生活循环继续；第二年的新主线尚未编写。
- 玩家形象读取现有个人设置；同行伙伴复用现有像素行走图，人物原图没有重画。
- 主线对白为写好的故事内容，不依赖在线模型或付费语音调用。

## 保存

AsyncStorage 独立键 `mistbell_valley_save_v1`。每次有效操作排队保存；刷新恢复日期、物品、田地、线索、好感和地点。存档读取失败显示重试，不自动覆盖损坏或更高版本的存档。当前为本机单存档，无云同步。

## 文件

- `src/screens/MistbellScreen.tsx`：主界面、对话、农场、钓鱼、手记、背包、居民。
- `src/components/MistbellMap.tsx`：地图与旅行动画。
- `src/components/MistbellWorldLayer.tsx`：户外居民和作物图层。
- `src/game/mistbell/worldScene.ts`：居民展示位置、步态和剧情光线。
- `src/game/mistbell/story.ts`：剧情、线索、地点、居民日常对白。
- `src/game/mistbell/engine.ts`：纯游戏规则和存档校验。
- `src/game/mistbell/routes.ts`：道路路线。
- `src/game/mistbell/useValleySave.ts`：串行自动保存。
- `src/screens/ExplorationScreen.tsx`：保留的原野自由散步。
- 原始故事全文保存在 `docs/mistbell/story-source.txt`。

## 验证

`node scripts/test-mistbell.mjs`：以 161 次正常游戏操作完成首年，覆盖所有 14 章／41 事件／16 线索，以及作物、雨天、鱼、经济、每日上限、地点门槛、错误答案不扣材料、48 人资料、地图联通与每一步存读档往返。
`node scripts/test-exploration.mjs`：48 位角色／768 帧原有动画检查通过。

浏览器已实际验证：开场阅读、线索与事件解锁、Ghost 的回答选择和好感、播种浇水过夜收获、沿道路旅行、刷新恢复和钓鱼失败结算。390×844 窄屏布局检查通过；原野显示 48 位伙伴，可返回主线且进度保留。当前浏览器未记录新运行错误，存在项目原有 Expo AV／样式弃用警告。工程整体 TypeScript 仍有探索模块以外的旧错误；本次新模块单独筛查无错误。

## 美术

使用内置 imagegen 生成场景，没有使用 CLI/API fallback。首张偏插画的草稿已弃用。当前场景通过 `src/game/mistbell/sceneArt.ts` 引用 `assets/mistbell/scenes/`。新住宅与户型使用内置 imagegen，提示词见 `family-art-prompts.json`、`family-art-repairs.json`。旧地图素材保留，主界面总地图使用实际场景拼接。

人物继续复用既有图集。地图上的标签、旅行路线、夜色叠层属于交互界面，不是新画的人物像素。

最终生成提示词记录见 [art-prompts.md](art-prompts.md)。

作物新增 `assets/mistbell/crops.png`（72×24，三个 24×24 帧）。原始生成图保留在 `crops-source.png`；`scripts/prepare-mistbell-crops.mjs` 只裁切、等比例最近邻缩放和打包，不手绘作物或人物。场景自动测试新增居民作息、Ghost 可见性、同行不重复、走动范围、剧情光线和当天等待的存档往返。

本轮浏览器验证使用独立测试站点存档：地图 Ghost 对话使好感 8→11；等到 19:00 保持春 3 日；地图播种、浇水、两次过夜后出现成熟／长叶／幼苗三个阶段；刷新保留春 5 日和田地状态。雨天地图与侧栏的水分提示保持一致。测试未推进 localhost 的玩家主线存档。

## Local playable scenes (2026-10-09)

Exploration now opens the local room instead of the overview map. Eleven generated pixel scenes live in `assets/mistbell/scenes`. The map is a travel overlay; chapter gates remain intact. The farm, square, riverbank, tavern, forest, keeper's cabin, observatory and four canal locations each have their own physical interaction targets. Residents follow existing day/evening schedules; investigation hosts remain available underground. The selected companion follows the player's trail.

Controls: WASD/arrows or touch direction pad; click/tap ground to walk; click a resident/object to approach it along a collision-aware path. E/Space interacts within 54 world pixels. Keys 1–6 select hand, hoe, seed, water, axe and pick. Nearby work targets take priority over the following companion when using tools. Collision is based on feet; furniture and scene edges block movement.

Farm workflow: hoe a grass plot, sow a seed, water it, sleep through two watered/rainy nights, then harvest with the hand. Old planted saves remain valid. Wood requires the axe, stone the pick, herbs the hand. Tools have a windup, a delayed impact that commits the action once, and recovery; movement is locked during the action. Invalid work does not spend stamina. Opening a modal cancels an uncommitted swing. Water has a tilted can, droplets and ripples; solid tools produce debris. Six personal avatar presets now use individual 4-direction/4-frame walk sheets with the same 40×48 cell and feet baseline as residents.

HUD: small date/time/energy/coins card, four map/journal/bag/menu icons, compact bottom tool belt. Instructions and residents directory are in the menu. Messages fade after five seconds; names show nearby. Camera follows the player on narrow or cropped views. Shop, rest, fishing, requests, valves and story investigation are opened by approaching their scene objects. Dialogues retain each resident's existing unique greeting, add place guidance and story-related conversation choices. They are authored dialogue, not an online AI conversation service.

Verification:
- `node scripts/test-mistbell.mjs`: 155 actions through all 14 chapters/41 events, 16 clues, economy, legacy saves.
- `node scripts/test-mistbell-scenes.mjs`: all 188 scene targets across daytime/night reachable, collision/proximity, correct tool order and full crop lifecycle, single-impact tool timing.
- Project-wide TypeScript still reports existing unrelated errors; no Mistbell errors.

### Browser verification — 2026-10-10

Verified in the local Expo web app on an isolated `127.0.0.1` save: hoe/seed/water, two watered nights, harvest into inventory; axe gives 2 wood per impact, pick gives 2 stone, each costs 8 energy once. After reload, day 3, energy 74, wood 4, stone 2, vegetable 1 and seed 5 remained. Verified Momo dialogue, farm rest and map travel, 390×844 touch layout, compact desktop HUD, and revised watering-can grip. Browser error log was empty. Current scene screenshot: `screenshots/local-farm-tools.png`.

TypeScript needs `node --stack-size=8192 node_modules/typescript/bin/tsc --noEmit` in this repository because the default compiler stack overflows. With that setting it reports existing unrelated project errors, with no errors in the Mistbell components or game modules. Sprite regression also passed: 48 resident sheets / 768 walking frames.


## Living scenes and resources — 2026-10-11

This supersedes the older map-teleport, dialogue-menu and fixed gathering behaviour above.

- Conversation opens a bottom dialogue box, one authored line at a time. Click/E/Space advances; the final line completes a story event once. Close early to leave an event incomplete. Ordinary residents retain their original greetings.
- Eleven scenes connect through 20 paired road exits. Walking into a road trigger switches to its neighbour and places the player beyond the opposite trigger, avoiding immediate bounce. Map/quest destinations guide movement toward the next connecting road. Existing story locks still apply.
- 48 residents each have one scheduled location, with four periods during the day and story-event overrides. Work/social groups include Toby helping Momo deliver bread, Daisy/Lily by the river, and the old keepers investigating together. Some residents stand still; others walk a short collision-aware route, pause, and return. Scene time advances five minutes per fifteen active seconds and pauses in panels/dialogues and when the app is hidden. These are authored schedules, not generative AI behaviour.
- Forest resources are separate sprites over a clean background. Nine independent nodes: small/medium/large stone, fallen logs, a large stump and herbs. Small/medium/large hard resources need 1/2/4 impacts and yield 1/3/6 materials; herbs need one hand action. Each valid impact costs 2 stamina and 5 game minutes; wrong tools/depleted nodes spend nothing. Cracks and the nearby durability bar show progress. Rewards arrive only on the final impact.
- Depleted objects disappear and stop blocking movement. Partial damage and empty sites survive save/reload and travel. Each depleted node returns after 1–3 nights, at a different free location; untouched objects stay in place. The central path and gates stay clear. Legacy saves initialise the resource field lazily without losing progress.
- Generated assets: `scenes/forest-clean.png`, `resources-source.png`, `resources.png`; provenance in `local-art-manifest.json` and prompts in `art-prompts.md`.

Automated validation: story 161 actions (including the new multi-hit resources) / 14 chapters / 41 events / 16 clues; 200 reachable local targets and tool timing; 20 road crossings / 110 connections; 2,016 resource placements with collision, partial save, delayed respawn and one-time yields; 768 resident poses and schedule/story overrides. Existing 48 character sheets / 768 walk frames passed unchanged. No Mistbell diagnostics in the expanded-stack TypeScript check; unrelated existing project errors remain.


Browser verification — 2026-10-11 (isolated 127.0.0.1 save):
- Click advances Toby dialogue by exactly one line; Space advances the next line; final click closes. Checked the bottom dialogue at 390×844, and game simulation pauses while it is open.
- Held Down to walk through the farm exit into the square without E or a destination modal. Walked square→forest→square→farm→square→forest. Arrival stayed in the destination instead of bouncing. Fixed road signs wrapping, bottom signs hidden under the tool belt, and residents covering road-sign hit targets.
- Large rock: 4→3 durability and stamina 70→68; refreshed and retained 3 hits remaining. Continued to 2→1→gone; total stamina 62, stone inventory 2→8. No material reward before depletion. Screenshots: `screenshots/forest-rock-cracked.png`, `screenshots/forest-rock-collected.png`.
- Slept three nights (spring 3→6), returned along the roads, and found the same resource ID fully restored at a different free position; screenshot `screenshots/forest-respawned.png`. Other unharvested resource sites stayed unchanged.
- Mobile road sign and dialogue visible without clipping; `screenshots/mobile-dialogue.png`. Browser error log empty. Temporary viewport override reset. Tests used the independent test origin, not the player's ::1 save.
