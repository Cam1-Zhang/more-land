# 场景风格基准

2026-10-13 用户指出后续场景越来越偏离庭院图。所有新图和重绘必须附带 `assets/mistbell/nordic-approved-reference.png`，不能只凭文字描述生成。

- 保持参考图的像素颗粒、杉树轮廓、屋顶瓦片、花朵符号、饱和草绿色和俯视角。
- 景物可以变化，细节密度不能逐张提高。避免写实植物、细碎抖色、插画光影。
- 无需把道路画成贯穿画面的条带；草地和花园可以通行，但需与场景出口及碰撞区域对应。
- 参考截图的圆角、白边和水印不属于场景素材，不得复制。
- 果园 `farmRoad-nordic.png` 与村口花园 `marketRoad-nordic.png` 已按基准重做，使用内置 imagegen。准确提示词在 `style-lock-prompts.json`。
- 17 张户外场景已共用 `sceneArt.ts` 接入探索与总地图；总地图按 `WORLD_TILES` 的实际相邻关系排列同一批素材。家庭改版另含 6 类室内和 5 张住宅外景，准确提示词在 `family-art-prompts.json`、`family-art-repairs.json`。
- 首轮户外提示词在 `nordic-art-prompts.json`；必须遵循每项的 styleReference，布局图只用于位置，不用于覆盖画风。
