import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppLanguage } from '../i18n/appStrings';
import { gameCopy } from '../i18n/appStrings';
import type { NightSegmentId } from '../game/types';
import {
  GAME_ROOM_NIGHT_CUE_GUARD,
  GAME_ROOM_NIGHT_CUE_SEER,
  GAME_ROOM_NIGHT_CUE_WITCH,
  GAME_ROOM_NIGHT_CUE_WOLVES,
  GAME_ROOM_NIGHT_CUE_ART_ASPECT,
  GAME_ROOM_NIGHT_CUE_DIALOG_INSET,
  GAME_ROOM_NIGHT_CUE_WIDTH_MAX,
  GAME_ROOM_NIGHT_CUE_WIDTH_MIN,
  GAME_ROOM_NIGHT_CUE_WIDTH_SCREEN_RATIO,
} from '../constants/gameRoomNightRoleCueImages';
import { GAME_PIXEL_CJK_FONT_FAMILY } from '../theme/pixelFont';
import { PIXEL_ART_SPRITE } from '../theme/pixelArtImage';
import { SDV } from '../theme/stardewPixel';

export type NightRoleCueSegment = 'guard' | 'wolves' | 'seer' | 'witch';

export function nightRoleCueSegment(seg: NightSegmentId | null): NightRoleCueSegment | null {
  if (seg === 'guard' || seg === 'wolves' || seg === 'seer' || seg === 'witch') return seg;
  return null;
}

type Props = {
  /** When null, keep art decoded but hidden so the next night segment pops in instantly. */
  segment: NightRoleCueSegment | null;
  lang: AppLanguage;
  /** Mount all cue images (even while hidden) so first night is warm. */
  keepWarm?: boolean;
};

const CUE_IMAGE: Record<NightRoleCueSegment, number> = {
  guard: GAME_ROOM_NIGHT_CUE_GUARD,
  wolves: GAME_ROOM_NIGHT_CUE_WOLVES,
  seer: GAME_ROOM_NIGHT_CUE_SEER,
  witch: GAME_ROOM_NIGHT_CUE_WITCH,
};

const ALL_SEGMENTS: NightRoleCueSegment[] = ['guard', 'wolves', 'seer', 'witch'];

function cueLine(lang: AppLanguage, segment: NightRoleCueSegment): string {
  const g = gameCopy[lang];
  switch (segment) {
    case 'guard':
      return g.nightRoleCueGuard;
    case 'wolves':
      return g.nightRoleCueWolves;
    case 'witch':
      return g.nightRoleCueWitch;
    case 'seer':
      return g.nightRoleCueSeer;
  }
}

function resolveCueWidth(screenW: number): number {
  const raw = Math.round(screenW * GAME_ROOM_NIGHT_CUE_WIDTH_SCREEN_RATIO);
  return Math.min(
    GAME_ROOM_NIGHT_CUE_WIDTH_MAX,
    Math.max(GAME_ROOM_NIGHT_CUE_WIDTH_MIN, raw)
  );
}

const BOTTOM_GAP_PX = 8;

export default function GameRoomNightRoleCue({ segment, lang, keepWarm = true }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const cueWidth = useMemo(() => resolveCueWidth(screenW), [screenW]);
  const cueHeight = useMemo(
    () => Math.max(1, Math.round(cueWidth / GAME_ROOM_NIGHT_CUE_ART_ASPECT)),
    [cueWidth]
  );
  const frameStyle = useMemo(
    () => ({ width: cueWidth, height: cueHeight }),
    [cueWidth, cueHeight]
  );
  const imageStyle = useMemo(
    () => [
      PIXEL_ART_SPRITE,
      frameStyle,
      Platform.OS === 'web'
        ? ({ maxWidth: cueWidth, maxHeight: cueHeight, objectFit: 'contain' } as const)
        : null,
    ],
    [cueWidth, cueHeight, frameStyle]
  );

  const visible = segment != null;
  const segmentsToMount = keepWarm ? ALL_SEGMENTS : segment ? [segment] : [];

  if (segmentsToMount.length === 0) return null;

  return (
    <View
      style={[
        styles.host,
        { left: 0, bottom: insets.bottom + BOTTOM_GAP_PX },
        !visible ? styles.hostHidden : null,
      ]}
      pointerEvents="none"
      accessibilityElementsHidden
    >
      {segmentsToMount.map((seg) => {
        const active = seg === segment;
        return (
          <View
            key={seg}
            style={[styles.artFrame, frameStyle, !active ? styles.artHidden : null]}
          >
            <Image
              source={CUE_IMAGE[seg]}
              style={imageStyle}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
            {active ? (
              <View style={[styles.dialogBox, GAME_ROOM_NIGHT_CUE_DIALOG_INSET]}>
                <Text style={styles.dialogText} numberOfLines={3}>
                  {cueLine(lang, seg)}
                </Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    zIndex: 12000,
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
  },
  hostHidden: {
    opacity: 0,
  },
  artFrame: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  artHidden: {
    position: 'absolute',
    left: 0,
    top: 0,
    opacity: 0,
  },
  dialogBox: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  dialogText: {
    fontFamily: GAME_PIXEL_CJK_FONT_FAMILY,
    fontSize: 25,
    lineHeight: 34,
    letterSpacing: 0,
    color: SDV.ink,
    textAlign: 'center',
    allowFontScaling: false,
    marginTop: 6,
  },
});
