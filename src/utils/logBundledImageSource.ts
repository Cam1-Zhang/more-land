import { Image, type ImageSourcePropType } from 'react-native';

/**
 * Dev-only：解析 `require()` / `{ uri }` 在运行时的实际加载地址与内建尺寸，用于核对是否命中预期资源。
 */
export function formatBundledImageSourceForLog(
  tag: string,
  source: ImageSourcePropType
): string {
  try {
    if (typeof source === 'number') {
      const r = Image.resolveAssetSource(source);
      return `[bundled-image:${tag}] static id=${source} uri=${r?.uri ?? '(null)'} size=${r?.width ?? '?'}×${r?.height ?? '?'} scale=${r?.scale ?? '?'}`;
    }
    const u = (source as { uri?: string })?.uri;
    return `[bundled-image:${tag}] object uri=${u ?? '(no uri)'}`;
  } catch (e) {
    return `[bundled-image:${tag}] resolve failed: ${String(e)}`;
  }
}
