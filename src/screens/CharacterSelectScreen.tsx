import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  useWindowDimensions,
  Platform,
  type ViewStyle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CHARACTERS } from '../data/mockData';
import { DifficultyType, type AICharacter } from '../types';
import type { GameBoard } from '../types/game';
import { aiOpponentCountForBoard, parseGameBoard } from '../constants/boardSetup';
import { ChevronLeft, Shuffle, Users, Star, Lightbulb } from 'lucide-react-native';
import { APP_LANGUAGE_KEY, createRoomCopy, type AppLanguage } from '../i18n/appStrings';
import { readHomeHubScene, type HomeHubScene } from '../utils/homeBgMode';
import HubDayNightBackground from '../components/HubDayNightBackground';
import {
  characterSelectCopy,
  characterSelectBoardLabel,
  difficultyTabLabel,
} from '../i18n/characterSelectStrings';
import { getCharacterPickerPortraitById } from '../constants/characterBodyImages';
import { getCharacterGalleryDetailImageById } from '../constants/characterGallerySceneImages';
import { SDV, pixelChrome } from '../theme/stardewPixel';
import { PIXEL_ART_BACKGROUND_IMAGE } from '../theme/pixelArtImage';
import BodyPortraitImage from '../components/BodyPortraitImage';
import { GameWoodButton } from '../components/GameWoodButton';
import {
  GAME_WOOD_BTN,
  PICKER_GLASS_PANEL_BG,
  gameButtonStyles,
  pickerCharacterCardBorder,
} from '../theme/gameButton';
import {
  characterConstellationForUi,
  characterDescriptionForUi,
  characterGallerySpecialtyWord,
  characterPersonalityForUi,
} from '../utils/characterDisplayCopy';
import { HUB_CHROME_BTN, HUB_CHROME_GAP } from '../utils/homeTopChromeLayout';
import { preloadGameEntryScreens } from '../navigation/lazyScreen';
import HubSettingsIconButton from '../components/HubSettingsIconButton';
import { homeCopy } from '../i18n/appStrings';
/** 左侧木牌菜单：本局设置卡宽度（星露谷式窄栏） */
function computePickerSidebarWidth(rowBasis: number): number {
  return Math.min(286, Math.max(156, Math.floor(rowBasis * 0.382)));
}

/**
 * 单人选人区固定栅格：一行 4 张、共 3 行（12 槽）。
 * 宽度计算与 `CHARACTERS` 每难度条数均依赖此布局，请勿改列数/行数。
 */
const PICKER_GRID_COLS = 4;
const PICKER_GRID_ROWS = 3;
const PICKER_GRID_SLOT_COUNT = PICKER_GRID_COLS * PICKER_GRID_ROWS;

/** 图鉴难度条：全部 + 新手 / 简单 / 中等 / 困难 */
const GALLERY_FILTER_DIFFICULTIES: DifficultyType[] = ['Novice', 'Easy', 'Medium', 'Hard'];

/** 与 `sidebarPlankWrap` marginLeft + marginRight 一致（侧栏占宽含外边距） */
const PICKER_SIDEBAR_MARGIN_H = 10 + 10;
/** 与 `mainPaneGrid` marginRight 一致（0 = 选人卡区贴主行最右） */
const PICKER_MAIN_PANE_MARGIN_RIGHT = 0;

/** 与 `listContentPicker.paddingTop` 一致：选人 Scroll 内容区顶留白 */
const PICKER_LIST_CONTENT_PADDING_TOP = 16;
/** 与选人 `pickerGridShell` 的 `marginTop` 一致：卡列整体下移 */
const PICKER_GRID_SHELL_MARGIN_TOP = 12;

export default function CharacterSelectScreen({ navigation, route }: any) {
  const presetBoard = route.params?.presetBoard as GameBoard | undefined;
  const lockBoard = route.params?.lockBoard === true;
  const lockToNoviceDifficulty = route.params?.lockToNoviceDifficulty === true;
  const lockedDifficulty = route.params?.lockedDifficulty as DifficultyType | undefined;
  const lockBoardWithPreset = route.params?.lockBoardWithPreset as GameBoard | undefined;
  const fromCreateRoom = route.params?.fromCreateRoom === true;
  const createRoomCode = route.params?.createRoomCode as string | undefined;
  const fromTutorial = route.params?.fromTutorial === true;
  const galleryOnly = route.params?.galleryOnly === true;
  const joinRoomCode = route.params?.joinRoomCode as string | undefined;
  const fromJoinRoom = route.params?.fromJoinRoom === true;

  const [lang, setLang] = useState<AppLanguage>('zh');
  const [selectedDiff, setSelectedDiff] = useState<DifficultyType>('Novice');
  const [selectedAI, setSelectedAI] = useState<string[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<GameBoard>('Standard12');
  const [galleryDetail, setGalleryDetail] = useState<AICharacter | null>(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  /** 主内容行实际宽度（onLayout），网页与原生共用，避免用 windowWidth 算半屏与 flex 真实宽度不一致 */
  const [mainRowInnerWidth, setMainRowInnerWidth] = useState(0);
  /** 主内容行高度，用于「本局设置」侧栏卡 maxHeight（主行高的比例） */
  const [mainRowInnerHeight, setMainRowInnerHeight] = useState(0);
  /** 与主页昼夜 + 开灯一致（四版 Hub 场景底图） */
  const [homeHubScene, setHomeHubScene] = useState<HomeHubScene>({ mode: 'day', lights: 'off' });
  /** 图鉴：「全部」与分难度筛选 */
  const [galleryShowAllDifficulties, setGalleryShowAllDifficulties] = useState(true);

  const refreshLang = useCallback(() => {
    AsyncStorage.getItem(APP_LANGUAGE_KEY).then((v) => {
      if (v === 'zh' || v === 'en') setLang(v);
      else setLang('zh');
    });
  }, []);

  const closeGalleryDetail = useCallback(() => {
    setGalleryDetail(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshLang();
      void readHomeHubScene().then(setHomeHubScene);
    }, [refreshLang])
  );

  const difficulties: DifficultyType[] = ['Novice', 'Easy', 'Medium', 'Hard'];
  const effectiveDiff: DifficultyType = lockToNoviceDifficulty
    ? 'Novice'
    : lockedDifficulty ?? selectedDiff;

  const currentPool = CHARACTERS.filter((char) => char.difficulty === effectiveDiff);

  const galleryFilteredPool = useMemo(() => {
    if (!galleryOnly) return [] as AICharacter[];
    if (galleryShowAllDifficulties) return CHARACTERS;
    return CHARACTERS.filter((c) => c.difficulty === selectedDiff);
  }, [galleryOnly, galleryShowAllDifficulties, selectedDiff]);

  const galleryRows = useMemo(() => {
    if (!galleryOnly) return [] as AICharacter[][];
    const pool = galleryFilteredPool;
    const rows: AICharacter[][] = [];
    for (let i = 0; i < pool.length; i += PICKER_GRID_COLS) {
      rows.push(pool.slice(i, i + PICKER_GRID_COLS));
    }
    return rows;
  }, [galleryOnly, galleryFilteredPool]);

  useEffect(() => {
    if (__DEV__ && !galleryOnly && currentPool.length !== PICKER_GRID_SLOT_COUNT) {
      console.warn(
        `[CharacterSelect] 当前难度角色数为 ${currentPool.length}，与固定 ${PICKER_GRID_COLS}×${PICKER_GRID_ROWS}=${PICKER_GRID_SLOT_COUNT} 栅格不一致。`
      );
    }
  }, [galleryOnly, currentPool.length]);
  const showDifficultyTabs = !lockToNoviceDifficulty && lockedDifficulty === undefined;
  const showBoardSection =
    !galleryOnly && !lockBoard && lockBoardWithPreset === undefined;

  const t = characterSelectCopy[lang];

  const requestedBoard: GameBoard =
    lockBoard && presetBoard
      ? parseGameBoard(presetBoard)
      : lockBoardWithPreset
        ? parseGameBoard(lockBoardWithPreset)
        : selectedBoard;
  // Tutorials teach werewolf boards only, even if stale navigation state contains Avalon.
  const effectiveBoard: GameBoard =
    fromTutorial && requestedBoard === 'Avalon10' ? 'Standard12' : requestedBoard;

  const aiPickMax = aiOpponentCountForBoard(effectiveBoard);

  useEffect(() => {
    setSelectedAI((prev) => (prev.length > aiPickMax ? prev.slice(0, aiPickMax) : prev));
  }, [aiPickMax]);

  // Warm GameRoom / Avalon JS + role-card / night-cue / sticker art for the selected board.
  useEffect(() => {
    void import('../fonts/ensureZpixLoaded').then(({ ensureZpixLoaded }) => {
      void ensureZpixLoaded();
    });
    preloadGameEntryScreens();
    void import('../utils/preloadGameEntryAssets').then(({ preloadGameEntryAssets }) => {
      preloadGameEntryAssets(effectiveBoard);
    });
  }, [effectiveBoard]);

  const toggleSelect = (id: string) => {
    if (galleryOnly) return;
    if (selectedAI.includes(id)) {
      setSelectedAI(selectedAI.filter((i) => i !== id));
    } else if (selectedAI.length < aiPickMax) {
      setSelectedAI([...selectedAI, id]);
    }
  };

  const onCardPress = (char: AICharacter) => {
    if (galleryOnly) {
      setGalleryDetail(char);
      return;
    }
    toggleSelect(char.id);
  };

  const genderMark = (g: AICharacter['gender']) =>
    g === 'Male' ? '♂' : g === 'Female' ? '♀' : '◎';

  const handleRandomSelect = () => {
    const randomPicks = [...currentPool]
      .sort(() => 0.5 - Math.random())
      .slice(0, aiPickMax)
      .map((c) => c.id);
    setSelectedAI(randomPicks);
  };

  const renderHeaderChromeActions = (showShuffle: boolean) => (
    <View style={styles.galleryHeaderActions}>
      {showShuffle ? (
        <GameWoodButton
          variant="icon"
          onPress={handleRandomSelect}
          accessibilityLabel={randomA11yLabel}
        >
          <Shuffle color={GAME_WOOD_BTN.text} size={22} strokeWidth={2.5} />
        </GameWoodButton>
      ) : null}
      <HubSettingsIconButton
        onPress={() => navigation.navigate('Settings')}
        accessibilityLabel={homeCopy[lang].settingsTitle}
      />
    </View>
  );

  const lockedBoardBanner = (board: GameBoard): string => {
    if (board === 'WolfBeauty') return t.boardLockedBeauty;
    if (board === 'SeerWitch6') return t.boardLockedSeerWitch6;
    if (board === 'Avalon10') return t.boardLockedAvalon10;
    return t.boardLockedStandard;
  };
  const boardBannerText =
    lockBoard && presetBoard
      ? lockedBoardBanner(effectiveBoard)
      : lockBoardWithPreset
        ? lockedBoardBanner(effectiveBoard)
        : null;

  const showSidebar = showDifficultyTabs || showBoardSection;

  /** 选人 / 图鉴均用横向图鉴卡排版（与参考图一致） */
  const useGalleryCardLayout = true;

  const mainRowBasis = mainRowInnerWidth > 0 ? mainRowInnerWidth : windowWidth;
  const pickerSidebarW =
    showSidebar && !galleryOnly ? computePickerSidebarWidth(mainRowBasis) : 0;

  /**
   * 单人选 AI：右侧选角区；与 listContentPicker 左右 padding 一致。
   * 固定 4 列 × 3 行（PICKER_GRID_COLS / PICKER_GRID_ROWS）；列宽均分，余像素摊到前几列。
   */
  const pickerGridMetrics = useMemo(() => {
    const cols = PICKER_GRID_COLS;
    if (useGalleryCardLayout) {
      return {
        cardW: 0,
        cardWidthBump: 0,
        gapH: 0,
        cols,
        avatarOuter: 0,
        avatarInner: 0,
        avatarPickerH: 0,
        sidebarLeftExtraPx: 0,
      };
    }
    /** 与选人 ScrollView 内容区一致：仅左侧 padding 10，右侧贴边为 0 */
    const listPadH = 10;
    const gapH = 6;
    const rightHalf = showSidebar && !galleryOnly;
    const rowBasis = mainRowInnerWidth > 0 ? mainRowInnerWidth : windowWidth;
    const sidebarW = rightHalf ? computePickerSidebarWidth(rowBasis) : 0;

    const computePass = (sidebarLeftExtra: number) => {
      const rightPanelW = rightHalf
        ? rowBasis -
          sidebarW -
          PICKER_SIDEBAR_MARGIN_H -
          PICKER_MAIN_PANE_MARGIN_RIGHT -
          sidebarLeftExtra
        : rowBasis;
      const inner = Math.max(200, Math.floor(rightPanelW - listPadH));
      const gaps = (cols - 1) * gapH;
      const raw = Math.floor((inner - gaps) / cols);
      const scaled = Math.floor((raw * 0.93 * 2) / 3);
      const baseW = Math.min(raw, Math.max(50, scaled));
      const cardWidthBump = Math.max(0, inner - gaps - baseW * cols);
      const avatarW = Math.round(Math.min(62, Math.max(30, baseW * 0.52)));
      const avatarH = Math.round((avatarW * 4) / 3);
      const oneAvg = Math.round(baseW + cardWidthBump / cols);
      return {
        cardW: baseW,
        cardWidthBump,
        avatarW,
        avatarH,
        oneAvg,
      };
    };

    const pass0 = computePass(0);
    const sidebarLeftExtraPx = rightHalf ? Math.max(0, Math.round(pass0.oneAvg / 2)) : 0;
    const pass1 = computePass(sidebarLeftExtraPx);

    return {
      cardW: pass1.cardW,
      cardWidthBump: pass1.cardWidthBump,
      gapH,
      cols,
      avatarOuter: pass1.avatarW,
      avatarInner: pass1.avatarW,
      avatarPickerH: pass1.avatarH,
      sidebarLeftExtraPx,
    };
  }, [galleryOnly, showSidebar, useGalleryCardLayout, windowWidth, mainRowInnerWidth]);

  /**
   * 单人选人（含首页「单人对局」进入）：右侧栏内、卡片外包一层应有的像素宽。
   * 与 `pickerGridMetrics` 里 `rightPanelW - listPad` 同源；不依赖 ScrollView onLayout（Web 上常为 0 或不触发，导致布局完全不变）。
   */
  const pickerPaneWrapWidth = useMemo(() => {
    if (galleryOnly) return 0;
    const rowBasis = mainRowInnerWidth > 0 ? mainRowInnerWidth : windowWidth;
    const rightHalf = showSidebar && !galleryOnly;
    const sidebarW = rightHalf ? computePickerSidebarWidth(rowBasis) : 0;
    const extra = pickerGridMetrics.sidebarLeftExtraPx ?? 0;
    const rightPanelW = rightHalf
      ? rowBasis - sidebarW - PICKER_SIDEBAR_MARGIN_H - PICKER_MAIN_PANE_MARGIN_RIGHT - extra
      : rowBasis;
    const listPadLeft = 10;
    return Math.max(80, Math.floor(rightPanelW - listPadLeft));
  }, [galleryOnly, showSidebar, windowWidth, mainRowInnerWidth, pickerGridMetrics]);

  /** 四列总宽（含列间距与 bump），保证一行正好四张对齐 */
  const pickerGridTotalWidth =
    !galleryOnly && !useGalleryCardLayout && pickerGridMetrics.cardW > 0
      ? pickerGridMetrics.cardW * PICKER_GRID_COLS +
        pickerGridMetrics.gapH * (PICKER_GRID_COLS - 1) +
        pickerGridMetrics.cardWidthBump
      : undefined;

  /** 单列平均卡宽（仅用于角色卡列位移，不动侧栏） */
  const pickerOneCardAvgWidthPx = useMemo(() => {
    if (galleryOnly || useGalleryCardLayout || pickerGridMetrics.cardW <= 0) return 0;
    return Math.round(pickerGridMetrics.cardW + pickerGridMetrics.cardWidthBump / PICKER_GRID_COLS);
  }, [galleryOnly, useGalleryCardLayout, pickerGridMetrics]);

  /** 角色卡整体：先按 1.5 张卡宽右移，再左移 0.6 张卡 ⇒ 净 0.9 张卡宽 */
  const pickerCardsMarginLeftPx = useMemo(
    () =>
      pickerOneCardAvgWidthPx > 0
        ? Math.max(0, Math.round(pickerOneCardAvgWidthPx * (1.5 - 0.6)))
        : 0,
    [pickerOneCardAvgWidthPx]
  );

  const safeWindowHeight = windowHeight > 0 ? windowHeight : 480;
  const galleryModalCardHeight = Math.min(
    540,
    Math.max(360, Math.round(safeWindowHeight * 0.88))
  );

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

  /** 4 列横向角色卡：图鉴 / 单人选人共用 */
  const galleryCardMetrics = useMemo(() => {
    const padH = galleryOnly ? 36 : 20;
    const gap = 10;
    const cols = PICKER_GRID_COLS;
    const rowBasis = mainRowInnerWidth > 0 ? mainRowInnerWidth : windowWidth;
    const sidebarW =
      !galleryOnly && showSidebar ? computePickerSidebarWidth(rowBasis) : 0;
    const innerChrome = galleryOnly ? 10 : 8;
    const usable = Math.max(
      260,
      Math.floor(
        rowBasis -
          padH * 2 -
          innerChrome -
          (galleryOnly ? 0 : sidebarW + PICKER_SIDEBAR_MARGIN_H + 8)
      )
    );
    const totalGaps = gap * (cols - 1);
    const cardW = Math.max(76, Math.floor((usable - totalGaps) / cols));
    const portraitColW = Math.max(44, Math.min(84, Math.round(cardW * 0.38)));
    const spriteW = Math.max(34, portraitColW - 10);
    const portraitH = Math.round(spriteW * 1.42);
    const portraitFrameMinH = portraitH + 12;
    const rowGap = 12;
    const gridWidth = cardW * cols + gap * (cols - 1);
    return {
      cardW,
      gap,
      rowGap,
      gridWidth,
      portraitColW,
      spriteW,
      portraitH,
      portraitFrameMinH,
    };
  }, [galleryOnly, mainRowInnerWidth, windowWidth, showSidebar]);

  const picksLeft = aiPickMax - selectedAI.length;
  const footerLineText = t.footerLine
    .replace('{count}', String(selectedAI.length))
    .replace('{max}', String(aiPickMax))
    .replace('{left}', String(picksLeft));
  const randomA11yLabel = t.randomA11y.replace('{max}', String(aiPickMax));

  /** 选人区不用 flexWrap 断行（Web 上易算错宽），改为每行固定 4 张 */
  const pickerCharacterRows = useMemo(() => {
    if (galleryOnly) return [] as AICharacter[][];
    const rows: AICharacter[][] = [];
    for (let i = 0; i < currentPool.length; i += PICKER_GRID_COLS) {
      rows.push(currentPool.slice(i, i + PICKER_GRID_COLS));
    }
    return rows;
  }, [galleryOnly, currentPool]);

  const renderGalleryCard = (char: AICharacter, selected = false) => {
    const { cardW, portraitColW, spriteW, portraitH, portraitFrameMinH } = galleryCardMetrics;
    return (
      <TouchableOpacity
        key={char.id}
        style={[
          styles.galleryCard,
          { width: cardW },
          selected && styles.galleryCardSelected,
        ]}
        onPress={() => onCardPress(char)}
        activeOpacity={0.9}
      >
        {!selected ? (
          <View style={styles.galleryStarCorner} pointerEvents="none">
            <Star color="#c9a040" size={15} strokeWidth={2} fill="none" />
          </View>
        ) : null}
        <View style={styles.galleryCardTopRow}>
          <View style={[styles.galleryPortraitCol, { width: portraitColW }]}>
            <View style={[styles.galleryPortraitFrame, { minHeight: portraitFrameMinH }]}>
              <BodyPortraitImage
                source={getCharacterPickerPortraitById(char.id)}
                debugTag={__DEV__ ? `gallery-grid-${char.id}` : undefined}
                style={{
                  width: spriteW,
                  height: portraitH,
                  alignSelf: 'center',
                }}
                resizeMode="contain"
              />
            </View>
          </View>
          <View style={styles.galleryInfoCol}>
            <Text style={styles.galleryNameText} numberOfLines={1}>
              {char.name}
            </Text>
            <Text style={styles.galleryMetaText} numberOfLines={1}>
              {genderMark(char.gender)} · {characterConstellationForUi(char, lang)}
            </Text>
          </View>
        </View>
        <View style={styles.galleryDescBar}>
          <Text style={styles.galleryDescText} numberOfLines={1}>
            {characterPersonalityForUi(char, lang)}
          </Text>
        </View>
        {selected ? (
          <View style={styles.checkMark}>
            <Text style={styles.checkMarkText}>✓</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderSelectCard = (char: AICharacter, index: number) => {
    const isSelected = selectedAI.includes(char.id);
    const cols = pickerGridMetrics.cols;
    const colGap =
      pickerGridMetrics.cardW > 0 && index % cols !== cols - 1 ? pickerGridMetrics.gapH : 0;
    const col = index % cols;
    const cardWFull =
      pickerGridMetrics.cardW + (col < pickerGridMetrics.cardWidthBump ? 1 : 0);
    return (
      <TouchableOpacity
        key={char.id}
        style={[
          styles.card,
          styles.cardPicker,
          pickerGridMetrics.cardW > 0 && {
            width: cardWFull,
            marginRight: colGap,
            flexShrink: 0,
          },
          isSelected && styles.activeCardPicker,
        ]}
        onPress={() => onCardPress(char)}
      >
        <View
          style={[
            styles.avatarBox,
            styles.avatarBoxPicker,
            pickerGridMetrics.avatarOuter > 0 && {
              width: pickerGridMetrics.avatarOuter,
              height:
                pickerGridMetrics.avatarPickerH > 0
                  ? pickerGridMetrics.avatarPickerH
                  : pickerGridMetrics.avatarOuter,
            },
          ]}
        >
          <BodyPortraitImage
            source={getCharacterPickerPortraitById(char.id)}
            debugTag={__DEV__ ? `character-picker-${char.id}` : undefined}
            style={[
              styles.avatarImage,
              pickerGridMetrics.avatarInner > 0 && {
                width: pickerGridMetrics.avatarInner,
                height:
                  pickerGridMetrics.avatarPickerH > 0
                    ? pickerGridMetrics.avatarPickerH
                    : pickerGridMetrics.avatarInner,
              },
            ]}
            resizeMode="contain"
          />
        </View>

        <Text style={[styles.nameText, styles.nameTextPicker]}>{char.name}</Text>
        <View style={[styles.infoRow, styles.infoRowPicker]}>
          <Text style={[styles.infoText, styles.infoTextPicker]}>{genderMark(char.gender)}</Text>
          <Text style={[styles.infoText, styles.infoTextPicker]}>
            {' · '}
            {characterConstellationForUi(char, lang)}
          </Text>
        </View>

        <View style={[styles.tag, styles.tagPicker]}>
          <Text style={[styles.tagText, styles.tagTextPicker]} numberOfLines={2}>
            {characterPersonalityForUi(char, lang)}
          </Text>
        </View>

        {isSelected ? (
          <View style={styles.checkMark}>
            <Text style={styles.checkMarkText}>✓</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <>
    <SafeAreaView style={[styles.container, styles.safeAreaTrans]}>
      <HubDayNightBackground scene={homeHubScene} style={[styles.imageBgRoot, screenFillStyle]}>
        <View style={[styles.bgContentColumn, screenFillStyle]}>
      <View
        style={[
          styles.pageBodyBelowHeader,
          styles.pageBodyBelowHeaderGallery,
        ]}
      >
        <View style={[styles.pageBodyBelowHeaderInner, styles.pageBodyBelowHeaderInnerGallery]}>
        <View style={[styles.mainShell, styles.mainShellGallery]}>
        <View style={[styles.mainRow, styles.mainRowGalleryColumn]}>
          {galleryOnly ? (
            <>
              <View style={styles.galleryChromeHeader}>
                <GameWoodButton variant="icon" onPress={() => navigation.goBack()}>
                  <ChevronLeft color={GAME_WOOD_BTN.text} size={22} strokeWidth={2.5} />
                </GameWoodButton>
                <View style={styles.galleryHeaderCenter}>
                  <Text style={styles.galleryScreenTitle}>{t.galleryTitleScreen}</Text>
                  <View style={styles.gallerySubtitleRow}>
                    <Text style={styles.gallerySubtitleDiamond}>◆</Text>
                    <Text style={styles.gallerySubtitleText} numberOfLines={2}>
                      {t.galleryHint}
                    </Text>
                  </View>
                </View>
                {renderHeaderChromeActions(false)}
              </View>
              {showDifficultyTabs ? (
                <View style={[styles.galleryFilterBlock, styles.galleryFilterBlockBelowHeader]}>
                  <View style={styles.gallerySegmentBar}>
                    <TouchableOpacity
                      style={[
                        styles.gallerySegmentCell,
                        styles.gallerySegmentCellFirst,
                        galleryShowAllDifficulties && styles.gallerySegmentCellOn,
                      ]}
                      onPress={() => {
                        setGalleryShowAllDifficulties(true);
                        setSelectedAI([]);
                      }}
                    >
                      <Text
                        style={[
                          styles.gallerySegmentTxt,
                          galleryShowAllDifficulties && styles.gallerySegmentTxtOn,
                        ]}
                        numberOfLines={1}
                      >
                        {t.galleryFilterAll}
                      </Text>
                    </TouchableOpacity>
                    {GALLERY_FILTER_DIFFICULTIES.map((diff) => {
                      const on = !galleryShowAllDifficulties && selectedDiff === diff;
                      return (
                        <TouchableOpacity
                          key={diff}
                          style={[
                            styles.gallerySegmentCell,
                            styles.gallerySegmentCellDivider,
                            on && styles.gallerySegmentCellOn,
                          ]}
                          onPress={() => {
                            setGalleryShowAllDifficulties(false);
                            setSelectedDiff(diff);
                            setSelectedAI([]);
                          }}
                        >
                          <Text
                            style={[styles.gallerySegmentTxt, on && styles.gallerySegmentTxtOn]}
                            numberOfLines={1}
                          >
                            {difficultyTabLabel(lang, diff)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : null}
              <View style={[styles.galleryPanelBody, styles.galleryPanelBodyBelowFilter]}>
                <View
                  style={styles.mainRowInner}
                  onLayout={(e) => {
                    const { width, height } = e.nativeEvent.layout;
                    const w = Math.round(width);
                    const h = Math.round(height);
                    if (w > 0) setMainRowInnerWidth(w);
                    if (h > 0) setMainRowInnerHeight((prev) => (prev === h ? prev : h));
                  }}
                >
                  <ScrollView
                    style={[
                      styles.listScrollBase,
                      styles.listScrollFill,
                      styles.listScrollGallery,
                    ]}
                    contentContainerStyle={[
                      styles.listContent,
                      styles.listContentGalleryPage,
                      styles.listContentGalleryPageOnly,
                      styles.listContentGalleryStretch,
                    ]}
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={[styles.galleryScrollColumn, styles.galleryScrollColumnCentered]}>
                      {galleryRows.map((row, ri) => (
                        <View
                          key={`gal-row-${ri}`}
                          style={[
                            styles.galleryGridRow,
                            styles.galleryGridRowCentered,
                            {
                              width: galleryCardMetrics.gridWidth,
                              gap: galleryCardMetrics.gap,
                              marginBottom: galleryCardMetrics.rowGap,
                            },
                          ]}
                        >
                          {row.map((char) => renderGalleryCard(char))}
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>
              <View style={styles.galleryPageFooterFixed}>
                <Lightbulb color="#e07030" size={16} strokeWidth={2.2} />
                <Text style={styles.galleryPageFooterFixedText}>{t.galleryFooterTip}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.galleryChromeHeader}>
                <GameWoodButton variant="icon" onPress={() => navigation.goBack()}>
                  <ChevronLeft color={GAME_WOOD_BTN.text} size={22} strokeWidth={2.5} />
                </GameWoodButton>
                <View style={styles.galleryHeaderCenter}>
                  <Text style={styles.galleryScreenTitle}>{t.title}</Text>
                  <View style={styles.gallerySubtitleRow}>
                    <Text style={styles.gallerySubtitleDiamond}>◆</Text>
                    <Text style={styles.gallerySubtitleText} numberOfLines={2}>
                      {t.soloScreenSubtitle}
                    </Text>
                  </View>
                  {fromCreateRoom ? (
                    <Text style={styles.pickerBannerInHeader} numberOfLines={2}>
                      {createRoomCode
                        ? `${t.createRoomPickBanner} · ${createRoomCopy[lang].roomCodeLabel} ${createRoomCode}`
                        : t.createRoomPickBanner}
                    </Text>
                  ) : null}
                  {fromJoinRoom && joinRoomCode ? (
                    <Text style={styles.pickerBannerInHeader}>
                      {t.joinBanner}：{joinRoomCode}
                    </Text>
                  ) : null}
                  {boardBannerText ? (
                    <Text style={styles.pickerBannerInHeader}>{boardBannerText}</Text>
                  ) : null}
                </View>
                {renderHeaderChromeActions(true)}
              </View>

              {lockToNoviceDifficulty ? (
                <View style={styles.noviceOnlyBarInPanel}>
                  <Text style={styles.noviceOnlyText}>{t.novOnlyBanner}</Text>
                </View>
              ) : lockedDifficulty ? (
                <View style={styles.noviceOnlyBarInPanel}>
                  <Text style={styles.noviceOnlyText}>
                    {lang === 'zh'
                      ? `本局难度已锁定为「${difficultyTabLabel(lang, lockedDifficulty)}」，仅显示该难度角色。`
                      : `Difficulty locked to ${difficultyTabLabel(lang, lockedDifficulty)}.`}
                  </Text>
                </View>
              ) : null}

              <View style={styles.galleryPanelBody}>
                <View
                  style={styles.mainRowInner}
                  onLayout={(e) => {
                    const { width, height } = e.nativeEvent.layout;
                    const w = Math.round(width);
                    const h = Math.round(height);
                    if (w > 0) setMainRowInnerWidth(w);
                    if (h > 0) setMainRowInnerHeight((prev) => (prev === h ? prev : h));
                  }}
                >
          {showSidebar ? (
            <View
              style={[
                styles.sidebarPlankWrap,
                styles.pickerSidebarPane,
                pickerSidebarW > 0 ? { width: pickerSidebarW } : null,
                mainRowInnerHeight > 0 && {
                  minHeight: Math.floor(mainRowInnerHeight * 0.94),
                },
                { marginLeft: 10, marginTop: 4, alignSelf: 'stretch' },
              ]}
            >
            <ScrollView
              style={styles.settingsCardScroll}
              contentContainerStyle={styles.settingsCardContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.settingsCardHeader}>{t.settingsSection}</Text>

              {showDifficultyTabs ? (
                <View style={styles.settingsBlock}>
                  <Text style={styles.settingsBlockTitle}>{t.difficultyHeading}</Text>
                  <Text style={styles.settingsBlockHint}>{t.difficultySub}</Text>
                  {fromCreateRoom ? (
                    <Text style={styles.settingsBlockHint}>{t.difficultyNoNovice}</Text>
                  ) : null}
                  <View style={styles.pickTabRows}>
                    <View style={styles.pickTabRow}>
                      {(['Novice', 'Easy'] as const).map((diff) => (
                        <TouchableOpacity
                          key={diff}
                          style={[
                            styles.pickTab,
                            selectedDiff === diff && styles.pickTabActive,
                          ]}
                          onPress={() => {
                            setSelectedDiff(diff);
                            setSelectedAI([]);
                          }}
                        >
                          <Text
                            style={[
                              styles.pickTabText,
                              selectedDiff === diff && styles.pickTabTextActive,
                            ]}
                            numberOfLines={2}
                          >
                            {difficultyTabLabel(lang, diff)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={[styles.pickTabRow, styles.pickTabRowSecond]}>
                      {(['Medium', 'Hard'] as const).map((diff) => (
                        <TouchableOpacity
                          key={diff}
                          style={[
                            styles.pickTab,
                            selectedDiff === diff && styles.pickTabActive,
                          ]}
                          onPress={() => {
                            setSelectedDiff(diff);
                            setSelectedAI([]);
                          }}
                        >
                          <Text
                            style={[
                              styles.pickTabText,
                              selectedDiff === diff && styles.pickTabTextActive,
                            ]}
                            numberOfLines={2}
                          >
                            {difficultyTabLabel(lang, diff)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              ) : null}

              {showBoardSection ? (
                <View
                  style={[
                    styles.settingsBlock,
                    showDifficultyTabs && styles.settingsBlockSpaced,
                  ]}
                >
                  <Text style={styles.settingsBlockTitle}>{t.boardHeading}</Text>
                  <View style={styles.pickBoardCol}>
                    <TouchableOpacity
                      style={[
                        styles.pickBoardChipFull,
                        selectedBoard === 'Standard12' && styles.pickBoardChipActive,
                      ]}
                      onPress={() => setSelectedBoard('Standard12')}
                    >
                      <Text
                        style={[
                          styles.pickBoardChipText,
                          selectedBoard === 'Standard12' && styles.pickBoardChipTextActive,
                        ]}
                        numberOfLines={2}
                      >
                        {characterSelectBoardLabel('Standard12', lang)}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.pickBoardChipFull,
                        styles.pickBoardChipFullSpacing,
                        selectedBoard === 'WolfBeauty' && styles.pickBoardChipActive,
                      ]}
                      onPress={() => setSelectedBoard('WolfBeauty')}
                    >
                      <Text
                        style={[
                          styles.pickBoardChipText,
                          selectedBoard === 'WolfBeauty' && styles.pickBoardChipTextActive,
                        ]}
                        numberOfLines={2}
                      >
                        {characterSelectBoardLabel('WolfBeauty', lang)}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.pickBoardChipFull,
                        styles.pickBoardChipFullSpacing,
                        selectedBoard === 'SeerWitch6' && styles.pickBoardChipActive,
                      ]}
                      onPress={() => setSelectedBoard('SeerWitch6')}
                    >
                      <Text
                        style={[
                          styles.pickBoardChipText,
                          selectedBoard === 'SeerWitch6' && styles.pickBoardChipTextActive,
                        ]}
                        numberOfLines={2}
                      >
                        {characterSelectBoardLabel('SeerWitch6', lang)}
                      </Text>
                    </TouchableOpacity>
                    {!fromTutorial ? (
                      <TouchableOpacity
                        style={[
                          styles.pickBoardChipFull,
                          styles.pickBoardChipFullSpacing,
                          selectedBoard === 'Avalon10' && styles.pickBoardChipActive,
                        ]}
                        onPress={() => setSelectedBoard('Avalon10')}
                      >
                        <Text
                          style={[
                            styles.pickBoardChipText,
                            selectedBoard === 'Avalon10' && styles.pickBoardChipTextActive,
                          ]}
                          numberOfLines={2}
                        >
                          {characterSelectBoardLabel('Avalon10', lang)}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </ScrollView>
            </View>
        ) : null}

                  <ScrollView
                    style={[styles.listScrollBase, styles.listScrollFill, styles.mainPaneGrid]}
                    contentContainerStyle={[
                      styles.listContent,
                      styles.listContentGalleryPage,
                      styles.listContentGalleryStretch,
                    ]}
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.galleryScrollColumn}>
                      {pickerCharacterRows.map((row, rowIdx) => (
                        <View
                          key={`picker-row-${rowIdx}`}
                          style={[
                            styles.galleryGridRow,
                            {
                              gap: galleryCardMetrics.gap,
                              marginBottom: galleryCardMetrics.rowGap,
                            },
                          ]}
                        >
                          {row.map((char) =>
                            renderGalleryCard(char, selectedAI.includes(char.id))
                          )}
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>

              <View style={styles.pickerFooterBlock}>
                <View style={styles.galleryPageFooterFixed}>
                  <Lightbulb color="#e07030" size={16} strokeWidth={2.2} />
                  <Text style={styles.galleryPageFooterFixedText}>{t.pickerFooterTip}</Text>
                </View>
                <View style={styles.pickerFooterActions}>
                  <View style={styles.pickerFooterCount}>
                    <Users color="#4a3728" size={18} strokeWidth={2.2} />
                    <Text style={styles.pickerFooterCountText}>{footerLineText}</Text>
                  </View>
                  <GameWoodButton
                    variant="text"
                    wide
                    label={t.startMatch}
                    disabled={selectedAI.length !== aiPickMax}
                    accessibilityLabel={
                      selectedAI.length === aiPickMax
                        ? t.startMatch
                        : t.needAll.replace('{max}', String(aiPickMax))
                    }
                    style={styles.confirmBtnInPanel}
                    labelStyle={styles.confirmBtnText}
                    onPress={() => {
                      const fromTutorial = route.params?.fromTutorial === true;
                      const fromMp =
                        route.params?.fromCreateRoom === true ||
                        route.params?.fromJoinRoom === true;
                      navigation.navigate(
                        effectiveBoard === 'Avalon10' ? 'AvalonGameRoom' : 'GameRoom',
                        {
                          config: {
                            board: effectiveBoard,
                            playerRole: 'Random',
                            selectedAIIds: selectedAI,
                            matchNonce: Date.now(),
                            fromTutorial,
                            aiDifficulty: effectiveDiff,
                            allowSkipAiWait: fromTutorial || !fromMp,
                            dayExileVotesPublic: false,
                          },
                        }
                      );
                    }}
                  />
                </View>
              </View>
            </>
          )}
        </View>
        </View>
        </View>
      </View>
        </View>
      </HubDayNightBackground>
    </SafeAreaView>

    <Modal
      visible={galleryOnly && galleryDetail !== null}
      transparent
      animationType="fade"
      onRequestClose={closeGalleryDetail}
      {...(Platform.OS === 'ios' ? { presentationStyle: 'overFullScreen' as const } : {})}
      {...(Platform.OS !== 'web'
        ? { supportedOrientations: ['landscape-left', 'landscape-right'] as const }
        : {})}
    >
      <View style={[styles.galleryModalRoot, Platform.OS === 'web' && styles.galleryModalRootWeb]}>
        <Pressable
          style={styles.galleryModalBackdrop}
          onPress={closeGalleryDetail}
          accessibilityLabel={t.galleryClose}
        />
        <View style={styles.galleryModalCenter} pointerEvents="box-none">
          {galleryDetail ? (
            <View
              style={[
                styles.galleryDetailCard,
                { height: galleryModalCardHeight },
              ]}
            >
              <View style={styles.galleryDetailPhotoWrap}>
                <Image
                  source={getCharacterGalleryDetailImageById(galleryDetail.id)}
                  style={[styles.galleryDetailPhoto, PIXEL_ART_BACKGROUND_IMAGE]}
                  resizeMode="cover"
                />
              </View>
              <ScrollView
                style={styles.galleryDetailScroll}
                contentContainerStyle={styles.galleryDetailScrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
                nestedScrollEnabled={Platform.OS === 'android'}
              >
                <Text style={styles.galleryDetailName}>{galleryDetail.name}</Text>
                <Text style={styles.galleryDetailMeta}>
                  {genderMark(galleryDetail.gender)} ·{' '}
                  {characterConstellationForUi(galleryDetail, lang)}
                </Text>
                <View style={styles.galleryDetailPersonality}>
                  <Text style={styles.galleryDetailPersonalityText}>
                    {characterPersonalityForUi(galleryDetail, lang)}
                  </Text>
                </View>
                <Text style={styles.galleryDetailSpecLine}>
                  {t.gallerySpecializesPrefix}
                  {characterGallerySpecialtyWord(galleryDetail, lang)}
                </Text>
                <Text style={styles.galleryDetailDiffLine}>
                  {t.galleryDifficulty}：{difficultyTabLabel(lang, galleryDetail.difficulty)}
                </Text>
                <Text style={styles.galleryDetailDesc}>
                  {characterDescriptionForUi(galleryDetail, lang)}
                </Text>
              </ScrollView>
              <TouchableOpacity
                style={styles.galleryCloseBtn}
                onPress={closeGalleryDetail}
                activeOpacity={0.85}
              >
                <Text style={styles.galleryCloseBtnText}>{t.galleryClose}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', backgroundColor: 'transparent' },
  safeAreaTrans: { backgroundColor: 'transparent' },
  imageBgRoot: { flex: 1, width: '100%' },
  bgContentColumn: { minHeight: 0, flexDirection: 'column' },
  soloHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 4,
    paddingBottom: 8,
    gap: 8,
    backgroundColor: 'transparent',
  },
  soloHeaderIconWrap: {
    width: HUB_CHROME_BTN,
    height: HUB_CHROME_BTN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soloTitleBlock: {
    flex: 1,
    minWidth: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  soloTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#fff8ec',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  soloSubtitle: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 248, 236, 0.95)',
    lineHeight: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.72)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  soloBanner: {
    marginTop: 6,
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 248, 236, 0.92)',
    lineHeight: 13,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  topBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 52,
  },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
    color: SDV.ink,
  },
  boardBanner: {
    fontSize: 11,
    fontWeight: '800',
    color: SDV.subtext,
    marginTop: 4,
    textAlign: 'center',
  },
  pageBodyBelowHeader: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    backgroundColor: 'transparent',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  pageBodyBelowHeaderGallery: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 10,
  },
  /** 选人页主面板贴齐安全区左右；底同样略透以露出全局框图 */
  pageBodyBelowHeaderPickerBleed: { paddingHorizontal: 0 },
  pageBodyBelowHeaderInner: { flex: 1, minHeight: 0, width: '100%' },
  /** 与首页同 maxWidth；窄屏下仍为 100% 宽 */
  pageBodyBelowHeaderInnerGallery: { maxWidth: 1120, width: '100%', flex: 1, minHeight: 0 },
  /** 图鉴：整块羊皮纸容器 */
  mainShell: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    backgroundColor: '#e8d4a8',
    borderRadius: 8,
    borderWidth: 4,
    borderColor: '#3e2012',
    overflow: 'hidden',
    flexDirection: 'column',
  },
  /** 单人选人：不要整屏大底板，只留左侧「本局设置」卡 + 右侧夜景上的角色卡 */
  mainShellPicker: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    overflow: 'visible',
  },
  mainShellGallery: {
    borderRadius: 16,
    borderWidth: 0,
    backgroundColor: PICKER_GLASS_PANEL_BG,
    maxWidth: 1080,
    alignSelf: 'center',
  },
  photoBgImageFill: {
    width: '100%',
    height: '100%',
  },
  mainRow: { flex: 1, flexDirection: 'row', minHeight: 0 },
  mainRowGalleryColumn: { flexDirection: 'column', alignItems: 'stretch' },
  mainRowInner: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
    minWidth: 0,
    width: '100%',
    backgroundColor: 'transparent',
  },
  /** 左侧本局设置：窄栏宽度由内联 width（computePickerSidebarWidth）约束 */
  pickerSidebarPane: {
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 0,
    alignSelf: 'stretch',
  },
  /** 右侧选人区：占主行剩余宽度；栅格内单卡 = 右栏可用宽的 1/4（每行 4 张） */
  mainPaneGrid: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    backgroundColor: 'transparent',
    marginRight: 0,
  },
  /** 顶栏左右方形按钮（参考图） */
  headerIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryDiffBar: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: pixelChrome.borderWidth,
    borderBottomColor: SDV.wood,
    backgroundColor: SDV.panelLight,
    gap: 10,
  },
  galleryDiffBarLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: SDV.subtext,
    letterSpacing: 0.3,
  },
  galleryDiffChips: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 6,
  },
  galleryDiffBarWide: { paddingHorizontal: 32 },
  galleryTopTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: pixelChrome.borderRadius,
    borderWidth: pixelChrome.borderWidth,
    borderColor: SDV.wood,
    backgroundColor: SDV.panel,
  },
  galleryTopTabActive: gameButtonStyles.segmentCellOn,
  galleryTopTabText: { ...gameButtonStyles.segmentTxt, fontSize: 11 },
  galleryTopTabTextActive: { ...gameButtonStyles.segmentTxtOn, fontSize: 11 },
  /** 参考图：单层奶油卡 + 深棕顶栏（无双层木框） */
  sidebarPlankWrap: {
    flexGrow: 1,
    flexShrink: 0,
    minHeight: 0,
    alignSelf: 'stretch',
    marginLeft: 12,
    marginVertical: 6,
    marginRight: 8,
    backgroundColor: '#fff8e7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5dcc8',
    overflow: 'hidden',
  },
  settingsCardScroll: {
    flex: 1,
    flexShrink: 1,
    width: '100%',
  },
  settingsCardContent: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 22,
  },
  settingsCardHeader: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff8f0',
    textAlign: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#5d3a21',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 10,
    marginBottom: 14,
    overflow: 'hidden',
  },
  settingsBlock: {
    alignSelf: 'stretch',
  },
  settingsBlockSpaced: {
    marginTop: 20,
  },
  settingsBlockTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#5d3a21',
    letterSpacing: 0.15,
  },
  settingsBlockHint: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '600',
    color: '#9a8472',
    lineHeight: 14,
  },
  pickTabRows: { marginTop: 12, gap: 8 },
  pickTabRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pickTabRowSecond: {},
  pickTab: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#5d3a21',
    borderRadius: 8,
    backgroundColor: '#f5e6d3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickTabActive: {
    backgroundColor: '#2d4f35',
    borderColor: '#2d4f35',
  },
  pickTabText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#5d3a21',
    textAlign: 'center',
    lineHeight: 14,
  },
  pickTabTextActive: { color: '#ffffff' },
  pickBoardCol: { marginTop: 12, alignSelf: 'stretch', gap: 8 },
  pickBoardChipFull: {
    alignSelf: 'stretch',
    minHeight: 46,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#5d3a21',
    borderRadius: 8,
    backgroundColor: '#f5e6d3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickBoardChipFullSpacing: { marginTop: 0 },
  pickBoardChipActive: {
    backgroundColor: '#2d4f35',
    borderColor: '#2d4f35',
  },
  pickBoardChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5d3a21',
    textAlign: 'center',
    lineHeight: 15,
  },
  pickBoardChipTextActive: { color: '#ffffff' },
  listScrollBase: { minWidth: 0, backgroundColor: 'transparent' },
  listScrollFill: { flex: 1, flexBasis: 0, minWidth: 0, backgroundColor: 'transparent' },
  listScrollGallery: { flex: 1, alignSelf: 'stretch', minHeight: 0, backgroundColor: 'transparent' },
  galleryModalRoot: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  galleryModalRootWeb: {
    minHeight: '100vh' as unknown as number,
    height: '100%' as unknown as number,
  },
  galleryModalCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  galleryModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 0,
  },
  galleryDetailCard: {
    width: '100%',
    maxWidth: 340,
    flexDirection: 'column',
    backgroundColor: SDV.panel,
    borderRadius: pixelChrome.borderRadius,
    borderWidth: pixelChrome.borderWidth,
    borderColor: SDV.wood,
    overflow: 'hidden',
    zIndex: 2,
    elevation: 8,
    shadowColor: '#1a0f08',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
  },
  galleryDetailPhotoWrap: {
    width: '100%',
    height: 188,
    backgroundColor: '#2a1f14',
    borderBottomWidth: pixelChrome.borderWidth,
    borderBottomColor: SDV.wood,
    overflow: 'hidden',
  },
  galleryDetailPhoto: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  galleryDetailScroll: { flex: 1, minHeight: 0 },
  galleryDetailScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  galleryDetailName: {
    fontSize: 20,
    fontWeight: '900',
    color: SDV.ink,
    marginBottom: 6,
  },
  galleryDetailMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: SDV.subtext,
    marginBottom: 10,
  },
  galleryDetailSpecLine: {
    fontSize: 12,
    fontWeight: '800',
    color: SDV.ink,
    marginBottom: 10,
  },
  galleryDetailPersonality: {
    alignSelf: 'flex-start',
    backgroundColor: SDV.wood,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 10,
  },
  galleryDetailPersonalityText: {
    fontSize: 11,
    fontWeight: '800',
    color: SDV.panelLight,
  },
  galleryDetailDiffLine: {
    fontSize: 12,
    fontWeight: '800',
    color: SDV.ink,
    marginBottom: 10,
  },
  galleryDetailDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: SDV.ink,
    lineHeight: 19,
  },
  galleryCloseBtn: {
    borderTopWidth: 2,
    borderTopColor: SDV.wood,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: SDV.wood,
  },
  galleryCloseBtnText: { color: SDV.panelLight, fontWeight: '900', fontSize: 14 },
  noviceOnlyBar: {
    marginHorizontal: 10,
    marginBottom: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: '#3e2012',
    backgroundColor: '#f8efd2',
  },
  noviceOnlyText: { fontSize: 11, fontWeight: '800', color: SDV.ink, textAlign: 'center' },
  listContent: { paddingHorizontal: 10, paddingVertical: 10, paddingBottom: 14 },
  /** 单人选人：占满右栏宽度（Web ScrollView 内需 minWidth 才稳定） */
  listContentPicker: {
    flexGrow: 1,
    width: '100%',
    minWidth: '100%',
    alignSelf: 'stretch',
    alignItems: 'stretch',
    paddingLeft: 10,
    paddingRight: 0,
    paddingTop: PICKER_LIST_CONTENT_PADDING_TOP,
    paddingBottom: 10,
  },
  /**
   * 整块 4×3：左侧弹性占位 + 右侧卡列（比 justifyContent:flex-end 在 RN Web 上更可靠）
   */
  pickerGridWrap: {
    width: '100%',
    minWidth: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 0,
  },
  /** 吃掉侧栏与卡区之间的水平空间，把角色卡整体顶到右栏最右侧 */
  pickerGridPushSpacer: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    alignSelf: 'stretch',
  },
  listContentGallery: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 16 },
  /** 图鉴主内容区：与参考排版一致的边距 */
  listContentGalleryPage: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 16,
    alignItems: 'stretch',
  },
  listContentGalleryPageOnly: {
    paddingTop: 28,
  },
  /** 图鉴：内容区至少铺满一屏，去掉底部大块留白 */
  listContentGalleryStretch: { flexGrow: 1, paddingBottom: 0 },
  listContentGalleryWidePads: { paddingHorizontal: 40 },
  galleryChromeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
    backgroundColor: 'transparent',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(74, 55, 40, 0.12)',
  },
  galleryHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HUB_CHROME_GAP,
    flexShrink: 0,
  },
  galleryHeaderCenter: {
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  galleryScreenTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4a3728',
    letterSpacing: -0.4,
  },
  gallerySubtitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    gap: 6,
  },
  gallerySubtitleDiamond: {
    fontSize: 11,
    fontWeight: '900',
    color: '#e07030',
    marginTop: 1,
  },
  gallerySubtitleText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#5c4a38',
    lineHeight: 16,
  },
  galleryFilterBlock: {
    flex: 1,
    minWidth: 168,
    maxWidth: 380,
    marginLeft: 4,
    alignItems: 'stretch',
  },
  galleryFilterBlockBelowHeader: {
    flex: 0,
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: '100%',
    marginLeft: 0,
    marginHorizontal: 14,
    marginBottom: 10,
    zIndex: 2,
  },
  gallerySegmentBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    alignSelf: 'stretch',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9b89a',
    overflow: 'hidden',
    backgroundColor: '#faf6ef',
  },
  gallerySegmentCell: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  gallerySegmentCellFirst: {
    borderLeftWidth: 0,
  },
  gallerySegmentCellDivider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: '#c9b89a',
  },
  gallerySegmentCellOn: gameButtonStyles.segmentCellOn,
  gallerySegmentTxt: gameButtonStyles.segmentTxt,
  gallerySegmentTxtOn: gameButtonStyles.segmentTxtOn,
  /** 图鉴：顶栏与底栏之间的可滚动卡片区 */
  galleryPanelBody: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: '100%',
  },
  /** 图鉴：角色卡网格与难度筛选栏拉开，避免首行遮挡筛选条 */
  galleryPanelBodyBelowFilter: {
    paddingTop: 24,
  },
  galleryScrollColumn: {
    width: '100%',
    alignSelf: 'stretch',
  },
  galleryScrollColumnCentered: {
    alignItems: 'center',
  },
  galleryGridRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'flex-start',
    /** 勿 stretch：同行选中卡 border 更厚时会把未选中卡拉高，底部露出 #fffdf8 白边 */
    alignItems: 'flex-start',
    width: '100%',
  },
  galleryGridRowCentered: {
    alignSelf: 'center',
    justifyContent: 'center',
  },
  galleryCard: {
    backgroundColor: '#fffdf8',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e8dcc8',
    paddingTop: 8,
    paddingBottom: 0,
    paddingHorizontal: 0,
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  galleryCardSelected: {
    backgroundColor: '#fff4dc',
    borderColor: '#c9a040',
  },
  pickerBannerInHeader: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '700',
    color: '#5c4a38',
    lineHeight: 14,
  },
  noviceOnlyBarInPanel: {
    marginHorizontal: 14,
    marginBottom: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e8d4bc',
    backgroundColor: '#fcefd8',
  },
  pickerFooterBlock: {
    flexShrink: 0,
    paddingBottom: 4,
  },
  pickerFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 14,
    marginBottom: 12,
    marginTop: 4,
    gap: 12,
  },
  pickerFooterCount: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  pickerFooterCountText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#4a3728',
  },
  confirmBtnInPanel: {
    flexShrink: 0,
    minWidth: GAME_WOOD_BTN.textMinWidthWide,
  },
  galleryCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: 8,
    paddingBottom: 8,
    minHeight: 88,
  },
  galleryPortraitCol: {
    flexShrink: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  galleryPortraitFrame: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  galleryInfoCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'flex-start',
    paddingTop: 12,
    paddingRight: 18,
  },
  galleryStarCorner: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 3,
  },
  galleryNameText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#4a3728',
    minWidth: 0,
    marginBottom: 8,
    letterSpacing: 1.2,
    lineHeight: 22,
  },
  galleryMetaText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6b5344',
    lineHeight: 16,
  },
  galleryDescBar: {
    backgroundColor: '#ede3d0',
    borderTopWidth: 1,
    borderTopColor: '#dccfb8',
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  galleryDescText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4a3728',
    textAlign: 'center',
    width: '100%',
  },
  /** 图鉴：固定在主面板底部的小贴士条（不随网格滚动） */
  galleryPageFooterFixed: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 12,
    marginTop: 2,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#fcefd8',
    borderWidth: 1,
    borderColor: '#e8d4bc',
  },
  galleryPageFooterFixedText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#5c4a38',
    lineHeight: 16,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  /** 选人：纵向堆行；整列宽度随子行，由 pickerGridWrap 横向推到右侧 */
  pickerGridShell: {
    flexDirection: 'column',
    alignItems: 'center',
    flexShrink: 0,
  },
  pickerGridRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    flexShrink: 0,
  },
  gridGallery: {
    width: '100%',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
  },
  /** NPC 档案式纸质卡：硬描边、无 iOS 浮层阴影 */
  card: {
    flexGrow: 0,
    backgroundColor: '#fff9e8',
    borderWidth: 2,
    borderColor: '#3e2012',
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
  },
  cardGallery: {
    width: '23.5%',
    minWidth: 84,
    flexGrow: 0,
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginBottom: 12,
    borderRadius: pixelChrome.borderRadius,
    borderWidth: pixelChrome.borderWidth,
  },
  /** 图鉴卡选中 */
  activeCard: {
    backgroundColor: '#fff2cc',
    borderColor: '#5c4a28',
    borderWidth: 3,
  },
  /**
   * 选人角色卡：星露谷式木框 + 羊皮芯（上左高光、下右阴影边）
   * 色值对齐参考：暖羊皮 #e6d5b3 系、深木 #5d3a1a 系
   */
  cardPicker: {
    backgroundColor: '#e8dcc8',
    ...pickerCharacterCardBorder,
    borderRadius: 4,
    paddingVertical: 11,
    paddingHorizontal: 4,
    marginBottom: 13,
  },
  activeCardPicker: {
    backgroundColor: '#efe4d4',
    borderWidth: 4,
    borderTopColor: '#a88868',
    borderLeftColor: '#a88868',
    borderBottomColor: '#3d2814',
    borderRightColor: '#3d2814',
    borderRadius: 4,
  },
  nameTextPicker: { fontSize: 14, marginBottom: 4, color: '#2a1810' },
  infoTextPicker: { fontSize: 8, lineHeight: 11, color: '#4a3d32' },
  infoRowPicker: { marginBottom: 7 },
  tagPicker: {
    paddingVertical: 5,
    paddingHorizontal: 4,
    marginTop: 4,
    backgroundColor: '#d4c4a8',
    borderWidth: 2,
    borderTopColor: '#c4b498',
    borderLeftColor: '#c4b498',
    borderBottomColor: '#3d3020',
    borderRightColor: '#3d3020',
    borderRadius: 3,
  },
  tagTextPicker: { fontSize: 8, lineHeight: 11, color: '#2a1810', fontWeight: '800' },
  /** 立绘容器默认尺寸（底色/框由子样式覆盖）；须透明以免叠在羊皮卡上产生暗边 */
  avatarBox: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  /** 单人选 AI：立绘无底色素框，直接叠在卡片羊皮纸上 */
  avatarBoxPicker: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    overflow: 'visible',
    marginBottom: 11,
  },
  avatarImage: {
    width: 56,
    height: 56,
    backgroundColor: 'transparent',
  },
  avatarBoxGallery: {
    width: 76,
    height: 76,
    marginBottom: 6,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#6D4526',
    borderRadius: 8,
    overflow: 'hidden',
  },
  avatarImageGallery: {
    width: 76,
    height: 76,
    backgroundColor: 'transparent',
  },
  /** 仅文字，无底框 */
  nameText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#3d2914',
    marginBottom: 2,
  },
  nameTextGallery: { fontSize: 13, marginBottom: 3 },
  infoRow: { flexDirection: 'row', marginBottom: 5, flexWrap: 'wrap', justifyContent: 'center' },
  infoText: { fontSize: 9, fontWeight: '700', color: '#5c4a38' },
  infoTextGallery: { fontSize: 8, fontWeight: '700' },
  tag: {
    backgroundColor: '#ead9b0',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#5c3d24',
    alignSelf: 'stretch',
  },
  tagText: { fontSize: 8, fontWeight: '800', color: '#3d2914', textAlign: 'center' },
  tagGallery: {
    paddingHorizontal: 5,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 2,
  },
  tagTextGallery: { fontSize: 7, lineHeight: 10 },
  /** 参考图：右上角绿色圆勾 */
  checkMark: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: SDV.leaf,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  checkMarkText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  footer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  footerInfo: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff8ec',
    textShadowColor: 'rgba(0, 0, 0, 0.78)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  confirmBtnText: { fontSize: 16 },
});
