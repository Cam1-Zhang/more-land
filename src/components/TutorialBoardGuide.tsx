import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  useWindowDimensions,
} from 'react-native';
import {
  BookOpen,
  ChevronLeft,
  GraduationCap,
  MessageCircle,
  Moon,
  ScrollText,
  Shield,
  Sun,
  Target,
  Trophy,
  Users,
} from 'lucide-react-native';
import type { AppLanguage } from '../i18n/appStrings';
import { homeCopy } from '../i18n/appStrings';
import {
  getTutorialGuideSteps,
  getTutorialGuideStepCount,
  getTutorialGuideUi,
  tutorialGuideStepBody,
  tutorialGuideStepBullets,
  tutorialGuideStepNote,
  tutorialGuideStepTitle,
  type TutorialGuideNavId,
  type TutorialGuideStep,
} from '../i18n/tutorialGuide';
import type { GameBoard } from '../types/game';
import { ROLE_CARD_IMAGES } from '../constants/roleCardImages';
import { GAME_ROOM_BACKGROUND_NIGHT } from '../constants/gameRoomSceneImages';
import HubSettingsIconButton from './HubSettingsIconButton';
import { GameWoodButton } from './GameWoodButton';
import { GAME_WOOD_BTN, gameWoodButtonFace } from '../theme/gameButton';
import { SDV } from '../theme/stardewPixel';
import { PIXEL_ART_SPRITE } from '../theme/pixelArtImage';
import { GAME_PIXEL_CJK_FONT_FAMILY } from '../theme/pixelFont';
import { tutorialUi } from '../i18n/tutorialSteps';
import {
  tutorialPixelBannerTextStyle,
  useTutorialPixelBannerTypography,
} from './TutorialPickBanner';
import {
  GUIDE_BOOK_CONTENT_MIN_WIDTH,
  GUIDE_BOOK_CONTENT_NATIVE_WIDTH,
  GUIDE_BOOK_SCREEN_SAFE_PAD,
  GUIDE_BOOK_SHIFT_DOWN,
  GUIDE_BOOK_SHIFT_UP,
  GUIDE_LEFT_PAGE_OUTSET_X,
  GUIDE_RIGHT_PAGE_OUTSET_X,
  GUIDE_ROOM_SHIFT_DOWN,
  GUIDE_SCENE_NATIVE_WIDTH,
  TUTORIAL_HEADER_EDGE_PAD,
} from '../constants/tutorialGuideLayout';
import { tutorialGuideChromeUi } from '../i18n/tutorialGuide';
import { TUTORIAL_GUIDE_ROOM_DAY_SIZE } from '../constants/hubSceneImages';
import { useHubSceneLayoutScale } from '../hooks/useHubSceneLayoutScale';

type Props = {
  board: GameBoard;
  lang: AppLanguage;
  stepIndex: number;
  onStepIndexChange: (index: number) => void;
  onBack: () => void;
  onStartNow: () => void;
  onOpenSettings: () => void;
  settingsA11y: string;
};

const TOC_ICONS: Record<
  TutorialGuideNavId,
  React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>
> = {
  goal: Target,
  roles: Users,
  flow: ScrollText,
  night: Moon,
  day: Sun,
  win: Trophy,
  tips: GraduationCap,
  setup: BookOpen,
  terms: MessageCircle,
};

function tocSubtitle(step: TutorialGuideStep, lang: AppLanguage): string {
  const body = (lang === 'zh' ? step.bodyZh : step.bodyEn).trim();
  const max = lang === 'zh' ? 22 : 36;
  return body.length > max ? `${body.slice(0, max)}…` : body;
}

export default function TutorialBoardGuide({
  board,
  lang,
  stepIndex,
  onStepIndexChange,
  onBack,
  onStartNow,
  onOpenSettings,
  settingsA11y,
}: Props) {
  const steps = useMemo(() => getTutorialGuideSteps(board), [board]);
  const stepCount = getTutorialGuideStepCount(board);
  const ui = getTutorialGuideUi(board, lang);
  const homeUi = homeCopy[lang];
  const titleFont = lang === 'zh' ? GAME_PIXEL_CJK_FONT_FAMILY : undefined;
  const { width: winW } = useWindowDimensions();
  const layout = useHubSceneLayoutScale(TUTORIAL_GUIDE_ROOM_DAY_SIZE.width);
  const bannerTypography = useTutorialPixelBannerTypography(lang);
  const guideHeaderTitle = useMemo(() => {
    const pick = tutorialUi[lang];
    const boardName = board === 'WolfBeauty' ? pick.pickBeautyTitle : pick.pickStandardTitle;
    return lang === 'zh' ? `新手教程：${boardName}` : `Tutorial: ${boardName}`;
  }, [board, lang]);

  const safeIndex = Math.min(Math.max(0, stepIndex), stepCount - 1);
  const current = steps[safeIndex]!;
  const isFirst = safeIndex === 0;
  const isLastPage = current.id === 'terms';
  const chrome = tutorialGuideChromeUi[lang];
  const footerButtonLabel = isLastPage ? chrome.startNow : chrome.skipTutorial;

  const goToStep = useCallback(
    (index: number) => {
      onStepIndexChange(Math.min(Math.max(0, index), stepCount - 1));
    },
    [onStepIndexChange, stepCount]
  );

  const handleHeaderBack = useCallback(() => {
    if (safeIndex > 0) goToStep(safeIndex - 1);
    else onBack();
  }, [safeIndex, goToStep, onBack]);

  const bullets = tutorialGuideStepBullets(current, lang);
  const proportionalBookWidth = Math.floor(
    (winW * GUIDE_BOOK_CONTENT_NATIVE_WIDTH) / GUIDE_SCENE_NATIVE_WIDTH
  );
  const bookSafeWidth = Math.max(1, winW - GUIDE_BOOK_SCREEN_SAFE_PAD);
  const bookMaxWidth = Math.min(
    bookSafeWidth,
    Math.max(Math.min(GUIDE_BOOK_CONTENT_MIN_WIDTH, bookSafeWidth), proportionalBookWidth)
  );
  const bookStageMarginTop = layout.roundPx(
    -GUIDE_BOOK_SHIFT_UP + GUIDE_BOOK_SHIFT_DOWN + GUIDE_ROOM_SHIFT_DOWN
  );

  const renderLeftBullets = () => {
    if (current.id === 'goal' && bullets.length >= 2) {
      return (
        <View style={styles.factionRow}>
          <View style={[styles.factionCard, styles.factionCardTown]}>
            <View style={[styles.factionIconWrap, styles.factionIconTown]}>
              <Shield color="#2a5a9e" size={20} strokeWidth={2.2} />
            </View>
            <Text style={styles.factionCardText}>{bullets[0]}</Text>
          </View>
          <View style={[styles.factionCard, styles.factionCardWolf]}>
            <View style={[styles.factionIconWrap, styles.factionIconWolf]}>
              <Text style={styles.factionWolfEmoji}>🐺</Text>
            </View>
            <Text style={styles.factionCardText}>{bullets[1]}</Text>
          </View>
        </View>
      );
    }
    return bullets.map((line, i) => (
      <View key={i} style={styles.bulletRow}>
        <Text style={styles.bulletDot}>•</Text>
        <Text style={styles.bulletText}>{line}</Text>
      </View>
    ));
  };

  return (
    <SafeAreaView style={styles.root}>
      <View
        style={[
          styles.headerTop,
          {
            paddingHorizontal: layout.roundPx(TUTORIAL_HEADER_EDGE_PAD),
            paddingTop: layout.roundPx(10),
          },
        ]}
      >
        <GameWoodButton
          variant="icon"
          onPress={handleHeaderBack}
          accessibilityLabel={isFirst ? homeUi.settingsBack : ui.prevPage}
        >
          <ChevronLeft color={GAME_WOOD_BTN.text} size={22} strokeWidth={2.5} />
        </GameWoodButton>
        <View
          style={[styles.headerTitleOverlay, { paddingHorizontal: layout.roundPx(56) }]}
          pointerEvents="none"
        >
          <Text
            style={[
              tutorialPixelBannerTextStyle,
              styles.guideHeaderTitle,
              {
                fontFamily: bannerTypography.fontFamily,
                fontSize: bannerTypography.fontSize,
                lineHeight: bannerTypography.lineHeight,
                maxWidth: winW - layout.roundPx(44 * 2 + 32),
              },
            ]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {guideHeaderTitle}
          </Text>
        </View>
        <HubSettingsIconButton onPress={onOpenSettings} accessibilityLabel={settingsA11y} />
      </View>

      <View
        style={[
          styles.bookStage,
          {
            paddingHorizontal: layout.roundPx(8),
            marginTop: bookStageMarginTop,
          },
        ]}
      >
        <View style={[styles.bookColumn, { width: bookMaxWidth, maxWidth: bookSafeWidth }]}>
          <View style={[styles.openBook, { minHeight: layout.roundPx(240) }]}>
            <ScrollView
            style={[
              styles.leftPageScroll,
              { transform: [{ translateX: -layout.roundPx(GUIDE_LEFT_PAGE_OUTSET_X) }] },
            ]}
            contentContainerStyle={styles.leftPageInner}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.pageHeadingRow}>
              <View style={styles.pageNumCircle}>
                <Text style={styles.pageNumText}>{current.step}</Text>
              </View>
              <Text style={[styles.pageTitle, titleFont ? { fontFamily: titleFont } : null]}>
                {tutorialGuideStepTitle(current, lang)}
              </Text>
            </View>

            {current.showVillageScene ? (
              <Image
                source={GAME_ROOM_BACKGROUND_NIGHT}
                style={[PIXEL_ART_SPRITE, styles.heroImage]}
                resizeMode="cover"
              />
            ) : null}

            {current.roleArts && current.roleArts.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.roleRowScroll}
                contentContainerStyle={styles.roleRow}
              >
                {current.roleArts.map((key) => (
                  <Image
                    key={key}
                    source={ROLE_CARD_IMAGES[key]}
                    style={[PIXEL_ART_SPRITE, styles.roleThumb]}
                    resizeMode="contain"
                  />
                ))}
              </ScrollView>
            ) : null}

            <Text style={styles.pageBody}>{tutorialGuideStepBody(current, lang)}</Text>
            {renderLeftBullets()}

            {tutorialGuideStepNote(current, lang) ? (
              <View style={styles.noteBox}>
                <Text style={styles.noteLabel}>{lang === 'zh' ? '注意' : 'Note'}</Text>
                <Text style={styles.noteText}>{tutorialGuideStepNote(current, lang)}</Text>
              </View>
            ) : null}

            {isLastPage ? <Text style={styles.lastHint}>{ui.lastPageHint}</Text> : null}
          </ScrollView>

          <ScrollView
            style={[
              styles.rightPageScroll,
              { transform: [{ translateX: layout.roundPx(GUIDE_RIGHT_PAGE_OUTSET_X) }] },
            ]}
            contentContainerStyle={styles.rightPageInner}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            <Text style={[styles.tocHeading, titleFont ? { fontFamily: titleFont } : null]}>
              {ui.chapterOutline}
            </Text>
            {steps.map((step, i) => {
              const TocIcon = TOC_ICONS[step.id];
              const active = i === safeIndex;
              return (
                <TouchableOpacity
                  key={step.id}
                  style={[styles.tocRow, active && styles.tocRowActive]}
                  onPress={() => goToStep(i)}
                  activeOpacity={0.88}
                >
                  <View style={[styles.tocIconWrap, active && styles.tocIconWrapActive]}>
                    <TocIcon size={17} color={active ? GAME_WOOD_BTN.text : SDV.wood} strokeWidth={2.2} />
                  </View>
                  <View style={styles.tocTextCol}>
                    <Text style={[styles.tocTitle, active && styles.tocTitleActive]} numberOfLines={1}>
                      {tutorialGuideStepTitle(step, lang)}
                    </Text>
                    <Text style={styles.tocSub} numberOfLines={1}>
                      {tocSubtitle(step, lang)}
                    </Text>
                  </View>
                  <Text style={[styles.tocPageNum, active && styles.tocPageNumActive]}>{step.step}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          </View>
        </View>
      </View>
      <View
        style={[
          styles.pageFooter,
          {
            width: bookMaxWidth,
            maxWidth: bookSafeWidth,
            paddingLeft: layout.roundPx(8),
            paddingRight: layout.roundPx(6),
            paddingTop: layout.roundPx(8),
            paddingBottom: layout.roundPx(10),
            marginBottom: layout.roundPx(10),
          },
        ]}
      >
        <GameWoodButton
          key={footerButtonLabel}
          variant="text"
          compact
          wide={isLastPage}
          tone={isLastPage ? 'default' : 'outline'}
          label={footerButtonLabel}
          onPress={onStartNow}
          accessibilityLabel={footerButtonLabel}
          leftIcon={
            <BookOpen
              size={14}
              color={isLastPage ? GAME_WOOD_BTN.text : SDV.ink}
              strokeWidth={2.2}
            />
          }
          style={isLastPage ? styles.skipFooterBtnPrimary : styles.skipFooterBtnOutline}
          labelStyle={isLastPage ? styles.skipFooterTextPrimary : styles.skipFooterTextOutline}
        />
      </View>
    </SafeAreaView>
  );
}

const BOOK_BORDER = '#c9a882';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  headerTop: {
    width: '100%',
    alignSelf: 'stretch',
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
  guideHeaderTitle: {
    textAlign: 'center',
    includeFontPadding: false,
  },
  bookStage: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 2,
    minHeight: 0,
  },
  bookColumn: {
    width: '100%',
    flex: 1,
    minHeight: 0,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  openBook: {
    width: '100%',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  leftPageScroll: {
    flex: 1.05,
    minHeight: 0,
    backgroundColor: 'transparent',
  },
  leftPageInner: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingLeft: 8,
    paddingRight: 16,
  },
  pageHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  pageNumCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: SDV.wood,
    borderWidth: 2,
    borderColor: '#3d2616',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNumText: {
    color: SDV.nightInk,
    fontSize: 14,
    fontWeight: '900',
  },
  pageTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: SDV.ink,
  },
  heroImage: {
    width: '100%',
    height: 82,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: BOOK_BORDER,
  },
  roleRowScroll: { marginBottom: 10, maxHeight: 72 },
  roleRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  roleThumb: { width: 58, height: 66 },
  pageBody: {
    fontSize: 13,
    lineHeight: 21,
    color: SDV.ink,
    marginBottom: 10,
  },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 6, gap: 6 },
  bulletDot: { fontSize: 13, lineHeight: 20, color: SDV.woodMid, width: 12 },
  bulletText: { flex: 1, fontSize: 12, lineHeight: 18, color: SDV.subtext },
  factionRow: { gap: 10, marginTop: 4 },
  factionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 2,
  },
  factionCardTown: {
    backgroundColor: '#e8f0fa',
    borderColor: '#8ab4e8',
  },
  factionCardWolf: {
    backgroundColor: '#fae8e8',
    borderColor: '#e8a0a0',
  },
  factionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  factionIconTown: { backgroundColor: '#c8dcf5' },
  factionIconWolf: { backgroundColor: '#f5d0d0' },
  factionWolfEmoji: { fontSize: 18 },
  factionCardText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    color: SDV.ink,
  },
  noteBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: SDV.honeyFill,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: SDV.honey,
  },
  noteLabel: { fontSize: 11, fontWeight: '800', color: SDV.wood, marginBottom: 4 },
  noteText: { fontSize: 11, lineHeight: 17, color: SDV.ink },
  lastHint: {
    marginTop: 14,
    fontSize: 12,
    lineHeight: 18,
    color: SDV.subtext,
    textAlign: 'center',
  },
  rightPageScroll: {
    flex: 0.95,
    minHeight: 0,
    backgroundColor: 'transparent',
  },
  rightPageInner: {
    paddingTop: 10,
    paddingBottom: 16,
    paddingLeft: 14,
    paddingRight: 6,
  },
  tocHeading: {
    fontSize: 15,
    fontWeight: '900',
    color: SDV.ink,
    marginBottom: 12,
    textAlign: 'center',
  },
  tocRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 8,
    marginBottom: 6,
  },
  tocRowActive: {
    backgroundColor: 'rgba(74, 55, 40, 0.14)',
  },
  tocIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 248, 236, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(92, 61, 36, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tocIconWrapActive: {
    ...gameWoodButtonFace('default'),
    borderWidth: GAME_WOOD_BTN.borderWidth,
    borderColor: GAME_WOOD_BTN.border,
  },
  tocTextCol: { flex: 1, minWidth: 0 },
  tocTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: SDV.ink,
    marginBottom: 3,
  },
  tocTitleActive: { color: '#5c3010' },
  tocSub: {
    fontSize: 10,
    lineHeight: 15,
    color: SDV.subtext,
  },
  tocPageNum: {
    fontSize: 13,
    fontWeight: '900',
    color: SDV.inkMuted,
    minWidth: 18,
    textAlign: 'right',
    paddingTop: 2,
  },
  tocPageNumActive: { color: SDV.wood },
  pageFooter: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  skipFooterBtnOutline: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 0,
  },
  skipFooterBtnPrimary: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    minWidth: 0,
  },
  skipFooterTextOutline: {
    fontSize: 11,
    fontWeight: '800',
  },
  skipFooterTextPrimary: {
    fontSize: 12,
    fontWeight: '900',
  },
});
