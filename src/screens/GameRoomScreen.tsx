import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import type { ImageSourcePropType, ViewStyle } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { exitToHome, promptExitGameWithConfirm } from '../utils/navExit';
import {
  clearGameSession,
  loadGameSession,
  saveGameSession,
} from '../utils/gameSessionPersist';
import {
  mapToRecord,
  recordToMap,
  type WerewolfSessionSnapshot,
} from '../game/werewolf/sessionSnapshot';
import { MatchHallRoomScene } from '../components/HallRoomScene';
import { assignHallSeats } from '../constants/hallScene';
import { GAME_ROOM_BACKGROUND_DAY, GAME_ROOM_BACKGROUND_NIGHT } from '../constants/gameRoomSceneImages';
import { CHARACTERS } from '../data/mockData';
import {
  X,
  Moon,
  Sun,
  ChevronLeft,
  Shield,
  Eye,
  Droplets,
  FlaskConical,
  Skull,
  Check,
  Ban,
  Target,
  Sparkles,
  Play,
  House,
  Crosshair,
  RotateCcw,
  AlertTriangle,
  Users,
  ClipboardList,
  MessageCircle,
  NotebookPen,
} from 'lucide-react-native';
import {
  fetchAISpeechBubbles,
  fetchAIExileVote,
  fetchAISheriffVote,
  fetchAISeerCheck,
  fetchAIWitchAction,
  fetchAIWolfBeautyCharm,
  fetchAIKnightDuel,
} from '../utils/aiApi';
import { llmSpeechFailureLine, reportLlmFail, setLlmFailReporter } from '../llm/llmSpeechPass';
import { formatLlmErrorForUser, probeDashscope, probeOllama } from '../llm/llmHealth';
import { formatDashscopeDifficultyModelMap } from '../llm/dashscopeEnv';
import { describeLlmMisconfig } from '../llm/ollamaUrl';
import { normalizedLlmProvider, setRuntimeLlmProviderOverride } from '../llm/providerEnv';
import { fixSelfThirdPersonSpeech } from '../utils/dayDiscussionSpeech';
import {
  bystanderSpeechPromptHint,
  directedSpeechPromptHint,
  findLatestUnansweredBystanderSpeech,
  findLatestUnansweredDirectedSpeech,
  shouldReactAsBystander,
} from '../utils/directedSpeechReaction';
import { buildModelRefMap } from '../utils/aiModelPool';
import type { AICharacter, ModelRef } from '../types';
import { decideVote, type VotingEngineContext } from '../utils/votingEngine';
import { characterPersonalityForUi, characterDescriptionForUi } from '../utils/characterDisplayCopy';
import { deterministicJitter } from '../utils/thoughtEngine';
import { getAIBehaviorProfile } from '../data/aiBehaviorProfiles';
import {
  getMemoryInfluenceOnBehavior,
  mergeSuspicionWithMemory,
  ingestPublicSpeechMemories,
} from '../utils/memoryEngine';
import { APP_LANGUAGE_KEY, gameCopy, homeCopy, type AppLanguage } from '../i18n/appStrings';
import { GAME_PIXEL_FONT_FAMILY } from '../theme/pixelFont';
import {
  resolveStandardNight,
  isWolfTeam,
  type RoomPlayer,
  type WitchNightState,
  type PlayerOutReason,
} from '../utils/nightResolver';
import { startGameRoomBgm, stopGameRoomBgm } from '../audio/gameRoomBgm';
import { readHubBgmEnabled, subscribeHubBgmEnabled } from '../audio/hubBgmPref';
import { playWolfKnifeHowlIfNewNight, resetWolfKnifeHowlNightGate } from '../audio/wolfKnifeHowl';
import { playDayBreakCue, playNightFallCue, playNightSegmentCue } from '../audio/narratorCue';
import { playVictoryCue, stopVictoryCue } from '../audio/victoryCue';
import { pickSpeechReaction } from '../utils/speechReaction';
import {
  createAiSpeechBrainHub,
  bindWolfPackKnowledge,
  applyPublicExileBallotToBrains,
  applySecretExileBallotToBrains,
  prepareAiSpeechDialogue,
  syncBrainDayRound,
  countPlayerSpeechLinesInHistory,
  detectDirectedAccusationAgainst,
  detectWolfSelfRevealInHistory,
  type AiSpeechBrainHub,
} from '../utils/speechPrep';
import { pickAiFriendSticker } from '../utils/aiFriendSticker';
import { getSpeechFacingEmotion } from '../utils/emotionEngine';
import {
  prepareAiUtterance,
  startPreparedAiUtterance,
  stopAiSpeech,
  type AiVoiceProfile,
} from '../utils/aiVoice';
import { evaluateGameEnd } from '../utils/winCheck';
import { expandSpeechBubbleParts } from '../llm/speechParse';
import type { WerewolfGameBoard } from '../types/game';
import {
  ROLES_POOL_BY_BOARD,
  ROLE_KIND_ORDER_BY_BOARD,
  aiOpponentCountForBoard,
  parseGameBoard,
  boardUsesSecretDayBallot,
} from '../constants/boardSetup';
import {
  buildPeerReviewPlan,
  initialPeerReviewCells,
  runPostGamePeerReviewGeneration,
  type PeerReviewCell,
  type WitchPoisonRecord,
} from '../utils/postGamePeerReview';
import { nextSheriffAfterDeath } from '../utils/sheriffSuccession';
import GameRoomNotepadPanel from '../components/GameRoomNotepadPanel';
import HubSettingsIconButton from '../components/HubSettingsIconButton';
import TutorialRolePickerModal from '../components/TutorialRolePickerModal';
import RoleIdentityCard from '../components/RoleIdentityCard';
import GameEndEpilogueModal from '../components/GameEndEpilogueModal';
import GameEndPeerReviewsModal from '../components/GameEndPeerReviewsModal';
import GameRoomNightRoleCue, { nightRoleCueSegment } from '../components/GameRoomNightRoleCue';
import { normalizeEpilogueRole } from '../i18n/gameEpilogueCopy';
import { roleEmojiForRole } from '../utils/roleEmoji';
import DeathRulesTeachingModal from '../components/DeathRulesTeachingModal';
import SheriffTeachingModal from '../components/SheriffTeachingModal';
import HumanSpeechBar from '../components/HumanSpeechBar';
import NightRpgPillButton from '../components/NightRpgPillButton';
import { resolveStickerSource, ROOM_STICKER_PACK, type RoomStickerId } from '../data/roomStickers';
import { aiRunsForSheriff, pickSheriffVoteForAi } from '../utils/sheriffElection';
import {
  pickGuardTarget,
  pickSeerCheckTarget,
  decideWitchActions,
  type PoolPlayer,
} from '../utils/nightTargetStrategy';
import { resolveAiWolfKillVote, shuffleKillCandidates } from '../utils/wolfKillDecision';
import { pickKnightDuelTarget } from '../utils/knightDuel';
import { getChibiAvatarByIndex, HUMAN_CHIBI_COUNT } from '../constants/characterAvatarImages';
import { getCharacterPickerPortraitById, getPlayerGridAvatar } from '../constants/characterBodyImages';
import PixelAvatarSprite from '../components/PixelAvatarSprite';
import {
  DEFAULT_AVATAR_ITEM_TRANSFORMS,
  USER_PIXEL_AVATAR_CONFIG_KEY,
  USER_PIXEL_AVATAR_TRANSFORMS_KEY,
  parseAvatarItemTransforms,
  parsePixelAvatarConfig,
  type AvatarItemTransformMap,
  type PixelAvatarConfig,
} from '../constants/avatarCreator';
import BodyPortraitImage from '../components/BodyPortraitImage';
import {
  GAME_WOOD_BTN,
  PARCHMENT_LOG_ROW_HIGHLIGHT_BG,
  PARCHMENT_PUBLIC_EVENT_ROW_BG,
  GAME_ROOM_FOOTER_ICON_COLOR,
  GAME_ROOM_FOOTER_PANEL_BG,
  PICKER_GLASS_PANEL_BORDER,
} from '../theme/gameButton';
import { buildPublicEventSections, type PublicEventKind } from '../game/info/publicEvents';
import { SDV, pixelChrome } from '../theme/stardewPixel';
import { PIXEL_ART_SPRITE } from '../theme/pixelArtImage';
import type { RoleCardImageKey } from '../constants/roleCardImages';
import {
  CLOUD_MODEL_ENABLED_KEY,
  USER_AVATAR_INDEX_KEY,
  USER_NICKNAME_KEY,
  USER_NICKNAME_MAX_LEN,
} from '../constants/userProfileKeys';
import { NATIVE_RING_GEOMETRY, type RingSeatGeometry } from '../utils/layoutChannel';
import {
  announceNightSegmentLine,
  announceNightSegmentCloseLine,
  applyKnightDuelResolution,
  applyWolfBeautyNightAftermath,
  buildAiPromptContext,
  buildNightChoicesFromPending,
  createEmptyPendingNight,
  createFreshWolfchaState,
  deathDetailsToCauseMap,
  firstNightWolfLastWordCandidates,
  hunterKilledByWolfTonight,
  makeNarratorLine,
  coalesceNarratorLine,
  mergeStandardNightOutcome,
  firstNightSegmentForBoard,
  nightSegmentHasOpenCloseBroadcast,
  nightSegmentNeedsHumanInput,
  planAfterNightSegment,
  currentDayPublicNarratorLogStrings,
  publicNarratorLogStrings,
  recentCurrentDayNarratorLogsForAi,
  recentNarratorLogsForAi,
  splitVisibleLogsForUi,
  isModeratorOrSystemLogLine,
  syncNightActions,
  uiDayPhaseToWolfcha,
  type NarratorKind,
  type NarratorLine,
  type NarratorVisibility,
  type NightSegmentId,
  type PendingNightRecord,
  type SeerCheckRecord,
  type UiDayPhase,
  type VoteHistoryEntry,
  type WolfchaGameState,
} from '../game';

/** 右栏牛皮纸装饰图：竖版资源宽×高（与 PNG 像素一致） */
const GAME_ROOM_PARCHMENT_DESIGN_W = 682;
const GAME_ROOM_PARCHMENT_DESIGN_H = 1024;
const GAME_ROOM_RIGHT_PARCHMENT = require('../../assets/gameRoomRightParchment.jpg');

/** 与 `actionColumnParchmentImage` 一致：牛皮纸在右栏内的横向跨度 */
function actionColumnParchmentSpanW(columnW: number, columnH: number): number {
  if (columnW <= 0 || columnH <= 0) return 0;
  const aspect = GAME_ROOM_PARCHMENT_DESIGN_W / GAME_ROOM_PARCHMENT_DESIGN_H;
  return Math.max(columnH * aspect, columnW);
}

type DayPhase = UiDayPhase;

type NightSeg = NightSegmentId;

type GridPlayer = RoomPlayer & {
  avatarSource: ImageSourcePropType;
};

type SheriffHandoffPickState = {
  alive: RoomPlayer[];
  defaultNextId: string | null;
  prevName: string;
};

type PendingNightKind = PendingNightRecord;

function phaseLabel(phase: DayPhase, lang: AppLanguage): string {
  const g = gameCopy[lang];
  if (phase === 'ENDED') return g.phaseEnded;
  if (phase === 'NIGHT') return g.phaseNight;
  if (phase === 'SHERIFF_SIGNUP') return g.phaseSheriffSignup;
  if (phase === 'SHERIFF_SPEECH') return g.phaseSheriffSpeech;
  if (phase === 'SHERIFF_VOTE') return g.phaseSheriffVote;
  if (phase === 'DISCUSSION') return g.phaseDiscussion;
  if (phase === 'KNIGHT_DUEL') return g.phaseKnightDuel;
  if (phase === 'VOTING') return g.phaseVoting;
  return g.phasePreparing;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** 可靠洗牌；避免 `sort(() => Math.random() - 0.5)` 在部分引擎上不稳定或异常。 */
function shuffleRoles<T>(items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

/** Web：逐字少触发几次 setState，减轻整屏重绘导致的底图与头像同步抖动 */
function shouldPaintTypingChar(i: number, len: number): boolean {
  if (len <= 0) return true;
  if (Platform.OS !== 'web') return true;
  return i % 2 === 0 || i === len - 1;
}

/** 与 styles.bubble.width 一致：固定为「正在思考中···」气泡宽度 */
const SPEECH_BUBBLE_FIXED_WIDTH = 96;
/** 白天放逐投票的人类弃票哨兵；不会写入有效票、票史或 AI 公开票型。 */
const DAY_EXILE_ABSTAIN_ID = '__day_exile_abstain__';

/**
 * 局内 AI 全身立绘绘制倍率（相对圆框 bw/bh）：略大于 contain，但小于过度放大。
 * 只放大绘制，不改木框/热区尺寸。
 */
const SEAT_AI_BODY_PORTRAIT_DRAW_SCALE = 2;
/** 相对圆框高度的垂直偏移（负 = 上移） */
const SEAT_AI_BODY_PORTRAIT_MARGIN_TOP_FRAC = -0.06;

const TOP_BAR_STATUS_GAP = '   ';
/** 顶栏 DAY / ALIVE 相对顶栏几何中心的右移量（px） */
const TOP_BAR_DAY_ALIVE_SHIFT_RIGHT = 30;
/** 牛皮纸聊天/事件区左右缩进、首条系统消息顶线（与 logScrollContent 一致） */
const PARCHMENT_SCROLL_PAD_H = 35;
const PARCHMENT_SCROLL_PAD_TOP = 48;

type ParchmentDisplayRow = {
  key: string;
  text: string;
  highlight: boolean;
  isModerator: boolean;
};

function splitParchmentMessageLines(text: string): string[] {
  const parts = text.replace(/\r\n/g, '\n').split('\n');
  if (parts.length <= 1) return [text];
  return parts.map((line, i) => (i === 0 ? line : line.trimStart()));
}

function buildParchmentDisplayRows(
  logs: readonly string[],
  liveLine: string | null,
  isModeratorLine: (text: string) => boolean
): ParchmentDisplayRow[] {
  const rows: ParchmentDisplayRow[] = [];
  logs.forEach((text, logIndex) => {
    const isModerator = isModeratorLine(text);
    splitParchmentMessageLines(text).forEach((line, lineIndex) => {
      if (!line.trim() && lineIndex > 0) return;
      rows.push({
        key: `log-${logIndex}-${lineIndex}`,
        text: line,
        highlight: false,
        isModerator,
      });
    });
  });
  if (liveLine != null) {
    const isModerator = isModeratorLine(liveLine);
    splitParchmentMessageLines(liveLine).forEach((line, lineIndex) => {
      rows.push({
        key: `log-live-${lineIndex}`,
        text: line,
        highlight: false,
        isModerator,
      });
    });
  }
  if (rows.length > 0) {
    rows[rows.length - 1]!.highlight = true;
  }
  return rows;
}

/** Web：RN Text 的 transform 常无效，用 DOM calc 锚点 */
function topBarHeadlineOverlayStyle(): ViewStyle {
  if (Platform.OS === 'web') {
    return {
      position: 'absolute',
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      zIndex: 10,
      left: `calc(50% + ${TOP_BAR_DAY_ALIVE_SHIFT_RIGHT}px)`,
      transform: 'translateX(-50%)',
    } as ViewStyle;
  }
  return {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    paddingLeft: TOP_BAR_DAY_ALIVE_SHIFT_RIGHT * 2,
  };
}

async function typeTextCharByChar(
  text: string,
  typingMs: number,
  sleep: (ms: number) => Promise<void>,
  shouldAbort: () => boolean,
  onPaint: (current: string) => void
): Promise<string> {
  let current = '';
  for (let i = 0; i < text.length; i++) {
    current += text[i]!;
    if (shouldPaintTypingChar(i, text.length)) {
      onPaint(current);
    }
    await sleep(typingMs);
    if (shouldAbort()) break;
  }
  onPaint(current);
  return current;
}

const AI_VOICE_PREP_MAX_WAIT_MS = 1_200;

/** Do not keep the table on "thinking" while optional TTS is slow. */
async function settleWithin<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function remainingRolesAfterHumanPick(humanRole: string, board: WerewolfGameBoard): string[] {
  const pool = [...ROLES_POOL_BY_BOARD[board]];
  const idx = pool.indexOf(humanRole);
  if (idx < 0) return shuffleRoles(pool);
  pool.splice(idx, 1);
  return shuffleRoles(pool);
}

/**
 * 随机局：人类身份在「种类」上均匀，再从剩余牌洗牌分给 AI，整副牌仍与板子一致。
 */
function assignHumanRandomUniformKind(board: WerewolfGameBoard): { meRole: string; aiDeck: string[] } {
  const pool = [...ROLES_POOL_BY_BOARD[board]];
  const kinds = ROLE_KIND_ORDER_BY_BOARD[board].filter((k) => pool.includes(k));
  const meRole = pickRandom(kinds);
  const takeIdx = pool.indexOf(meRole);
  pool.splice(takeIdx, 1);
  return { meRole, aiDeck: shuffleRoles(pool) };
}

/** 12 人位：设计稿固定 (x,y) 表映射到环形容器（槽位尺寸见 `RingSeatGeometry`） */
type RingSeat = { left: number; top: number; nudgeY: number };

function seatAvatarSource(playerId: string, meAvatarIdx: number | undefined): ImageSourcePropType {
  if (playerId === 'me') {
    return getPlayerGridAvatar(playerId, meAvatarIdx);
  }
  /** AI：与选人/图鉴同款透明立绘，叠在牛皮纸色圆框上（不用白底 generated chibi） */
  return getCharacterPickerPortraitById(playerId);
}

function shuffleIds<T>(items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

/** 非 12 人时退回圆周等角 */
function ringSeatPositionsCircle(
  count: number,
  lw: number,
  lh: number,
  g: RingSeatGeometry,
  cyOffsetPx: number
): RingSeat[] {
  if (count <= 0 || lw < 48 || lh < 48) return [];
  const cx = lw / 2;
  const cy = lh / 2 + cyOffsetPx;
  const R = Math.min(lw, lh) * 0.41;
  const out: RingSeat[] = [];
  for (let i = 0; i < count; i++) {
    const ang = -Math.PI / 2 + (2 * Math.PI * i) / count;
    out.push({
      left: cx + R * Math.cos(ang) - g.slotW / 2,
      top: cy + R * Math.sin(ang) - g.slotH / 2,
      nudgeY: 0,
    });
  }
  return out;
}

/**
 * 12 人座位：设计稿手写坐标（槽位 1→12），按参考画布映射到当前 ring；
 * `left = x - slotW/2`、`top = y - slotH/2`，等价以 (x,y) 为中心。
 * 参考宽 1364、高 1154；水平外扩后以 `lh/2+cyOffset` 为竖轴把 y 向中心收一点，再整体上移。
 */
const SEAT_PRESET_DESIGN_REF_W = 1364;
const SEAT_PRESET_DESIGN_REF_H = 1154;
/** 相对原坐标整体右移，使环心约对齐 1536 宽背景上桌子水平中心（768−682） */
const SEAT_PRESET_PAN_DESIGN_X = 86;
/** 略下移，更贴背景桌心 */
const SEAT_PRESET_PAN_DESIGN_Y = 12;
/** 映射后再以环心 `lw/2` 水平拉开：左右都外扩，右侧更大 */
const SEAT_HORIZ_STRETCH_L = 1.168;
const SEAT_HORIZ_STRETCH_R = 1.272;
/** 竖直方向向环心收拢：1 不变，<1 上下向 `lh/2+cyOffset` 聚拢 */
const SEAT_VERT_TOWARD_CENTER = 0.87;
/** 整环相对舞台略上移（占环区高度比例），避免贴底 */
const SEAT_RING_SHIFT_UP_FRAC = 0.03;
/** 全体头像在环区内再平移（px）：负为左、上 */
const SEAT_GLOBAL_NUDGE_X = -12;
const SEAT_GLOBAL_NUDGE_Y = -14;

const SEAT_PRESET_POINTS_DESIGN: readonly { x: number; y: number }[] = [
  { x: 682, y: 268 },
  { x: 871, y: 300 },
  { x: 1033, y: 408 },
  { x: 1108, y: 585 },
  { x: 1016, y: 758 },
  { x: 857, y: 847 },
  { x: 682, y: 886 },
  { x: 507, y: 847 },
  { x: 348, y: 758 },
  { x: 256, y: 585 },
  { x: 331, y: 408 },
  { x: 493, y: 300 },
];

/** 6 人局：沿用 12 人设计稿 1、3、5、7、9、11 号位（1-based）→ 预设点下标 0,2,4,6,8,10 */
const SEAT_PRESET_INDICES_6_PLAYER: readonly number[] = [0, 2, 4, 6, 8, 10];

function stadiumSeatPositionsFromPresetIndices(
  presetIndices: readonly number[],
  lw: number,
  lh: number,
  g: RingSeatGeometry,
  cyOffsetPx: number
): RingSeat[] {
  if (lw < 48 || lh < 48) return [];
  const out: RingSeat[] = [];
  for (const i of presetIndices) {
    const pt = SEAT_PRESET_POINTS_DESIGN[i];
    if (!pt) continue;
    const { x: xd, y: yd } = pt;
    let x = ((xd + SEAT_PRESET_PAN_DESIGN_X) / SEAT_PRESET_DESIGN_REF_W) * lw;
    const cx = lw / 2;
    const k = x >= cx ? SEAT_HORIZ_STRETCH_R : SEAT_HORIZ_STRETCH_L;
    x = cx + (x - cx) * k;
    let y =
      ((yd + SEAT_PRESET_PAN_DESIGN_Y) / SEAT_PRESET_DESIGN_REF_H) * lh +
      cyOffsetPx -
      lh * SEAT_RING_SHIFT_UP_FRAC;
    const vc = lh / 2 + cyOffsetPx;
    y = vc + (y - vc) * SEAT_VERT_TOWARD_CENTER;
    out.push({
      left: x - g.slotW / 2,
      top: y - g.slotH / 2,
      nudgeY: 0,
    });
  }
  return out;
}

function stadiumSeatPositions12(
  lw: number,
  lh: number,
  g: RingSeatGeometry,
  cyOffsetPx: number
): RingSeat[] {
  const all = Array.from({ length: SEAT_PRESET_POINTS_DESIGN.length }, (_, i) => i);
  return stadiumSeatPositionsFromPresetIndices(all, lw, lh, g, cyOffsetPx);
}

function stadiumSeatPositions6(
  lw: number,
  lh: number,
  g: RingSeatGeometry,
  cyOffsetPx: number
): RingSeat[] {
  return stadiumSeatPositionsFromPresetIndices(
    SEAT_PRESET_INDICES_6_PLAYER,
    lw,
    lh,
    g,
    cyOffsetPx
  );
}

function ringSeatLayout(
  count: number,
  lw: number,
  lh: number,
  g: RingSeatGeometry,
  cyOffsetPx: number
): RingSeat[] {
  if (count === 12) return stadiumSeatPositions12(lw, lh, g, cyOffsetPx);
  if (count === 6) return stadiumSeatPositions6(lw, lh, g, cyOffsetPx);
  return ringSeatPositionsCircle(count, lw, lh, g, cyOffsetPx);
}

/** 保证与 `players` 一一对应且顺序与圆桌槽位一致；`seatOrder` 异常时用稳定默认序兜底 */
function buildSeatIdOrder(players: RoomPlayer[], seatOrder: string[]): string[] {
  const want = players.map((p) => p.id);
  if (seatOrder.length !== players.length) return want;
  const set = new Set(want);
  const head: string[] = [];
  for (const id of seatOrder) {
    if (set.has(id) && !head.includes(id)) head.push(id);
  }
  const tail = want.filter((id) => !head.includes(id));
  if (head.length + tail.length !== want.length) return want;
  return [...head, ...tail];
}

type GameRoomRouteConfig = {
  board: WerewolfGameBoard;
  playerRole: string;
  selectedAIIds: string[];
  /** 选角页每次「开始」传入，用于强制重新执行开局洗牌 */
  matchNonce: number;
  fromTutorial: boolean;
  /** 默认 true：好人可跳过 AI 逐字动画；狼人身份时界面不提供跳过 */
  allowSkipAiWait: boolean;
  /**
   * When true, daytime exile per-voter ballots are visible to AI brains (debug/sim only).
   * Default false: secret ballot — AI must not know who voted for whom.
   */
  dayExileVotesPublic: boolean;
};

function fallbackAiIdsForBoard(board: WerewolfGameBoard): string[] {
  return CHARACTERS.slice(0, aiOpponentCountForBoard(board)).map((c) => c.id);
}

function parseGameRoomConfig(route: any): { config: GameRoomRouteConfig; configInvalid: boolean } {
  const raw = route?.params?.config;
  const defaultBoard: WerewolfGameBoard = 'Standard12';
  if (!raw || typeof raw !== 'object') {
    return {
      configInvalid: true,
      config: {
        board: defaultBoard,
        playerRole: 'Random',
        selectedAIIds: fallbackAiIdsForBoard(defaultBoard),
        matchNonce: 0,
        fromTutorial: false,
        allowSkipAiWait: true,
        dayExileVotesPublic: false,
      },
    };
  }
  const ids = raw.selectedAIIds;
  const parsedBoard = parseGameBoard(raw.board);
  const board: WerewolfGameBoard = parsedBoard === 'Avalon10' ? defaultBoard : parsedBoard;
  const needAi = aiOpponentCountForBoard(board);
  const idsOk = Array.isArray(ids) && ids.length === needAi;
  const configInvalid = !idsOk;
  const rawNonce = (raw as { matchNonce?: unknown }).matchNonce;
  const matchNonce =
    typeof rawNonce === 'number' && Number.isFinite(rawNonce) ? rawNonce : 0;
  const rawBallot = (raw as { dayExileVotesPublic?: unknown }).dayExileVotesPublic;
  const debugPublicBallot =
    rawBallot === true ||
    rawBallot === 'true' ||
    rawBallot === 1 ||
    rawBallot === '1';
  const dayExileVotesPublic = boardUsesSecretDayBallot(board) ? debugPublicBallot : true;
  return {
    configInvalid,
    config: {
      board,
      playerRole: typeof raw.playerRole === 'string' ? raw.playerRole : 'Random',
      selectedAIIds: idsOk ? (ids as string[]).slice(0, needAi) : fallbackAiIdsForBoard(board),
      matchNonce,
      fromTutorial: raw.fromTutorial === true,
      allowSkipAiWait: (raw as { allowSkipAiWait?: boolean }).allowSkipAiWait !== false,
      dayExileVotesPublic,
    },
  };
}

/**
 * AI-facing log slice for one seat (information isolation) — 与 UI 同一套旁白可见性。
 */
function aiHistoryForPlayer(
  player: RoomPlayer,
  narratorLines: readonly NarratorLine[],
  lang: AppLanguage,
  dayExileVotesPublic: boolean | undefined,
  limit = 40
): string[] {
  return recentNarratorLogsForAi(
    player,
    narratorLines,
    { lang, dayExileVotesPublic },
    limit
  );
}

/** AI-facing logs from this dawn onward; used by day speech, sheriff, last words, and exile. */
function aiCurrentDayHistoryForPlayer(
  player: RoomPlayer,
  narratorLines: readonly NarratorLine[],
  lang: AppLanguage,
  dayExileVotesPublic: boolean | undefined,
  limit = 40
): string[] {
  return recentCurrentDayNarratorLogsForAi(
    player,
    narratorLines,
    { lang, dayExileVotesPublic },
    limit
  );
}

/** 全员公开视角（发言检测、记忆摄取等）。 */
function publicTableLogLines(
  narratorLines: readonly NarratorLine[],
  lang: AppLanguage,
  limit = 80
): string[] {
  return publicNarratorLogStrings(narratorLines, lang, limit);
}

function currentDayPublicTableLogLines(
  narratorLines: readonly NarratorLine[],
  lang: AppLanguage,
  limit = 80
): string[] {
  return currentDayPublicNarratorLogStrings(narratorLines, lang, limit);
}

function buildGameContextForPlayer(params: {
  player: RoomPlayer;
  allPlayers: readonly RoomPlayer[];
  tableOrder: readonly string[];
  dayNumber: number;
  sheriffId: string | null;
  wolfPackIds: readonly string[] | null;
  lang: AppLanguage;
  wolfchaPhase: ReturnType<typeof uiDayPhaseToWolfcha>;
  seerChecks?: readonly SeerCheckRecord[];
  witchState?: WitchNightState;
  witchKnifeName?: string | null;
  voteHistory?: readonly VoteHistoryEntry[];
  dayExileVotesPublic?: boolean;
  guardLastTargetName?: string | null;
}): string {
  const {
    player,
    allPlayers,
    tableOrder,
    dayNumber,
    sheriffId,
    wolfPackIds,
    lang,
    wolfchaPhase,
    seerChecks,
    witchState,
    witchKnifeName,
    voteHistory,
    dayExileVotesPublic,
    guardLastTargetName,
  } = params;
  return buildAiPromptContext({
    observer: player,
    allPlayers,
    tableOrder,
    dayNumber,
    phase: wolfchaPhase,
    sheriffId,
    wolfPackIds,
    lang,
    seerChecks: player.role === 'Seer' ? seerChecks : undefined,
    witchState: player.role === 'Witch' ? witchState : undefined,
    witchKnifeTargetName:
      player.role === 'Witch' && witchState?.hasAntidote ? witchKnifeName : undefined,
    knightDuelUsed: player.knightDuelUsed,
    guardLastTargetName: player.role === 'Guard' ? guardLastTargetName : undefined,
    voteHistory,
    dayExileVotesPublic,
  });
}

/**
 * Builds short perspective hints for the LLM's <focus_angle> block.
 * Only includes situational info NOT already covered by speakOrderHint.
 */
function buildAiFocusAngleHints(
  player: RoomPlayer,
  logs: string[],
  llmSignalLines: string[],
  lang: AppLanguage,
  humanPlayerName: string
): string[] {
  const hints: string[] = [];

  const directedSpeech = findLatestUnansweredDirectedSpeech({
    logs,
    targetName: player.name,
    humanPlayerName,
    lang,
  });
  if (directedSpeech) {
    hints.push(directedSpeechPromptHint(directedSpeech, lang));
  }

  const character = CHARACTERS.find((c) => c.id === player.id);
  const bystanderSpeech = directedSpeech
    ? null
    : findLatestUnansweredBystanderSpeech({
        logs,
        observerName: player.name,
        humanPlayerName,
        characterNames: CHARACTERS.map((c) => c.name),
        lang,
      });
  const reactsAsBystander =
    character &&
    bystanderSpeech &&
    shouldReactAsBystander({
      observerId: player.id,
      personalityLabel: character.personality,
      profile: getAIBehaviorProfile(character),
      reaction: bystanderSpeech,
    });
  if (bystanderSpeech && reactsAsBystander) {
    hints.push(bystanderSpeechPromptHint(bystanderSpeech, lang));
  }

  const hasSocialReaction = Boolean(directedSpeech || (bystanderSpeech && reactsAsBystander));

  if (llmSignalLines.length > 0) {
    hints.push(...llmSignalLines.slice(0, hasSocialReaction ? 1 : 2));
  }

  const recentMentions = logs
    .slice(-15)
    .filter(
      (l) =>
        l.includes(player.name) &&
        !l.startsWith(player.name + ':') &&
        !l.startsWith(player.name + '：')
    );
  if (!hasSocialReaction && recentMentions.length > 0) {
    hints.push(
      lang === 'zh'
        ? '其他玩家最近提到了你，可以考虑是否需要回应或澄清。'
        : 'Others mentioned you recently — decide whether to respond, clarify, or let it go.'
    );
  }

  return hints.slice(0, 3);
}

/** Extracts the last few lines this player has said today (from log prefixes). */
function extractSelfSpeechToday(playerName: string, logs: string[], lang: AppLanguage): string | null {
  const prefix1 = `${playerName}：`;
  const prefix2 = `${playerName}: `;
  const lines = logs
    .filter((l) => l.startsWith(prefix1) || l.startsWith(prefix2))
    .map((l) => l.replace(/^[^：:]+[：:]\s*/, ''))
    .slice(-4);
  if (lines.length === 0) return null;
  return lang === 'zh' ? lines.join('\n') : lines.join('\n');
}

async function fetchSpeechSafe(
  character: Parameters<typeof fetchAISpeechBubbles>[0],
  role: Parameters<typeof fetchAISpeechBubbles>[1],
  history: Parameters<typeof fetchAISpeechBubbles>[2],
  lang: Parameters<typeof fetchAISpeechBubbles>[3],
  ctx: Parameters<typeof fetchAISpeechBubbles>[4]
): Promise<string[]> {
  const channel = ctx?.channel ?? 'discussion';
  let lastErr: unknown = null;

  const attemptLlm = async (): Promise<string[] | null> => {
    try {
      const bubbles = await fetchAISpeechBubbles(character, role, history, lang, ctx);
      const split = expandSpeechBubbleParts(bubbles);
      const out = split
        .map((b) => {
          const t = b.trim();
          if (!t) return '';
          const fixedSelf = fixSelfThirdPersonSpeech(t, character.name, lang);
          return fixedSelf ?? t;
        })
        .filter((b) => b.length > 0);
      return out.length > 0 ? out : null;
    } catch (e) {
      lastErr = e;
      if (__DEV__) console.warn('[fetchSpeechSafe] LLM failed:', character.name, e);
      return null;
    }
  };

  // One bounded request per turn. Repeating a timed-out speech request made a
  // single AI player hold the table for several minutes.
  const retryDelaysMs = [0];
  for (const delay of retryDelaysMs) {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    const speech = await attemptLlm();
    if (speech) return speech;
  }

  const detail = formatLlmErrorForUser(lastErr, lang);
  reportLlmFail(detail);
  if (__DEV__) {
    console.warn('[fetchSpeechSafe] LLM failed after retries → pass', character.name, lastErr);
  }
  return [llmSpeechFailureLine(lang, channel)];
}

export default function GameRoomScreen({ route, navigation }: any) {
  const { config, configInvalid } = parseGameRoomConfig(route);
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
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
  const { width: backdropWinW } = useWindowDimensions();
  /** 底图水平偏移：首次稳定屏宽后冻结，避免视口微抖时背景左右飘 */
  const [backdropPanX, setBackdropPanX] = useState(() => -Math.round(backdropWinW * 0.09));
  const backdropPanFrozenRef = useRef(false);
  useLayoutEffect(() => {
    if (backdropPanFrozenRef.current) return;
    if (backdropWinW < 200) return;
    backdropPanFrozenRef.current = true;
    setBackdropPanX(-Math.round(backdropWinW * 0.09));
  }, [backdropWinW]);
  const ringGeom = NATIVE_RING_GEOMETRY;
  /** 局内圆桌：透明底立绘圆内展示；木金圆框 + 点击热区 */
  const sceneSeatMetrics = useMemo(() => {
    const bodyW = Math.min(58, Math.max(50, Math.round(ringGeom.slotW * 0.82)));
    const bodyH = bodyW;
    const portraitOuter = bodyW + 12;
    const aiDraw = Math.round(bodyW * SEAT_AI_BODY_PORTRAIT_DRAW_SCALE);
    return {
      bodyW,
      bodyH,
      aiPortraitDrawW: aiDraw,
      aiPortraitDrawH: aiDraw,
      /** 立绘在圆内略偏上；contain 保证头顶完整，由底部裁切 */
      aiPortraitMarginTop: Math.round(bodyH * SEAT_AI_BODY_PORTRAIT_MARGIN_TOP_FRAC),
      /** 与圆木框外径一致，铭牌宽度对齐参考图 */
      namePlateMaxW: portraitOuter,
      hit: {
        width: Math.round(ringGeom.slotW),
        height: Math.round(
          Math.max(ringGeom.slotH * 0.92, bodyH + 12 + 34 + (ringGeom.slotH > 100 ? 14 : 10))
        ),
      },
    };
  }, [ringGeom.slotW, ringGeom.slotH]);

  const scrollViewRef = useRef<ScrollView>(null);
  const eventsScrollRef = useRef<ScrollView>(null);
  const chatScrollViewportRef = useRef<View>(null);
  const chatAnchorRowRef = useRef<View>(null);
  const chatScrollYRef = useRef(0);
  const [chatScrollY, setChatScrollY] = useState(0);
  /** 「房间就绪」在滚动内容中的 Y（不含 content paddingTop） */
  const chatAnchorContentYRef = useRef<number | null>(null);
  /** 开局时「房间就绪」在滚动视口内的顶边 Y（固定裁切线，非列表序号） */
  const chatClipViewportYRef = useRef(PARCHMENT_SCROLL_PAD_TOP);
  const chatClipSlotCapturedRef = useRef(false);
  /** 上滚下限：使「房间就绪」顶边停在开局时的裁切线位置 */
  const chatMinScrollYRef = useRef<number | null>(null);
  const chatRowLayoutYRef = useRef<Map<string, number>>(new Map());
  const chatScrollContentHRef = useRef(0);
  const chatScrollViewportHRef = useRef(0);
  const isChatScrollNearBottomRef = useRef(true);
  type ParchmentPanelTab = 'chat' | 'events' | 'notepad';
  const [parchmentPanelTab, setParchmentPanelTab] = useState<ParchmentPanelTab>('chat');
  const [playerNotepad, setPlayerNotepad] = useState('');
  const [narratorLogEpoch, setNarratorLogEpoch] = useState(0);
  const breathe = useRef(new Animated.Value(0)).current;

  /** 发言高亮：不用 `transform: scale`（子像素缩放易让透明 PNG 在圆裁切下出现黑边/糊边），改用轻微不透明度脉冲 */
  const breathOpacity = useMemo(
    () =>
      breathe.interpolate({
        inputRange: [0, 1],
        outputRange: Platform.OS === 'web' ? [0.985, 1] : [0.94, 1],
      }),
    [breathe]
  );

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [breathe]);

  const [uiLang, setUiLang] = useState<AppLanguage>('zh');
  const uiLangRef = useRef<AppLanguage>('zh');
  /** 允许离开 GameRoom（已在弹窗中确认），避免 beforeRemove 无限拦截 */
  const allowGameExitRef = useRef(false);
  useEffect(() => {
    uiLangRef.current = uiLang;
  }, [uiLang]);

  const promptLeaveGame = useCallback(() => {
    promptExitGameWithConfirm(navigation, uiLangRef.current, allowGameExitRef, clearGameSession);
  }, [navigation]);

  const leaveToHomeFromEnded = useCallback(() => {
    allowGameExitRef.current = true;
    clearGameSession();
    exitToHome(navigation);
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(APP_LANGUAGE_KEY).then((v) => {
        if (v === 'zh' || v === 'en') setUiLang(v);
      });
    }, [])
  );

  useEffect(() => {
    return () => {
      void stopAiSpeech();
    };
  }, []);

  /** 昼夜底图常驻两张，opacity 切换，避免换 `source` 时空白闪一下；预取仅原生（web 的 Image 无 resolveAssetSource） */
  useEffect(() => {
    const resolve = Image.resolveAssetSource as ((s: ImageSourcePropType) => { uri?: string } | undefined) | undefined;
    if (typeof resolve !== 'function' || typeof Image.prefetch !== 'function') return;
    const d = resolve(GAME_ROOM_BACKGROUND_DAY);
    const n = resolve(GAME_ROOM_BACKGROUND_NIGHT);
    if (d?.uri) void Image.prefetch(d.uri);
    if (n?.uri) void Image.prefetch(n.uri);
  }, []);

  const [roomReady, setRoomReady] = useState(false);
  /** Gate "开始本局" until LLM probe succeeds (so night AI actions are not silent). */
  const [llmLinkStatus, setLlmLinkStatus] = useState<'pending' | 'ready' | 'failed'>('pending');
  const llmProbeGenRef = useRef(0);
  /** 与主页 / 选人共用 `HUB_BGM_ENABLED_KEY`，关则对局内也不自动播 BGM。 */
  const [matchBgmEnabled, setMatchBgmEnabled] = useState(false);
  const [matchBgmPrefReady, setMatchBgmPrefReady] = useState(false);
  const reloadMatchBgmPref = useCallback(() => {
    void readHubBgmEnabled().then((enabled) => {
      setMatchBgmEnabled(enabled);
      setMatchBgmPrefReady(true);
    });
  }, []);

  useEffect(() => {
    reloadMatchBgmPref();
    return subscribeHubBgmEnabled((enabled) => {
      setMatchBgmEnabled(enabled);
      setMatchBgmPrefReady(true);
    });
  }, [reloadMatchBgmPref]);

  useFocusEffect(
    useCallback(() => {
      reloadMatchBgmPref();
    }, [reloadMatchBgmPref])
  );
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  /** 顺时针座位序（左上为 1 号）；开局随机洗入玩家 */
  const [tableSeatOrder, setTableSeatOrder] = useState<string[]>([]);
  const tableSeatOrderRef = useRef<string[]>([]);
  const playersRef = useRef<RoomPlayer[]>([]);
  const charactersById = useMemo(() => new Map(CHARACTERS.map((c) => [c.id, c])), []);
  const aiSpeechBrainHubRef = useRef<AiSpeechBrainHub | null>(null);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    tableSeatOrderRef.current = tableSeatOrder;
  }, [tableSeatOrder]);

  type TutorialRoomDraft = {
    lang: AppLanguage;
    meName: string;
    meAvatarIdx: number;
    selectedAIIds: string[];
    board: WerewolfGameBoard;
  };
  const tutorialInitDraftRef = useRef<TutorialRoomDraft | null>(null);
  const [tutorialAwaitingRolePick, setTutorialAwaitingRolePick] = useState(false);

  const [phase, setPhase] = useState<DayPhase>('PREPARING');
  /** 昼夜全屏底图（与 phase 解耦：天亮语音时即可切日景，流程仍可处 NIGHT_RESOLVE） */
  const [backdropIsNight, setBackdropIsNight] = useState(false);
  const [actionParchmentLayout, setActionParchmentLayout] = useState({ w: 0, h: 0 });
  const phaseRef = useRef<DayPhase>('PREPARING');
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  /** `contain` 不裁不放大；昼夜底图同框、同平移，叠放仅换 opacity */
  const gameBackdropPanStyle = useMemo((): ViewStyle => {
    return { transform: [{ translateX: backdropPanX }] };
  }, [backdropPanX]);

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e: { preventDefault: () => void }) => {
      if (allowGameExitRef.current) {
        allowGameExitRef.current = false;
        return;
      }
      if (phaseRef.current === 'ENDED') {
        e.preventDefault();
        allowGameExitRef.current = true;
        exitToHome(navigation);
        return;
      }
      e.preventDefault();
      promptLeaveGame();
    });
    return unsub;
  }, [navigation, promptLeaveGame]);

  const [logs, setLogs] = useState<string[]>([]);
  /** 已完成天亮次数（与 nightCountRef 同步，供顶栏 DAY 显示） */
  const [dawnCount, setDawnCount] = useState(0);
  const logsRef = useRef<string[]>([]);
  /** 旁白源（带 visibility）；UI 与 AI 均由此过滤。 */
  const narratorLinesRef = useRef<NarratorLine[]>([]);
  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  /** 发言逐字写入右栏时，尚未 commit 到 narrator 的预览行 */
  const [speechLogLiveLine, setSpeechLogLiveLine] = useState<string | null>(null);

  const [typingText, setTypingText] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheriffCandidatesState, setSheriffCandidatesState] = useState<string[]>([]);
  /** 轮到人类「上警 / 不上警」 */
  const [sheriffSignupGate, setSheriffSignupGate] = useState(false);
  /** 轮到人类警下投警长 */
  const [sheriffVoteGate, setSheriffVoteGate] = useState(false);

  const nightCountRef = useRef(0);
  const witchStateRef = useRef<WitchNightState>({ hasAntidote: true, hasPoison: true });
  const discussionRunningRef = useRef(false);
  const nightAdvanceBusyRef = useRef(false);
  const speechNonceRef = useRef(`g${Date.now()}-${Math.random().toString(36).slice(2)}`);
  /** Per-character model ref map — built once at game start, read on every LLM call */
  const modelRefMapRef = useRef<Map<string, ModelRef>>(new Map());

  const [humanBarVisible, setHumanBarVisible] = useState(false);
  const humanResolveRef = useRef<((text: string) => void) | null>(null);
  const [roleCardDismissed, setRoleCardDismissed] = useState(false);
  const [gameEndEpilogue, setGameEndEpilogue] = useState<{
    winner: 'good' | 'wolf';
    role: RoleCardImageKey;
  } | null>(null);
  const [peerReviewCells, setPeerReviewCells] = useState<PeerReviewCell[]>([]);
  const [peerReviewsModalVisible, setPeerReviewsModalVisible] = useState(false);
  const gameEndWinnerRef = useRef<'good' | 'wolf' | null>(null);
  const postGameReviewsGenRef = useRef(0);
  const peerReviewsStartedRef = useRef(false);
  const witchPoisonHistoryRef = useRef<WitchPoisonRecord[]>([]);

  /** 预言家验人结果弹层（人类确认查验后展示） */
  const [seerInspectCard, setSeerInspectCard] = useState<{
    targetName: string;
    isWolfSide: boolean;
  } | null>(null);

  /** 白痴白天放逐翻牌：全员确认卡片 */
  const [idiotFlipModal, setIdiotFlipModal] = useState<{
    playerId: string;
    name: string;
    avatarSource: ImageSourcePropType;
  } | null>(null);
  const idiotFlipAckResolveRef = useRef<(() => void) | null>(null);
  const confirmIdiotFlipModal = useCallback(() => {
    const r = idiotFlipAckResolveRef.current;
    idiotFlipAckResolveRef.current = null;
    setIdiotFlipModal(null);
    r?.();
  }, []);

  /** 桌上表情：玩家 id → 展示至 until（毫秒） */
  const [seatStickerPop, setSeatStickerPop] = useState<
    Record<string, { stickerId: RoomStickerId; until: number }>
  >({});

  const showSeatSticker = useCallback((playerId: string, stickerId: RoomStickerId) => {
    setSeatStickerPop((prev) => ({
      ...prev,
      [playerId]: { stickerId, until: Date.now() + 4000 },
    }));
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setSeatStickerPop((prev) => {
        const next = { ...prev };
        let dirty = false;
        for (const k of Object.keys(next)) {
          if (next[k]!.until <= now) {
            delete next[k];
            dirty = true;
          }
        }
        return dirty ? next : prev;
      });
    }, 450);
    return () => clearInterval(id);
  }, []);

  const maybeAppendAiFriendSticker = useCallback(
    (speech: string, playerId: string, personality: string) => {
      const character = charactersById.get(playerId);
      const profile = character ? getAIBehaviorProfile(character) : null;
      const brain = aiSpeechBrainHubRef.current?.byAiId[playerId] ?? null;
      const emotion = brain && profile ? getSpeechFacingEmotion(brain.emotion, profile) : 'calm';
      const stickerId = pickAiFriendSticker(speech, playerId, {
        personality,
        emotion,
        stress: brain?.emotion.stress,
        emotionality: profile?.emotionality,
        sociability: profile?.sociability,
      });
      if (!stickerId) return;
      showSeatSticker(playerId, stickerId);
    },
    [charactersById, showSeatSticker]
  );

  const deathRulesAckResolveRef = useRef<(() => void) | null>(null);
  const [deathRulesModalVisible, setDeathRulesModalVisible] = useState(false);

  const confirmDeathRulesModal = useCallback(() => {
    setDeathRulesModalVisible(false);
    const r = deathRulesAckResolveRef.current;
    deathRulesAckResolveRef.current = null;
    r?.();
  }, []);

  const sheriffTutorialAckRef = useRef<(() => void) | null>(null);
  const [sheriffTutorialVisible, setSheriffTutorialVisible] = useState(false);
  const confirmSheriffTutorial = useCallback(() => {
    setSheriffTutorialVisible(false);
    const r = sheriffTutorialAckRef.current;
    sheriffTutorialAckRef.current = null;
    r?.();
  }, []);

  const sheriffIdRef = useRef<string | null>(null);
  const [sheriffPlayerId, setSheriffPlayerId] = useState<string | null>(null);
  const syncSheriffId = useCallback((id: string | null) => {
    sheriffIdRef.current = id;
    setSheriffPlayerId(id);
  }, []);
  const sheriffElectionCompleteRef = useRef(false);
  const sheriffSignupResolveRef = useRef<((v: boolean) => void) | null>(null);
  const sheriffVoteResolveRef = useRef<((id: string | null) => void) | null>(null);
  /** 放逐结算进行中，防止 VOTING 阶段未改 phase 时重复进入（遗言/猎人期间仍为 VOTING）。 */
  const exileVoteFlowBusyRef = useRef(false);

  /** 人类猎人开枪：点选带走目标 */
  const [hunterShotMode, setHunterShotMode] = useState<{ hunterId: string } | null>(null);
  const hunterShotResolveRef = useRef<((id: string | null) => void) | null>(null);

  /** 人类警长出局：弹窗选择警徽继承人（与 `sheriffHandoffResolveRef` 配对） */
  const [sheriffHandoffPick, setSheriffHandoffPick] = useState<SheriffHandoffPickState | null>(null);
  const [sheriffHandoffSelectedId, setSheriffHandoffSelectedId] = useState<string | null>(null);
  const sheriffHandoffPickRef = useRef<SheriffHandoffPickState | null>(null);
  const sheriffHandoffResolveRef = useRef<((id: string | null) => void) | null>(null);

  const finishSheriffHandoffPick = useCallback((nextId: string | null) => {
    const r = sheriffHandoffResolveRef.current;
    sheriffHandoffResolveRef.current = null;
    sheriffHandoffPickRef.current = null;
    setSheriffHandoffPick(null);
    setSheriffHandoffSelectedId(null);
    r?.(nextId);
  }, []);

  const [nightSeg, setNightSeg] = useState<NightSeg | null>(null);
  /** 与 `nightSeg` 同步，供计时器/跳过与推进逻辑读取，避免闭包陈旧导致重复推进、界面卡住 */
  const nightSegRef = useRef<NightSeg | null>(null);
  useEffect(() => {
    nightSegRef.current = nightSeg;
  }, [nightSeg]);
  const nightSegAutoTokenRef = useRef(0);
  /** 主页「设置」里选的 Q 版头像索引，用于「我」的格子头像 */
  const [meAvatarIndex, setMeAvatarIndex] = useState(3);
  const [mePixelAvatar, setMePixelAvatar] = useState<PixelAvatarConfig | null>(null);
  const [mePixelAvatarTransforms, setMePixelAvatarTransforms] = useState<AvatarItemTransformMap>(
    DEFAULT_AVATAR_ITEM_TRANSFORMS
  );

  const pendingNightRef = useRef<PendingNightKind>(createEmptyPendingNight());
  /** Wolfcha-shaped state mirror — updated alongside pendingNightRef / phase changes. */
  const wolfchaStateRef = useRef<WolfchaGameState>(createFreshWolfchaState());
  const humanWolfKillVoteRef = useRef<string | null>(null);
  const wolfBeautyModeRef = useRef<'vote' | 'charm'>('vote');
  const humanWolfCharmTargetRef = useRef<string | null>(null);
  /** 最近一次成功魅惑所在「夜序号」（与 nightCountRef 在狼人行动时一致：已完成天亮次数）及目标，用于禁止连续两晚魅惑同一人 */
  const wolfBeautyCharmMetaRef = useRef<{ lastNight: number; lastTarget: string | null }>({
    lastNight: -999,
    lastTarget: null,
  });
  /** 预言家私有查验记录（仅注入该预言家 AI prompt）。 */
  const seerPrivateRef = useRef<Map<string, SeerCheckRecord[]>>(new Map());
  const humanSeerInspectRef = useRef<string | null>(null);
  const witchHumanSaveRef = useRef<'undecided' | 'yes' | 'no'>('undecided');
  const witchHumanPoisonRef = useRef<string | null>(null);
  /** 女巫解药选择变化时 bump，以便用 ref 驱动「救人则隐藏开毒」的 UI */
  const [witchUiTick, setWitchUiTick] = useState(0);
  /** 人类女巫：点「毒药」后进入点选毒杀目标子界面 */
  const [witchPoisonPickMode, setWitchPoisonPickMode] = useState(false);
  const humanGuardTargetRef = useRef<string | null>(null);
  /** 守卫上一晚守护目标（守卫板启用后写入 prompt）。 */
  const guardLastTargetRef = useRef<{ id: string; name: string } | null>(null);
  const knightDuelResolveRef = useRef<
    ((v: { useSkill: boolean; targetId: string | null }) => void) | null
  >(null);
  const [knightDuelMode, setKnightDuelMode] = useState(false);
  const [nightHumanGate, setNightHumanGate] = useState(false);
  /** 人类点过底栏主操作后先收起按钮（含等待其他玩家/AI 时） */
  const [footerButtonsDismissed, setFooterButtonsDismissed] = useState(false);
  const [wolfBeautyActionMode, setWolfBeautyActionMode] = useState<'vote' | 'charm'>('vote');
  /** 狼美人局：本夜是否已确认狼刀票（确认后才进入魅惑选人） */
  const [wolfBeautyKnifeDoneThisNight, setWolfBeautyKnifeDoneThisNight] = useState(false);
  const [nightWolfVictimId, setNightWolfVictimId] = useState<string | null>(null);
  /** 本夜狼队投刀汇总：目标玩家 id → 票数（仅狼人 UI 展示） */
  const [wolfPackKnifeTally, setWolfPackKnifeTally] = useState<Record<string, number>>({});
  /** 当前狼人行动段：每名狼人（id）→ 刀票目标（用于过程中展示与结束时结算） */
  const wolfPackKillVoteByWolfRef = useRef<Map<string, string>>(new Map());
  /** 狼刀阶段 AI 决策进行中（进入段时启动，finalize 时会 await） */
  const aiWolfKillSeedInFlightRef = useRef<Promise<void> | null>(null);

  const resetNightChoices = useCallback(() => {
    humanWolfKillVoteRef.current = null;
    wolfBeautyModeRef.current = 'vote';
    humanWolfCharmTargetRef.current = null;
    humanSeerInspectRef.current = null;
    witchHumanSaveRef.current = 'undecided';
    witchHumanPoisonRef.current = null;
    humanGuardTargetRef.current = null;
    setWolfBeautyActionMode('vote');
    setWolfBeautyKnifeDoneThisNight(false);
    setNightWolfVictimId(null);
    pendingNightRef.current = createEmptyPendingNight();
    wolfchaStateRef.current = syncNightActions(wolfchaStateRef.current, pendingNightRef.current);
    setSeerInspectCard(null);
    wolfPackKillVoteByWolfRef.current = new Map();
  }, []);

  const recomputeWolfPackKnifeTally = useCallback(() => {
    const alive = playersRef.current.filter((p) => p.isAlive);
    const outsiders = alive.filter((p) => !isWolfTeam(p.role));
    const wolves = alive.filter((p) => isWolfTeam(p.role) && p.canVote !== false);
    const tally = new Map<string, number>();
    for (const w of wolves) {
      const tid = wolfPackKillVoteByWolfRef.current.get(w.id);
      if (!tid) continue;
      const basePool =
        outsiders.length > 0
          ? outsiders
          : alive.filter((p) => p.id !== w.id);
      const pool = basePool.filter((p) => p.id !== w.id);
      if (!pool.some((p) => p.id === tid)) continue;
      tally.set(tid, (tally.get(tid) ?? 0) + 1);
    }
    const tallyObj: Record<string, number> = {};
    for (const [id, c] of tally) tallyObj[id] = c;
    setWolfPackKnifeTally(tallyObj);
  }, []);

  const runAiWolfKillDecisions = useCallback(
    async (opts?: { showThinking?: boolean }) => {
      const lang = uiLangRef.current;
      const alive = playersRef.current.filter((p) => p.isAlive);
      const outsiders = alive.filter((p) => !isWolfTeam(p.role));
      const aiWolves = alive
        .filter((p) => isWolfTeam(p.role) && p.canVote !== false && p.isAI)
        .sort((a, b) => a.id.localeCompare(b.id));
      const isFirstNight = nightCountRef.current <= 0;
      const packVotesSoFar: { voterName: string; targetName: string }[] = [];
      const killPoolBase = shuffleKillCandidates(
        outsiders.length > 0 ? outsiders : alive.filter((p) => !isWolfTeam(p.role))
      );

      for (const w of aiWolves) {
        const pool = killPoolBase.filter((p) => p.id !== w.id);
        if (pool.length === 0) continue;

        const char = charactersById.get(w.id);
        if (!char) continue;

        if (opts?.showThinking) setTypingText(gameCopy[lang].aiThinking);

        const brain = aiSpeechBrainHubRef.current?.byAiId[w.id] ?? null;
        const packMateNames =
          brain?.wolfPackMemberIds
            ?.filter((id) => id !== w.id)
            .map((id) => alive.find((p) => p.id === id)?.name)
            .filter((n): n is string => !!n) ?? [];

        const history = aiHistoryForPlayer(
          w,
          narratorLinesRef.current,
          lang,
          config.dayExileVotesPublic,
          48
        );

        const targetId = await resolveAiWolfKillVote({
          wolf: { ...w, name: w.name, isAI: true },
          char,
          modelRef: modelRefMapRef.current.get(w.id),
          brain,
          pool: pool as PoolPlayer[],
          lang,
          history,
          nightNumber: Math.max(1, nightCountRef.current + 1),
          isFirstNight,
          sheriffId: sheriffIdRef.current,
          packMateNames,
          packVotesSoFar,
          alivePlayers: alive.map((p) => ({ id: p.id, name: p.name })),
        });

        wolfPackKillVoteByWolfRef.current.set(w.id, targetId);
        const targetName = alive.find((p) => p.id === targetId)?.name ?? targetId;
        packVotesSoFar.push({ voterName: w.name, targetName });
        recomputeWolfPackKnifeTally();
      }

      if (opts?.showThinking) setTypingText('');
    },
    [charactersById, config.dayExileVotesPublic, recomputeWolfPackKnifeTally]
  );

  const seedAiWolfPackKillPreview = useCallback(async () => {
    wolfPackKillVoteByWolfRef.current = new Map();
    recomputeWolfPackKnifeTally();
    await runAiWolfKillDecisions({ showThinking: false });
  }, [recomputeWolfPackKnifeTally, runAiWolfKillDecisions]);

  useEffect(() => {
    setSelectedId(null);
  }, [nightSeg, phase]);

  useEffect(() => {
    if (phase !== 'NIGHT' || nightSeg !== 'wolves') {
      setWolfPackKnifeTally({});
    }
  }, [phase, nightSeg]);

  useEffect(() => {
    if (phase !== 'NIGHT' || !nightSeg) {
      setNightHumanGate(false);
      return;
    }
    if (nightSeg === 'guard') {
      humanGuardTargetRef.current = null;
    }
    if (nightSeg === 'wolves') {
      void playWolfKnifeHowlIfNewNight(nightCountRef.current);
      wolfBeautyModeRef.current = 'vote';
      setWolfBeautyActionMode('vote');
      setWolfBeautyKnifeDoneThisNight(false);
      humanWolfKillVoteRef.current = null;
      humanWolfCharmTargetRef.current = null;
      wolfPackKillVoteByWolfRef.current = new Map();
      recomputeWolfPackKnifeTally();
      aiWolfKillSeedInFlightRef.current = seedAiWolfPackKillPreview().catch(() => undefined);
    }
    if (nightSeg === 'witch') {
      witchHumanSaveRef.current = 'undecided';
      witchHumanPoisonRef.current = null;
      setWitchPoisonPickMode(false);
      setWitchUiTick((n) => n + 1);
    }
    if (nightSeg === 'seer') {
      humanSeerInspectRef.current = null;
    }
    if (nightSeg === 'wolf_beauty') {
      humanWolfCharmTargetRef.current = null;
      wolfBeautyModeRef.current = 'charm';
      setWolfBeautyActionMode('charm');
    }

    const me = playersRef.current.find((p) => p.id === 'me');
    setNightHumanGate(
      nightSegmentNeedsHumanInput(
        nightSeg,
        me,
        me?.role === 'Witch' ? witchStateRef.current : undefined
      )
    );
    nightSegAutoTokenRef.current += 1;
  }, [phase, nightSeg, seedAiWolfPackKillPreview]);

  const footerButtonsContextKey = useMemo(
    () =>
      [
        phase,
        nightSeg ?? '-',
        sheriffSignupGate,
        sheriffVoteGate,
        hunterShotMode?.hunterId ?? '',
        knightDuelMode,
        witchPoisonPickMode,
      ].join('\0'),
    [
      phase,
      nightSeg,
      sheriffSignupGate,
      sheriffVoteGate,
      hunterShotMode,
      knightDuelMode,
      witchPoisonPickMode,
    ]
  );

  useEffect(() => {
    setFooterButtonsDismissed(false);
  }, [footerButtonsContextKey]);

  useEffect(() => {
    if (!roomReady) return;
    void import('../fonts/ensureZpixLoaded').then(({ ensureZpixLoaded }) => {
      void ensureZpixLoaded();
    });
    void import('../utils/preloadGameEntryAssets').then(({ preloadGameEntryAssets }) => {
      preloadGameEntryAssets(config.board);
    });
  }, [roomReady, config.board]);

  useEffect(() => {
    if (!isFocused || !roomReady || phase === 'ENDED' || !matchBgmPrefReady) {
      void stopGameRoomBgm();
      return;
    }
    if (matchBgmEnabled) {
      void startGameRoomBgm();
    } else {
      void stopGameRoomBgm();
    }
  }, [isFocused, roomReady, phase, matchBgmEnabled, matchBgmPrefReady]);

  useEffect(() => {
    return () => {
      void stopGameRoomBgm();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setRoleCardDismissed(false);

    (async () => {
      if (configInvalid) {
        setTutorialAwaitingRolePick(false);
        tutorialInitDraftRef.current = null;
        setRoomReady(false);
        setLlmLinkStatus('pending');
        setPlayers([]);
        playersRef.current = [];
        aiSpeechBrainHubRef.current = null;
        setTableSeatOrder([]);
        tableSeatOrderRef.current = [];
        setGameEndEpilogue(null);
        setPeerReviewCells([]);
        setPeerReviewsModalVisible(false);
        gameEndWinnerRef.current = null;
        witchPoisonHistoryRef.current = [];
        postGameReviewsGenRef.current += 1;
        peerReviewsStartedRef.current = false;
        syncSheriffId(null);
        return;
      }
      const [raw, nickRaw, avatarRaw, pixelAvatarRaw, pixelAvatarTransformsRaw, cloudModelRaw] =
        await Promise.all([
          AsyncStorage.getItem(APP_LANGUAGE_KEY),
          AsyncStorage.getItem(USER_NICKNAME_KEY),
          AsyncStorage.getItem(USER_AVATAR_INDEX_KEY),
          AsyncStorage.getItem(USER_PIXEL_AVATAR_CONFIG_KEY),
          AsyncStorage.getItem(USER_PIXEL_AVATAR_TRANSFORMS_KEY),
          AsyncStorage.getItem(CLOUD_MODEL_ENABLED_KEY),
        ]);
      if (cancelled) return;
      const lang: AppLanguage = raw === 'en' ? 'en' : 'zh';
      setUiLang(lang);
      const cloudModelEnabled = cloudModelRaw !== 'false';
      setRuntimeLlmProviderOverride(cloudModelEnabled ? null : 'ollama');
      const parsedAvatar = parseInt(avatarRaw ?? '', 10);
      const meAvatarIdx =
        Number.isFinite(parsedAvatar) &&
        parsedAvatar >= 0 &&
        parsedAvatar < HUMAN_CHIBI_COUNT
          ? parsedAvatar
          : 3;
      setMeAvatarIndex(meAvatarIdx);
      const nextPixelAvatar = parsePixelAvatarConfig(pixelAvatarRaw);
      setMePixelAvatar(nextPixelAvatar);
      setMePixelAvatarTransforms(parseAvatarItemTransforms(pixelAvatarTransformsRaw, nextPixelAvatar));
      const trimmed = typeof nickRaw === 'string' ? nickRaw.trim() : '';
      const meName =
        trimmed.length > 0
          ? trimmed.slice(0, USER_NICKNAME_MAX_LEN)
          : lang === 'en'
            ? 'You'
            : '你';

      if (cancelled) return;

      const restored = loadGameSession<WerewolfSessionSnapshot>('werewolf', config.matchNonce);
      if (restored && !config.fromTutorial && !cancelled) {
        modelRefMapRef.current = new Map(Object.entries(restored.modelRefMap));
        playersRef.current = restored.players;
        tableSeatOrderRef.current = restored.tableSeatOrder;
        nightCountRef.current = restored.nightCount;
        witchStateRef.current = restored.witchState;
        seerPrivateRef.current = recordToMap(restored.seerPrivate);
        guardLastTargetRef.current = restored.guardLastTarget;
        wolfBeautyCharmMetaRef.current = restored.wolfBeautyCharmMeta;
        witchPoisonHistoryRef.current = restored.witchPoisonHistory;
        sheriffIdRef.current = restored.sheriffId;
        sheriffElectionCompleteRef.current = restored.sheriffElectionComplete;
        pendingNightRef.current = restored.pendingNight;
        wolfchaStateRef.current = restored.wolfcha;
        narratorLinesRef.current = restored.narratorLines;
        logsRef.current = restored.logs;
        aiSpeechBrainHubRef.current = restored.aiBrainHub;
        if (aiSpeechBrainHubRef.current) {
          bindWolfPackKnowledge(aiSpeechBrainHubRef.current, restored.players);
        }
        syncSheriffId(restored.sheriffId);
        setPlayers(restored.players);
        setTableSeatOrder(restored.tableSeatOrder);
        setPhase(restored.phase);
        setNightSeg(restored.nightSeg);
        setDawnCount(restored.dawnCount);
        setBackdropIsNight(restored.backdropIsNight);
        setLogs(restored.logs);
        setRoleCardDismissed(restored.roleCardDismissed);
        setPlayerNotepad(restored.playerNotepad);
        setNarratorLogEpoch((n) => n + 1);
        setRoomReady(true);
        return;
      }

      if (config.fromTutorial) {
        tutorialInitDraftRef.current = {
          lang,
          meName,
          meAvatarIdx,
          selectedAIIds: config.selectedAIIds.slice(0, aiOpponentCountForBoard(config.board)),
          board: config.board,
        };
        setPlayers([]);
        playersRef.current = [];
        aiSpeechBrainHubRef.current = null;
        setTableSeatOrder([]);
        tableSeatOrderRef.current = [];
        setRoomReady(false);
        setGameEndEpilogue(null);
        setPeerReviewCells([]);
        setPeerReviewsModalVisible(false);
        gameEndWinnerRef.current = null;
        witchPoisonHistoryRef.current = [];
        postGameReviewsGenRef.current += 1;
        peerReviewsStartedRef.current = false;
        syncSheriffId(null);
        setTutorialAwaitingRolePick(true);
        return;
      }

      if (cancelled) return;

      let meRole: string;
      let aiDeck: string[];
      if (config.playerRole === 'Random') {
        const out = assignHumanRandomUniformKind(config.board);
        meRole = out.meRole;
        aiDeck = out.aiDeck;
      } else {
        const rolePool = [...ROLES_POOL_BY_BOARD[config.board]];
        const shuffled = shuffleRoles(rolePool);
        meRole = config.playerRole;
        const drop = shuffled.indexOf(meRole);
        if (drop >= 0) shuffled.splice(drop, 1);
        aiDeck = shuffled;
      }
      const aiCount = aiOpponentCountForBoard(config.board);
      const initialPlayers: RoomPlayer[] = [
        {
          id: 'me',
          name: meName,
          isAI: false,
          role: meRole,
          isAlive: true,
          canVote: true,
          cannotUseHunterGun: false,
          ...(meRole === 'Idiot' ? { idiotFlipUsed: false } : {}),
        },
        ...config.selectedAIIds.slice(0, aiCount).map((id: string, idx: number) => {
          const char = CHARACTERS.find((c) => c.id === id);
          const r = aiDeck[idx]!;
          return {
            id,
            name: char?.name ?? `AI-${id}`,
            isAI: true,
            role: r,
            isAlive: true,
            canVote: true,
            cannotUseHunterGun: false,
            ...(r === 'Idiot' ? { idiotFlipUsed: false } : {}),
          };
        }),
      ];
      if (cancelled) return;
      const seatIds = shuffleIds(initialPlayers.map((p) => p.id));
      tableSeatOrderRef.current = seatIds;
      nightCountRef.current = 0;
      setDawnCount(0);

      // Build per-character model ref map (wolfcha pattern: each AI gets its own model)
      modelRefMapRef.current = buildModelRefMap(
        initialPlayers
          .filter((p) => p.isAI)
          .map((p) => {
            const char = CHARACTERS.find((c) => c.id === p.id);
            return { id: p.id, difficulty: char?.difficulty };
          })
      );
      resetWolfKnifeHowlNightGate();
      sheriffElectionCompleteRef.current = false;
      wolfBeautyCharmMetaRef.current = { lastNight: -999, lastTarget: null };
      seerPrivateRef.current = new Map();
      wolfchaStateRef.current = createFreshWolfchaState();
      guardLastTargetRef.current = null;
      wolfPackKillVoteByWolfRef.current = new Map();
      syncSheriffId(null);
      setNightSeg(null);
      setPhase('PREPARING');
      setTableSeatOrder(seatIds);
      setPlayers(initialPlayers);
      playersRef.current = initialPlayers;
      aiSpeechBrainHubRef.current = createAiSpeechBrainHub(initialPlayers, {
        dayExileVotesPublic: config.dayExileVotesPublic,
      });
      if (aiSpeechBrainHubRef.current) bindWolfPackKnowledge(aiSpeechBrainHubRef.current, initialPlayers);
      const readyCopy =
        config.board === 'SeerWitch6'
          ? { zh: gameCopy.zh.systemReady6, en: gameCopy.en.systemReady6 }
          : { zh: gameCopy.zh.systemReady, en: gameCopy.en.systemReady };
      const firstLine = makeNarratorLine(readyCopy, 'public', 'GAME_START');
      const byModel = new Map<string, string[]>();
      for (const p of initialPlayers.filter((x) => x.isAI)) {
        const key = modelRefMapRef.current.get(p.id)?.model ?? '?';
        const list = byModel.get(key) ?? [];
        list.push(p.name);
        byModel.set(key, list);
      }
      const modelSummary = [...byModel.entries()]
        .map(([model, names]) => `${model}←${names.join('、')}`)
        .join('；');
      const modelLine = makeNarratorLine(
        {
          zh: `系统：本局座位模型 ${modelSummary}`,
          en: `System: seat models ${[...byModel.entries()]
            .map(([model, names]) => `${model}←${names.join(',')}`)
            .join('; ')}`,
        },
        'public',
        'OTHER'
      );
      narratorLinesRef.current = [firstLine, modelLine];
      chatAnchorContentYRef.current = null;
      chatMinScrollYRef.current = null;
      chatClipViewportYRef.current = PARCHMENT_SCROLL_PAD_TOP;
      chatClipSlotCapturedRef.current = false;
      chatRowLayoutYRef.current = new Map();
      isChatScrollNearBottomRef.current = true;
      setChatScrollY(0);
      const split = splitVisibleLogsForUi(
        { id: 'me', role: meRole },
        narratorLinesRef.current,
        { lang: uiLangRef.current, dayExileVotesPublic: config.dayExileVotesPublic }
      );
      setLogs(split.speechLogs);
      logsRef.current = split.speechLogs;
      setNarratorLogEpoch((n) => n + 1);
      setGameEndEpilogue(null);
      setPeerReviewCells([]);
      setPeerReviewsModalVisible(false);
      gameEndWinnerRef.current = null;
      witchPoisonHistoryRef.current = [];
      postGameReviewsGenRef.current += 1;
      peerReviewsStartedRef.current = false;
      setRoomReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    configInvalid,
    config.board,
    config.playerRole,
    config.selectedAIIds.join(','),
    config.matchNonce,
    config.fromTutorial,
    config.dayExileVotesPublic,
    syncSheriffId,
  ]);

  const buildWerewolfSessionSnapshot = useCallback((): WerewolfSessionSnapshot => ({
    players: playersRef.current,
    tableSeatOrder: tableSeatOrderRef.current,
    phase,
    nightSeg,
    nightCount: nightCountRef.current,
    dawnCount,
    backdropIsNight,
    narratorLines: narratorLinesRef.current,
    logs,
    wolfcha: wolfchaStateRef.current,
    pendingNight: pendingNightRef.current,
    witchState: witchStateRef.current,
    seerPrivate: mapToRecord(seerPrivateRef.current),
    guardLastTarget: guardLastTargetRef.current,
    wolfBeautyCharmMeta: wolfBeautyCharmMetaRef.current,
    witchPoisonHistory: witchPoisonHistoryRef.current,
    sheriffId: sheriffIdRef.current,
    sheriffElectionComplete: sheriffElectionCompleteRef.current,
    modelRefMap: Object.fromEntries(modelRefMapRef.current.entries()),
    aiBrainHub: aiSpeechBrainHubRef.current,
    roleCardDismissed,
    playerNotepad,
  }), [
    backdropIsNight,
    dawnCount,
    logs,
    nightSeg,
    phase,
    playerNotepad,
    roleCardDismissed,
  ]);

  useEffect(() => {
    if (!roomReady || players.length === 0) return;
    const timer = setTimeout(() => {
      saveGameSession('werewolf', config.matchNonce, buildWerewolfSessionSnapshot());
    }, 400);
    return () => clearTimeout(timer);
  }, [
    buildWerewolfSessionSnapshot,
    config.matchNonce,
    phase,
    players.length,
    roomReady,
    logs,
    nightSeg,
    dawnCount,
    backdropIsNight,
    roleCardDismissed,
    playerNotepad,
  ]);

  const addNarratorLine = useCallback(
    (
      input: string | { zh: string; en: string } | NarratorLine,
      visibility: NarratorVisibility = 'public',
      kind: NarratorKind = 'OTHER'
    ) => {
      const line = coalesceNarratorLine(input, visibility, kind);
      narratorLinesRef.current = [...narratorLinesRef.current, line];
      const mePlayer = playersRef.current.find((p) => p.id === 'me');
      const split = splitVisibleLogsForUi(
        { id: 'me', role: mePlayer?.role ?? 'Villager' },
        narratorLinesRef.current,
        { lang: uiLangRef.current, dayExileVotesPublic: config.dayExileVotesPublic }
      );
      logsRef.current = split.speechLogs;
      setLogs(split.speechLogs);
      setNarratorLogEpoch((n) => n + 1);
      if (isChatScrollNearBottomRef.current) {
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      }
    },
    [config.dayExileVotesPublic]
  );

  const addLog = useCallback(
    (text: string, visibility: NarratorVisibility = 'public', kind: NarratorKind = 'OTHER') => {
      addNarratorLine(text, visibility, kind);
    },
    [addNarratorLine]
  );

  useEffect(() => {
    setLlmFailReporter((detail) => {
      const L = uiLangRef.current;
      addLog(
        L === 'zh' ? `系统：AI 发言失败（${detail}）` : `System: AI speech failed (${detail})`
      );
    });
    return () => setLlmFailReporter(null);
  }, [addLog]);

  useEffect(() => {
    if (!roomReady) return;
    let cancelled = false;
    const gen = ++llmProbeGenRef.current;
    void (async () => {
      const lang = uiLangRef.current;
      const gateStart = phaseRef.current === 'PREPARING';
      if (gateStart) setLlmLinkStatus('pending');
      else setLlmLinkStatus('ready');

      const mis = describeLlmMisconfig(lang);
      if (mis) {
        if (cancelled || gen !== llmProbeGenRef.current) return;
        addLog(mis);
        if (gateStart) {
          addLog(lang === 'zh' ? gameCopy.zh.modelConnectFailedHint : gameCopy.en.modelConnectFailedHint);
          setLlmLinkStatus('failed');
        }
        return;
      }

      if (gateStart) {
        addLog(lang === 'zh' ? gameCopy.zh.modelConnectingLog : gameCopy.en.modelConnectingLog);
      }

      const provider = normalizedLlmProvider();
      let health: Awaited<ReturnType<typeof probeOllama>> | null = null;
      if (provider === 'ollama') {
        health = await probeOllama();
      } else if (provider === 'dashscope') {
        health = await probeDashscope();
      } else {
        // Other providers: don't block start; still mark ready.
        if (cancelled || gen !== llmProbeGenRef.current) return;
        setLlmLinkStatus('ready');
        return;
      }
      if (cancelled || gen !== llmProbeGenRef.current) return;

      if (!health.ok) {
        addLog(
          lang === 'zh'
            ? provider === 'ollama'
              ? `系统：Ollama 未就绪（${health.error}）`
              : `系统：百炼未就绪（${health.error}）`
            : provider === 'ollama'
              ? `System: Ollama not ready (${health.error})`
              : `System: Bailian/DashScope not ready (${health.error})`
        );
        if (gateStart) {
          addLog(lang === 'zh' ? gameCopy.zh.modelConnectFailedHint : gameCopy.en.modelConnectFailedHint);
          setLlmLinkStatus('failed');
        }
        return;
      }

      addLog(
        lang === 'zh'
          ? provider === 'ollama'
            ? `系统：Ollama 已连通（探测模型 ${health.model}）`
            : `系统：百炼已连通。本局按角色难度分模型——${formatDashscopeDifficultyModelMap('zh')}。连通性探测用的是新手档，与你选的难度无关。`
          : provider === 'ollama'
            ? `System: Ollama reachable (probe ${health.model})`
            : `System: Bailian reachable. Seat models by difficulty — ${formatDashscopeDifficultyModelMap('en')}. Connectivity probe always uses Novice; it is not your match model.`
      );
      setLlmLinkStatus('ready');
    })();
    return () => {
      cancelled = true;
    };
  }, [roomReady, addLog]);

  const retryLlmProbe = useCallback(() => {
    setLlmLinkStatus('pending');
    llmProbeGenRef.current += 1;
    const gen = llmProbeGenRef.current;
    void (async () => {
      const lang = uiLangRef.current;
      const mis = describeLlmMisconfig(lang);
      if (mis) {
        if (gen !== llmProbeGenRef.current) return;
        addLog(mis);
        addLog(lang === 'zh' ? gameCopy.zh.modelConnectFailedHint : gameCopy.en.modelConnectFailedHint);
        setLlmLinkStatus('failed');
        return;
      }
      addLog(lang === 'zh' ? gameCopy.zh.modelConnectingLog : gameCopy.en.modelConnectingLog);
      const provider = normalizedLlmProvider();
      const health =
        provider === 'ollama'
          ? await probeOllama()
          : provider === 'dashscope'
            ? await probeDashscope()
            : null;
      if (gen !== llmProbeGenRef.current) return;
      if (!health) {
        setLlmLinkStatus('ready');
        return;
      }
      if (!health.ok) {
        addLog(
          lang === 'zh'
            ? provider === 'ollama'
              ? `系统：Ollama 未就绪（${health.error}）`
              : `系统：百炼未就绪（${health.error}）`
            : provider === 'ollama'
              ? `System: Ollama not ready (${health.error})`
              : `System: Bailian/DashScope not ready (${health.error})`
        );
        addLog(lang === 'zh' ? gameCopy.zh.modelConnectFailedHint : gameCopy.en.modelConnectFailedHint);
        setLlmLinkStatus('failed');
        return;
      }
      addLog(
        lang === 'zh'
          ? provider === 'ollama'
            ? `系统：Ollama 已连通（探测模型 ${health.model}）`
            : `系统：百炼已连通。本局按角色难度分模型——${formatDashscopeDifficultyModelMap('zh')}。连通性探测用的是新手档，与你选的难度无关。`
          : provider === 'ollama'
            ? `System: Ollama reachable (probe ${health.model})`
            : `System: Bailian reachable. Seat models by difficulty — ${formatDashscopeDifficultyModelMap('en')}. Connectivity probe always uses Novice; it is not your match model.`
      );
      setLlmLinkStatus('ready');
    })();
  }, [addLog]);

  const appendVoteHistory = useCallback((entries: VoteHistoryEntry[]) => {
    if (entries.length === 0) return;
    wolfchaStateRef.current = {
      ...wolfchaStateRef.current,
      voteHistory: [...wolfchaStateRef.current.voteHistory, ...entries],
      votes: Object.fromEntries(entries.map((e) => [e.voterId, e.targetId])),
    };
  }, []);

  /** 入夜：统一从狼人段开始（狼 → 守卫 → 预言家 → 女巫）。 */
  const beginNightPhase = useCallback(async () => {
    resetNightChoices();
    const lang = uiLangRef.current;
    const seg = firstNightSegmentForBoard(config.board);
    const firstWolfNight = seg === 'wolves' && nightCountRef.current <= 0;

    await playNightFallCue(lang, {
      onPlaybackStart: () => {
        setBackdropIsNight(true);
        setPhase('NIGHT');
        const nextNightNumber = Math.max(1, nightCountRef.current + 1);
        addNarratorLine(
          {
            zh: `第${nextNightNumber}夜，${gameCopy.zh.nightFalls}。`,
            en: `Night ${nextNightNumber}. ${gameCopy.en.nightFalls}`,
          },
          'public',
          'NIGHT_START'
        );
      },
    });

    if (nightSegmentHasOpenCloseBroadcast(seg)) {
      await playNightSegmentCue(seg, 'wake', lang, {
        onPlaybackStart: () => {
          addNarratorLine(announceNightSegmentLine(seg, firstWolfNight));
        },
      });
    } else {
      addNarratorLine(announceNightSegmentLine(seg, firstWolfNight));
    }
    setNightSeg(seg);
  }, [addNarratorLine, config.board, resetNightChoices]);

  const maybeTransferSheriffBadge = useCallback(
    async (playersSnapshot: RoomPlayer[]) => {
      const sid = sheriffIdRef.current;
      if (!sid) return;
      const sheriffStillAlive = playersSnapshot.some((p) => p.id === sid && p.isAlive);
      if (sheriffStillAlive) return;
      const prevName = playersSnapshot.find((p) => p.id === sid)?.name ?? sid;
      const alive = playersSnapshot.filter((p) => p.isAlive);
      const lang = uiLangRef.current;
      const t = gameCopy[lang];
      const order = tableSeatOrderRef.current;
      const defaultNext = nextSheriffAfterDeath(sid, alive, order);

      const applyTransfer = (nextId: string | null) => {
        if (!nextId) {
          addLog(t.sheriffBadgeDestroyed(prevName));
          syncSheriffId(null);
          return;
        }
        const nextName = playersSnapshot.find((p) => p.id === nextId)?.name ?? nextId;
        addLog(t.sheriffBadgeTransferred(prevName, nextName));
        syncSheriffId(nextId);
      };

      if (sid === 'me' && alive.length > 0) {
        addLog(t.sheriffHandoffJudgeAsk(prevName));
        const chosen = await new Promise<string | null>((resolve) => {
          sheriffHandoffResolveRef.current = resolve;
          const payload: SheriffHandoffPickState = {
            alive,
            defaultNextId: defaultNext,
            prevName,
          };
          sheriffHandoffPickRef.current = payload;
          setSheriffHandoffSelectedId(defaultNext);
          setSheriffHandoffPick(payload);
        });
        const finalNext =
          chosen && alive.some((p) => p.id === chosen) ? chosen : defaultNext;
        applyTransfer(finalNext);
        return;
      }

      applyTransfer(defaultNext);
    },
    [addLog, syncSheriffId]
  );

  const applyTutorialRole = useCallback((chosenRole: RoleCardImageKey) => {
    const d = tutorialInitDraftRef.current;
    if (!d) return;
    const aiRoles = remainingRolesAfterHumanPick(chosenRole, d.board);
    const meRole = chosenRole;
    const initialPlayers: RoomPlayer[] = [
      {
        id: 'me',
        name: d.meName,
        isAI: false,
        role: meRole,
        isAlive: true,
        canVote: true,
        cannotUseHunterGun: false,
        ...(meRole === 'Idiot' ? { idiotFlipUsed: false } : {}),
      },
      ...d.selectedAIIds.map((id: string, idx: number) => {
        const char = CHARACTERS.find((c) => c.id === id);
        const r = aiRoles[idx]!;
        return {
          id,
          name: char?.name ?? `AI-${id}`,
          isAI: true,
          role: r,
          isAlive: true,
          canVote: true,
          cannotUseHunterGun: false,
          ...(r === 'Idiot' ? { idiotFlipUsed: false } : {}),
        };
      }),
    ];
    const seatIds = shuffleIds(initialPlayers.map((p) => p.id));
    tableSeatOrderRef.current = seatIds;
    nightCountRef.current = 0;
    setDawnCount(0);
    resetWolfKnifeHowlNightGate();
    sheriffElectionCompleteRef.current = false;
    wolfBeautyCharmMetaRef.current = { lastNight: -999, lastTarget: null };
    wolfchaStateRef.current = createFreshWolfchaState();
    guardLastTargetRef.current = null;
    wolfPackKillVoteByWolfRef.current = new Map();
    syncSheriffId(null);
    setNightSeg(null);
    setPhase('PREPARING');
    setTableSeatOrder(seatIds);
    setPlayers(initialPlayers);
    playersRef.current = initialPlayers;
    aiSpeechBrainHubRef.current = createAiSpeechBrainHub(initialPlayers, {
      dayExileVotesPublic: config.dayExileVotesPublic,
    });
    if (aiSpeechBrainHubRef.current) bindWolfPackKnowledge(aiSpeechBrainHubRef.current, initialPlayers);
    const readyCopyTutorial =
      d.board === 'SeerWitch6'
        ? { zh: gameCopy.zh.systemReady6, en: gameCopy.en.systemReady6 }
        : { zh: gameCopy.zh.systemReady, en: gameCopy.en.systemReady };
    const firstLine = makeNarratorLine(readyCopyTutorial, 'public', 'GAME_START');
    narratorLinesRef.current = [firstLine];
    chatAnchorContentYRef.current = null;
    chatMinScrollYRef.current = null;
    chatClipViewportYRef.current = PARCHMENT_SCROLL_PAD_TOP;
    chatClipSlotCapturedRef.current = false;
    chatRowLayoutYRef.current = new Map();
    isChatScrollNearBottomRef.current = true;
    setChatScrollY(0);
    const split = splitVisibleLogsForUi(
      { id: 'me', role: meRole },
      narratorLinesRef.current,
      { lang: d.lang, dayExileVotesPublic: config.dayExileVotesPublic }
    );
    setLogs(split.speechLogs);
    setDawnCount(0);
    logsRef.current = split.speechLogs;
    setNarratorLogEpoch((n) => n + 1);
    setUiLang(d.lang);
    setMeAvatarIndex(d.meAvatarIdx);
    witchStateRef.current = { hasAntidote: true, hasPoison: true };
    witchPoisonHistoryRef.current = [];
    setTutorialAwaitingRolePick(false);
    setRoomReady(true);
    setRoleCardDismissed(true);
    setGameEndEpilogue(null);
    tutorialInitDraftRef.current = null;
  }, [syncSheriffId, config.dayExileVotesPublic]);

  const endGameIfNeeded = useCallback(
    (nextPlayers: RoomPlayer[], lang: AppLanguage) => {
      const t = gameCopy[lang];
      const w = evaluateGameEnd(nextPlayers);
      if (w === 'good') {
        addLog(t.goodVictory);
        const me = nextPlayers.find((p) => p.id === 'me');
        /** 结算瞬间关掉其它弹层，避免结算卡关掉后底下再闪身份卡/验人卡等 */
        setSeerInspectCard(null);
        setIdiotFlipModal(null);
        setDeathRulesModalVisible(false);
        setSheriffTutorialVisible(false);
        setSheriffHandoffPick(null);
        setSheriffHandoffSelectedId(null);
        sheriffHandoffPickRef.current = null;
        sheriffHandoffResolveRef.current = null;
        gameEndWinnerRef.current = 'good';
        setGameEndEpilogue({ winner: 'good', role: normalizeEpilogueRole(me?.role ?? 'Villager') });
        setPhase('ENDED');
        void playVictoryCue('good', lang);
        return true;
      }
      if (w === 'wolf') {
        addLog(t.wolfVictory);
        const me = nextPlayers.find((p) => p.id === 'me');
        setSeerInspectCard(null);
        setIdiotFlipModal(null);
        setDeathRulesModalVisible(false);
        setSheriffTutorialVisible(false);
        setSheriffHandoffPick(null);
        setSheriffHandoffSelectedId(null);
        sheriffHandoffPickRef.current = null;
        sheriffHandoffResolveRef.current = null;
        gameEndWinnerRef.current = 'wolf';
        setGameEndEpilogue({ winner: 'wolf', role: normalizeEpilogueRole(me?.role ?? 'Villager') });
        setPhase('ENDED');
        void playVictoryCue('wolf', lang);
        return true;
      }
      return false;
    },
    [addLog]
  );

  useEffect(() => {
    if (phase !== 'ENDED') {
      peerReviewsStartedRef.current = false;
      return;
    }
    if (!roomReady || peerReviewsStartedRef.current) return;
    const winner = gameEndWinnerRef.current ?? gameEndEpilogue?.winner ?? null;
    if (winner == null) return;
    peerReviewsStartedRef.current = true;

    const gen = postGameReviewsGenRef.current;
    const snapshot = playersRef.current;
    const plan = buildPeerReviewPlan(snapshot);
    setPeerReviewCells(initialPeerReviewCells(plan));

    const lang = uiLangRef.current;
    const boardLabel =
      config.board === 'WolfBeauty'
        ? homeCopy[lang].boardBeauty
        : config.board === 'SeerWitch6'
          ? homeCopy[lang].boardSeerWitch6
          : homeCopy[lang].boardStandard;
    const mePlayer = snapshot.find((p) => p.id === 'me');
    const publicLogs = splitVisibleLogsForUi(
      { id: 'me', role: mePlayer?.role ?? 'Villager' },
      narratorLinesRef.current,
      { lang, dayExileVotesPublic: config.dayExileVotesPublic }
    ).speechLogs;

    let cancelled = false;
    void runPostGamePeerReviewGeneration({
      lang,
      players: snapshot,
      winner,
      boardLabel,
      publicLogs,
      witchPoisonRecords: [...witchPoisonHistoryRef.current],
      charactersById,
      modelRefById: modelRefMapRef.current,
      isCancelled: () => cancelled || postGameReviewsGenRef.current !== gen,
      onCellReady: (key, text) => {
        setPeerReviewCells((prev) =>
          prev.map((cell) =>
            cell.key === key ? { ...cell, status: 'ready' as const, text } : cell
          )
        );
      },
    });

    return () => {
      cancelled = true;
    };
  }, [phase, roomReady, gameEndEpilogue?.winner, config.board, config.dayExileVotesPublic, charactersById]);

  const waitForHumanSpeech = useCallback(() => {
    return new Promise<string>((resolve) => {
      humanResolveRef.current = resolve;
      setHumanBarVisible(true);
    });
  }, []);

  const finishHumanTurn = useCallback((text: string) => {
    setHumanBarVisible(false);
    const r = humanResolveRef.current;
    humanResolveRef.current = null;
    r?.(text);
  }, []);

  const submitSpeechTurn = useCallback(
    (text: string) => {
      const raw = text.trim();
      const pass =
        uiLangRef.current === 'zh' ? '…（过麦）' : '… (passed)';
      finishHumanTurn(raw || pass);
    },
    [finishHumanTurn]
  );

  const passHuman = useCallback(() => {
    const text = uiLangRef.current === 'zh' ? '…（过麦）' : '… (passed)';
    finishHumanTurn(text);
  }, [finishHumanTurn]);

  const speechSkipRequestedRef = useRef(false);

  /** 发言环节不提供「跳过逐字」；跳过仅用于夜间非本人行动时的计时等待。 */
  const typingSkippable = useCallback(() => false, []);

  const sleepInterruptible = useCallback(
    async (ms: number) => {
      if (!typingSkippable()) {
        await new Promise((r) => setTimeout(r, ms));
        return;
      }
      const until = Date.now() + ms;
      while (Date.now() < until) {
        if (speechSkipRequestedRef.current) return;
        await new Promise((r) => setTimeout(r, 22));
      }
    },
    [typingSkippable]
  );

  /** wolfcha-style: one JSON array element → one typed bubble + one log line. */
  const deliverAiSpeechBubbles = useCallback(
    async (
      bubbles: string[],
      p: RoomPlayer,
      persona: string,
      lang: AppLanguage,
      char: AICharacter | undefined,
      typingMs: number
    ) => {
      const parts = expandSpeechBubbleParts(bubbles)
        .map((b) => b.trim())
        .filter(Boolean);
      if (parts.length === 0) return;

      const behaviorProfile = char ? getAIBehaviorProfile(char) : null;
      const brain = aiSpeechBrainHubRef.current?.byAiId[p.id] ?? null;
      const voiceProfile: AiVoiceProfile = {
        characterId: char?.id ?? p.id,
        characterName: char?.name ?? p.name,
        lang,
        age: char?.age,
        gender: char?.gender,
        // Use English mockData personality so UI language does not reshuffle voices.
        personality: char?.personality ?? persona,
        emotion: brain && behaviorProfile
          ? getSpeechFacingEmotion(brain.emotion, behaviorProfile)
          : 'calm',
      };
      let preparedPromise = prepareAiUtterance(parts[0]!, voiceProfile);

      for (let bi = 0; bi < parts.length; bi++) {
        const bubble = parts[bi]!;
        // Keep a visible state while this sentence's voice is being prepared.
        // This also replaces the previous sentence during inter-sentence pauses.
        setTypingText(gameCopy[lang].aiThinking);
        const prepared = await settleWithin(preparedPromise, AI_VOICE_PREP_MAX_WAIT_MS);
        preparedPromise = bi + 1 < parts.length
          ? prepareAiUtterance(parts[bi + 1]!, voiceProfile)
          : Promise.resolve(null);
        const playback = prepared ? await startPreparedAiUtterance(prepared) : null;
        const visibleCharCount = Math.max(1, [...bubble].length);
        const syncedTypingMs = playback?.durationMs
          ? Math.max(32, Math.min(180, Math.round((playback.durationMs * 0.9) / visibleCharCount)))
          : typingMs;

        speechSkipRequestedRef.current = false;
        setSpeechLogLiveLine(`${p.name}: `);
        const typed = await typeTextCharByChar(
          bubble,
          syncedTypingMs,
          sleepInterruptible,
          () => speechSkipRequestedRef.current,
          (current) => {
            setTypingText(current);
            setSpeechLogLiveLine(`${p.name}: ${current}`);
          }
        );
        if (speechSkipRequestedRef.current) {
          void stopAiSpeech();
          setTypingText(bubble);
          setSpeechLogLiveLine(`${p.name}: ${bubble}`);
          speechSkipRequestedRef.current = false;
        }

        // 不切到下一句/下一位，直到当前角色的整段声音播放完。
        await playback?.finished;

        const reaction = pickSpeechReaction(typed, p.id);
        if (reaction) {
          if (bi < parts.length - 1) {
            setTypingText(gameCopy[lang].aiThinking);
          }
          await sleepInterruptible(160);
          await typeTextCharByChar(
            reaction,
            typingMs,
            sleepInterruptible,
            () => false,
            (current) => setTypingText(current)
          );
          if (bi < parts.length - 1) {
            setTypingText(gameCopy[lang].aiThinking);
          }
          await sleepInterruptible(240);
          speechSkipRequestedRef.current = false;
        }

        addLog(`${p.name}: ${bubble}`, 'public', 'SPEECH');
        setSpeechLogLiveLine(null);
        if (bi === parts.length - 1) {
          maybeAppendAiFriendSticker(bubble, p.id, persona);
        }
        if (bi < parts.length - 1) {
          setTypingText(gameCopy[lang].aiThinking);
          await sleepInterruptible(160);
        }
      }
    },
    [addLog, maybeAppendAiFriendSticker, sleepInterruptible]
  );

  const typeHumanSpeechIntoUi = useCallback(
    async (speakerName: string, spoken: string, typingMs = 22) => {
      if (!spoken.trim()) return;
      setSpeechLogLiveLine(`${speakerName}: `);
      setTypingText('');
      await typeTextCharByChar(
        spoken,
        typingMs,
        sleepInterruptible,
        () => false,
        (current) => {
          setTypingText(current);
          setSpeechLogLiveLine(`${speakerName}: ${current}`);
        }
      );
    },
    [sleepInterruptible]
  );

  const runSpeakingTurns = useCallback(async () => {
    const lang = uiLangRef.current;
    const seatIds = buildSeatIdOrder(playersRef.current, tableSeatOrderRef.current);
    const seatRank = new Map(seatIds.map((id, i) => [id, i]));
    const roster = [...playersRef.current.filter((p) => p.isAlive)].sort((a, b) => {
      if (seatIds.length < 2) return 0;
      const ia = seatRank.get(a.id);
      const ib = seatRank.get(b.id);
      return (ia === undefined ? 999 : ia) - (ib === undefined ? 999 : ib);
    });
    let speechIdx = 0;
    const dayNumCtx = Math.max(1, nightCountRef.current);
    const humanPlayerName = playersRef.current.find((x) => x.id === 'me')?.name ?? '';
    const hub = aiSpeechBrainHubRef.current;
    if (hub) syncBrainDayRound(hub, Math.max(1, nightCountRef.current));

    // Detect wolf self-reveal (e.g. human says "我是狼人") — all AIs must react this round
    const publicLogs = currentDayPublicTableLogLines(narratorLinesRef.current, lang);
    const wolfSelfRevealName = detectWolfSelfRevealInHistory(publicLogs, lang);

    for (const p of roster) {
      if (!playersRef.current.find((x) => x.id === p.id)?.isAlive) continue;

      if (p.isAI) {
        const char = CHARACTERS.find((c) => c.id === p.id);
        const persona = char ? characterPersonalityForUi(char, lang) : 'Neutral';
        const personaDesc = char ? characterDescriptionForUi(char, lang) : '';
        const diff = char?.difficulty ?? 'Novice';

        // speakFrequency / speakThreshold: quiet characters may skip rounds
        const aiProfile = char ? getAIBehaviorProfile(char) : null;
        const dayNum = Math.max(1, nightCountRef.current);
        const observerLogs = aiCurrentDayHistoryForPlayer(
          p,
          narratorLinesRef.current,
          lang,
          config.dayExileVotesPublic,
          80
        );
        const isAccused = detectDirectedAccusationAgainst(observerLogs, p.name, lang);
        const shouldSpeak = (() => {
          if (!aiProfile) return true;
          if (dayNum <= 1) return true; // day 1: everyone speaks
          if (isAccused) return true; // always defend
          if (aiProfile.speakFrequency >= 85) return true; // eager talkers
          const roll = deterministicJitter([p.id, String(dayNum), String(speechIdx), speechNonceRef.current, 'sfq']);
          if (roll <= aiProfile.speakFrequency / 100) return true;
          // speakThreshold override: speak if enough discussion has already happened
          const progress = roster.length > 1 ? speechIdx / (roster.length - 1) : 1;
          return progress >= aiProfile.speakThreshold / 100;
        })();
        if (!shouldSpeak) continue;

        const speaker = {
          ...p,
          personality: persona,
          personalityDescription: personaDesc,
          difficulty: diff,
          avatarIcon: char?.avatarIcon ?? '🤖',
          modelRef: modelRefMapRef.current.get(p.id),
        };

        setActiveSpeaker(p.id);
        setTypingText(gameCopy[lang].aiThinking);
        const prep =
          char && hub
            ? prepareAiSpeechDialogue({
                hub,
                observerCharacter: char,
                observerId: p.id,
                alivePlayers: roster.map((x) => ({ id: x.id, name: x.name })),
                lang,
                channel: 'discussion',
                speechIndex: speechIdx,
                totalSpeakers: roster.length,
                gameNonce: speechNonceRef.current,
                priorSpeakerName: speechIdx > 0 ? roster[speechIdx - 1]?.name ?? null : null,
                priorSpeechLines: countPlayerSpeechLinesInHistory(publicLogs),
                accusedThisRound: detectDirectedAccusationAgainst(observerLogs, p.name, lang),
                recentLogLines: aiCurrentDayHistoryForPlayer(
                  p,
                  narratorLinesRef.current,
                  lang,
                  config.dayExileVotesPublic,
                  48
                ),
                observerRole: p.role,
              })
            : null;
        const brain = hub?.byAiId[p.id] ?? null;
        const priorSpeakerName = speechIdx > 0 ? roster[speechIdx - 1]?.name ?? null : null;
        const wStForCtx = witchStateRef.current;
        const rawKnifeId = pendingNightRef.current.wolfKillTargetId;
        const knifeName =
          wStForCtx.hasAntidote && rawKnifeId != null
            ? playersRef.current.find((x) => x.id === rawKnifeId)?.name ?? null
            : null;
        const gameCtxBlock = buildGameContextForPlayer({
          player: p,
          allPlayers: playersRef.current,
          tableOrder: tableSeatOrderRef.current,
          dayNumber: dayNumCtx,
          sheriffId: sheriffIdRef.current,
          wolfPackIds: brain?.wolfPackMemberIds ?? null,
          lang,
          wolfchaPhase: uiDayPhaseToWolfcha('DISCUSSION', null),
          seerChecks: seerPrivateRef.current.get(p.id),
          witchState: witchStateRef.current,
          witchKnifeName: knifeName,
          voteHistory: wolfchaStateRef.current.voteHistory,
          dayExileVotesPublic: config.dayExileVotesPublic,
          guardLastTargetName: guardLastTargetRef.current?.name ?? null,
        });
        const focusHints = buildAiFocusAngleHints(
          p,
          observerLogs,
          prep?.llmSignalLines ?? [],
          lang,
          humanPlayerName
        );
        const selfSpeech = extractSelfSpeechToday(p.name, publicLogs, lang);

        const speechBubbles = await fetchSpeechSafe(
          speaker,
          p.role,
          aiCurrentDayHistoryForPlayer(p, narratorLinesRef.current, lang, config.dayExileVotesPublic, 72),
          lang,
          {
            speechIndex: speechIdx,
            totalSpeakers: roster.length,
            dayNumber: dayNumCtx,
            difficulty: diff,
            gameNonce: speechNonceRef.current,
            personality: persona,
            channel: 'discussion',
            humanPlayerName,
            priorSpeakerName,
            alreadySpokenThisPhase: roster.slice(0, speechIdx).map((player) => player.name),
            notYetSpokenThisPhase: roster.slice(speechIdx + 1).map((player) => player.name),
            preparedDialogue: prep,
            dayExileVotesPublic: prep?.dayExileVotesPublic ?? config.dayExileVotesPublic,
            wolfSelfRevealName,
            gameContextBlock: gameCtxBlock,
            focusAngleHints: focusHints,
            selfSpeechToday: selfSpeech,
          }
        );
        speechIdx += 1;

        await deliverAiSpeechBubbles(speechBubbles, p, persona, lang, char, 22);
        setTypingText('');
        setActiveSpeaker(null);
        await sleepInterruptible(180);
      } else {
        setActiveSpeaker('me');
        setTypingText(gameCopy[lang].yourTurn);
        setSpeechLogLiveLine(
          lang === 'zh' ? `${p.name}: （发言中…）` : `${p.name}: (speaking…)`
        );
        addLog(gameCopy[lang].yourTurnLog);
        const spoken = await waitForHumanSpeech();
        await typeHumanSpeechIntoUi(p.name, spoken);
        setSpeechLogLiveLine(null);
        addLog(`${p.name}: ${spoken}`, 'public', 'SPEECH');
        setTypingText('');
        setActiveSpeaker(null);
        speechIdx += 1;
        await sleepInterruptible(400);
      }
    }
  }, [
    addLog,
    deliverAiSpeechBubbles,
    maybeAppendAiFriendSticker,
    typeHumanSpeechIntoUi,
    waitForHumanSpeech,
    sleepInterruptible,
    config.dayExileVotesPublic,
  ]);

  const runLastWordsPhase = useCallback(
    async (victims: RoomPlayer[]) => {
      if (victims.length === 0) return;
      const lang = uiLangRef.current;
      addLog(lang === 'zh' ? '--- 遗言环节 ---' : '--- Last words ---');
      const ordered = [...victims].sort((a, b) => {
        if (a.id === 'me') return 1;
        if (b.id === 'me') return -1;
        return 0;
      });
      let idx = 0;
      for (const p of ordered) {
        if (p.isAI) {
          const char = CHARACTERS.find((c) => c.id === p.id);
          const diff = char?.difficulty ?? 'Novice';
          const persona = char ? characterPersonalityForUi(char, lang) : 'Neutral';
          const personaDesc = char ? characterDescriptionForUi(char, lang) : '';
          const speaker = {
            ...p,
            personality: persona,
            personalityDescription: personaDesc,
            difficulty: diff,
            avatarIcon: char?.avatarIcon ?? '🤖',
            modelRef: modelRefMapRef.current.get(p.id),
          };
          setActiveSpeaker(p.id);
          setTypingText(gameCopy[lang].aiThinking);
          const hint =
            lang === 'zh'
              ? '系统：请发表简短遗言（最后一次可发言）。'
              : 'System: Give brief last words—your final speech allowed.';
          const hist = [
            ...aiCurrentDayHistoryForPlayer(p, narratorLinesRef.current, lang, config.dayExileVotesPublic, 56),
            hint,
          ];
          const humanPlayerName = playersRef.current.find((x) => x.id === 'me')?.name ?? '';
          const aliveRoster = playersRef.current.filter((x) => x.isAlive);
          const lwPublicLogs = currentDayPublicTableLogLines(narratorLinesRef.current, lang);
          const lwObserverLogs = aiCurrentDayHistoryForPlayer(
            p,
            narratorLinesRef.current,
            lang,
            config.dayExileVotesPublic,
            40
          );
          const prep =
            char && aiSpeechBrainHubRef.current
              ? prepareAiSpeechDialogue({
                  hub: aiSpeechBrainHubRef.current,
                  observerCharacter: char,
                  observerId: p.id,
                  alivePlayers: aliveRoster.map((x) => ({ id: x.id, name: x.name })),
                  lang,
                  channel: 'lastwords',
                  speechIndex: idx,
                  totalSpeakers: ordered.length,
                  gameNonce: speechNonceRef.current,
                  priorSpeakerName: null,
                  priorSpeechLines: countPlayerSpeechLinesInHistory(lwPublicLogs),
                  accusedThisRound: true,
                  recentLogLines: lwObserverLogs,
                  observerRole: p.role,
                })
              : null;
          const lastWordsBrain = aiSpeechBrainHubRef.current?.byAiId[p.id] ?? null;
          const lwDayNum = Math.max(1, nightCountRef.current);
          const lwGameCtx = buildGameContextForPlayer({
            player: p,
            allPlayers: playersRef.current,
            tableOrder: tableSeatOrderRef.current,
            dayNumber: lwDayNum,
            sheriffId: sheriffIdRef.current,
            wolfPackIds: lastWordsBrain?.wolfPackMemberIds ?? null,
            lang,
            wolfchaPhase: 'DAY_SPEECH',
            seerChecks: seerPrivateRef.current.get(p.id),
            witchState: witchStateRef.current,
            voteHistory: wolfchaStateRef.current.voteHistory,
            dayExileVotesPublic: config.dayExileVotesPublic,
            guardLastTargetName: guardLastTargetRef.current?.name ?? null,
          });
          const lwBubbles = await fetchSpeechSafe(speaker, p.role, hist, lang, {
            speechIndex: idx,
            totalSpeakers: ordered.length,
            dayNumber: lwDayNum,
            difficulty: diff,
            gameNonce: speechNonceRef.current,
            personality: persona,
            channel: 'lastwords',
            humanPlayerName,
            priorSpeakerName: null,
            preparedDialogue: prep,
            dayExileVotesPublic: prep?.dayExileVotesPublic ?? config.dayExileVotesPublic,
            gameContextBlock: lwGameCtx,
          });
          idx += 1;

          await deliverAiSpeechBubbles(lwBubbles, p, persona, lang, char, 18);
          setTypingText('');
          setActiveSpeaker(null);
          await sleepInterruptible(180);
        } else {
          setActiveSpeaker('me');
          setTypingText(
            lang === 'zh'
              ? '系统：请发表遗言（本轮结束后不可再发言）。'
              : 'System: Your last words—then you stay silent.'
          );
          setSpeechLogLiveLine(
            lang === 'zh' ? `${p.name}: （发言中…）` : `${p.name}: (speaking…)`
          );
          addLog(lang === 'zh' ? '系统：轮到你发表遗言。' : 'System: Your turn for last words.');
          const spoken = await waitForHumanSpeech();
          await typeHumanSpeechIntoUi(p.name, spoken, 18);
          setSpeechLogLiveLine(null);
          addLog(`${p.name}: ${spoken}`, 'public', 'SPEECH');
          setTypingText('');
          setActiveSpeaker(null);
          idx += 1;
          await sleepInterruptible(400);
        }
      }
    },
    [
      addLog,
      deliverAiSpeechBubbles,
      maybeAppendAiFriendSticker,
      typeHumanSpeechIntoUi,
      waitForHumanSpeech,
      sleepInterruptible,
      config.dayExileVotesPublic,
    ]
  );

  const runHunterGunPhase = useCallback(
    async (
      hunter: RoomPlayer,
      _opts?: { reason: 'night_wolf' | 'exile' | 'knight_duel' }
    ): Promise<{
      gameEnded: boolean;
      shotVictimId: string | null;
      martyrForLastWords: RoomPlayer | null;
    }> => {
      const lang = uiLangRef.current;
      const t = gameCopy[lang];
      const none = {
        gameEnded: false,
        shotVictimId: null as string | null,
        martyrForLastWords: null as RoomPlayer | null,
      };

      if (hunter.role !== 'Hunter') return none;
      if (hunter.cannotUseHunterGun) {
        addLog(t.hunterGunBlockedWhiteWolf);
        return none;
      }

      const alive = playersRef.current.filter((p) => p.isAlive);
      const targets = alive.filter((p) => p.id !== hunter.id);
      if (targets.length === 0) {
        addLog(t.hunterGunNoTarget);
        return none;
      }

      let targetId: string | null = null;

      if (hunter.isAI) {
        const wolves = targets.filter((p) => isWolfTeam(p.role));
        if (wolves.length > 0 && Math.random() < 0.72) {
          targetId = pickRandom(wolves).id;
        } else {
          targetId = pickRandom(targets).id;
        }
      } else {
        addLog(t.hunterGunJudgeAsk(hunter.name));
        setSelectedId(null);
        setHunterShotMode({ hunterId: hunter.id });
        targetId = await new Promise<string | null>((resolve) => {
          hunterShotResolveRef.current = resolve;
        });
        setHunterShotMode(null);
      }

      if (
        !targetId ||
        !playersRef.current.some((p) => p.id === targetId && p.isAlive)
      ) {
        addLog(t.hunterGunNoTarget);
        return none;
      }

      const tn = playersRef.current.find((p) => p.id === targetId)?.name ?? targetId;
      addLog(t.hunterGunFires(hunter.name, tn));

      let next = playersRef.current.map((p) =>
        p.id === targetId ? { ...p, isAlive: false, outReason: 'hunter_gun' as const } : p
      );
      let martyrForLastWords: RoomPlayer | null = null;
      if (config.board === 'WolfBeauty') {
        const shot = next.find((p) => p.id === targetId);
        if (shot?.role === 'WolfBeauty') {
          const m = next.find((p) => p.isAlive && p.charmedByWolfBeautyId === shot.id);
          if (m) {
            const mn = m.name;
            addLog(t.wolfBeautyMartyr(mn));
            next = next.map((p) =>
              p.id === m.id
                ? {
                    ...p,
                    isAlive: false,
                    outReason: 'wolf_beauty_charm' as const,
                    cannotUseHunterGun: true,
                  }
                : p
            );
            martyrForLastWords = next.find((p) => p.id === m.id && !p.isAlive) ?? null;
          }
        }
      }
      setPlayers(next);
      playersRef.current = next;
      setSelectedId(null);
      await maybeTransferSheriffBadge(next);
      const ended = endGameIfNeeded(next, lang);
      return { gameEnded: ended, shotVictimId: targetId, martyrForLastWords };
    },
    [addLog, config.board, endGameIfNeeded, maybeTransferSheriffBadge]
  );

  const confirmHunterShot = useCallback(() => {
    const lang = uiLangRef.current;
    const t = gameCopy[lang];
    const tid = selectedId;
    const alive = playersRef.current.filter((p) => p.isAlive);
    if (!tid || !alive.some((p) => p.id === tid)) {
      Alert.alert(t.pickPlayerAlert, t.hunterGunPickBody);
      return;
    }
    setFooterButtonsDismissed(true);
    const r = hunterShotResolveRef.current;
    hunterShotResolveRef.current = null;
    setHunterShotMode(null);
    setSelectedId(null);
    r?.(tid);
  }, [selectedId]);

  const runSheriffFlow = useCallback(async () => {
    const lang = uiLangRef.current;
    const t = gameCopy[lang];
    const fromTutorial = config.fromTutorial === true;
    setPhase('SHERIFF_SIGNUP');
    addLog(t.judgeSheriffAsk);

    if (fromTutorial) {
      await new Promise<void>((resolve) => {
        sheriffTutorialAckRef.current = resolve;
        setSheriffTutorialVisible(true);
      });
    }

    const candidates: string[] = [];
    const alive = playersRef.current.filter((p) => p.isAlive);
    const aliveSorted = [...alive].sort((a, b) => a.id.localeCompare(b.id));
    for (const p of aliveSorted) {
      if (p.isAI) {
        const char = CHARACTERS.find((c) => c.id === p.id);
        const diff = char?.difficulty ?? 'Novice';
        const profile = char ? getAIBehaviorProfile(char) : undefined;
        if (aiRunsForSheriff(p.role, diff, p.id, speechNonceRef.current, profile)) {
          candidates.push(p.id);
        }
      } else if (!playersRef.current.find((x) => x.id === p.id)?.isAlive) {
        continue;
      } else {
        setSheriffSignupGate(true);
        try {
          const run = await new Promise<boolean>((resolve) => {
            sheriffSignupResolveRef.current = resolve;
          });
          sheriffSignupResolveRef.current = null;
          if (run) candidates.push(p.id);
        } finally {
          setSheriffSignupGate(false);
        }
      }
    }

    candidates.sort((a, b) => a.localeCompare(b));
    setSheriffCandidatesState(candidates);

    if (candidates.length === 0) {
      syncSheriffId(null);
      return;
    }

    const names = candidates
      .map((id) => playersRef.current.find((x) => x.id === id)?.name ?? id)
      .join(lang === 'zh' ? '、' : ', ');
    addLog(t.judgeSheriffCandidates(names));

    setPhase('SHERIFF_SPEECH');
    let speechIdx = 0;
    for (const cid of candidates) {
      const p = playersRef.current.find((x) => x.id === cid);
      if (!p) continue;
      if (p.isAI) {
        const char = CHARACTERS.find((c) => c.id === p.id);
        const persona = char ? characterPersonalityForUi(char, lang) : 'Neutral';
        const personaDesc = char ? characterDescriptionForUi(char, lang) : '';
        const diff = char?.difficulty ?? 'Novice';
        const speaker = {
          ...p,
          personality: persona,
          personalityDescription: personaDesc,
          difficulty: diff,
          avatarIcon: char?.avatarIcon ?? '🤖',
          modelRef: modelRefMapRef.current.get(p.id),
        };
        setActiveSpeaker(p.id);
        setTypingText(gameCopy[lang].aiThinking);
        const humanPlayerName = playersRef.current.find((x) => x.id === 'me')?.name ?? '';
        const aliveForSheriff = playersRef.current.filter((x) => x.isAlive);
        const sheriffPublicLogs = currentDayPublicTableLogLines(narratorLinesRef.current, lang);
        const sheriffObserverLogs = aiCurrentDayHistoryForPlayer(
          p,
          narratorLinesRef.current,
          lang,
          config.dayExileVotesPublic,
          32
        );
        const sheriffPrep =
          char && aiSpeechBrainHubRef.current
            ? prepareAiSpeechDialogue({
                hub: aiSpeechBrainHubRef.current,
                observerCharacter: char,
                observerId: p.id,
                alivePlayers: aliveForSheriff.map((x) => ({ id: x.id, name: x.name })),
                lang,
                channel: 'sheriff',
                speechIndex: speechIdx,
                totalSpeakers: candidates.length,
                gameNonce: speechNonceRef.current,
                priorSpeakerName:
                  speechIdx > 0
                    ? playersRef.current.find((x) => x.id === candidates[speechIdx - 1])?.name ?? null
                    : null,
                priorSpeechLines: countPlayerSpeechLinesInHistory(sheriffPublicLogs),
                accusedThisRound: false,
                recentLogLines: sheriffObserverLogs,
                observerRole: p.role,
              })
            : null;
        const sheriffBrain = aiSpeechBrainHubRef.current?.byAiId[p.id] ?? null;
        const sheriffDayNum = Math.max(1, nightCountRef.current);
        const sheriffGameCtx = buildGameContextForPlayer({
          player: p,
          allPlayers: playersRef.current,
          tableOrder: tableSeatOrderRef.current,
          dayNumber: sheriffDayNum,
          sheriffId: sheriffIdRef.current,
          wolfPackIds: sheriffBrain?.wolfPackMemberIds ?? null,
          lang,
          wolfchaPhase: 'SHERIFF_SPEECH',
          seerChecks: seerPrivateRef.current.get(p.id),
          witchState: witchStateRef.current,
          voteHistory: wolfchaStateRef.current.voteHistory,
          dayExileVotesPublic: config.dayExileVotesPublic,
          guardLastTargetName: guardLastTargetRef.current?.name ?? null,
        });
        const sheriffFocusHints = buildAiFocusAngleHints(
          p,
          sheriffObserverLogs,
          sheriffPrep?.llmSignalLines ?? [],
          lang,
          humanPlayerName
        );
        const sheriffAlreadySpokenNames = candidates
          .slice(0, speechIdx)
          .map((id) => playersRef.current.find((x) => x.id === id)?.name)
          .filter((name): name is string => !!name);
        const sheriffAlreadySpokenSet = new Set(sheriffAlreadySpokenNames);
        const sheriffNotYetSpokenNames = aliveForSheriff
          .filter((player) => player.id !== p.id && !sheriffAlreadySpokenSet.has(player.name))
          .map((player) => player.name);
        const sheriffBubbles = await fetchSpeechSafe(
          speaker,
          p.role,
          aiCurrentDayHistoryForPlayer(p, narratorLinesRef.current, lang, config.dayExileVotesPublic, 56),
          lang,
          {
            speechIndex: speechIdx,
            totalSpeakers: candidates.length,
            dayNumber: sheriffDayNum,
            difficulty: diff,
            gameNonce: speechNonceRef.current,
            personality: persona,
            channel: 'sheriff',
            humanPlayerName,
            alreadySpokenThisPhase: sheriffAlreadySpokenNames,
            notYetSpokenThisPhase: sheriffNotYetSpokenNames,
            preparedDialogue: sheriffPrep,
            gameContextBlock: sheriffGameCtx,
            focusAngleHints: sheriffFocusHints,
          }
        );

        await deliverAiSpeechBubbles(sheriffBubbles, p, persona, lang, char, 18);
        setTypingText('');
        setActiveSpeaker(null);
        speechIdx += 1;
        await sleepInterruptible(180);
      } else {
        setActiveSpeaker('me');
        setTypingText(lang === 'zh' ? '系统：轮到你警上发言。' : 'System: your sheriff speech.');
        setSpeechLogLiveLine(
          lang === 'zh' ? `${p.name}: （发言中…）` : `${p.name}: (speaking…)`
        );
        addLog(lang === 'zh' ? '系统：轮到你警上发言。' : 'System: your sheriff speech.');
        const spoken = await waitForHumanSpeech();
        await typeHumanSpeechIntoUi(p.name, spoken, 18);
        setSpeechLogLiveLine(null);
        addLog(`${p.name}: ${spoken}`, 'public', 'SPEECH');
        setTypingText('');
        setActiveSpeaker(null);
        speechIdx += 1;
        await sleepInterruptible(400);
      }
    }

    setPhase('SHERIFF_VOTE');
    addLog(t.judgeSheriffVoteLine);

    const aliveForVote = playersRef.current.filter((p) => p.isAlive);
    /** 仅警下（未上警）且仍有投票权的存活玩家可投警长 */
    const voters = aliveForVote.filter(
      (p) => !candidates.includes(p.id) && p.canVote !== false
    );

    const tally = new Map<string, number>();
    const sheriffVotes = new Map<string, string>();
    for (const v of voters) {
      let choice: string | null = null;
      if (v.isAI) {
        const char = CHARACTERS.find((c) => c.id === v.id);
        const persona = char ? characterPersonalityForUi(char, lang) : 'Neutral';
        const personaDesc = char ? characterDescriptionForUi(char, lang) : '';
        const diff = char?.difficulty ?? 'Novice';
        const candidatePool = candidates.map((id) => {
          const pl = playersRef.current.find((x) => x.id === id);
          return { id, name: pl?.name ?? id };
        });
        const sheriffVoteHistory = aiCurrentDayHistoryForPlayer(
          v,
          narratorLinesRef.current,
          lang,
          config.dayExileVotesPublic,
          56
        );
        try {
          choice = await fetchAISheriffVote({
            voter: {
              id: v.id,
              name: v.name,
              personality: persona,
              personalityDescription: personaDesc,
              difficulty: diff,
              modelRef: modelRefMapRef.current.get(v.id),
            },
            role: v.role,
            lang,
            history: sheriffVoteHistory,
            candidates: candidatePool,
            dayNumber: Math.max(1, nightCountRef.current),
          });
        } catch {
          choice = pickSheriffVoteForAi(v.id, candidates, playersRef.current, speechNonceRef.current);
        }
        if (!candidatePool.some((c) => c.id === choice)) {
          choice = pickSheriffVoteForAi(v.id, candidates, playersRef.current, speechNonceRef.current);
        }
      } else {
        setSheriffVoteGate(true);
        try {
          choice = await new Promise<string | null>((resolve) => {
            sheriffVoteResolveRef.current = resolve;
          });
          sheriffVoteResolveRef.current = null;
        } finally {
          setSheriffVoteGate(false);
        }
      }
      if (choice && candidates.includes(choice)) {
        sheriffVotes.set(v.id, choice);
        tally.set(choice, (tally.get(choice) ?? 0) + 1);
      }
    }

    appendVoteHistory(
      [...sheriffVotes.entries()].map(([voterId, targetId]) => ({
        kind: 'sheriff' as const,
        day: Math.max(1, nightCountRef.current),
        voterId,
        targetId,
      }))
    );

    let best = -1;
    const tops: string[] = [];
    for (const [id, c] of tally) {
      if (c > best) {
        best = c;
        tops.length = 0;
        tops.push(id);
      } else if (c === best) {
        tops.push(id);
      }
    }

    if (tops.length !== 1 || best <= 0) {
      addLog(t.sheriffTieNoSheriff);
      syncSheriffId(null);
      return;
    }
    const winId = tops[0]!;
    const winName = playersRef.current.find((x) => x.id === winId)?.name ?? winId;
    addLog(t.sheriffElected(winName));
    syncSheriffId(winId);
  }, [
    addLog,
    appendVoteHistory,
    deliverAiSpeechBubbles,
    config.dayExileVotesPublic,
    config.fromTutorial,
    maybeAppendAiFriendSticker,
    typeHumanSpeechIntoUi,
    waitForHumanSpeech,
    sleepInterruptible,
    syncSheriffId,
  ]);

  const finalizeGuardChoice = useCallback(async () => {
    const alive = playersRef.current.filter((p) => p.isAlive);
    const guard = alive.find((p) => p.role === 'Guard');
    if (!guard) {
      pendingNightRef.current.guardTargetId = null;
      setNightHumanGate(false);
      return;
    }
    const lastId = guardLastTargetRef.current?.id ?? null;
    const pool = lastId ? alive.filter((p) => p.id !== lastId) : alive;
    if (pool.length === 0) {
      pendingNightRef.current.guardTargetId = null;
      setNightHumanGate(false);
      return;
    }

    if (guard.isAI) {
      const char = charactersById.get(guard.id);
      const brain = aiSpeechBrainHubRef.current?.byAiId[guard.id] ?? null;
      let picked: string | null = null;
      if (char) {
        picked = pickGuardTarget({
          guardId: guard.id,
          brain,
          profile: getAIBehaviorProfile(char),
          pool: pool as PoolPlayer[],
          sheriffId: sheriffIdRef.current,
          previousTargetId: lastId,
        });
      }
      pendingNightRef.current.guardTargetId =
        picked && pool.some((p) => p.id === picked) ? picked : pickRandom(pool).id;
    } else {
      const pick = humanGuardTargetRef.current;
      pendingNightRef.current.guardTargetId =
        pick && pool.some((p) => p.id === pick) ? pick : pickRandom(pool).id;
    }
    setNightHumanGate(false);
  }, [charactersById]);

  const finalizeWolfVotes = useCallback(async () => {
    const alive = playersRef.current.filter((p) => p.isAlive);
    const outsiders = alive.filter((p) => !isWolfTeam(p.role));
    const wolves = alive.filter((p) => isWolfTeam(p.role) && p.canVote !== false);

    if (alive.length === 0) {
      pendingNightRef.current.wolfKillTargetId = null;
      setNightHumanGate(false);
      wolfPackKillVoteByWolfRef.current = new Map();
      setWolfPackKnifeTally({});
      return;
    }

    await aiWolfKillSeedInFlightRef.current?.catch(() => undefined);
    const aiNeedsDecision = wolves.some(
      (w) => w.isAI && !wolfPackKillVoteByWolfRef.current.get(w.id)
    );
    if (aiNeedsDecision) {
      await runAiWolfKillDecisions({ showThinking: true });
    }

    const killPoolBase = shuffleKillCandidates(
      outsiders.length > 0 ? outsiders : alive.filter((p) => !isWolfTeam(p.role))
    );

    const tally = new Map<string, number>();
    for (const w of wolves) {
      const pool = killPoolBase.filter((p) => p.id !== w.id);
      if (pool.length === 0) continue;

      let targetId = wolfPackKillVoteByWolfRef.current.get(w.id);
      if (!w.isAI) {
        const humanPick = humanWolfKillVoteRef.current;
        if (humanPick && pool.some((p) => p.id === humanPick)) {
          targetId = humanPick;
        }
        if (!targetId || !pool.some((p) => p.id === targetId)) {
          targetId = pickRandom(pool).id;
        }
        wolfPackKillVoteByWolfRef.current.set(w.id, targetId);
      } else if (!targetId || !pool.some((p) => p.id === targetId)) {
        targetId = pickRandom(pool).id;
        wolfPackKillVoteByWolfRef.current.set(w.id, targetId);
      }
      tally.set(targetId, (tally.get(targetId) ?? 0) + 1);
    }
    setTypingText('');

    const tallyObj: Record<string, number> = {};
    for (const [id, c] of tally) tallyObj[id] = c;
    setWolfPackKnifeTally(tallyObj);

    let best = -1;
    const tops: string[] = [];
    for (const [id, c] of tally) {
      if (c > best) {
        best = c;
        tops.length = 0;
        tops.push(id);
      } else if (c === best) tops.push(id);
    }
    const fallbackPool = shuffleKillCandidates(outsiders.length > 0 ? outsiders : alive);
    const killId =
      tops.length === 0
        ? pickRandom(fallbackPool).id
        : tops.length === 1
          ? tops[0]!
          : pickRandom(tops);
    pendingNightRef.current.wolfKillTargetId = killId;
    setNightWolfVictimId(killId);
    setNightHumanGate(false);
  }, [runAiWolfKillDecisions]);

  const finalizeWolfBeautyCharm = useCallback(async () => {
    const lang = uiLangRef.current;
    const t = gameCopy[lang];
    const alive = playersRef.current.filter((p) => p.isAlive);
    const wb = alive.find((p) => p.role === 'WolfBeauty');
    if (!wb) {
      pendingNightRef.current.wolfBeautyCharmTargetId = null;
      setNightHumanGate(false);
      return;
    }
    const goodAlive = alive.filter((p) => !isWolfTeam(p.role));
    let charmPool = goodAlive;
    const meta = wolfBeautyCharmMetaRef.current;
    if (meta.lastNight === nightCountRef.current - 1 && meta.lastTarget) {
      charmPool = charmPool.filter((p) => p.id !== meta.lastTarget);
    }
    if (charmPool.length === 0) {
      pendingNightRef.current.wolfBeautyCharmTargetId = null;
      setNightHumanGate(false);
      return;
    }

    let charmTargetId: string | null = null;
    if (wb.isAI) {
      const char = charactersById.get(wb.id);
      const candidates = charmPool.map((p) => ({ id: p.id, name: p.name }));
      if (char) {
        setTypingText(gameCopy[lang].aiThinking);
        const llmId = await fetchAIWolfBeautyCharm({
          actor: {
            id: wb.id,
            name: wb.name,
            personality: characterPersonalityForUi(char, lang),
            personalityDescription: characterDescriptionForUi(char, lang),
            difficulty: char.difficulty,
            modelRef: modelRefMapRef.current.get(wb.id),
          },
          lang,
          candidates,
          history: aiHistoryForPlayer(wb, narratorLinesRef.current, lang, config.dayExileVotesPublic, 40),
          nightNumber: Math.max(1, nightCountRef.current + 1),
        });
        setTypingText('');
        if (llmId && charmPool.some((p) => p.id === llmId)) charmTargetId = llmId;
      }
      if (!charmTargetId) charmTargetId = pickRandom(charmPool).id;
    } else {
      const c = humanWolfCharmTargetRef.current;
      if (c && charmPool.some((p) => p.id === c)) charmTargetId = c;
      if (!charmTargetId) charmTargetId = pickRandom(charmPool).id;
    }

    pendingNightRef.current.wolfBeautyCharmTargetId = charmTargetId;
    const base = playersRef.current;
    const updated = base.map((p) => {
      if (p.id === charmTargetId) return { ...p, charmedByWolfBeautyId: wb.id };
      if (p.charmedByWolfBeautyId === wb.id && p.id !== charmTargetId) {
        return { ...p, charmedByWolfBeautyId: undefined };
      }
      return p;
    });
    setPlayers(updated);
    playersRef.current = updated;
    wolfBeautyCharmMetaRef.current = {
      lastNight: nightCountRef.current,
      lastTarget: charmTargetId,
    };
    const tn = updated.find((p) => p.id === charmTargetId)?.name ?? charmTargetId;
    addNarratorLine(
      {
        zh: gameCopy.zh.wolfBeautyCharmApplied(tn),
        en: gameCopy.en.wolfBeautyCharmApplied(tn),
      },
      'wolf_team',
      'NIGHT_WOLF_BEAUTY_CHARM'
    );
    setNightHumanGate(false);
  }, [addLog, charactersById]);

  const finalizeWitchChoices = useCallback(async () => {
    const lang = uiLangRef.current;
    const alive = playersRef.current.filter((p) => p.isAlive);
    const witch = alive.find((p) => p.role === 'Witch');
    if (!witch) {
      pendingNightRef.current.witchUsesAntidote = false;
      pendingNightRef.current.witchPoisonTargetId = null;
      setNightHumanGate(false);
      return;
    }
    const vid = pendingNightRef.current.wolfKillTargetId;
    const wstate = witchStateRef.current;
    if (!wstate.hasAntidote && !wstate.hasPoison) {
      pendingNightRef.current.witchUsesAntidote = false;
      pendingNightRef.current.witchPoisonTargetId = null;
      setNightHumanGate(false);
      return;
    }
    const revealKnife = wstate.hasAntidote;
    if (witch.isAI) {
      const isFirstNight = nightCountRef.current <= 0;
      const char = charactersById.get(witch.id);
      const brain = aiSpeechBrainHubRef.current?.byAiId[witch.id] ?? null;
      const pool = alive.filter((p) => p.id !== witch.id);
      let save = false;
      let poison: string | null = null;
      if (char) {
        setTypingText(gameCopy[lang].aiThinking);
        const actor = {
          id: witch.id,
          name: witch.name,
          personality: characterPersonalityForUi(char, lang),
          personalityDescription: characterDescriptionForUi(char, lang),
          difficulty: char.difficulty,
          modelRef: modelRefMapRef.current.get(witch.id),
        };
        const knifeVictimName =
          revealKnife && vid ? alive.find((p) => p.id === vid)?.name ?? null : null;
        const knifeVictimId = revealKnife ? vid ?? null : null;
        const llmDecision = await fetchAIWitchAction({
          actor,
          lang,
          poisonCandidates: pool.map((p) => ({ id: p.id, name: p.name })),
          history: aiHistoryForPlayer(witch, narratorLinesRef.current, lang, config.dayExileVotesPublic, 40),
          nightNumber: Math.max(1, nightCountRef.current + 1),
          hasAntidote: wstate.hasAntidote,
          hasPoison: wstate.hasPoison,
          knifeVictimName,
          knifeVictimId,
          witchId: witch.id,
          isFirstNight,
        });
        if (llmDecision) {
          save = llmDecision.save;
          poison =
            llmDecision.poisonTargetId && pool.some((p) => p.id === llmDecision.poisonTargetId)
              ? llmDecision.poisonTargetId
              : null;
        } else {
          const decision = decideWitchActions({
            witchId: witch.id,
            brain,
            profile: getAIBehaviorProfile(char),
            knifeVictimId,
            poisonPool: pool as PoolPlayer[],
            hasAntidote: wstate.hasAntidote,
            hasPoison: wstate.hasPoison,
            isFirstNight,
            sheriffId: sheriffIdRef.current,
          });
          save = decision.save;
          poison = decision.poisonTargetId;
        }
        setTypingText('');
      } else {
        if (vid && wstate.hasAntidote) {
          if (vid === witch.id) {
            if (isFirstNight) save = Math.random() < 0.86;
          } else {
            save = Math.random() < (isFirstNight ? 0.86 : 0.38);
          }
        }
        if (wstate.hasPoison && !save) {
          const pChance = isFirstNight ? 0.07 : 0.2;
          if (Math.random() < pChance && pool.length > 0) {
            poison = pickRandom(pool).id;
          }
        }
      }
      pendingNightRef.current.witchUsesAntidote = save;
      pendingNightRef.current.witchPoisonTargetId = save ? null : poison;
      setNightHumanGate(false);
      return;
    }
    const selfKnife = vid === witch.id;
    const firstNight = nightCountRef.current <= 0;
    if (!vid || !wstate.hasAntidote) {
      pendingNightRef.current.witchUsesAntidote = false;
    } else if (selfKnife && !firstNight) {
      pendingNightRef.current.witchUsesAntidote = false;
    } else {
      pendingNightRef.current.witchUsesAntidote = witchHumanSaveRef.current === 'yes';
    }
    const usedSave = pendingNightRef.current.witchUsesAntidote;
    if (wstate.hasPoison && !usedSave) {
      const p = witchHumanPoisonRef.current;
      const ok = p !== null && alive.some((x) => x.id === p && x.id !== witch.id);
      pendingNightRef.current.witchPoisonTargetId = ok ? p : null;
    } else {
      pendingNightRef.current.witchPoisonTargetId = null;
    }
    setNightHumanGate(false);
  }, [charactersById]);

  const finalizeSeerChoice = useCallback(async () => {
    const lang = uiLangRef.current;
    const alive = playersRef.current.filter((p) => p.isAlive);
    const seer = alive.find((p) => p.role === 'Seer');
    if (!seer) {
      pendingNightRef.current.seerInspectTargetId =
        alive.length > 0 ? pickRandom(alive).id : 'me';
      setNightHumanGate(false);
      return;
    }
    if (seer.isAI) {
      const pool = alive.filter((p) => p.id !== seer.id);
      const char = charactersById.get(seer.id);
      const brain = aiSpeechBrainHubRef.current?.byAiId[seer.id] ?? null;
      const candidates = pool.map((p) => ({ id: p.id, name: p.name }));
      let picked: string | null = null;
      if (pool.length > 0 && char) {
        setTypingText(gameCopy[lang].aiThinking);
        const actor = {
          id: seer.id,
          name: seer.name,
          personality: characterPersonalityForUi(char, lang),
          personalityDescription: characterDescriptionForUi(char, lang),
          difficulty: char.difficulty,
          modelRef: modelRefMapRef.current.get(seer.id),
        };
        picked = await fetchAISeerCheck({
          actor,
          lang,
          candidates,
          history: aiHistoryForPlayer(seer, narratorLinesRef.current, lang, config.dayExileVotesPublic, 40),
          nightNumber: Math.max(1, nightCountRef.current + 1),
        });
        setTypingText('');
      }
      if (!picked || !pool.some((p) => p.id === picked)) {
        picked =
          pool.length > 0 && char
            ? pickSeerCheckTarget({
                seerId: seer.id,
                brain,
                profile: getAIBehaviorProfile(char),
                pool: pool as PoolPlayer[],
                sheriffId: sheriffIdRef.current,
              })
            : null;
      }
      pendingNightRef.current.seerInspectTargetId =
        picked ?? (pool.length > 0 ? pickRandom(pool).id : seer.id);
    } else {
      const v = humanSeerInspectRef.current;
      const pool = alive.filter((p) => p.id !== seer.id);
      pendingNightRef.current.seerInspectTargetId =
        v && pool.some((p) => p.id === v) ? v : pool.length > 0 ? pickRandom(pool).id : seer.id;
    }
    const seerPickId = pendingNightRef.current.seerInspectTargetId;
    if (seerPickId) {
      const target = playersRef.current.find((pl) => pl.id === seerPickId);
      if (target) {
        const nightNum = Math.max(1, nightCountRef.current + 1);
        const prev = seerPrivateRef.current.get(seer.id) ?? [];
        seerPrivateRef.current.set(seer.id, [
          ...prev,
          {
            nightNumber: nightNum,
            targetName: target.name,
            isWolf: isWolfTeam(target.role),
          },
        ]);
      }
    }
    setNightHumanGate(false);
  }, [charactersById]);

  const runKnightDuelPhase = useCallback(async (): Promise<boolean> => {
    const lang = uiLangRef.current;
    const t = gameCopy[lang];
    const alive = playersRef.current.filter((p) => p.isAlive);
    const knight = alive.find((p) => p.role === 'Knight' && !p.knightDuelUsed);
    if (!knight) return false;

    setPhase('KNIGHT_DUEL');
    addLog(t.knightDuelJudgeAsk(knight.name));

    const pool = alive.filter((p) => p.id !== knight.id);
    let useSkill = false;
    let targetId: string | null = null;

    if (knight.isAI) {
      const char = charactersById.get(knight.id);
      const brain = aiSpeechBrainHubRef.current?.byAiId[knight.id] ?? null;
      const candidates = pool.map((p) => ({ id: p.id, name: p.name }));
      if (char) {
        setTypingText(gameCopy[lang].aiThinking);
        const llm = await fetchAIKnightDuel({
          actor: {
            id: knight.id,
            name: knight.name,
            personality: characterPersonalityForUi(char, lang),
            personalityDescription: characterDescriptionForUi(char, lang),
            difficulty: char.difficulty,
            modelRef: modelRefMapRef.current.get(knight.id),
          },
          lang,
          candidates,
          history: aiHistoryForPlayer(knight, narratorLinesRef.current, lang, config.dayExileVotesPublic, 40),
          dayNumber: nightCountRef.current,
        });
        setTypingText('');
        if (llm) {
          useSkill = llm.useSkill;
          targetId = llm.targetId;
        } else {
          const fallback = pickKnightDuelTarget({
            knightId: knight.id,
            profile: getAIBehaviorProfile(char),
            brain,
            pool,
            dayNumber: nightCountRef.current,
          });
          useSkill = fallback.useSkill;
          targetId = fallback.targetId;
        }
      } else {
        const fallback = pickKnightDuelTarget({
          knightId: knight.id,
          profile: getAIBehaviorProfile(CHARACTERS[0]!),
          brain,
          pool,
          dayNumber: nightCountRef.current,
        });
        useSkill = fallback.useSkill;
        targetId = fallback.targetId;
      }
    } else {
      setKnightDuelMode(true);
      setSelectedId(null);
      const decision = await new Promise<{ useSkill: boolean; targetId: string | null }>((resolve) => {
        knightDuelResolveRef.current = resolve;
      });
      setKnightDuelMode(false);
      useSkill = decision.useSkill;
      targetId = decision.targetId;
    }

    if (!useSkill || !targetId || !pool.some((p) => p.id === targetId)) {
      addLog(t.knightDuelPassed);
      return false;
    }

    const duelResult = applyKnightDuelResolution({
      players: playersRef.current,
      knightId: knight.id,
      targetId,
      lang,
    });
    duelResult.logs.forEach((line) => addLog(line));

    setPlayers(duelResult.players);
    playersRef.current = duelResult.players;
    setSelectedId(null);
    await maybeTransferSheriffBadge(duelResult.players);
    if (endGameIfNeeded(duelResult.players, lang)) return true;

    if (duelResult.lastWordDead.length > 0) {
      addLog(t.dayExileLastWords);
      await runLastWordsPhase(duelResult.lastWordDead);
    }

    const hunterSnap = playersRef.current.find((p) => p.id === targetId);
    if (
      duelResult.targetDied &&
      hunterSnap?.role === 'Hunter' &&
      !hunterSnap.isAlive &&
      !hunterSnap.cannotUseHunterGun
    ) {
      const hr = await runHunterGunPhase(hunterSnap, { reason: 'knight_duel' });
      if (hr.gameEnded) return true;
      const lw: RoomPlayer[] = [];
      if (hr.shotVictimId) {
        const shotDead = playersRef.current.find((p) => p.id === hr.shotVictimId && !p.isAlive);
        if (shotDead) lw.push(shotDead);
      }
      if (hr.martyrForLastWords) lw.push(hr.martyrForLastWords);
      if (lw.length > 0) await runLastWordsPhase(lw);
    }

    return false;
  }, [
    addLog,
    charactersById,
    endGameIfNeeded,
    maybeTransferSheriffBadge,
    runLastWordsPhase,
    runHunterGunPhase,
  ]);

  const confirmKnightDuel = useCallback(() => {
    const lang = uiLangRef.current;
    const t = gameCopy[lang];
    const tid = selectedId;
    const alive = playersRef.current.filter((p) => p.isAlive);
    const knight = alive.find((p) => p.id === 'me' && p.role === 'Knight');
    if (!knight || !tid || !alive.some((p) => p.id === tid && p.id !== 'me')) {
      Alert.alert(t.pickPlayerAlert, t.knightDuelHint);
      return;
    }
    setFooterButtonsDismissed(true);
    const r = knightDuelResolveRef.current;
    knightDuelResolveRef.current = null;
    setKnightDuelMode(false);
    setSelectedId(null);
    r?.({ useSkill: true, targetId: tid });
  }, [selectedId]);

  const skipKnightDuel = useCallback(() => {
    setFooterButtonsDismissed(true);
    const r = knightDuelResolveRef.current;
    knightDuelResolveRef.current = null;
    setKnightDuelMode(false);
    setSelectedId(null);
    r?.({ useSkill: false, targetId: null });
  }, []);

  const applyDawnResolution = useCallback(async () => {
    if (discussionRunningRef.current) return;
    discussionRunningRef.current = true;
    const lang = uiLangRef.current;
    const t = gameCopy[lang];
    const fromTutorial = config.fromTutorial === true;
    try {
      await playDayBreakCue(lang, {
        onPlaybackStart: () => {
          setBackdropIsNight(false);
          addNarratorLine(
            { zh: gameCopy.zh.dayBreakAnnounce, en: gameCopy.en.dayBreakAnnounce },
            'public',
            'NIGHT_RESOLVE'
          );
        },
      });
      nightCountRef.current += 1;
      setDawnCount(nightCountRef.current);
      const pending = pendingNightRef.current;
      const choices = buildNightChoicesFromPending(playersRef.current, pending);
      const outcome = resolveStandardNight(playersRef.current, {
        nightNumber: nightCountRef.current,
        witch: witchStateRef.current,
        choices,
      });
      witchStateRef.current = outcome.witch;

      const { players: merged, diedTonight } = mergeStandardNightOutcome(
        playersRef.current,
        outcome
      );

      let finalPlayers = merged;
      if (config.board === 'WolfBeauty') {
        const aftermath = applyWolfBeautyNightAftermath(
          merged,
          diedTonight,
          deathDetailsToCauseMap(outcome.deathDetails),
          lang
        );
        finalPlayers = aftermath.players;
        aftermath.logs.forEach((l) => addLog(l.line, 'public', 'WOLF_BEAUTY_FOLLOW'));
      }

      setPlayers(finalPlayers);
      playersRef.current = finalPlayers;

      const witchPlayer =
        finalPlayers.find((p) => p.role === 'Witch') ??
        playersRef.current.find((p) => p.role === 'Witch');
      if (witchPlayer) {
        for (const d of outcome.deathDetails) {
          if (d.cause !== 'poison' && d.cause !== 'both') continue;
          const victim = finalPlayers.find((p) => p.id === d.id);
          witchPoisonHistoryRef.current.push({
            nightNumber: nightCountRef.current,
            witchId: witchPlayer.id,
            witchName: witchPlayer.name,
            targetId: d.id,
            targetName: victim?.name ?? d.id,
          });
        }
      }

      const guardPick = pendingNightRef.current.guardTargetId;
      if (guardPick) {
        const gName = finalPlayers.find((p) => p.id === guardPick)?.name ?? guardPick;
        guardLastTargetRef.current = { id: guardPick, name: gName };
      }

      outcome.lines.forEach((line) =>
        addNarratorLine(line, 'public', 'NIGHT_RESOLVE')
      );

      await maybeTransferSheriffBadge(finalPlayers);

      if (endGameIfNeeded(finalPlayers, lang)) return;

      if (fromTutorial && diedTonight.length > 0 && nightCountRef.current === 1) {
        await new Promise<void>((resolve) => {
          deathRulesAckResolveRef.current = resolve;
          setDeathRulesModalVisible(true);
        });
      }

      const lwNightPreview = firstNightWolfLastWordCandidates(
        diedTonight,
        outcome.deathDetails,
        nightCountRef.current
      );
      if (diedTonight.length > 0) {
        const isFirstNightAfterDawn = nightCountRef.current === 1;
        if (isFirstNightAfterDawn) {
          addLog(t.firstNightDeathLastWords);
          if (diedTonight.some((p) => p.id === 'me')) {
            addLog(t.nightDeadYouKnowStatus, 'player_me', 'NIGHT_RESOLVE');
          }
        } else {
          addLog(t.laterNightDeathNoLastWords);
          if (diedTonight.some((p) => p.id === 'me')) {
            addLog(t.nightDeadYouKnowStatusSilent, 'player_me', 'NIGHT_RESOLVE');
          }
        }
      }

      const hunterWolfOnly = hunterKilledByWolfTonight(diedTonight, outcome.deathDetails);
      if (hunterWolfOnly) {
        const hr = await runHunterGunPhase(hunterWolfOnly, { reason: 'night_wolf' });
        if (hr.gameEnded) return;
        if (hr.martyrForLastWords) await runLastWordsPhase([hr.martyrForLastWords]);
      }

      if (lwNightPreview.length > 0) {
        await runLastWordsPhase(lwNightPreview);
      }

      if (nightCountRef.current === 1 && !sheriffElectionCompleteRef.current) {
        await runSheriffFlow();
        sheriffElectionCompleteRef.current = true;
      }

      setPhase('DISCUSSION');
      addLog(t.discussionStart);
      await runSpeakingTurns();
      if (config.board === 'WolfBeauty') {
        const duelEnded = await runKnightDuelPhase();
        if (duelEnded) return;
      }
      setPhase('VOTING');
    } finally {
      discussionRunningRef.current = false;
      resetNightChoices();
    }
  }, [
    addLog,
    addNarratorLine,
    runSpeakingTurns,
    runKnightDuelPhase,
    endGameIfNeeded,
    runLastWordsPhase,
    runHunterGunPhase,
    runSheriffFlow,
    beginNightPhase,
    resetNightChoices,
    config.fromTutorial,
    config.board,
    maybeTransferSheriffBadge,
  ]);


  const handleNightSegmentAdvance = useCallback(async () => {
    if (nightAdvanceBusyRef.current) return;
    nightAdvanceBusyRef.current = true;
    try {
      const seg = nightSegRef.current;
      if (!seg) return;

      if (seg === 'guard') await finalizeGuardChoice();
      else if (seg === 'wolves') await finalizeWolfVotes();
      else if (seg === 'wolf_beauty') await finalizeWolfBeautyCharm();
      else if (seg === 'witch') await finalizeWitchChoices();
      else if (seg === 'seer') await finalizeSeerChoice();

      wolfchaStateRef.current = syncNightActions(wolfchaStateRef.current, pendingNightRef.current);

      const lang = uiLangRef.current;
      if (nightSegmentHasOpenCloseBroadcast(seg)) {
        await playNightSegmentCue(seg, 'close', lang, {
          onPlaybackStart: () => {
            addNarratorLine(announceNightSegmentCloseLine(seg));
          },
        });
      }

      const advance = planAfterNightSegment(seg, config.board, playersRef.current);
      if (advance.kind === 'next') {
        if (nightSegmentHasOpenCloseBroadcast(advance.segment)) {
          await playNightSegmentCue(advance.segment, 'wake', lang, {
            onPlaybackStart: () => {
              addNarratorLine(announceNightSegmentLine(advance.segment));
            },
          });
        } else {
          addNarratorLine(announceNightSegmentLine(advance.segment));
        }
        nightSegRef.current = advance.segment;
        nightAdvanceBusyRef.current = false;
        setNightSeg(advance.segment);
        return;
      }

      nightSegRef.current = null;
      setNightSeg(null);
      wolfchaStateRef.current = { ...wolfchaStateRef.current, phase: 'NIGHT_RESOLVE' };
      await applyDawnResolution();
    } finally {
      nightAdvanceBusyRef.current = false;
    }
  }, [
    addNarratorLine,
    config.board,
    applyDawnResolution,
    finalizeGuardChoice,
    finalizeWolfVotes,
    finalizeWolfBeautyCharm,
    finalizeWitchChoices,
    finalizeSeerChoice,
  ]);

  useEffect(() => {
    if (phase !== 'NIGHT' || !nightSeg) return;
    const me = playersRef.current.find((p) => p.id === 'me');
    if (
      nightSegmentNeedsHumanInput(
        nightSeg,
        me,
        me?.role === 'Witch' ? witchStateRef.current : undefined
      )
    ) {
      return;
    }
    const token = nightSegAutoTokenRef.current;
    void (async () => {
      if (nightSeg === 'wolves') {
        await aiWolfKillSeedInFlightRef.current?.catch(() => undefined);
      }
      if (nightSegAutoTokenRef.current !== token) return;
      if (nightSegRef.current !== nightSeg) return;
      await handleNightSegmentAdvance();
    })();
  }, [phase, nightSeg, handleNightSegmentAdvance]);

  const commitHumanWitchAndAdvance = useCallback(async () => {
    setWitchPoisonPickMode(false);
    await handleNightSegmentAdvance();
  }, [handleNightSegmentAdvance]);

  const executeExileVoteFlow = useCallback(
    async (humanPick: string | null) => {
      if (exileVoteFlowBusyRef.current) return;
      exileVoteFlowBusyRef.current = true;
      try {
        const lang = uiLangRef.current;
        const t = gameCopy[lang];
        const alive = playersRef.current.filter((p) => p.isAlive);
        const voters = alive.filter((p) => p.canVote !== false);
        const hub = aiSpeechBrainHubRef.current;
        if (hub && narratorLinesRef.current.length > 0) {
          hub.sharedMemory = ingestPublicSpeechMemories(hub.sharedMemory, {
            logLines: publicNarratorLogStrings(narratorLinesRef.current, lang, 80),
            alivePlayers: alive.map((p) => ({ id: p.id, name: p.name })),
            lang,
            round: hub.dayRoundApprox,
            phaseIndex: hub.exilePhaseIndex,
          });
        }
        const votes = new Map<string, string>();
        for (const p of voters) {
          if (p.isAI) {
            const pool = alive.filter((x) => x.id !== p.id);
            if (pool.length === 0) continue;
            const char = CHARACTERS.find((c) => c.id === p.id);
            const diff = char?.difficulty ?? 'Novice';
            const persona = char ? characterPersonalityForUi(char, lang) : 'Neutral';
            const personaDesc = char ? characterDescriptionForUi(char, lang) : '';

            // Deterministic voting engine: respects personality traits + difficulty
            const brain = aiSpeechBrainHubRef.current?.byAiId[p.id];
            let tid: string | null = null;
            if (char && brain && aiSpeechBrainHubRef.current) {
              const hub = aiSpeechBrainHubRef.current;
              const aiProfile = getAIBehaviorProfile(char);
              const poolIds = pool.map((x) => x.id);
              const memInf = getMemoryInfluenceOnBehavior(
                hub.sharedMemory,
                p.id,
                aiProfile,
                char.difficulty,
                poolIds,
                { daytimeExileBallotDetailPublic: hub.dayExileVotesPublic }
              );
              const mergedScores = mergeSuspicionWithMemory(brain.suspicion.scores, memInf.suspicionDeltaByPlayerId);
              const suspicionForVote = { ...brain.suspicion, scores: mergedScores };
              // Wolf-only: identify pack members already drawing >=2 public votes this round.
              // These are "bussable" — a cunning wolf may vote with the wagon to keep cover.
              // Only computable in public-ballot mode (hidden ballots leak nothing to a wolf either).
              let sacrificeIds: string[] | undefined;
              if (hub.dayExileVotesPublic && brain.wolfPackMemberIds) {
                const ballotTally = new Map<string, number>();
                for (const tid of votes.values()) ballotTally.set(tid, (ballotTally.get(tid) ?? 0) + 1);
                sacrificeIds = brain.wolfPackMemberIds.filter(
                  (id) => id !== p.id && (ballotTally.get(id) ?? 0) >= 2
                );
                if (sacrificeIds.length === 0) sacrificeIds = undefined;
              }
              const voteCtx: VotingEngineContext = {
                observerId: p.id,
                observerCharacter: char,
                alivePlayers: pool.map((x) => ({ id: x.id, name: x.name })),
                suspicionState: suspicionForVote,
                thoughtTick: brain.thoughtTick,
                phaseIndex: hub.exilePhaseIndex,
                // Only expose current ballot in public vote mode; secret ballot stays hidden
                currentBallot: hub.dayExileVotesPublic ? Object.fromEntries(votes) : {},
                hiddenAllyIds: brain.wolfPackMemberIds?.filter((id) => id !== p.id) ?? undefined,
                sacrificeCandidateIds: sacrificeIds,
                // Only expose last phase ballot in public vote mode
                lastPhaseVoteByVoter: hub.dayExileVotesPublic ? (hub.lastExileBallot ?? undefined) : undefined,
              };
              const decision = decideVote(voteCtx);
              if (pool.some((x) => x.id === decision.targetId)) {
                tid = decision.targetId;
              }
            }

            // Fallback to LLM if voting engine is not available
            if (!tid) {
              const voter = { id: p.id, name: p.name, personality: persona, personalityDescription: personaDesc, difficulty: diff, modelRef: modelRefMapRef.current.get(p.id) };
              const sheriffW = sheriffIdRef.current === p.id ? 1.5 : 1;
              tid = await fetchAIExileVote({
                voter,
                role: p.role,
                lang,
                history: aiCurrentDayHistoryForPlayer(p, narratorLinesRef.current, lang, config.dayExileVotesPublic, 80),
                candidates: pool.map((x) => ({ id: x.id, name: x.name })),
                dayNumber: Math.max(1, nightCountRef.current),
                sheriffVoteWeight: sheriffW,
              });
            }

            votes.set(p.id, pool.some((x) => x.id === tid) ? tid : pickRandom(pool).id);
          } else {
            if (humanPick === DAY_EXILE_ABSTAIN_ID) {
              continue;
            }
            if (!humanPick || !alive.some((x) => x.id === humanPick)) {
              return;
            }
            votes.set(p.id, humanPick);
          }
        }

        const hubAfterVote = aiSpeechBrainHubRef.current;
        if (hubAfterVote && votes.size > 0) {
          if (config.dayExileVotesPublic) {
            applyPublicExileBallotToBrains(hubAfterVote, votes, alive, charactersById);
          } else {
            applySecretExileBallotToBrains(hubAfterVote);
          }
        }

        appendVoteHistory(
          [...votes.entries()].map(([voterId, targetId]) => ({
            kind: 'day_exile' as const,
            day: Math.max(1, nightCountRef.current),
            voterId,
            targetId,
          }))
        );

        const tally = new Map<string, number>();
        for (const [voterId, tid] of votes) {
          const w = sheriffIdRef.current === voterId ? 1.5 : 1;
          tally.set(tid, (tally.get(tid) ?? 0) + w);
        }

        let best = -1;
        const tops: string[] = [];
        for (const [id, c] of tally) {
          if (c > best) {
            best = c;
            tops.length = 0;
            tops.push(id);
          } else if (c === best) {
            tops.push(id);
          }
        }

        if (tops.length === 0) {
          addLog(lang === 'zh' ? '法官：本轮无有效票，流局入夜。' : 'Moderator: no valid votes—night resumes.');
          await beginNightPhase();
          return;
        }

        if (tops.length > 1) {
          const names = tops
            .map((id) => playersRef.current.find((p) => p.id === id)?.name ?? id)
            .join(lang === 'zh' ? '、' : ', ');
          addLog(t.exileTie(names));
          await beginNightPhase();
          return;
        }

        const victimId = tops[0]!;
        const victim = playersRef.current.find((p) => p.id === victimId);
        const victimName = victim?.name ?? victimId;

        let next = playersRef.current.map((p) => ({ ...p }));
        const vObj = next.find((p) => p.id === victimId);
        const idiotSurvive = vObj?.role === 'Idiot' && !vObj.idiotFlipUsed;

        if (idiotSurvive) {
          next = next.map((p) =>
            p.id === victimId ? { ...p, idiotFlipUsed: true, canVote: false } : p
          );
          addLog(t.exileIdiot(victimName));
          addLog(t.idiotLostVote);
          setPlayers(next);
          playersRef.current = next;
          setSelectedId(null);
          if (endGameIfNeeded(next, lang)) return;
          await new Promise<void>((resolve) => {
            idiotFlipAckResolveRef.current = resolve;
            const src = seatAvatarSource(victimId, victimId === 'me' ? meAvatarIndex : undefined);
            setIdiotFlipModal({
              playerId: victimId,
              name: victimName,
              avatarSource: src,
            });
          });
        } else {
          let martyrId: string | null = null;
          next = next.map((p) =>
            p.id === victimId ? { ...p, isAlive: false, outReason: 'exile_day' as const } : p
          );
          if (config.board === 'WolfBeauty' && vObj?.role === 'WolfBeauty') {
            const charmed = next.find((p) => p.isAlive && p.charmedByWolfBeautyId === victimId);
            if (charmed) {
              martyrId = charmed.id;
              addLog(t.wolfBeautyMartyr(charmed.name));
              next = next.map((p) =>
                p.id === martyrId
                  ? {
                      ...p,
                      isAlive: false,
                      outReason: 'wolf_beauty_charm' as const,
                      cannotUseHunterGun: true,
                    }
                  : p
              );
            }
          }
          addLog(t.exileDead(victimName));
          addLog(t.dayExileLastWords);
          const deadSnapshot = next.find((p) => p.id === victimId)!;
          const lwBatch: RoomPlayer[] = [deadSnapshot];
          if (martyrId) {
            const ms = next.find((p) => p.id === martyrId);
            if (ms) lwBatch.push(ms);
          }
          setPlayers(next);
          playersRef.current = next;
          setSelectedId(null);
          await maybeTransferSheriffBadge(next);
          if (endGameIfNeeded(next, lang)) return;
          await runLastWordsPhase(lwBatch);
          const hunterSnap = playersRef.current.find((p) => p.id === victimId);
          if (hunterSnap?.role === 'Hunter' && !hunterSnap.cannotUseHunterGun) {
            const hr = await runHunterGunPhase(hunterSnap, { reason: 'exile' });
            if (hr.gameEnded) return;
            const lw: RoomPlayer[] = [];
            if (hr.shotVictimId) {
              const shotDead = playersRef.current.find((p) => p.id === hr.shotVictimId && !p.isAlive);
              if (shotDead) lw.push(shotDead);
            }
            if (hr.martyrForLastWords) lw.push(hr.martyrForLastWords);
            if (lw.length > 0) await runLastWordsPhase(lw);
          }
        }

        await beginNightPhase();
      } finally {
        exileVoteFlowBusyRef.current = false;
      }
    },
    [
      addLog,
      addNarratorLine,
      appendVoteHistory,
      beginNightPhase,
      endGameIfNeeded,
      runLastWordsPhase,
      runHunterGunPhase,
      resetNightChoices,
      meAvatarIndex,
      maybeTransferSheriffBadge,
      config.board,
      config.dayExileVotesPublic,
      charactersById,
    ]
  );

  const submitVote = useCallback(() => {
    const lang = uiLangRef.current;
    const t = gameCopy[lang];
    const targetId = selectedId;
    if (!targetId) {
      Alert.alert(t.exileVotePickAlert, t.exileVotePickBody);
      return;
    }
    const alive = playersRef.current.filter((p) => p.isAlive);
    if (!alive.some((p) => p.id === targetId)) {
      Alert.alert(t.exileVotePickAlert, t.exileVotePickBody);
      return;
    }
    setFooterButtonsDismissed(true);
    void executeExileVoteFlow(targetId);
  }, [selectedId, executeExileVoteFlow]);

  const abstainExileVote = useCallback(() => {
    setFooterButtonsDismissed(true);
    setSelectedId(null);
    void executeExileVoteFlow(DAY_EXILE_ABSTAIN_ID);
  }, [executeExileVoteFlow]);

  /** 已出局或无投票权：无法点「确认放逐」，由 AI 票型自动结算放逐。 */
  useEffect(() => {
    if (phase !== 'VOTING') return;
    if (hunterShotMode) return;
    const me = playersRef.current.find((p) => p.id === 'me');
    const interactive = Boolean(me?.isAlive && me.canVote !== false);
    if (interactive) return;
    let cancelled = false;
    const raf = requestAnimationFrame(() => {
      if (cancelled) return;
      void executeExileVoteFlow(null);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [phase, hunterShotMode, executeExileVoteFlow]);

  const g = gameCopy[uiLang];

  /**
   * 牛皮纸：仅在右栏内竖放，贴右栏顶/底与最右；高度仍随栏高，宽度至少按资源比例，
   * 若右栏更宽则拉宽到整栏，略超比例时用 stretch 仅横向铺满。
   */
  const actionColumnParchmentImage = useMemo(() => {
    const ph = actionParchmentLayout.h;
    const pw = actionParchmentLayout.w;
    if (ph <= 0) {
      return {
        style: { ...PIXEL_ART_SPRITE, width: 1, height: 1, opacity: 0 } as const,
        resizeMode: 'contain' as const,
      };
    }
    const aspect = GAME_ROOM_PARCHMENT_DESIGN_W / GAME_ROOM_PARCHMENT_DESIGN_H;
    const naturalW = ph * aspect;
    const spanW = pw > 0 ? actionColumnParchmentSpanW(pw, ph) : naturalW;
    return {
      style: {
        ...PIXEL_ART_SPRITE,
        position: 'absolute' as const,
        right: 0,
        top: 0,
        width: spanW,
        height: ph,
        opacity: 1,
      },
      resizeMode: spanW > naturalW + 0.5 ? ('stretch' as const) : ('contain' as const),
    };
  }, [actionParchmentLayout.h, actionParchmentLayout.w]);

  const myRole = useMemo(
    () => players.find((p) => p.id === 'me')?.role ?? 'Villager',
    [players]
  );

  const { exileVoteInteractive, exileVoteSpectator } = useMemo(() => {
    const me = players.find((p) => p.id === 'me');
    const v = phase === 'VOTING';
    if (!me) return { exileVoteInteractive: false, exileVoteSpectator: false };
    if (hunterShotMode) {
      return { exileVoteInteractive: false, exileVoteSpectator: false };
    }
    return {
      exileVoteInteractive: v && me.isAlive && me.canVote !== false,
      exileVoteSpectator: v && (!me.isAlive || me.canVote === false),
    };
  }, [phase, players, hunterShotMode]);

  const { sheriffVoteInteractive, sheriffVoteSpectator, sheriffSignupInteractive, sheriffSignupSpectator } =
    useMemo(() => {
      const me = players.find((p) => p.id === 'me');
      if (!me) {
        return {
          sheriffVoteInteractive: false,
          sheriffVoteSpectator: false,
          sheriffSignupInteractive: false,
          sheriffSignupSpectator: false,
        };
      }
      const onTicket = sheriffCandidatesState.includes('me');
      return {
        sheriffSignupInteractive: phase === 'SHERIFF_SIGNUP' && sheriffSignupGate && me.isAlive,
        sheriffSignupSpectator: phase === 'SHERIFF_SIGNUP' && !me.isAlive,
        sheriffVoteInteractive:
          phase === 'SHERIFF_VOTE' &&
          sheriffVoteGate &&
          me.isAlive &&
          me.canVote !== false &&
          !onTicket,
        sheriffVoteSpectator:
          phase === 'SHERIFF_VOTE' &&
          (!me.isAlive || me.canVote === false || onTicket),
      };
    }, [phase, players, sheriffCandidatesState, sheriffSignupGate, sheriffVoteGate]);

  const sheriffSpectatorHint = useMemo(() => {
    const t = gameCopy[uiLang];
    const me = players.find((p) => p.id === 'me');
    if (!me || !me.isAlive) {
      return phase === 'SHERIFF_SIGNUP' ? t.sheriffSignupSpectatorDead : t.sheriffVoteSpectatorDead;
    }
    return t.sheriffVoteSpectatorOnTicket;
  }, [phase, players, uiLang]);

  const secretDayBallot = !config.dayExileVotesPublic;

  const voteSpectatorHint = useMemo(() => {
    const t = gameCopy[uiLang];
    if (secretDayBallot && phase === 'VOTING') {
      return t.voteUiSecretBallotActive;
    }
    const me = players.find((p) => p.id === 'me');
    if (!me) return t.voteUiNoVoteOther;
    if (me.isAlive && me.role === 'Idiot' && me.idiotFlipUsed && me.canVote === false) {
      return t.voteUiNoVoteIdiot;
    }
    if (!me.isAlive) {
      switch (me.outReason) {
        case 'exile_day':
          return t.voteUiDeadExile;
        case 'wolf_night':
          return t.voteUiDeadWolf;
        case 'poison_night':
        case 'both_night':
          return t.voteUiDeadPoisonOrMixed;
        case 'hunter_gun':
          return t.voteUiDeadHunter;
        case 'wolf_beauty_charm':
          return t.voteUiDeadCharmMartyr;
        default:
          return t.voteUiDeadOther;
      }
    }
    if (me.canVote === false) return t.voteUiNoVoteOther;
    return t.voteUiNoVoteOther;
  }, [players, uiLang, phase, secretDayBallot]);

  const displayPlayers: GridPlayer[] = useMemo(() => {
    if (players.length === 0) return [];
    const byId = new Map(
      players.map((p) => [
        p.id,
        {
          ...p,
          avatarSource: seatAvatarSource(p.id, meAvatarIndex),
        } as GridPlayer,
      ])
    );
    const order = buildSeatIdOrder(players, tableSeatOrder);
    return order.map((id) => byId.get(id)).filter((p): p is GridPlayer => p != null);
  }, [players, tableSeatOrder, meAvatarIndex]);

  const topBarDayLabel = useMemo(() => {
    const n =
      phase === 'NIGHT' || phase === 'PREPARING'
        ? Math.max(1, dawnCount + 1)
        : Math.max(1, dawnCount);
    return `DAY ${String(n).padStart(2, '0')}`;
  }, [phase, dawnCount]);

  const topBarAliveLabel = useMemo(() => {
    const total = players.length;
    const alive = players.filter((p) => p.isAlive).length;
    return `ALIVE ${alive}/${total}`;
  }, [players]);

  const activeNightRoleCue = phase === 'NIGHT' ? nightRoleCueSegment(nightSeg) : null;

  const parchmentLogRows = useMemo(
    () => buildParchmentDisplayRows(logs, speechLogLiveLine, (t) => isModeratorOrSystemLogLine(t, uiLang)),
    [logs, speechLogLiveLine, uiLang]
  );

  const parchmentChatAnchorKey = useMemo(() => {
    const readyLine = gameCopy[uiLang].systemReady;
    const hit = parchmentLogRows.find((r) => r.text === readyLine);
    return hit?.key ?? parchmentLogRows[0]?.key ?? null;
  }, [parchmentLogRows, uiLang]);

  const captureChatClipSlotAtStart = useCallback(() => {
    if (chatClipSlotCapturedRef.current) return;
    const anchorY = chatAnchorContentYRef.current;
    const viewport = chatScrollViewportRef.current;
    const anchorEl = chatAnchorRowRef.current;
    if (anchorY == null || !viewport || !anchorEl) return;
    viewport.measureInWindow((_vx, vy) => {
      anchorEl.measureInWindow((_ax, ay) => {
        const clipY = ay - vy;
        if (!Number.isFinite(clipY)) return;
        chatClipViewportYRef.current = clipY;
        chatMinScrollYRef.current = PARCHMENT_SCROLL_PAD_TOP + anchorY - clipY;
        chatClipSlotCapturedRef.current = true;
      });
    });
  }, []);

  const applyChatScrollOffset = useCallback((rawY: number, opts?: { animated?: boolean }) => {
    const minY = chatMinScrollYRef.current;
    const y = minY != null && rawY < minY ? minY : rawY;
    if (minY != null && rawY < minY - 0.5) {
      scrollViewRef.current?.scrollTo({ y: minY, animated: opts?.animated ?? false });
    }
    chatScrollYRef.current = y;
    setChatScrollY(y);
    return y;
  }, []);

  const handleChatScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const y = applyChatScrollOffset(contentOffset.y);
      chatScrollContentHRef.current = contentSize.height;
      chatScrollViewportHRef.current = layoutMeasurement.height;
      isChatScrollNearBottomRef.current =
        contentSize.height - y - layoutMeasurement.height < 56;
    },
    [applyChatScrollOffset]
  );

  const handleChatRowLayout = useCallback(
    (rowKey: string, e: LayoutChangeEvent) => {
      const y = e.nativeEvent.layout.y;
      if (!Number.isFinite(y)) return;
      chatRowLayoutYRef.current.set(rowKey, y);
      if (rowKey === parchmentChatAnchorKey) {
        chatAnchorContentYRef.current = y;
        requestAnimationFrame(() => captureChatClipSlotAtStart());
      }
    },
    [parchmentChatAnchorKey, captureChatClipSlotAtStart]
  );

  /** 隐藏滚到开局「房间就绪」裁切线之上的内容（该行及之后的发言不隐藏） */
  const isChatRowClipped = useCallback(
    (rowKey: string) => {
      const anchorY = chatAnchorContentYRef.current;
      const rowY = chatRowLayoutYRef.current.get(rowKey);
      if (anchorY == null || rowY == null) return false;
      if (rowY >= anchorY - 0.5) return false;
      const topInViewport = PARCHMENT_SCROLL_PAD_TOP + rowY - chatScrollY;
      return topInViewport < chatClipViewportYRef.current - 0.5;
    },
    [chatScrollY]
  );

  const scrollChatToEndIfNearBottom = useCallback(
    (animated: boolean) => {
      if (!isChatScrollNearBottomRef.current) return;
      scrollViewRef.current?.scrollToEnd({ animated });
      requestAnimationFrame(() => {
        const minY = chatMinScrollYRef.current ?? 0;
        const contentH = chatScrollContentHRef.current;
        const viewH = chatScrollViewportHRef.current;
        const y =
          contentH > viewH ? Math.max(minY, contentH - viewH) : minY;
        applyChatScrollOffset(y, { animated: false });
      });
    },
    [applyChatScrollOffset]
  );

  const parchmentScrollAnchor = useMemo(() => {
    const last = parchmentLogRows[parchmentLogRows.length - 1];
    return last ? `${parchmentLogRows.length}:${last.key}:${last.text.length}` : '';
  }, [parchmentLogRows]);

  const publicEventsTimeline = useMemo(() => {
    void narratorLogEpoch;
    const mePlayer = players.find((p) => p.id === 'me');
    return buildPublicEventSections(
      narratorLinesRef.current,
      { id: 'me', role: mePlayer?.role ?? 'Villager' },
      { lang: uiLang, dayExileVotesPublic: config.dayExileVotesPublic },
      {
        players,
        seatOrder: tableSeatOrder,
        sheriffId: sheriffPlayerId,
      }
    );
  }, [
    narratorLogEpoch,
    uiLang,
    config.dayExileVotesPublic,
    players,
    tableSeatOrder,
    sheriffPlayerId,
  ]);

  const { currentSheriff: publicCurrentSheriff, sections: publicEventSections } =
    publicEventsTimeline;

  const publicEventCount = useMemo(() => {
    const dayItems = publicEventSections.reduce((n, sec) => n + sec.items.length, 0);
    return dayItems + (publicCurrentSheriff ? 1 : 0);
  }, [publicEventSections, publicCurrentSheriff]);

  const publicEventsScrollAnchor = useMemo(() => {
    const sections = publicEventSections;
    const lastSec = sections[sections.length - 1];
    const lastItem = lastSec?.items[lastSec.items.length - 1];
    if (lastItem) return `${lastItem.key}:${lastItem.text.length}`;
    if (publicCurrentSheriff) {
      return `${publicCurrentSheriff.key}:${publicCurrentSheriff.text.length}`;
    }
    return '';
  }, [publicEventSections, publicCurrentSheriff]);

  useEffect(() => {
    if (parchmentPanelTab !== 'chat' || !parchmentScrollAnchor) return;
    const t = setTimeout(() => {
      scrollChatToEndIfNearBottom(true);
      requestAnimationFrame(() => captureChatClipSlotAtStart());
    }, 50);
    return () => clearTimeout(t);
  }, [parchmentPanelTab, parchmentScrollAnchor, scrollChatToEndIfNearBottom, captureChatClipSlotAtStart]);

  useEffect(() => {
    if (!roomReady || parchmentPanelTab !== 'chat') return;
    const t = setTimeout(() => captureChatClipSlotAtStart(), 120);
    return () => clearTimeout(t);
  }, [roomReady, parchmentPanelTab, parchmentChatAnchorKey, captureChatClipSlotAtStart]);

  useEffect(() => {
    if (parchmentPanelTab !== 'events' || !publicEventsScrollAnchor) return;
    setTimeout(() => eventsScrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [parchmentPanelTab, publicEventsScrollAnchor]);

  const renderPublicEventIcon = (kind: PublicEventKind, text: string) => {
    const iconProps = { size: 18, strokeWidth: 2.4 } as const;
    switch (kind) {
      case 'sheriff':
        return <Shield color={SDV.wood} fill="#e8c44a" {...iconProps} />;
      case 'night':
        return /死亡|died/i.test(text) ? (
          <Skull color={SDV.wood} {...iconProps} />
        ) : (
          <Moon color={SDV.wood} {...iconProps} />
        );
      case 'day':
        return <AlertTriangle color={SDV.wood} {...iconProps} />;
      case 'end':
        return <Users color={SDV.wood} {...iconProps} />;
      default:
        return <Sun color={SDV.wood} {...iconProps} />;
    }
  };

  if (configInvalid) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: SDV.ink, textAlign: 'center', marginBottom: 16 }}>
          {uiLang === 'zh'
            ? '开局参数无效（需 11 名 AI 与合法板型）。请返回重新选人。'
            : `Invalid match setup (need ${aiOpponentCountForBoard(config.board)} AI for this board). Go back and pick again.`}
        </Text>
        <NightRpgPillButton
          variant="wood"
          label={uiLang === 'zh' ? '返回' : 'Back'}
          style={{ alignSelf: 'stretch', maxWidth: 280 }}
          leftIcon={<ChevronLeft size={21} color="#e8c44a" strokeWidth={2.5} />}
          onPress={promptLeaveGame}
        />
      </SafeAreaView>
    );
  }

  if (config.fromTutorial && tutorialAwaitingRolePick) {
    return (
      <SafeAreaView style={[styles.container, styles.containerTrans]}>
        <TutorialRolePickerModal
          visible
          board={config.board}
          lang={uiLang}
          onConfirm={applyTutorialRole}
        />
      </SafeAreaView>
    );
  }

  if (!roomReady || players.length === 0) {
    return (
      <View style={[styles.gameScreenShell, screenFillStyle, styles.containerGameShell]}>
        <View style={styles.gameScreenBackdropWrap} pointerEvents="none">
          <Image
            accessibilityIgnoresInvertColors
            source={GAME_ROOM_BACKGROUND_DAY}
            style={[PIXEL_ART_SPRITE, styles.gameScreenBackdrop, gameBackdropPanStyle]}
            resizeMode="contain"
          />
        </View>
        <View style={styles.roomBootOverlay} accessibilityLabel="Loading">
          <ActivityIndicator size="large" color={SDV.wood} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.gameScreenShell, screenFillStyle, styles.containerGameShell]}>
      <MatchHallRoomScene panX={backdropPanX} night={backdropIsNight}
        seatCount={displayPlayers.length} selected={selectedId}
        occupants={assignHallSeats(displayPlayers).map(p => {
          const isSheriff = sheriffPlayerId === p.id && p.isAlive;
          const wolfMate = isWolfTeam(myRole) && p.id !== 'me' && isWolfTeam(p.role) && p.isAlive;
          const badge = phase === 'ENDED'
            ? `${sheriffPlayerId === p.id ? '👮' : ''}${roleEmojiForRole(p.role)}`
            : p.id === 'me' && roleCardDismissed
              ? `${isSheriff ? '👮' : ''}${roleEmojiForRole(p.role)}`
              : `${isSheriff ? '👮' : ''}${wolfMate ? '🐺' : ''}`;
          const showKnives = phase === 'NIGHT' && nightSeg === 'wolves' && isWolfTeam(myRole) && p.isAlive;
          const knives = showKnives ? (wolfPackKnifeTally[p.id] ?? 0) + (nightHumanGate && selectedId === p.id && !wolfPackKillVoteByWolfRef.current.get('me') ? 1 : 0) : 0;
          const pop = seatStickerPop[p.id];
          return { ...p, characterId: p.id, badge, speaking: activeSpeaker === p.id,
            speech: activeSpeaker === p.id ? typingText : undefined,
            stickerSource: pop && Date.now() < pop.until ? resolveStickerSource(pop.stickerId) ?? undefined : undefined,
            tally: knives ? '🔪'.repeat(knives) : undefined };
        })}
        renderHuman={mePixelAvatar ? (width, facing) => <PixelAvatarSprite config={mePixelAvatar} size={width} pose="seated" facing={facing} transforms={mePixelAvatarTransforms} /> : undefined}
        onSeatPress={seatId => {
          const p = assignHallSeats(displayPlayers).find(player => player.seatId === seatId);
          if (!p) return;
          if (!p.isAlive) return;
          if (hunterShotMode) {
            setSelectedId(p.id);
            return;
          }
          if (phase === 'KNIGHT_DUEL' && knightDuelMode && p.id !== 'me') {
            setSelectedId(p.id);
            return;
          }
          if (phase === 'VOTING') {
            const meVote = playersRef.current.find((x) => x.id === 'me');
            if (
              meVote?.isAlive &&
              meVote.canVote !== false &&
              !hunterShotMode
            ) {
              setSelectedId(p.id);
            }
            return;
          }
          if (
            phase === 'SHERIFF_VOTE' &&
            sheriffVoteInteractive &&
            sheriffCandidatesState.includes(p.id)
          ) {
            setSelectedId(p.id);
            return;
          }
          if (phase === 'NIGHT' && nightSeg && nightHumanGate) {
            if (nightSeg === 'guard' && myRole === 'Guard') {
              const lastGuard = guardLastTargetRef.current?.id;
              if (lastGuard && p.id === lastGuard) return;
              setSelectedId(p.id);
              return;
            }
            if (nightSeg === 'wolves' && isWolfTeam(myRole) && p.id !== 'me') {
              setSelectedId(p.id);
              return;
            }
            if (
              nightSeg === 'wolf_beauty' &&
              myRole === 'WolfBeauty' &&
              p.id !== 'me' &&
              !isWolfTeam(p.role)
            ) {
              setSelectedId(p.id);
              return;
            }
            if (nightSeg === 'seer' && myRole === 'Seer' && p.id !== 'me') {
              setSelectedId(p.id);
              return;
            }
            if (
              nightSeg === 'witch' &&
              myRole === 'Witch' &&
              p.id !== 'me' &&
              witchPoisonPickMode
            ) {
              setSelectedId(p.id);
              return;
            }
          }
        }} />
      <KeyboardAvoidingView
        pointerEvents="box-none"
        style={[
          styles.flex,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
          <View pointerEvents="box-none" style={styles.gameSceneOverlay}>
            <View pointerEvents="box-none" style={styles.gameMainRow}>
              <View pointerEvents="box-none" style={styles.gameLeftColumn}>
            <View style={styles.gameTopBarWrap}>
              <View style={styles.topBarRow}>
                <View style={styles.topBarSideRail}>
                  <TouchableOpacity
                    style={styles.headerExit}
                    onPress={phase === 'ENDED' ? leaveToHomeFromEnded : promptLeaveGame}
                    hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={uiLang === 'zh' ? '退出对局' : 'Leave game'}
                  >
                    <ChevronLeft color="#ffffff" size={26} />
                  </TouchableOpacity>
                  <View style={[styles.phaseStatusPill, styles.statusBadge]}>
                    {phase === 'NIGHT' ? (
                      <Moon size={18} color={SDV.ink} />
                    ) : (
                      <Sun size={18} color={SDV.ink} />
                    )}
                    <Text style={styles.statusText}>{phaseLabel(phase, uiLang)}</Text>
                  </View>
                </View>
                <View style={styles.topBarHeadlineSpacer} />
                <View style={[styles.topBarSideRail, styles.topBarSideRailEnd]}>
                  <View style={styles.topBarMusicBtn}>
                    <HubSettingsIconButton
                      onPress={() => navigation.navigate('Settings')}
                      accessibilityLabel={gameCopy[uiLang].settingsTitle}
                    />
                  </View>
                </View>
                <View style={topBarHeadlineOverlayStyle()} pointerEvents="none">
                  <Text style={[styles.topBarStatusPixel, styles.topBarStatusCombined]}>
                    {topBarDayLabel}
                    {TOP_BAR_STATUS_GAP}
                    {topBarAliveLabel}
                  </Text>
                </View>
              </View>
            </View>

          <View pointerEvents="none" style={styles.ringColumn} />
              </View>

          <View style={styles.actionColumn}>
            <View
              style={styles.actionColumnParchmentWrap}
              pointerEvents="none"
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                if (width > 0 && height > 0) {
                  setActionParchmentLayout({ w: Math.round(width), h: Math.round(height) });
                }
              }}
            >
              <Image
                source={GAME_ROOM_RIGHT_PARCHMENT}
                style={actionColumnParchmentImage.style}
                resizeMode={actionColumnParchmentImage.resizeMode}
                accessibilityIgnoresInvertColors
              />
            </View>
            <View style={styles.actionColumnForeground}>
              <TouchableOpacity
                style={[styles.phaseStatusPill, styles.parchmentNotepadToggle]}
                activeOpacity={1}
                onPress={() =>
                  setParchmentPanelTab((tab) => (tab === 'notepad' ? 'chat' : 'notepad'))
                }
                accessibilityRole="button"
                accessibilityLabel={g.parchmentTabNotepad}
              >
                <NotebookPen size={18} color={SDV.ink} strokeWidth={2.4} />
                <Text style={styles.phaseStatusPillText}>{g.parchmentTabNotepad}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.phaseStatusPill, styles.parchmentPanelToggle]}
                onPress={() =>
                  setParchmentPanelTab((tab) => (tab === 'chat' ? 'events' : 'chat'))
                }
                accessibilityRole="button"
                accessibilityLabel={
                  parchmentPanelTab === 'chat' ? g.parchmentTabEvents : g.parchmentTabChat
                }
              >
                {parchmentPanelTab === 'chat' ? (
                  <ClipboardList size={18} color={SDV.ink} strokeWidth={2.4} />
                ) : (
                  <MessageCircle size={18} color={SDV.ink} strokeWidth={2.4} />
                )}
                <Text style={styles.phaseStatusPillText}>
                  {parchmentPanelTab === 'chat' ? g.parchmentTabEvents : g.parchmentTabChat}
                </Text>
              </TouchableOpacity>

              {parchmentPanelTab === 'notepad' ? (
                <View style={styles.logScrollClip}>
                  <GameRoomNotepadPanel
                    value={playerNotepad}
                    onChangeText={setPlayerNotepad}
                    placeholder={g.notepadPlaceholder}
                    contentPaddingH={PARCHMENT_SCROLL_PAD_H}
                    contentPaddingTop={PARCHMENT_SCROLL_PAD_TOP}
                  />
                </View>
              ) : parchmentPanelTab === 'chat' ? (
                <View ref={chatScrollViewportRef} style={styles.logScrollClip}>
                  <ScrollView
                    ref={scrollViewRef}
                    style={styles.logScroll}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.logScrollContent}
                    scrollEventThrottle={16}
                    onScroll={handleChatScroll}
                    onScrollEndDrag={handleChatScroll}
                    onMomentumScrollEnd={handleChatScroll}
                    onLayout={(e) => {
                      chatScrollViewportHRef.current = e.nativeEvent.layout.height;
                    }}
                    onContentSizeChange={(_w, h) => {
                      if (parchmentPanelTab !== 'chat' || parchmentLogRows.length === 0) return;
                      chatScrollContentHRef.current = h;
                      scrollChatToEndIfNearBottom(false);
                    }}
                  >
                    {parchmentLogRows.map((row) => {
                      const clipped = isChatRowClipped(row.key);
                      return (
                        <View
                          key={row.key}
                          ref={row.key === parchmentChatAnchorKey ? chatAnchorRowRef : undefined}
                          onLayout={(e) => handleChatRowLayout(row.key, e)}
                          style={[
                            styles.logRowContainer,
                            row.highlight ? styles.logRowContainerHighlight : null,
                            clipped ? styles.chatRowClipped : null,
                          ]}
                        >
                          <View
                            style={row.isModerator ? styles.logItemModerator : styles.logItemSpeech}
                          >
                            <Text style={styles.logText}>{row.text}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : (
                <ScrollView
                  ref={eventsScrollRef}
                  style={styles.logScroll}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.eventsScrollContent}
                  onContentSizeChange={() => {
                    if (parchmentPanelTab !== 'events') return;
                    eventsScrollRef.current?.scrollToEnd({ animated: false });
                  }}
                >
                  <View style={styles.publicEventsHeader}>
                    <View style={styles.publicEventsHeaderTitleRow}>
                      <ClipboardList size={20} color={SDV.ink} strokeWidth={2.4} />
                      <Text style={styles.logText}>{g.parchmentPublicEventsTitle}</Text>
                    </View>
                    <Text style={styles.publicEventsCount}>
                      {g.parchmentPublicEventsCount(publicEventCount)}
                    </Text>
                  </View>
                  {publicCurrentSheriff ? (
                    <View style={styles.publicSheriffCurrentBlock}>
                      <View style={styles.publicEventRow}>
                        {renderPublicEventIcon(
                          publicCurrentSheriff.kind,
                          publicCurrentSheriff.text
                        )}
                        <Text style={styles.logText}>{publicCurrentSheriff.text}</Text>
                      </View>
                    </View>
                  ) : null}
                  {publicEventSections.map((section) => (
                    <View key={`day-${section.day}`}>
                      <View style={styles.eventDayDivider}>
                        <View style={styles.eventDayDividerLine} />
                        <Text style={styles.eventDayDividerText}>{section.dayLabel}</Text>
                        <View style={styles.eventDayDividerLine} />
                      </View>
                      {section.items.map((item) => (
                        <View key={item.key} style={styles.publicEventRow}>
                          {renderPublicEventIcon(item.kind, item.text)}
                          <Text style={styles.logText}>{item.text}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </ScrollView>
              )}

            <View
              style={[
                styles.footer,
                !humanBarVisible && styles.footerBottomCap,
                humanBarVisible && styles.footerWhenSpeaking,
              ]}
            >
          {roleCardDismissed && phase !== 'PREPARING' && phase !== 'ENDED' && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.stickerStrip}
              contentContainerStyle={styles.stickerStripInner}
              keyboardShouldPersistTaps="handled"
            >
              {ROOM_STICKER_PACK.map(({ id: sid, source }) => (
                <TouchableOpacity
                  key={sid}
                  style={styles.stickerChip}
                  onPress={() => showSeatSticker('me', sid)}
                  accessibilityRole="button"
                  accessibilityLabel={sid}
                >
                  <Image
                    source={source}
                    style={[PIXEL_ART_SPRITE, styles.stickerChipImg]}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          {phase === 'PREPARING' && roleCardDismissed && !footerButtonsDismissed && (
            <View style={{ marginTop: 10, alignSelf: 'stretch' }}>
              <NightRpgPillButton
                variant="wood"
                label={
                  llmLinkStatus === 'pending'
                    ? g.waitModelConnect
                    : llmLinkStatus === 'failed'
                      ? g.retryModelConnect
                      : g.startMatch
                }
                leftIcon={
                  <Play size={21} color={GAME_ROOM_FOOTER_ICON_COLOR} strokeWidth={2.5} />
                }
                style={{ alignSelf: 'stretch' }}
                disabled={llmLinkStatus === 'pending'}
                onPress={() => {
                  if (llmLinkStatus === 'failed') {
                    retryLlmProbe();
                    return;
                  }
                  if (llmLinkStatus !== 'ready') return;
                  setFooterButtonsDismissed(true);
                  void beginNightPhase();
                }}
              />
            </View>
          )}
          {phase === 'NIGHT' && nightSeg != null && !footerButtonsDismissed && (
            <View>
              {nightHumanGate && nightSeg === 'guard' && myRole === 'Guard' && (
                <View>
                  <Text style={styles.voteHint}>{g.nightGuardHint}</Text>
                  <NightRpgPillButton
                    variant="wood"
                    label={g.nightGuardConfirm}
                    leftIcon={
                      <Shield size={21} color={GAME_ROOM_FOOTER_ICON_COLOR} strokeWidth={2.5} />
                    }
                    onPress={() => {
                      const al = players.filter((x) => x.isAlive);
                      const lastGuard = guardLastTargetRef.current?.id;
                      if (
                        !selectedId ||
                        !al.some((x) => x.id === selectedId) ||
                        (lastGuard && selectedId === lastGuard)
                      ) {
                        Alert.alert(g.pickPlayerAlert, g.nightGuardHint);
                        return;
                      }
                      humanGuardTargetRef.current = selectedId;
                      setFooterButtonsDismissed(true);
                      void handleNightSegmentAdvance();
                    }}
                  />
                </View>
              )}

              {nightHumanGate && nightSeg === 'wolves' && isWolfTeam(myRole) && (
                <View>
                  <Text style={styles.voteHint}>{g.nightWolfVoteHint}</Text>
                  <NightRpgPillButton
                    variant="wood"
                    label={g.nightWolfConfirm}
                    leftIcon={
                      <Target size={21} color={GAME_ROOM_FOOTER_ICON_COLOR} strokeWidth={2.5} />
                    }
                    onPress={() => {
                      const alive = players.filter((x) => x.isAlive);
                      const outsiders = alive.filter((x) => !isWolfTeam(x.role));
                      const pool =
                        outsiders.length > 0
                          ? outsiders.filter((x) => x.id !== 'me')
                          : alive.filter((x) => x.id !== 'me');
                      if (!selectedId || !pool.some((x) => x.id === selectedId)) {
                        Alert.alert(g.pickPlayerAlert, g.nightWolfVoteHint);
                        return;
                      }
                      humanWolfKillVoteRef.current = selectedId;
                      wolfPackKillVoteByWolfRef.current.set('me', selectedId);
                      recomputeWolfPackKnifeTally();
                      setFooterButtonsDismissed(true);
                      void handleNightSegmentAdvance();
                    }}
                  />
                </View>
              )}

              {nightHumanGate && nightSeg === 'wolf_beauty' && myRole === 'WolfBeauty' && (
                <View>
                  <Text style={styles.voteHint}>{g.nightWolfCharmHint}</Text>
                  <NightRpgPillButton
                    variant="wood"
                    label={g.nightWolfCharmConfirm}
                    leftIcon={
                      <Sparkles size={21} color={GAME_ROOM_FOOTER_ICON_COLOR} strokeWidth={2.4} />
                    }
                    onPress={() => {
                      const al = players.filter((x) => x.isAlive);
                      const sel = players.find((pl) => pl.id === selectedId);
                      const meta = wolfBeautyCharmMetaRef.current;
                      const sameTwoNights =
                        meta.lastNight === nightCountRef.current - 1 &&
                        meta.lastTarget &&
                        selectedId === meta.lastTarget;
                      if (sameTwoNights) {
                        Alert.alert(
                          g.nightWolfBeautyCharmRepeatTitle,
                          g.nightWolfBeautyCharmRepeatMessage
                        );
                        return;
                      }
                      if (
                        !selectedId ||
                        !al.some((x) => x.id === selectedId) ||
                        selectedId === 'me' ||
                        !sel ||
                        isWolfTeam(sel.role)
                      ) {
                        Alert.alert(g.pickPlayerAlert, g.nightWolfCharmHint);
                        return;
                      }
                      humanWolfCharmTargetRef.current = selectedId;
                      setFooterButtonsDismissed(true);
                      void handleNightSegmentAdvance();
                    }}
                  />
                </View>
              )}

              {nightHumanGate && nightSeg === 'seer' && myRole === 'Seer' && (
                <View>
                  <Text style={styles.voteHint}>{g.nightSeerHint}</Text>
                  <NightRpgPillButton
                    variant="wood"
                    label={g.nightSeerConfirm}
                    leftIcon={
                      <Eye size={21} color={GAME_ROOM_FOOTER_ICON_COLOR} strokeWidth={2.5} />
                    }
                    onPress={() => {
                      const pool = players.filter((p) => p.isAlive && p.id !== 'me');
                      if (!selectedId || !pool.some((p) => p.id === selectedId)) {
                        Alert.alert(g.pickPlayerAlert, g.nightSeerHint);
                        return;
                      }
                      const target = players.find((pl) => pl.id === selectedId);
                      if (!target) return;
                      humanSeerInspectRef.current = selectedId;
                      setSeerInspectCard({
                        targetName: target.name,
                        isWolfSide: isWolfTeam(target.role),
                      });
                      setFooterButtonsDismissed(true);
                      void handleNightSegmentAdvance();
                    }}
                  />
                </View>
              )}

              {nightHumanGate && nightSeg === 'witch' && myRole === 'Witch' && (
                <View key={witchUiTick}>
                  {(() => {
                    const wStHint = witchStateRef.current;
                    const selfKnifeHint = nightWolfVictimId === 'me';
                    const firstNightHint = nightCountRef.current <= 0;
                    const showKnifeHint =
                      wStHint.hasAntidote &&
                      !!nightWolfVictimId &&
                      (!selfKnifeHint || firstNightHint);
                    if (showKnifeHint) {
                      return (
                        <Text style={styles.voteHint}>
                          {g.nightWitchVictim(
                            players.find((x) => x.id === nightWolfVictimId)?.name ?? ''
                          )}
                        </Text>
                      );
                    }
                    if (!wStHint.hasAntidote && wStHint.hasPoison) {
                      return <Text style={styles.voteHint}>{g.nightWitchAntidoteSpent}</Text>;
                    }
                    if (!wStHint.hasAntidote) {
                      return <Text style={styles.voteHint}>{g.nightWitchVictimHiddenNoAntidote}</Text>;
                    }
                    return null;
                  })()}
                  {witchPoisonPickMode ? (
                    <View style={{ marginTop: 10 }}>
                      <Text style={styles.voteHint}>{g.nightWitchPickPoisonHint}</Text>
                      <View style={[styles.sheriffSignupRow, { marginTop: 10 }]}>
                        <NightRpgPillButton
                          variant="parchment"
                          label={g.nightWitchPoisonPickBack}
                          style={{ flex: 1, marginHorizontal: 4 }}
                          leftIcon={
                            <ChevronLeft
                              size={21}
                              color={GAME_ROOM_FOOTER_ICON_COLOR}
                              strokeWidth={2.5}
                            />
                          }
                          onPress={() => {
                            setWitchPoisonPickMode(false);
                            setSelectedId(null);
                          }}
                        />
                        <NightRpgPillButton
                          variant="wood"
                          label={g.nightWitchPoisonConfirm}
                          style={{ flex: 1, marginHorizontal: 4 }}
                          leftIcon={
                            <Skull
                              size={21}
                              color={GAME_ROOM_FOOTER_ICON_COLOR}
                              strokeWidth={2.4}
                            />
                          }
                          onPress={() => {
                            if (
                              !selectedId ||
                              !players.some(
                                (x) => x.id === selectedId && x.isAlive && x.id !== 'me'
                              )
                            ) {
                              Alert.alert(g.pickPlayerAlert, g.nightWitchPickPoisonHint);
                              return;
                            }
                            witchHumanPoisonRef.current = selectedId;
                            witchHumanSaveRef.current = 'no';
                            setFooterButtonsDismissed(true);
                            void commitHumanWitchAndAdvance();
                          }}
                        />
                      </View>
                    </View>
                  ) : (
                    (() => {
                      const wSt = witchStateRef.current;
                      const selfKnife = nightWolfVictimId === 'me';
                      const firstNight = nightCountRef.current <= 0;
                      const canSave =
                        wSt.hasAntidote &&
                        !!nightWolfVictimId &&
                        (!selfKnife || firstNight);
                      const hasPoison = wSt.hasPoison;
                      const bothGone = !wSt.hasAntidote && !hasPoison;
                      return (
                        <View style={{ marginTop: 10, gap: 10, alignSelf: 'stretch' }}>
                          {canSave ? (
                            <NightRpgPillButton
                              variant="wood"
                              label={g.nightWitchBtnAntidote}
                              leftIcon={
                                <Droplets
                                  size={21}
                                  color={GAME_ROOM_FOOTER_ICON_COLOR}
                                  strokeWidth={2.4}
                                />
                              }
                              onPress={() => {
                                witchHumanSaveRef.current = 'yes';
                                witchHumanPoisonRef.current = null;
                                setFooterButtonsDismissed(true);
                                void commitHumanWitchAndAdvance();
                              }}
                            />
                          ) : null}
                          {hasPoison ? (
                            <NightRpgPillButton
                              variant="wood"
                              label={g.nightWitchBtnPoison}
                              leftIcon={
                                <FlaskConical
                                  size={21}
                                  color={GAME_ROOM_FOOTER_ICON_COLOR}
                                  strokeWidth={2.4}
                                />
                              }
                              onPress={() => {
                                setSelectedId(null);
                                setWitchPoisonPickMode(true);
                              }}
                            />
                          ) : null}
                          <NightRpgPillButton
                            variant={bothGone ? 'wood' : 'parchment'}
                            label={bothGone ? g.nightWitchPassBlind : g.nightWitchSkipNeither}
                            onPress={() => {
                              witchHumanSaveRef.current = 'no';
                              witchHumanPoisonRef.current = null;
                              setFooterButtonsDismissed(true);
                              void commitHumanWitchAndAdvance();
                            }}
                          />
                        </View>
                      );
                    })()
                  )}
                </View>
              )}

            </View>
          )}
          {phase === 'KNIGHT_DUEL' && knightDuelMode && !footerButtonsDismissed && (
            <View>
              <Text style={styles.voteHint}>{g.knightDuelHint}</Text>
              <View style={styles.sheriffSignupRow}>
                <NightRpgPillButton
                  variant="wood"
                  label={g.knightDuelConfirm}
                  style={{ flex: 1, marginHorizontal: 4 }}
                  leftIcon={
                    <Shield
                      size={21}
                      color={GAME_ROOM_FOOTER_ICON_COLOR}
                      fill={GAME_ROOM_FOOTER_ICON_COLOR}
                      strokeWidth={2}
                    />
                  }
                  onPress={confirmKnightDuel}
                />
                <NightRpgPillButton
                  variant="parchment"
                  label={g.knightDuelSkip}
                  style={{ flex: 1, marginHorizontal: 4 }}
                  leftIcon={
                    <Ban size={20} color={GAME_ROOM_FOOTER_ICON_COLOR} strokeWidth={2.3} />
                  }
                  onPress={skipKnightDuel}
                />
              </View>
            </View>
          )}
          {sheriffSignupInteractive && !footerButtonsDismissed && (
            <View style={styles.sheriffSignupRow}>
              <NightRpgPillButton
                variant="wood"
                label={g.sheriffRun}
                style={{ flex: 1, marginHorizontal: 4 }}
                leftIcon={
                  <Shield
                    size={21}
                    color={GAME_ROOM_FOOTER_ICON_COLOR}
                    fill={GAME_ROOM_FOOTER_ICON_COLOR}
                    strokeWidth={2}
                  />
                }
                onPress={() => {
                  const r = sheriffSignupResolveRef.current;
                  if (!r) return;
                  sheriffSignupResolveRef.current = null;
                  setFooterButtonsDismissed(true);
                  r(true);
                }}
              />
              <NightRpgPillButton
                variant="parchment"
                label={g.sheriffSkip}
                style={{ flex: 1, marginHorizontal: 4 }}
                leftIcon={
                  <Shield
                    size={21}
                    color={GAME_ROOM_FOOTER_ICON_COLOR}
                    fill="none"
                    strokeWidth={2.5}
                  />
                }
                onPress={() => {
                  const r = sheriffSignupResolveRef.current;
                  if (!r) return;
                  sheriffSignupResolveRef.current = null;
                  setFooterButtonsDismissed(true);
                  r(false);
                }}
              />
            </View>
          )}
          {sheriffSignupSpectator && phase === 'SHERIFF_SIGNUP' && (
            <View style={{ paddingVertical: 8 }}>
              <Text style={styles.voteHint}>{sheriffSpectatorHint}</Text>
            </View>
          )}
          {sheriffVoteInteractive && !footerButtonsDismissed && (
            <View>
              <Text style={styles.voteHint}>{g.sheriffVoteHint}</Text>
              <View style={styles.sheriffSignupRow}>
                <NightRpgPillButton
                  variant="wood"
                  label={g.sheriffVoteConfirm}
                  style={{ flex: 1, marginHorizontal: 4 }}
                  leftIcon={
                    <Check size={21} color={GAME_ROOM_FOOTER_ICON_COLOR} strokeWidth={2.8} />
                  }
                  onPress={() => {
                    if (
                      !selectedId ||
                      !sheriffCandidatesState.includes(selectedId)
                    ) {
                      Alert.alert(g.pickPlayerAlert, g.sheriffVoteHint);
                      return;
                    }
                    const r = sheriffVoteResolveRef.current;
                    if (!r) return;
                    sheriffVoteResolveRef.current = null;
                    setFooterButtonsDismissed(true);
                    r(selectedId);
                    setSelectedId(null);
                  }}
                />
                <NightRpgPillButton
                  variant="parchment"
                  label={g.sheriffVoteAbstain}
                  style={{ flex: 1, marginHorizontal: 4 }}
                  leftIcon={
                    <Ban size={20} color={GAME_ROOM_FOOTER_ICON_COLOR} strokeWidth={2.3} />
                  }
                  onPress={() => {
                    const r = sheriffVoteResolveRef.current;
                    if (!r) return;
                    sheriffVoteResolveRef.current = null;
                    setFooterButtonsDismissed(true);
                    r(null);
                    setSelectedId(null);
                  }}
                />
              </View>
            </View>
          )}
          {sheriffVoteSpectator && phase === 'SHERIFF_VOTE' && (
            <View style={{ paddingVertical: 8 }}>
              <Text style={styles.voteHint}>{sheriffSpectatorHint}</Text>
            </View>
          )}
          {hunterShotMode && !footerButtonsDismissed && (
            <View>
              <Text style={styles.voteHint}>{g.hunterGunHint}</Text>
              <NightRpgPillButton
                variant="wood"
                label={g.hunterGunConfirm}
                leftIcon={
                  <Crosshair size={21} color={GAME_ROOM_FOOTER_ICON_COLOR} strokeWidth={2.5} />
                }
                onPress={confirmHunterShot}
              />
            </View>
          )}
          {exileVoteInteractive && !footerButtonsDismissed && (
            <View>
              <Text style={styles.voteHint}>{g.voteHint}</Text>
              <View style={styles.sheriffSignupRow}>
                <NightRpgPillButton
                  variant="wood"
                  label={g.voteConfirm}
                  style={{ flex: 1, marginHorizontal: 4 }}
                  leftIcon={
                    <Check size={21} color={GAME_ROOM_FOOTER_ICON_COLOR} strokeWidth={2.8} />
                  }
                  onPress={submitVote}
                />
                <NightRpgPillButton
                  variant="parchment"
                  label={g.exileVoteAbstain}
                  style={{ flex: 1, marginHorizontal: 4 }}
                  leftIcon={
                    <Ban size={20} color={GAME_ROOM_FOOTER_ICON_COLOR} strokeWidth={2.3} />
                  }
                  onPress={abstainExileVote}
                />
              </View>
            </View>
          )}
          {exileVoteSpectator && (
            <View style={{ paddingVertical: 8 }}>
              <Text style={styles.voteHint}>{voteSpectatorHint}</Text>
            </View>
          )}
          {phase === 'ENDED' && !footerButtonsDismissed && (
            <View style={styles.endedFooterBtns}>
              <NightRpgPillButton
                variant="wood"
                label={g.viewPeerReviews}
                leftIcon={
                  <MessageCircle
                    size={21}
                    color={GAME_ROOM_FOOTER_ICON_COLOR}
                    strokeWidth={2.4}
                  />
                }
                onPress={() => setPeerReviewsModalVisible(true)}
              />
              <NightRpgPillButton
                variant="wood"
                label={g.backHome}
                leftIcon={
                  <House size={21} color={GAME_ROOM_FOOTER_ICON_COLOR} strokeWidth={2.4} />
                }
                onPress={() => {
                  setFooterButtonsDismissed(true);
                  leaveToHomeFromEnded();
                }}
              />
            </View>
          )}
            </View>

            {humanBarVisible ? (
              <HumanSpeechBar
                visible
                placeholder={g.humanPlaceholder}
                passLabel={g.humanSkip}
                submitLabel={g.humanSubmit}
                maxLength={400}
                onSubmit={submitSpeechTurn}
                onPass={passHuman}
              />
            ) : null}
            </View>
          </View>
        </View>
          </View>
      </KeyboardAvoidingView>

      <GameRoomNightRoleCue segment={activeNightRoleCue} lang={uiLang} keepWarm />
      {/* Stickers only appear in the footer after the role card; warm decode immediately. */}
      <View style={styles.assetWarmSink} pointerEvents="none" accessibilityElementsHidden>
        {ROOM_STICKER_PACK.map(({ id: sid, source }) => (
          <Image
            key={sid}
            source={source}
            style={styles.assetWarmImg}
            resizeMode="contain"
          />
        ))}
      </View>

      <RoleIdentityCard
        visible={
          roomReady &&
          players.length > 0 &&
          !roleCardDismissed &&
          phase !== 'ENDED' &&
          gameEndEpilogue == null
        }
        role={myRole}
        lang={uiLang}
        onConfirm={() => setRoleCardDismissed(true)}
      />

      <GameEndEpilogueModal
        visible={gameEndEpilogue != null}
        lang={uiLang}
        winner={gameEndEpilogue?.winner ?? 'good'}
        role={gameEndEpilogue?.role ?? 'Villager'}
        onDismiss={() => setGameEndEpilogue(null)}
        onViewReviews={() => {
          setGameEndEpilogue(null);
          setPeerReviewsModalVisible(true);
        }}
      />

      <GameEndPeerReviewsModal
        visible={peerReviewsModalVisible}
        lang={uiLang}
        cells={peerReviewCells}
        seatOrder={tableSeatOrder}
        onClose={() => setPeerReviewsModalVisible(false)}
      />

      <DeathRulesTeachingModal
        visible={deathRulesModalVisible}
        lang={uiLang}
        onConfirm={confirmDeathRulesModal}
      />

      <SheriffTeachingModal
        visible={sheriffTutorialVisible}
        lang={uiLang}
        onConfirm={confirmSheriffTutorial}
      />

      <Modal visible={seerInspectCard != null} transparent animationType="fade">
        <View style={styles.seerModalRoot}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setSeerInspectCard(null)}
            accessibilityRole="button"
            accessibilityLabel={g.seerRevealDismiss}
          />
          <View style={styles.seerModalCard} pointerEvents="box-none">
            <Text style={styles.seerModalTitle}>{g.seerRevealTitle}</Text>
            <Text style={styles.seerModalLine}>
              {seerInspectCard ? g.seerRevealFor(seerInspectCard.targetName) : ''}
            </Text>
            <Text style={styles.seerModalResult}>
              {seerInspectCard
                ? seerInspectCard.isWolfSide
                  ? g.seerRevealWolf
                  : g.seerRevealGood
                : ''}
            </Text>
            <NightRpgPillButton
              variant="wood"
              label={g.seerRevealDismiss}
              style={{ marginTop: 16, alignSelf: 'stretch' }}
              leftIcon={<Check size={21} color="#e8c44a" strokeWidth={2.8} />}
              onPress={() => setSeerInspectCard(null)}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={idiotFlipModal != null} transparent animationType="fade">
        <View style={styles.seerModalRoot}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={confirmIdiotFlipModal}
            accessibilityRole="button"
            accessibilityLabel={g.idiotFlipDismiss}
          />
          <View style={styles.seerModalCard} pointerEvents="box-none">
            <Text style={styles.seerModalTitle}>{g.idiotFlipCardTitle}</Text>
            {idiotFlipModal ? (
              <>
                <View style={styles.idiotFlipRow}>
                  <Image
                    source={idiotFlipModal.avatarSource}
                    style={[PIXEL_ART_SPRITE, styles.idiotFlipAvatar]}
                    resizeMode="contain"
                  />
                  <Text style={styles.idiotFlipName}>{idiotFlipModal.name}</Text>
                </View>
                <Text style={styles.idiotFlipMain}>{g.idiotFlipCardBody}</Text>
                <Text style={styles.idiotFlipNote}>{g.idiotFlipCardNote}</Text>
              </>
            ) : null}
            <NightRpgPillButton
              variant="wood"
              label={g.idiotFlipDismiss}
              style={{ marginTop: 16, alignSelf: 'stretch' }}
              leftIcon={<Check size={21} color="#e8c44a" strokeWidth={2.8} />}
              onPress={confirmIdiotFlipModal}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={sheriffHandoffPick !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!sheriffHandoffResolveRef.current) return;
          const pick = sheriffHandoffPickRef.current;
          finishSheriffHandoffPick(pick?.defaultNextId ?? null);
        }}
      >
        <View style={styles.seerModalRoot}>
          <View style={styles.seerModalCard} pointerEvents="box-none">
            <Text style={styles.seerModalTitle}>{g.sheriffHandoffModalTitle}</Text>
            <Text style={styles.sheriffHandoffHint}>{g.sheriffHandoffModalHint}</Text>
            <ScrollView
              style={styles.sheriffHandoffScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {sheriffHandoffPick?.alive.map((p) => {
                const sel = sheriffHandoffSelectedId === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.sheriffHandoffRow, sel && styles.sheriffHandoffRowSel]}
                    onPress={() => setSheriffHandoffSelectedId(p.id)}
                  >
                    <Text style={styles.sheriffHandoffRowText}>{p.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <NightRpgPillButton
              variant="wood"
              label={g.sheriffHandoffConfirm}
              style={{ marginTop: 14, alignSelf: 'stretch' }}
              leftIcon={<Check size={21} color="#e8c44a" strokeWidth={2.8} />}
              onPress={() => {
                const pick = sheriffHandoffPickRef.current;
                const sel = sheriffHandoffSelectedId;
                const next =
                  sel && pick?.alive.some((x) => x.id === sel)
                    ? sel
                    : pick?.defaultNextId ?? null;
                finishSheriffHandoffPick(next);
              }}
            />
            <NightRpgPillButton
              variant="parchment"
              label={g.sheriffHandoffUseDefault}
              style={{ marginTop: 10, alignSelf: 'stretch' }}
              leftIcon={<RotateCcw size={20} color={SDV.wood} strokeWidth={2.4} />}
              onPress={() => {
                const pick = sheriffHandoffPickRef.current;
                finishSheriffHandoffPick(pick?.defaultNextId ?? null);
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, width: '100%', backgroundColor: SDV.paper },
  containerTrans: { backgroundColor: 'transparent' },
  /** 局内主界面：底图透出安全区外沿 */
  containerGameShell: { backgroundColor: 'transparent' },
  roomBootOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 232, 200, 0.28)',
  },
  assetWarmSink: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
    left: -4,
    top: -4,
  },
  assetWarmImg: { width: 1, height: 1 },
  /** 全屏壳：底图 absolute 铺满物理屏（含刘海区），Web 用 100vh */
  gameScreenShell: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  /** 昼夜底图：`contain` 完整显示；平移时露底用深色 */
  gameScreenBackdropWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: 'hidden',
    backgroundColor: '#100c09',
  },
  gameScreenBackdrop: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  centered: { justifyContent: 'center', alignItems: 'center' },
  /** 顶栏：左退出+昼夜 · 正中计时 · 右音乐（全透明底，木屋昼夜图铺满其下） */
  gameSceneOverlay: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    zIndex: 1,
    flexDirection: 'column',
    position: 'relative',
  },
  gameTopBarWrap: {
    marginHorizontal: 10,
    marginTop: 2,
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  topBarRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 52,
  },
  /** 左右等宽，播报区才能相对左侧整体（不含牛皮纸）几何居中 */
  topBarSideRail: {
    width: 136,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  topBarSideRailEnd: {
    justifyContent: 'flex-end',
  },
  topBarHeadlineSpacer: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
  },
  topBarStatusPixel: {
    fontFamily: GAME_PIXEL_FONT_FAMILY,
    fontSize: 11,
    lineHeight: 16,
    color: '#ffffff',
    letterSpacing: 0,
    allowFontScaling: false,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  topBarStatusCombined: {
    textAlign: 'center',
  },
  topBarMusicBtn: {
    marginLeft: 0,
  },
  topTimerText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    maxWidth: '46%',
    letterSpacing: 0.3,
  },
  headerExit: {
    width: 36,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /** 顶栏与圆桌一列 | 牛皮纸栏一列；右栏顶对齐屏顶、底对齐屏底 */
  gameMainRow: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
    width: '100%',
    zIndex: 1,
    alignItems: 'stretch',
  },
  /** 左侧：顶栏 + 圆桌区（与右栏约 5:3） */
  gameLeftColumn: {
    flexGrow: 5,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 200,
    minHeight: 0,
    flexDirection: 'column',
    position: 'relative',
    overflow: 'visible',
  },
  /** 圆桌：占左侧列顶栏以下的剩余高度 */
  ringColumn: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: '100%',
    borderRightWidth: 2,
    borderRightColor: SDV.wood,
    backgroundColor: 'transparent',
    overflow: 'visible',
    position: 'relative',
  },
  ringHost: {
    flex: 1,
    position: 'relative',
    minHeight: 200,
    marginHorizontal: 0,
    marginVertical: 0,
    width: '100%',
    alignSelf: 'stretch',
    /** 允许右侧座位（如 4 号）木框略超出正方形舞台，落在 host 左右留白区 */
    overflow: 'visible',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /** 正方形舞台：在 ringHost 内 flex 居中；勿 hidden，否则右侧预设位头像被裁切 */
  ringArenaStage: {
    position: 'relative',
    zIndex: 0,
    overflow: 'visible',
  },
  sceneCharacterColumn: {
    position: 'relative',
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  sceneCharacterHit: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  sceneCharacterAnim: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderRadius: 999,
    overflow: 'visible',
    backgroundColor: 'transparent',
  },
  sceneCharacterSprite: {
    backgroundColor: 'transparent',
  },
  /** 选中头像：黄色圆环（绝对定位，不占布局） */
  seatSelectionRing: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    borderWidth: 3,
    borderColor: '#FFD700',
    backgroundColor: 'transparent',
    zIndex: 25,
    elevation: 12,
  },
  playerSeatRing: {
    position: 'absolute',
    alignItems: 'center',
    overflow: 'visible',
    backgroundColor: 'transparent',
  },
  roleEmojiTop: {
    fontSize: 16,
    lineHeight: 20,
    minHeight: 20,
    marginBottom: -18,
    textAlign: 'center',
  },
  wolfMateMark: {
    fontSize: 13,
    lineHeight: 20,
    minHeight: 20,
    marginBottom: -18,
    textAlign: 'center',
  },
  /** 与 roleEmojiTop / wolfMateMark 同高同负边距，避免当选警长时从占位换成 👮 顶动头像 */
  wolfMateSpacer: { minHeight: 20, marginBottom: -18 },
  sheriffHandoffHint: {
    fontSize: 13,
    fontWeight: '600',
    color: SDV.subtext,
    lineHeight: 18,
  },
  sheriffHandoffScroll: { maxHeight: 280, marginTop: 12 },
  sheriffHandoffRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: SDV.wood,
    backgroundColor: SDV.panelLight,
    marginBottom: 8,
  },
  sheriffHandoffRowSel: { backgroundColor: SDV.honeyFill },
  sheriffHandoffRowText: { fontSize: 15, fontWeight: '800', color: SDV.ink },
  knifeMarks: {
    fontSize: 11,
    fontWeight: '900',
    marginTop: 0,
    color: SDV.ink,
    textAlign: 'center',
  },
  /** 狼刀数行：固定高度，有/无刀标不顶动头像列 */
  knifeMarksCell: {
    minHeight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /** 右栏：底层牛皮纸图 + 前景日志/操作区 */
  actionColumn: {
    flexGrow: 3,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  /** 牛皮纸：铺满右栏，裁切溢出；位于日志层之下 */
  actionColumnParchmentWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    overflow: 'hidden',
  },
  actionColumnForeground: {
    flex: 1,
    zIndex: 1,
    minHeight: 0,
    minWidth: 0,
    position: 'relative',
  },
  /** 与顶栏「准备中」阶段胶囊一致 */
  phaseStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    backgroundColor: SDV.panel,
    borderWidth: 2,
    borderColor: SDV.wood,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  phaseStatusPillText: {
    marginLeft: 6,
    fontWeight: '900',
    fontSize: 12,
    color: SDV.ink,
  },
  statusBadge: {
    marginLeft: 6,
    maxWidth: 200,
  },
  statusText: {
    marginLeft: 6,
    fontWeight: '900',
    fontSize: 12,
    textTransform: 'uppercase',
    color: SDV.ink,
  },
  logScrollClip: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  logScroll: {
    flex: 1,
    minHeight: 0,
    ...Platform.select({
      web: { outlineStyle: 'none' as const },
      default: {},
    }),
  },
  chatRowClipped: {
    opacity: 0,
  },
  /** 牛皮纸左上角：记事本 */
  parchmentNotepadToggle: {
    position: 'absolute',
    top: 10,
    left: 36,
    zIndex: 10,
    ...Platform.select({
      web: { outlineStyle: 'none' as const },
      default: {},
    }),
  },
  /** 牛皮纸右上角：同顶栏「准备中」胶囊，点按在聊天/事件间切换 */
  parchmentPanelToggle: {
    position: 'absolute',
    top: 10,
    right: 36,
    zIndex: 10,
    ...Platform.select({
      web: { outlineStyle: 'none' as const },
      default: {},
    }),
  },
  logScrollContent: {
    width: '100%',
    paddingLeft: PARCHMENT_SCROLL_PAD_H,
    paddingRight: PARCHMENT_SCROLL_PAD_H,
    paddingTop: PARCHMENT_SCROLL_PAD_TOP,
    paddingBottom: 6,
  },
  eventsScrollContent: {
    width: '100%',
    paddingLeft: PARCHMENT_SCROLL_PAD_H,
    paddingRight: PARCHMENT_SCROLL_PAD_H,
    paddingTop: PARCHMENT_SCROLL_PAD_TOP,
    paddingBottom: 12,
  },
  publicEventsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingRight: 72,
  },
  publicEventsHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  publicEventsCount: {
    fontSize: 13,
    fontWeight: '700',
    color: SDV.subtext,
    lineHeight: 19,
  },
  eventDayDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  eventDayDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(92, 61, 36, 0.22)',
  },
  eventDayDividerText: {
    marginHorizontal: 10,
    fontSize: 13,
    fontWeight: '700',
    color: SDV.subtext,
    lineHeight: 19,
  },
  publicSheriffCurrentBlock: {
    marginTop: 3,
    marginBottom: 14,
  },
  publicEventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 9,
    borderRadius: 8,
    backgroundColor: PARCHMENT_PUBLIC_EVENT_ROW_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(92, 61, 36, 0.12)',
    alignSelf: 'stretch',
  },
  logRowContainer: {
    width: '100%',
    marginBottom: 9,
  },
  logRowContainerHighlight: {
    backgroundColor: PARCHMENT_LOG_ROW_HIGHLIGHT_BG,
    borderRadius: 4,
  },
  /** 玩家发言：无左侧竖杠 */
  logItemSpeech: {
    paddingLeft: 0,
    paddingVertical: 4,
    width: '100%',
  },
  /** 法官 / 系统：竖杠 + 额外缩进 */
  logItemModerator: {
    borderLeftWidth: 3,
    borderLeftColor: SDV.woodMid,
    paddingLeft: 14,
    paddingVertical: 4,
    width: '100%',
  },

  avatarBlock: {
    position: 'relative',
    alignSelf: 'center',
  },
  /** 整块可点：含右上角表情气泡，避免点到气泡外不触发 */
  avatarBlockHit: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  /** 表情：头像右上角气泡框 */
  seatStickerBubble: {
    position: 'absolute',
    top: -8,
    right: -10,
    zIndex: 10050,
    backgroundColor: SDV.panel,
    borderWidth: 2,
    borderColor: SDV.wood,
    borderRadius: 14,
    paddingHorizontal: 4,
    paddingVertical: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: SDV.wood,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 28,
  },
  seatStickerImg: { width: 34, height: 34 },
  avatarTouchFill: { width: '100%', height: '100%' },
  /** 头像 + 左上槽位号（与参考木屋 UI 一致） */
  portraitSlotWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  /** 槽位号：设计稿式小方框 + 双层棕像素边，内凹深色底 */
  seatSlotNumberBadge: {
    position: 'absolute',
    top: -8,
    left: -6,
    zIndex: 12,
    minWidth: 28,
    height: 24,
    borderRadius: 4,
    padding: 2,
    borderWidth: 2,
    borderColor: '#6D4526',
    backgroundColor: '#8B5E34',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  seatSlotNumberBadgeInset: {
    flex: 1,
    alignSelf: 'stretch',
    width: '100%',
    borderRadius: 2,
    backgroundColor: '#3A2416',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatSlotNumberBadgeText: {
    color: '#FFE09F',
    fontSize: 10,
    fontWeight: '900',
    marginTop: -1,
  },
  /** 外环：深棕木边（略细，避免过粗） */
  portraitWoodOuter: {
    borderWidth: 2,
    borderColor: '#6D4526',
    backgroundColor: '#523626',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  /** 内环：浅一档高光木边（#C49A4A），与外环形成双层描边感 */
  portraitGoldRing: {
    borderWidth: 2,
    borderColor: '#C49A4A',
    backgroundColor: '#6D4526',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  portraitFaceClip: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  /** 局内半身：深棕木框 + 牛皮纸芯（略深于 SDV.panel），透明立绘叠在纸色底上 */
  portraitFaceClipBust: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#e3c992',
  },
  /** 仅排名字，无底框 */
  playerNamePlate: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    marginTop: -4,
    zIndex: 8,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  playerNamePlateText: {
    flex: 1,
    flexShrink: 1,
    color: '#E8C78B',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  /** 圆桌点选目标（投票/刀/验/毒/守/枪）时的头像高亮 */
  avatarRingSelected: {
    borderWidth: 4,
    borderColor: SDV.woodMid,
    backgroundColor: SDV.honeyFill,
    shadowColor: SDV.wood,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarSlotImage: {},
  deathOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deadText: { color: SDV.inkMuted, textDecorationLine: 'line-through' },

  bubble: {
    position: 'absolute',
    top: -58,
    left: '50%',
    width: SPEECH_BUBBLE_FIXED_WIDTH,
    marginLeft: -SPEECH_BUBBLE_FIXED_WIDTH / 2,
    minHeight: 28,
    backgroundColor: SDV.panel,
    borderWidth: 2,
    borderColor: SDV.wood,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 10,
    zIndex: 10050,
    elevation: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleText: {
    color: SDV.ink,
    fontSize: 8,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 11,
    width: '100%',
  },
  bubbleArrow: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderLeftColor: 'transparent',
    borderRightWidth: 6,
    borderRightColor: 'transparent',
    borderTopWidth: 6,
    borderTopColor: SDV.wood,
  },

  logText: {
    fontSize: 13,
    fontWeight: '700',
    color: SDV.ink,
    lineHeight: 19,
    flexShrink: 1,
    textShadowColor: 'rgba(255, 248, 220, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },

  stickerStrip: {
    maxHeight: 56,
    marginBottom: 8,
    flexGrow: 0,
  },
  stickerStripInner: {
    alignItems: 'center',
    paddingRight: 4,
    gap: 8,
  },
  stickerChip: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: SDV.wood,
    backgroundColor: SDV.panelLight,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { outlineStyle: 'none' as const },
      default: {},
    }),
  },
  stickerChipImg: { width: 36, height: 36 },
  seerModalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  seerModalCard: {
    width: '100%',
    maxWidth: 320,
    zIndex: 2,
    elevation: 6,
    backgroundColor: SDV.panel,
    borderWidth: 3,
    borderColor: SDV.wood,
    borderRadius: 16,
    padding: 20,
  },
  seerModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: SDV.ink,
    marginBottom: 12,
  },
  seerModalLine: {
    fontSize: 14,
    fontWeight: '700',
    color: SDV.subtext,
    marginBottom: 8,
  },
  seerModalResult: {
    fontSize: 17,
    fontWeight: '900',
    color: SDV.ink,
  },
  idiotFlipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  idiotFlipAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: SDV.wood,
    backgroundColor: SDV.panel,
  },
  idiotFlipName: { flex: 1, fontSize: 17, fontWeight: '900', color: SDV.ink },
  idiotFlipMain: { fontSize: 16, fontWeight: '800', color: SDV.ink, lineHeight: 22 },
  idiotFlipNote: {
    marginTop: 10,
    fontSize: 11,
    fontWeight: '600',
    color: SDV.subtext,
    lineHeight: 17,
  },
  voteHint: {
    fontSize: 13,
    fontWeight: '700',
    color: SDV.ink,
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  endedFooterBtns: {
    gap: 10,
  },
  /** 贴纸与操作按钮区：半透明白底 + 图鉴角色卡同款浅黄细框（galleryCard） */
  footer: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: GAME_ROOM_FOOTER_PANEL_BG,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: PICKER_GLASS_PANEL_BORDER,
  },
  footerBottomCap: {},
  footerWhenSpeaking: {},
  sheriffSignupRow: { flexDirection: 'row', alignItems: 'stretch', marginHorizontal: -4 },
});
