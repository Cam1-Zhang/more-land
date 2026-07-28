/**
 * 星露谷式像素 UI：暖色羊皮纸 + 木框描边 + 深棕字迹（与 Press Start 2P 像素字搭配）。
 * 数值偏「整数像素」感：描边 3、圆角 6–10。
 */
export const SDV = {
  /** 全屏底：略深的羊皮纸 */
  paper: '#e8d4a8',
  /** 卡片 / 弹层 / 头像衬底 */
  panel: '#f8efd2',
  /** 再亮一档的块面 */
  panelLight: '#fff9e8',
  /** 木框、主描边 */
  wood: '#5c3d24',
  woodMid: '#7a5230',
  /** 正文、图标线色 */
  ink: '#3d2914',
  inkMuted: '#6b5344',
  /** 次要说明 */
  subtext: '#5c4a38',
  /** 选中 / 高亮（蜂蜜色） */
  honey: '#ffc66d',
  honeyFill: '#ffe8b8',
  /** 夜间条等深色区（仍带暖棕底） */
  nightBar: '#4a3528',
  nightInk: '#f5e6c8',
  /** 成功绿（公告、勾） */
  leaf: '#4a7c3a',
} as const;

export const pixelChrome = {
  borderWidth: 3 as const,
  borderColor: SDV.wood,
  borderRadius: 8 as const,
};

export const pixelChromeTight = {
  borderWidth: 3 as const,
  borderColor: SDV.wood,
  borderRadius: 6 as const,
};
