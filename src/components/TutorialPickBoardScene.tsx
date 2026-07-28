import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Platform,
  type ViewStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import type { GameBoard } from '../types/game';
import type { AppLanguage } from '../i18n/appStrings';
import {
  TUTORIAL_PICK_BOOKS_DAY_BG,
  TUTORIAL_PICK_BOOKS_NIGHT_BG,
  TUTORIAL_PICK_BOOKS_SIZE,
} from '../constants/hubSceneImages';
import { readHomeBgMode, type HomeBgMode } from '../utils/homeBgMode';
import HubSettingsIconButton from './HubSettingsIconButton';
import { GameWoodButton } from './GameWoodButton';
import { GAME_WOOD_BTN } from '../theme/gameButton';
import HubSceneBottomRightWidthFill from './HubSceneBottomRightWidthFill';
import TutorialPickBanner from './TutorialPickBanner';
import { useHubSceneLayoutScale } from '../hooks/useHubSceneLayoutScale';

type Props = {
  lang: AppLanguage;
  bannerLine: string;
  onBack: () => void;
  onPickBoard: (board: GameBoard) => void;
  backLabel: string;
  standardLabel: string;
  beautyLabel: string;
  onOpenSettings: () => void;
  settingsA11y: string;
};

/** 叠在左右两本书底部「打开教程」按钮上（相对 1024×576） */
const OPEN_BTN_HIT = {
  standard: { left: '32%', top: '62%', width: '14%', height: '9%' },
  wolfBeauty: { left: '55%', top: '62%', width: '14%', height: '9%' },
} as const;

/** 与讲解页顶栏一致 */
const TUTORIAL_HEADER_EDGE_PAD = 8;
/** 昼夜背景与两本教程热区整体下移 */
const PICK_BOARD_SHIFT_DOWN = 10;
/** 顶栏「选择你想学习的内容…」提示文案下移 */
const PICK_BANNER_SHIFT_DOWN = 40;

export default function TutorialPickBoardScene({
  lang,
  bannerLine,
  onBack,
  onPickBoard,
  backLabel,
  standardLabel,
  beautyLabel,
  onOpenSettings,
  settingsA11y,
}: Props) {
  const [homeBgMode, setHomeBgMode] = useState<HomeBgMode>('day');
  const layout = useHubSceneLayoutScale(TUTORIAL_PICK_BOOKS_SIZE.width);
  const screenFillStyle = useMemo((): ViewStyle => {
    if (Platform.OS === 'web') {
      return {
        flex: 1,
        width: '100%',
        minHeight: '100vh' as unknown as number,
        height: '100vh' as unknown as number,
      };
    }
    return { flex: 1, width: '100%' };
  }, []);

  useFocusEffect(
    useCallback(() => {
      void readHomeBgMode().then(setHomeBgMode);
    }, [])
  );

  const bgSource =
    homeBgMode === 'day' ? TUTORIAL_PICK_BOOKS_DAY_BG : TUTORIAL_PICK_BOOKS_NIGHT_BG;
  const letterboxColor = homeBgMode === 'day' ? '#2c241c' : '#120e0c';

  return (
    <View style={[styles.root, screenFillStyle, { backgroundColor: letterboxColor }]}>
      <HubSceneBottomRightWidthFill
        source={bgSource}
        nativeWidth={TUTORIAL_PICK_BOOKS_SIZE.width}
        nativeHeight={TUTORIAL_PICK_BOOKS_SIZE.height}
        letterboxColor={letterboxColor}
        shiftDown={PICK_BOARD_SHIFT_DOWN}
        style={styles.frameFill}
      >
        <Pressable
          style={[styles.hitZone, OPEN_BTN_HIT.standard]}
          onPress={() => onPickBoard('Standard12')}
          accessibilityRole="button"
          accessibilityLabel={standardLabel}
        />
        <Pressable
          style={[styles.hitZone, OPEN_BTN_HIT.wolfBeauty]}
          onPress={() => onPickBoard('WolfBeauty')}
          accessibilityRole="button"
          accessibilityLabel={beautyLabel}
        />
      </HubSceneBottomRightWidthFill>

      <SafeAreaView style={styles.chromeOverlay} pointerEvents="box-none">
        <View
          style={[
            styles.headerTop,
            {
              paddingHorizontal: layout.roundPx(TUTORIAL_HEADER_EDGE_PAD),
              paddingTop: layout.roundPx(10),
            },
          ]}
        >
          <GameWoodButton variant="icon" onPress={onBack} accessibilityLabel={backLabel}>
            <ChevronLeft color={GAME_WOOD_BTN.text} size={22} strokeWidth={2.5} />
          </GameWoodButton>
          <View
            style={[styles.headerTitleOverlay, { paddingHorizontal: layout.roundPx(56) }]}
            pointerEvents="none"
          >
            <View style={{ transform: [{ translateY: layout.roundPx(PICK_BANNER_SHIFT_DOWN) }] }}>
              <TutorialPickBanner lang={lang} text={bannerLine} />
            </View>
          </View>
          <HubSettingsIconButton onPress={onOpenSettings} accessibilityLabel={settingsA11y} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  frameFill: {
    flex: 1,
    width: '100%',
  },
  chromeOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  headerTop: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    minHeight: 44,
    zIndex: 10,
  },
  headerTitleOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hitZone: {
    position: 'absolute',
  },
});
