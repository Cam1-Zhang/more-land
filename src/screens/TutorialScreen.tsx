import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Platform, type ViewStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { tutorialUi } from '../i18n/tutorialSteps';
import { APP_LANGUAGE_KEY, homeCopy, type AppLanguage } from '../i18n/appStrings';
import { exitToHome } from '../utils/navExit';
import { readHomeBgMode, type HomeBgMode } from '../utils/homeBgMode';
import type { GameBoard } from '../types/game';
import TutorialBoardGuide from '../components/TutorialBoardGuide';
import TutorialPickBoardScene from '../components/TutorialPickBoardScene';
import { getTutorialGuideStepCount } from '../i18n/tutorialGuide';
import HubSceneBottomRightWidthFill from '../components/HubSceneBottomRightWidthFill';
import {
  TUTORIAL_GUIDE_ROOM_DAY_BG,
  TUTORIAL_GUIDE_ROOM_DAY_SIZE,
  TUTORIAL_GUIDE_ROOM_NIGHT_BG,
  TUTORIAL_GUIDE_ROOM_NIGHT_SIZE,
} from '../constants/hubSceneImages';
import { GUIDE_ROOM_SHIFT_DOWN } from '../constants/tutorialGuideLayout';

type Phase = 'pickBoard' | 'guide';

export default function TutorialScreen({ navigation }: any) {
  const [phase, setPhase] = useState<Phase>('pickBoard');
  const [board, setBoard] = useState<GameBoard>('Standard12');
  const [currentStep, setCurrentStep] = useState(0);
  const [lang, setLang] = useState<AppLanguage>('zh');
  const [homeBgMode, setHomeBgMode] = useState<HomeBgMode>('day');
  const allowTutorialExitRef = useRef(false);
  const skipTutorialExitGuardRef = useRef(false);

  const refreshLang = useCallback(() => {
    AsyncStorage.getItem(APP_LANGUAGE_KEY).then((v) => {
      if (v === 'zh' || v === 'en') setLang(v);
      else setLang('zh');
    });
  }, []);

  const refreshHomeBgMode = useCallback(() => {
    void readHomeBgMode().then(setHomeBgMode);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshLang();
      refreshHomeBgMode();
    }, [refreshLang, refreshHomeBgMode])
  );

  useEffect(() => {
    if (phase === 'guide') refreshHomeBgMode();
  }, [phase, refreshHomeBgMode]);

  const leaveTutorialToHome = useCallback(() => {
    allowTutorialExitRef.current = true;
    exitToHome(navigation);
  }, [navigation]);

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e: { preventDefault: () => void }) => {
      if (allowTutorialExitRef.current) {
        allowTutorialExitRef.current = false;
        return;
      }
      if (skipTutorialExitGuardRef.current) {
        skipTutorialExitGuardRef.current = false;
        return;
      }
      e.preventDefault();
      leaveTutorialToHome();
    });
    return unsub;
  }, [navigation, leaveTutorialToHome]);

  const ui = tutorialUi[lang];
  const homeUi = homeCopy[lang];
  const guideStepCount = getTutorialGuideStepCount(board);

  useEffect(() => {
    if (phase !== 'guide') return;
    setCurrentStep((s) => Math.min(Math.max(0, s), guideStepCount - 1));
  }, [phase, board, guideStepCount]);

  const chooseBoard = (b: GameBoard) => {
    setBoard(b);
    setCurrentStep(0);
    setPhase('guide');
  };

  const confirmLeaveTutorialFromPickBoard = () => {
    leaveTutorialToHome();
  };

  const goTutorialCharacterSelect = useCallback(() => {
    skipTutorialExitGuardRef.current = true;
    navigation.reset({
      index: 1,
      routes: [
        { name: 'Home' },
        {
          name: 'CharacterSelect',
          params: {
            presetBoard: board,
            lockBoard: true,
            lockToNoviceDifficulty: true,
            fromTutorial: true,
          },
        },
      ],
    });
  }, [board, navigation]);

  const guideStepIndex =
    phase === 'guide' ? Math.min(Math.max(0, currentStep), guideStepCount - 1) : 0;

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

  if (phase === 'guide') {
    const guideBgSource =
      homeBgMode === 'day' ? TUTORIAL_GUIDE_ROOM_DAY_BG : TUTORIAL_GUIDE_ROOM_NIGHT_BG;
    const guideBgSize =
      homeBgMode === 'day' ? TUTORIAL_GUIDE_ROOM_DAY_SIZE : TUTORIAL_GUIDE_ROOM_NIGHT_SIZE;
    const guideLetterbox = homeBgMode === 'day' ? '#2c241c' : '#120e0c';

    return (
      <View style={[styles.guideBgRoot, screenFillStyle, { backgroundColor: guideLetterbox }]}>
        <HubSceneBottomRightWidthFill
          source={guideBgSource}
          nativeWidth={guideBgSize.width}
          nativeHeight={guideBgSize.height}
          letterboxColor={guideLetterbox}
          shiftDown={GUIDE_ROOM_SHIFT_DOWN}
          style={StyleSheet.absoluteFillObject}
        />
        <TutorialBoardGuide
          board={board}
          lang={lang}
          stepIndex={guideStepIndex}
          onStepIndexChange={setCurrentStep}
          onBack={() => setPhase('pickBoard')}
          onStartNow={goTutorialCharacterSelect}
          onOpenSettings={() => navigation.navigate('Settings')}
          settingsA11y={homeUi.settingsTitle}
        />
      </View>
    );
  }

  const openTutorialLabel = (title: string) =>
    lang === 'zh' ? `打开教程：${title}` : `Open tutorial: ${title}`;

  return (
    <TutorialPickBoardScene
      lang={lang}
      bannerLine={ui.pickBannerLine}
      onBack={confirmLeaveTutorialFromPickBoard}
      onPickBoard={chooseBoard}
      backLabel={homeUi.settingsBack}
      standardLabel={openTutorialLabel(ui.pickStandardTitle)}
      beautyLabel={openTutorialLabel(ui.pickBeautyTitle)}
      onOpenSettings={() => navigation.navigate('Settings')}
      settingsA11y={homeUi.settingsTitle}
    />
  );
}

const styles = StyleSheet.create({
  guideBgRoot: {
    flex: 1,
  },
});
