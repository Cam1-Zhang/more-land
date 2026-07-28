import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  AVATAR_CANVAS,
  AVATAR_SHEETS,
  DEFAULT_AVATAR_ITEM_TRANSFORMS,
  DEFAULT_AVATAR_LAYER_TRANSFORM,
  getAvatarRenderLayers,
  type AvatarHairColor,
  type AvatarItemTransformMap,
  type AvatarLayerTransform,
  type AvatarRenderLayer,
  type AvatarSpriteOption,
  type PixelAvatarConfig,
} from '../constants/avatarCreator';
import { PIXEL_ART_SPRITE } from '../theme/pixelArtImage';

const HAIR_CACHE = new Map<string, string>();

function resolveSourceUri(source: ImageSourcePropType, webPath?: string): string | null {
  const resolveAssetSource = Image.resolveAssetSource as
    | ((input: ImageSourcePropType) => { uri?: string } | undefined)
    | undefined;
  const resolved = resolveAssetSource?.(source);
  if (resolved?.uri) return resolved.uri;
  if (Platform.OS === 'web' && webPath) {
    return webPath.replace(/^\/public/, '');
  }
  return null;
}

function hexToRgb(hex: AvatarHairColor): { r: number; g: number; b: number } {
  const raw = hex.replace('#', '');
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

function recolorHairOnCanvas(
  uri: string,
  option: AvatarSpriteOption,
  color: AvatarHairColor
): Promise<string> {
  const cacheKey = `${uri}:${option.id}:${option.x}:${option.y}:${option.width}:${option.height}:${color}`;
  const cached = HAIR_CACHE.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Canvas recolor is only available on web'));
      return;
    }

    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = AVATAR_CANVAS.width;
      canvas.height = AVATAR_CANVAS.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Cannot create avatar canvas context'));
        return;
      }
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        img,
        option.x,
        option.y,
        option.width,
        option.height,
        0,
        0,
        AVATAR_CANVAS.width,
        AVATAR_CANVAS.height
      );

      const target = hexToRgb(color);
      const image = ctx.getImageData(0, 0, AVATAR_CANVAS.width, AVATAR_CANVAS.height);
      const data = image.data;
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha === 0) continue;
        const luminance = (data[i] + data[i + 1] + data[i + 2]) / (255 * 3);
        const shade = 0.48 + luminance * 0.92;
        data[i] = Math.min(255, Math.round(target.r * shade));
        data[i + 1] = Math.min(255, Math.round(target.g * shade));
        data[i + 2] = Math.min(255, Math.round(target.b * shade));
      }
      ctx.putImageData(image, 0, 0);
      const dataUri = canvas.toDataURL('image/png');
      HAIR_CACHE.set(cacheKey, dataUri);
      resolve(dataUri);
    };
    img.onerror = () => reject(new Error(`Cannot load avatar hair sheet: ${uri}`));
    img.src = uri;
  });
}

function SpriteSheetLayer({
  option,
  scale,
  transform,
  tintColor,
}: {
  option: AvatarSpriteOption;
  scale: number;
  transform: AvatarLayerTransform;
  tintColor?: string;
}) {
  const sheet = AVATAR_SHEETS[option.sheet];
  const scaleX = (AVATAR_CANVAS.width / option.width) * scale * transform.scaleX;
  const scaleY = (AVATAR_CANVAS.height / option.height) * scale * transform.scaleY;
  return (
    <View style={[styles.layerClip, { width: AVATAR_CANVAS.width * scale, height: AVATAR_CANVAS.height * scale }]}>
      <Image
        source={sheet.source}
        style={[
          PIXEL_ART_SPRITE,
          styles.sheetImage,
          {
            left: transform.x * scale - option.x * scaleX,
            top: transform.y * scale - option.y * scaleY,
            width: sheet.width * scaleX,
            height: sheet.height * scaleY,
          },
          tintColor ? { tintColor } : null,
        ]}
        resizeMode="stretch"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

function HairLayer({
  layer,
  scale,
  transform,
}: {
  layer: Extract<AvatarRenderLayer, { kind: 'hair' }>;
  scale: number;
  transform: AvatarLayerTransform;
}) {
  const sheet = AVATAR_SHEETS[layer.option.sheet];
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const sourceUri = resolveSourceUri(sheet.source, sheet.path);
    if (!sourceUri || Platform.OS !== 'web') {
      setUri(null);
      return;
    }
    recolorHairOnCanvas(sourceUri, layer.option, layer.color)
      .then((next) => {
        if (!cancelled) setUri(next);
      })
      .catch(() => {
        if (!cancelled) setUri(null);
      });
    return () => {
      cancelled = true;
    };
  }, [layer.color, layer.option, sheet.source]);

  if (!uri) {
    return (
      <SpriteSheetLayer
        option={layer.option}
        scale={scale}
        transform={transform}
        tintColor={layer.color}
      />
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[
        PIXEL_ART_SPRITE,
        styles.recoloredLayer,
        {
          width: AVATAR_CANVAS.width * scale * transform.scaleX,
          height: AVATAR_CANVAS.height * scale * transform.scaleY,
          left: transform.x * scale,
          top: transform.y * scale,
        },
      ]}
      resizeMode="stretch"
      accessibilityIgnoresInvertColors
    />
  );
}

export default function PixelAvatarSprite({
  config,
  size = 192,
  style,
  transforms = DEFAULT_AVATAR_ITEM_TRANSFORMS,
}: {
  config: PixelAvatarConfig;
  size?: number;
  style?: StyleProp<ViewStyle>;
  transforms?: AvatarItemTransformMap;
}) {
  const scale = Math.max(1, size / AVATAR_CANVAS.width);
  const width = AVATAR_CANVAS.width * scale;
  const height = AVATAR_CANVAS.height * scale;
  const layers = useMemo(() => getAvatarRenderLayers(config), [config]);

  return (
    <View style={[styles.root, { width, height }, style]} pointerEvents="none">
      {layers.map((layer) => (
        <View key={layer.kind === 'hair' ? `hair-${layer.option.id}` : layer.option.id} style={styles.layer}>
          {(() => {
            // The body is the immutable anchor for every wearable layer. Never
            // let stale per-item calibration move a skin tone off center.
            const itemTransform = layer.option.sheet === 'body' || layer.option.sheet === 'bodyFront'
              ? DEFAULT_AVATAR_LAYER_TRANSFORM
              : transforms[layer.option.id] ?? DEFAULT_AVATAR_LAYER_TRANSFORM;
            const transform = itemTransform;
            return layer.kind === 'hair' ? (
              <HairLayer layer={layer} scale={scale} transform={transform} />
            ) : (
              <SpriteSheetLayer option={layer.option} scale={scale} transform={transform} />
            );
          })()}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    backgroundColor: 'transparent',
  },
  layer: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  layerClip: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  sheetImage: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  recoloredLayer: {
    backgroundColor: 'transparent',
  },
});
