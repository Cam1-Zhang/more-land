import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type ImageStyle,
  type ViewStyle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import {
  Check,
  ChevronLeft,
  ClipboardList,
  MessageCircle,
  Moon,
  NotebookPen,
  Play,
  Shield,
  ShieldCheck,
  ShieldX,
  Sparkles,
  Sun,
  Swords,
  Users,
  X,
} from 'lucide-react-native';
import { APP_LANGUAGE_KEY, gameCopy, type AppLanguage } from '../i18n/appStrings';
import { avalonCopy } from '../i18n/avalonStrings';
import {
  playAvalonOpeningCue,
  stopAvalonOpeningCue,
  type AvalonOpeningCueStep,
} from '../audio/avalonNarratorCue';
import { playVictoryCue, stopVictoryCue } from '../audio/victoryCue';
import {
  CLOUD_MODEL_ENABLED_KEY,
  USER_AVATAR_INDEX_KEY,
  USER_NICKNAME_KEY,
  USER_NICKNAME_MAX_LEN,
} from '../constants/userProfileKeys';
import { CHARACTERS } from '../data/mockData';
import type { AICharacter, DifficultyType, ModelRef } from '../types';
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
import { GAME_ROOM_BACKGROUND_DAY, GAME_ROOM_BACKGROUND_NIGHT } from '../constants/gameRoomSceneImages';
import { LOYAL_SERVANT_CARD_IMAGES } from '../constants/roleCardImages';
import RoleIdentityCard from '../components/RoleIdentityCard';
import { GameWoodButton } from '../components/GameWoodButton';
import NightRpgPillButton from '../components/NightRpgPillButton';
import { startGameRoomBgm, stopGameRoomBgm } from '../audio/gameRoomBgm';
import { readHubBgmEnabled, subscribeHubBgmEnabled } from '../audio/hubBgmPref';
import { PIXEL_ART_BACKGROUND_IMAGE, PIXEL_ART_SPRITE } from '../theme/pixelArtImage';
import { GAME_PIXEL_FONT_FAMILY } from '../theme/pixelFont';
import { SDV } from '../theme/stardewPixel';
import {
  GAME_ROOM_FOOTER_ICON_COLOR,
  GAME_ROOM_FOOTER_PANEL_BG,
  PARCHMENT_LOG_ROW_HIGHLIGHT_BG,
  PICKER_GLASS_PANEL_BORDER,
} from '../theme/gameButton';
import BodyPortraitImage from '../components/BodyPortraitImage';
import HumanSpeechBar from '../components/HumanSpeechBar';
import GameRoomNotepadPanel from '../components/GameRoomNotepadPanel';
import HubSettingsIconButton from '../components/HubSettingsIconButton';
import GameEndPeerReviewsModal from '../components/GameEndPeerReviewsModal';
import { exitToHome, promptExitGameWithConfirm } from '../utils/navExit';
import type { PeerReviewCell } from '../utils/postGamePeerReview';
import { gameEpilogueCardUi } from '../i18n/gameEpilogueCopy';
import { ROOM_STICKER_PACK, resolveStickerSource, type RoomStickerId } from '../data/roomStickers';
import { speakAiUtterance, stopAiSpeech, type AiVoiceProfile } from '../utils/aiVoice';
import {
  AVALON_10_PLAYER_QUESTS,
  chooseAvalonAssassinationTarget,
  createAvalonSeededRng,
  dealAvalonRoles,
  decideAvalonMissionVote,
  decideAvalonProposalVote,
  resolveAvalonSeatProposalVote,
  getAvalonPlayerKnowledge,
  getAvalonRoleDefinition,
  resolveAvalonMissionVotes,
  resolveAvalonProposalVotes,
  requestAvalonAssassinationTarget,
  requestAvalonMissionVote,
  requestAvalonProposalVote,
  requestAvalonPeerReview,
  requestAvalonSpeech,
  requestAvalonTeam,
  selectAvalonTeam,
  type AvalonAiStyle,
  type AvalonAssignment,
  type AvalonFaction,
  type AvalonMissionVote,
  type AvalonModelPublicState,
  type AvalonPlayerKnowledge,
  type AvalonProposalResolution,
  type AvalonProposalVote,
  type AvalonQuestNumber,
  type AvalonQuestResolution,
  type AvalonRoleId,
} from '../game/avalon';
import { setRuntimeLlmProviderOverride, normalizedLlmProvider } from '../llm/providerEnv';
import { probeDashscope, probeOllama } from '../llm/llmHealth';
import { formatDashscopeDifficultyModelMap } from '../llm/dashscopeEnv';
import { describeLlmMisconfig } from '../llm/ollamaUrl';
import { llmSpeechFailureLine } from '../llm/llmSpeechPass';
import { buildModelRefMap, modelRefForDifficulty } from '../utils/aiModelPool';
import {
  characterDescriptionForUi,
  characterPersonalityForUi,
} from '../utils/characterDisplayCopy';
import {
  hydrateAvalonSeats,
  serializeAvalonSeats,
  type AvalonSessionSnapshot,
} from '../game/avalon/sessionSnapshot';
import {
  clearGameSession,
  loadGameSession,
  saveGameSession,
} from '../utils/gameSessionPersist';

type AvalonUiPhase =
  | 'night'
  | 'discussion'
  | 'proposal'
  | 'teamVote'
  | 'teamVoteResult'
  | 'missionVote'
  | 'evilDiscussion'
  | 'assassination'
  | 'ended';

type AvalonDiscussionPurpose = 'beforeTeamVote' | 'afterMission';

type AvalonSeat = {
  id: string;
  name: string;
  role: AvalonRoleId;
  faction: AvalonFaction;
  isHuman: boolean;
  character?: AICharacter;
  roleArtVariant?: number;
};

type AvalonRouteConfig = {
  selectedAIIds: string[];
  matchNonce: number;
  aiDifficulty: DifficultyType;
};

type EndState = {
  winner: AvalonFaction;
  reason: 'three_failed_quests' | 'five_rejected_teams' | 'merlin_assassinated' | 'merlin_survived';
  assassinationTargetId?: string;
};

type AvalonLogRow = {
  text: string;
  isSystem: boolean;
};

type AvalonPanelTab = 'chat' | 'notepad' | 'events';

type AvalonEventRecord =
  | {
      id: string;
      kind: 'team';
      questNumber: AvalonQuestNumber;
      attempt: number;
      approved: boolean;
      approveVotes: number;
      rejectVotes: number;
      leaderName: string;
      teamNames: string;
      votes?: {
        playerName: string;
        vote: AvalonProposalVote;
        autoApprove?: boolean;
      }[];
    }
  | {
      id: string;
      kind: 'mission';
      questNumber: AvalonQuestNumber;
      succeeded: boolean;
      failVotes: number;
      teamNames: string;
      byFiveRejections?: boolean;
    };

const ROLE_CARD_NAME: Record<AvalonRoleId, string> = {
  merlin: 'Merlin',
  percival: 'Percival',
  loyal_servant: 'LoyalServant',
  assassin: 'Assassin',
  morgana: 'Morgana',
  mordred: 'Mordred',
  oberon: 'Oberon',
};

const GOOD = '#3e7a55';
const GOOD_LIGHT = '#d9f0d6';
const EVIL = '#8c3544';
const EVIL_LIGHT = '#f3d4d2';
const GOLD = '#d6aa3d';
const INK = '#332417';
const GLASS = 'rgba(255, 247, 224, 0.90)';
const GLASS_SOFT = 'rgba(255, 247, 224, 0.72)';
const AVALON_SEAT_W = 76;
const AVALON_SEAT_H = 112;
const GAME_ROOM_PARCHMENT_DESIGN_W = 682;
const GAME_ROOM_PARCHMENT_DESIGN_H = 1024;
const GAME_ROOM_RIGHT_PARCHMENT = require('../../assets/gameRoomRightParchment.jpg');
const EVIL_DISCUSSION_DURATION_SEC = 120;

function systemLogPrefix(lang: AppLanguage): string {
  return lang === 'zh' ? '系统：' : 'System: ';
}

function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function actionColumnParchmentSpanW(columnW: number, columnH: number): number {
  if (columnW <= 0 || columnH <= 0) return 0;
  const aspect = GAME_ROOM_PARCHMENT_DESIGN_W / GAME_ROOM_PARCHMENT_DESIGN_H;
  return Math.max(columnH * aspect, columnW);
}

type AvalonNightStep = 0 | 1 | 2 | 3 | 4;
type RingPoint = { left: number; top: number };

function avalonRingPositions(count: number, width: number, height: number, compact: boolean): RingPoint[] {
  if (count <= 0 || width < 80 || height < 80) return [];
  const seatW = compact ? 62 : AVALON_SEAT_W;
  const seatH = compact ? 92 : AVALON_SEAT_H;
  // Match the full, contained werewolf-room artwork: its large oval table sits
  // slightly right and below the center of the left gameplay column.
  const radiusX = Math.max(0, width * 0.34);
  const radiusY = Math.max(0, height * 0.28);
  const centerX = width * 0.55;
  const centerY = height * 0.58;
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
    return {
      left: centerX + radiusX * Math.cos(angle) - seatW / 2,
      top: centerY + radiusY * Math.sin(angle) - seatH / 2,
    };
  });
}

function raisedHandEmoji(seat: AvalonSeat): string {
  if (seat.character?.gender === 'Male') return '🙋‍♂️';
  if (seat.character?.gender === 'Female') return '🙋‍♀️';
  return '🙋';
}

function splitAvalonSpeechSentences(text: string): string[] {
  const normalized = text.replace(/\r/g, '').trim();
  if (!normalized) return [];
  const sentences =
    normalized.match(/[^。！？；.!?\n…]+[。！？；.!?…]?/g)
      ?.map((sentence) => sentence.trim())
      .filter(Boolean) ?? [normalized];
  return sentences.length > 0 ? sentences : [normalized];
}

function avalonBubbleDisplayMs(text: string, lang: AppLanguage): number {
  return Math.min(12000, Math.max(1050, text.length * (lang === 'zh' ? 75 : 38)));
}

function parseConfig(route: any): AvalonRouteConfig {
  const raw = route?.params?.config;
  const requested: unknown[] = Array.isArray(raw?.selectedAIIds) ? raw.selectedAIIds : [];
  const known = new Set(CHARACTERS.map((character) => character.id));
  const unique: string[] = [...new Set(requested.filter((id): id is string => typeof id === 'string'))]
    .filter((id) => known.has(id));
  const fallback = CHARACTERS.map((character) => character.id).filter((id) => !unique.includes(id));
  const selectedAIIds = [...unique, ...fallback].slice(0, 9);
  const rawNonce = raw?.matchNonce;
  const matchNonce = typeof rawNonce === 'number' && Number.isFinite(rawNonce)
    ? rawNonce
    : Date.now();
  const difficulty: DifficultyType =
    raw?.aiDifficulty === 'Easy' ||
    raw?.aiDifficulty === 'Medium' ||
    raw?.aiDifficulty === 'Hard'
      ? raw.aiDifficulty
      : 'Novice';
  return { selectedAIIds, matchNonce, aiDifficulty: difficulty };
}

function aiStyleForSeat(seat: AvalonSeat, fallback: DifficultyType): AvalonAiStyle {
  const difficulty = seat.character?.difficulty ?? fallback;
  const tier = difficulty === 'Hard' ? 0.88 : difficulty === 'Medium' ? 0.7 : difficulty === 'Easy' ? 0.5 : 0.3;
  const numericId = Number.parseInt(seat.id, 10);
  const wobble = Number.isFinite(numericId) ? (numericId % 7) / 50 : 0.06;
  return {
    caution: Math.min(1, 0.34 + tier * 0.55 + wobble),
    deception: Math.min(1, 0.3 + tier * 0.62),
    aggression: Math.min(1, 0.28 + tier * 0.48 + wobble),
    randomness: Math.max(0.04, 0.46 - tier * 0.4 + wobble),
  };
}

/** Shared with Werewolf MiniMax TTS: age/gender/personality pick a stable voice. */
function avalonAiVoiceProfile(seat: AvalonSeat, lang: AppLanguage): AiVoiceProfile {
  return {
    lang,
    age: seat.character?.age,
    gender: seat.character?.gender,
    personality: seat.character?.personality,
    characterId: seat.character?.id,
    characterName: seat.character?.name,
    emotion: 'calm',
  };
}

function roleName(role: AvalonRoleId, lang: AppLanguage): string {
  const roleInfo = getAvalonRoleDefinition(role);
  return lang === 'zh' ? roleInfo.nameZh : roleInfo.name;
}

function roleIntel(
  knowledge: AvalonPlayerKnowledge,
  seats: readonly AvalonSeat[],
  lang: AppLanguage
): string {
  const t = avalonCopy[lang];
  const namesFor = (ids: readonly string[]) =>
    ids.map((id) => seats.find((seat) => seat.id === id)?.name ?? id).join(lang === 'zh' ? '、' : ', ');
  if (knowledge.viewerRole === 'merlin') {
    return t.privateIntelMerlin(namesFor(knowledge.signals.map((signal) => signal.playerId)));
  }
  if (knowledge.viewerRole === 'percival') {
    return t.privateIntelPercival(namesFor(knowledge.merlinOrMorganaIds));
  }
  if (knowledge.viewerRole === 'oberon') return t.privateIntelOberon;
  if (knowledge.viewerFaction === 'evil') {
    return t.privateIntelEvil(namesFor(knowledge.evilTeammateIds));
  }
  return t.privateIntelNone;
}

function avalonPhaseStatus(
  phase: AvalonUiPhase,
  matchStarted: boolean,
  lang: AppLanguage
): string {
  if (!matchStarted) return lang === 'zh' ? '准备中' : 'PREPARING';
  if (phase === 'night') return lang === 'zh' ? '天黑' : 'NIGHT';
  if (phase === 'discussion') return lang === 'zh' ? '发言' : 'DISCUSSION';
  if (phase === 'proposal') return lang === 'zh' ? '队长选人' : 'LEADER PICK';
  if (phase === 'teamVote') return lang === 'zh' ? '组队表决' : 'TEAM VOTE';
  if (phase === 'teamVoteResult') return lang === 'zh' ? '表决结果' : 'VOTE RESULT';
  if (phase === 'missionVote') return lang === 'zh' ? '执行任务' : 'QUEST';
  if (phase === 'evilDiscussion') return lang === 'zh' ? '坏人讨论' : 'EVIL TALK';
  if (phase === 'assassination') return lang === 'zh' ? '刺杀' : 'ASSASSINATION';
  return lang === 'zh' ? '已结束' : 'ENDED';
}

export default function AvalonGameRoomScreen({ route, navigation }: any) {
  const config = useMemo(() => parseConfig(route), [route]);
  const isFocused = useIsFocused();
  const allowGameExitRef = useRef(false);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [backdropPanX, setBackdropPanX] = useState(() => -Math.round(windowWidth * 0.09));
  const backdropPanFrozenRef = useRef(false);
  useLayoutEffect(() => {
    if (backdropPanFrozenRef.current || windowWidth < 200) return;
    backdropPanFrozenRef.current = true;
    setBackdropPanX(-Math.round(windowWidth * 0.09));
  }, [windowWidth]);
  const gameBackdropPanStyle = useMemo(
    (): ImageStyle => ({ transform: [{ translateX: backdropPanX }] }),
    [backdropPanX]
  );
  const compact = windowWidth < 860 || windowHeight < 520;
  const [lang, setLang] = useState<AppLanguage>('zh');
  const [seats, setSeats] = useState<AvalonSeat[]>([]);
  const [humanAvatarIndex, setHumanAvatarIndex] = useState(3);
  const [humanPixelAvatar, setHumanPixelAvatar] = useState<PixelAvatarConfig | null>(null);
  const [humanPixelAvatarTransforms, setHumanPixelAvatarTransforms] = useState<AvatarItemTransformMap>(
    DEFAULT_AVATAR_ITEM_TRANSFORMS
  );
  const [ready, setReady] = useState(false);
  /** 与主页 / 设置共用 `HUB_BGM_ENABLED_KEY`；关则对局内不播 BGM（与游戏音效无关）。 */
  const [matchBgmEnabled, setMatchBgmEnabled] = useState(false);
  const [matchBgmPrefReady, setMatchBgmPrefReady] = useState(false);
  const reloadMatchBgmPref = useCallback(() => {
    void readHubBgmEnabled().then((enabled) => {
      setMatchBgmEnabled(enabled);
      setMatchBgmPrefReady(true);
    });
  }, []);
  const [restartKey, setRestartKey] = useState(0);
  const [roleVisible, setRoleVisible] = useState(false);
  const [roleConfirmed, setRoleConfirmed] = useState(false);
  const [matchStarted, setMatchStarted] = useState(false);
  const [llmLinkStatus, setLlmLinkStatus] = useState<'pending' | 'ready' | 'failed'>('pending');
  const llmProbeGenRef = useRef(0);
  const [phase, setPhase] = useState<AvalonUiPhase>('night');
  const [nightStep, setNightStep] = useState<AvalonNightStep>(0);
  const [discussionIndex, setDiscussionIndex] = useState(0);
  const [discussionPurpose, setDiscussionPurpose] = useState<AvalonDiscussionPurpose>('beforeTeamVote');
  const [evilDiscussionIndex, setEvilDiscussionIndex] = useState(0);
  const [evilDiscussionSecondsLeft, setEvilDiscussionSecondsLeft] = useState(EVIL_DISCUSSION_DURATION_SEC);
  const [activeSpeech, setActiveSpeech] = useState<{ playerId: string; text: string } | null>(null);
  const [thinkingSeatId, setThinkingSeatId] = useState<string | null>(null);
  const [tableLayout, setTableLayout] = useState({ width: 0, height: 0 });
  const [actionParchmentLayout, setActionParchmentLayout] = useState({ width: 0, height: 0 });
  const [questNumber, setQuestNumber] = useState<AvalonQuestNumber>(1);
  const [questResults, setQuestResults] = useState<AvalonQuestResolution[]>([]);
  const [leaderIndex, setLeaderIndex] = useState(0);
  const [rejectionTrack, setRejectionTrack] = useState(0);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [proposalVotes, setProposalVotes] = useState<Record<string, AvalonProposalVote> | null>(null);
  const [proposalResolution, setProposalResolution] = useState<AvalonProposalResolution | null>(null);
  const [missionResolution, setMissionResolution] = useState<AvalonQuestResolution | null>(null);
  const [suspicion, setSuspicion] = useState<Record<string, number>>({});
  const [assassinationTargetId, setAssassinationTargetId] = useState<string | null>(null);
  const [endState, setEndState] = useState<EndState | null>(null);
  const [endVisible, setEndVisible] = useState(false);
  const [peerReviewCells, setPeerReviewCells] = useState<PeerReviewCell[]>([]);
  const [peerReviewsVisible, setPeerReviewsVisible] = useState(false);
  const [logs, setLogs] = useState<AvalonLogRow[]>([]);
  const [panelTab, setPanelTab] = useState<AvalonPanelTab>('chat');
  const [playerNotepad, setPlayerNotepad] = useState('');
  const [eventRecords, setEventRecords] = useState<AvalonEventRecord[]>([]);
  const logScrollRef = useRef<ScrollView | null>(null);
  const nightLoggedStepRef = useRef<number | null>(null);
  const evilDiscussionActiveRef = useRef(false);
  const evilDiscussionSkipResetRef = useRef(false);
  const restoredSkipAutoRef = useRef(new Set<string>());
  const endEvilDiscussionRef = useRef<() => void>(() => {});
  const stickerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [humanSticker, setHumanSticker] = useState<RoomStickerId | null>(null);
  const modelRefMapRef = useRef<Map<string, ModelRef>>(new Map());
  const latestModelPublicStateRef = useRef<AvalonModelPublicState | null>(null);
  const asyncDecisionRunRef = useRef(0);
  const decisionPendingRef = useRef(false);
  const peerReviewsRunRef = useRef(0);
  const [decisionPending, setDecisionPending] = useState(false);

  const appendLog = useCallback((line: string, isSystem = true) => {
    setLogs((previous) => [...previous.slice(-80), { text: line, isSystem }]);
  }, []);

  const seatSpeechPipelineRef = useRef(Promise.resolve());
  const seatSpeechAbortRef = useRef(0);
  const seatSpeechPendingRef = useRef<string | null>(null);
  const seatNameByIdRef = useRef<Record<string, string>>({});
  const phaseRef = useRef<AvalonUiPhase>('night');
  phaseRef.current = phase;

  const enqueueAvalonSeatSpeech = useCallback((task: () => Promise<void>) => {
    seatSpeechPipelineRef.current = seatSpeechPipelineRef.current.then(task).catch(() => {});
  }, []);

  const deliverAvalonSeatSpeech = useCallback(
    async (
      seatId: string,
      seatName: string,
      textOrBubbles: string | readonly string[],
      opts?: { abortGen?: number; voice?: AiVoiceProfile | null }
    ) => {
      const stale = () =>
        opts?.abortGen != null && seatSpeechAbortRef.current !== opts.abortGen;
      const bubbles = typeof textOrBubbles === 'string' ? [textOrBubbles] : [...textOrBubbles];
      const sentences = bubbles.flatMap((bubble) => splitAvalonSpeechSentences(bubble));
      if (sentences.length === 0) return;
      for (let index = 0; index < sentences.length; index += 1) {
        if (stale()) {
          void stopAiSpeech();
          return;
        }
        const sentence = sentences[index]!;
        setActiveSpeech({ playerId: seatId, text: sentence });
        appendLog(`${seatName}：${sentence}`, false);
        // Same MiniMax TTS path as Werewolf; humans keep text-only bubbles.
        if (opts?.voice) {
          speakAiUtterance(sentence, opts.voice);
        }
        await new Promise((resolve) => setTimeout(resolve, avalonBubbleDisplayMs(sentence, lang)));
        if (stale()) {
          void stopAiSpeech();
          return;
        }
        if (index < sentences.length - 1) {
          setActiveSpeech(null);
          await new Promise((resolve) => setTimeout(resolve, 280));
        }
      }
      setActiveSpeech(null);
    },
    [appendLog, lang]
  );

  const runAvalonAiSeatSpeech = useCallback(
    async (params: {
      seatId: string;
      seatName: string;
      abortGen: number;
      voice?: AiVoiceProfile | null;
      isActive: () => boolean;
      request: () => ReturnType<typeof requestAvalonSpeech>;
      advance: () => void;
    }) => {
      if (!params.isActive()) return;
      if (seatSpeechAbortRef.current !== params.abortGen) return;
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (!params.isActive() || seatSpeechAbortRef.current !== params.abortGen) return;
      setThinkingSeatId(params.seatId);
      const result = await params.request();
      if (!params.isActive() || seatSpeechAbortRef.current !== params.abortGen) return;
      setThinkingSeatId(null);
      if (!result.bubbles?.length) {
        if (result.failReason) {
          appendLog(
            lang === 'zh'
              ? `AI 发言失败（${result.failReason}）`
              : `AI speech failed (${result.failReason})`
          );
        }
        await deliverAvalonSeatSpeech(
          params.seatId,
          params.seatName,
          llmSpeechFailureLine(lang),
          { abortGen: params.abortGen, voice: params.voice }
        );
        if (!params.isActive() || seatSpeechAbortRef.current !== params.abortGen) return;
        params.advance();
        return;
      }
      await deliverAvalonSeatSpeech(params.seatId, params.seatName, result.bubbles, {
        abortGen: params.abortGen,
        voice: params.voice,
      });
      if (!params.isActive() || seatSpeechAbortRef.current !== params.abortGen) return;
      params.advance();
    },
    [appendLog, deliverAvalonSeatSpeech, lang]
  );

  useEffect(() => {
    return () => {
      void stopAiSpeech();
    };
  }, []);

  useEffect(() => {
    if (phase === 'discussion' || phase === 'evilDiscussion') return;
    seatSpeechAbortRef.current += 1;
    seatSpeechPipelineRef.current = Promise.resolve();
    seatSpeechPendingRef.current = null;
    setThinkingSeatId(null);
    void stopAiSpeech();
  }, [phase]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const gen = ++llmProbeGenRef.current;
    void (async () => {
      const gateStart = !matchStarted;
      if (gateStart) setLlmLinkStatus('pending');
      else setLlmLinkStatus('ready');

      const mis = describeLlmMisconfig(lang);
      if (mis) {
        if (cancelled || gen !== llmProbeGenRef.current) return;
        appendLog(mis);
        if (gateStart) {
          appendLog(lang === 'zh' ? gameCopy.zh.modelConnectFailedHint : gameCopy.en.modelConnectFailedHint);
          setLlmLinkStatus('failed');
        }
        return;
      }
      if (gateStart) {
        appendLog(lang === 'zh' ? gameCopy.zh.modelConnectingLog : gameCopy.en.modelConnectingLog);
      }
      const provider = normalizedLlmProvider();
      let health: Awaited<ReturnType<typeof probeOllama>> | null = null;
      if (provider === 'ollama') health = await probeOllama();
      else if (provider === 'dashscope') health = await probeDashscope();
      else {
        if (cancelled || gen !== llmProbeGenRef.current) return;
        setLlmLinkStatus('ready');
        return;
      }
      if (cancelled || gen !== llmProbeGenRef.current) return;
      if (!health.ok) {
        appendLog(
          lang === 'zh'
            ? provider === 'ollama'
              ? `Ollama 未就绪（${health.error}）`
              : `百炼未就绪（${health.error}）`
            : provider === 'ollama'
              ? `Ollama not ready (${health.error})`
              : `Bailian/DashScope not ready (${health.error})`
        );
        if (gateStart) {
          appendLog(lang === 'zh' ? gameCopy.zh.modelConnectFailedHint : gameCopy.en.modelConnectFailedHint);
          setLlmLinkStatus('failed');
        }
        return;
      }
      appendLog(
        lang === 'zh'
          ? provider === 'ollama'
            ? `Ollama 已连通（探测模型 ${health.model}）`
            : `百炼已连通。本局按角色难度分模型——${formatDashscopeDifficultyModelMap('zh')}。连通性探测用的是新手档，与你选的难度无关。`
          : provider === 'ollama'
            ? `Ollama reachable (probe ${health.model})`
            : `Bailian reachable. Seat models by difficulty — ${formatDashscopeDifficultyModelMap('en')}. Connectivity probe always uses Novice; it is not your match model.`
      );
      setLlmLinkStatus('ready');
    })();
    return () => {
      cancelled = true;
    };
  }, [appendLog, lang, ready]);

  const retryLlmProbe = useCallback(() => {
    setLlmLinkStatus('pending');
    llmProbeGenRef.current += 1;
    const gen = llmProbeGenRef.current;
    void (async () => {
      const mis = describeLlmMisconfig(lang);
      if (mis) {
        if (gen !== llmProbeGenRef.current) return;
        appendLog(mis);
        appendLog(lang === 'zh' ? gameCopy.zh.modelConnectFailedHint : gameCopy.en.modelConnectFailedHint);
        setLlmLinkStatus('failed');
        return;
      }
      appendLog(lang === 'zh' ? gameCopy.zh.modelConnectingLog : gameCopy.en.modelConnectingLog);
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
        appendLog(
          lang === 'zh'
            ? provider === 'ollama'
              ? `Ollama 未就绪（${health.error}）`
              : `百炼未就绪（${health.error}）`
            : provider === 'ollama'
              ? `Ollama not ready (${health.error})`
              : `Bailian/DashScope not ready (${health.error})`
        );
        appendLog(lang === 'zh' ? gameCopy.zh.modelConnectFailedHint : gameCopy.en.modelConnectFailedHint);
        setLlmLinkStatus('failed');
        return;
      }
      appendLog(
        lang === 'zh'
          ? provider === 'ollama'
            ? `Ollama 已连通（探测模型 ${health.model}）`
            : `百炼已连通。本局按角色难度分模型——${formatDashscopeDifficultyModelMap('zh')}。连通性探测用的是新手档，与你选的难度无关。`
          : provider === 'ollama'
            ? `Ollama reachable (probe ${health.model})`
            : `Bailian reachable. Seat models by difficulty — ${formatDashscopeDifficultyModelMap('en')}. Connectivity probe always uses Novice; it is not your match model.`
      );
      setLlmLinkStatus('ready');
    })();
  }, [appendLog, lang]);

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

  useEffect(() => {
    if (!isFocused || !ready || phase === 'ended' || !matchBgmPrefReady) {
      void stopGameRoomBgm();
      return;
    }
    if (matchBgmEnabled) {
      void startGameRoomBgm();
    } else {
      void stopGameRoomBgm();
    }
  }, [isFocused, matchBgmEnabled, matchBgmPrefReady, phase, ready]);

  useEffect(() => () => {
    void stopGameRoomBgm();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setReady(false);
      setLlmLinkStatus('pending');
      const [rawLang, rawName, rawAvatar, rawPixelAvatar, rawPixelAvatarTransforms, rawCloudModelEnabled] = await Promise.all([
        AsyncStorage.getItem(APP_LANGUAGE_KEY),
        AsyncStorage.getItem(USER_NICKNAME_KEY),
        AsyncStorage.getItem(USER_AVATAR_INDEX_KEY),
        AsyncStorage.getItem(USER_PIXEL_AVATAR_CONFIG_KEY),
        AsyncStorage.getItem(USER_PIXEL_AVATAR_TRANSFORMS_KEY),
        AsyncStorage.getItem(CLOUD_MODEL_ENABLED_KEY),
      ]);
      if (cancelled) return;
      const cloudModelEnabled = rawCloudModelEnabled !== 'false';
      setRuntimeLlmProviderOverride(cloudModelEnabled ? null : 'ollama');
      const nextLang: AppLanguage = rawLang === 'en' ? 'en' : 'zh';
      const parsedAvatar = Number.parseInt(rawAvatar ?? '', 10);
      const avatarIndex = Number.isFinite(parsedAvatar) && parsedAvatar >= 0 ? parsedAvatar : 3;
      const nextHumanPixelAvatar = parsePixelAvatarConfig(rawPixelAvatar);
      setHumanPixelAvatar(nextHumanPixelAvatar);
      setHumanPixelAvatarTransforms(parseAvatarItemTransforms(rawPixelAvatarTransforms, nextHumanPixelAvatar));
      const humanName = rawName?.trim().slice(0, USER_NICKNAME_MAX_LEN) || (nextLang === 'zh' ? '我' : 'You');
      const restored = loadGameSession<AvalonSessionSnapshot>('avalon', config.matchNonce);
      if (restored && restored.restartKey === restartKey && !cancelled) {
        const nextSeats = hydrateAvalonSeats(restored.seats);
        modelRefMapRef.current = new Map(Object.entries(restored.modelRefMap));
        evilDiscussionSkipResetRef.current = restored.phase === 'evilDiscussion';
        evilDiscussionActiveRef.current = restored.phase === 'evilDiscussion';
        restoredSkipAutoRef.current = new Set([
          'proposal',
          'discussion',
          'evilDiscussion',
          'missionVote',
          'assassination',
          ...(restored.phase === 'teamVote' ? ['teamVoteLeader'] : []),
        ]);
        asyncDecisionRunRef.current += 1;
        decisionPendingRef.current = false;
        setDecisionPending(false);
        setLang(restored.lang);
        setHumanAvatarIndex(restored.humanAvatarIndex);
        setSeats(nextSeats);
        setLeaderIndex(restored.leaderIndex);
        setPhase(restored.phase as AvalonUiPhase);
        setNightStep(restored.nightStep as AvalonNightStep);
        setDiscussionIndex(restored.discussionIndex);
        setDiscussionPurpose(restored.discussionPurpose as AvalonDiscussionPurpose);
        setEvilDiscussionIndex(restored.evilDiscussionIndex);
        setEvilDiscussionSecondsLeft(restored.evilDiscussionSecondsLeft);
        setActiveSpeech(null);
        setThinkingSeatId(null);
        setQuestNumber(restored.questNumber);
        setQuestResults(restored.questResults);
        setRejectionTrack(restored.rejectionTrack);
        setTeamIds([...restored.teamIds]);
        setProposalVotes(restored.proposalVotes);
        setProposalResolution(restored.proposalResolution);
        setMissionResolution(restored.missionResolution);
        setSuspicion({ ...restored.suspicion });
        setAssassinationTargetId(restored.assassinationTargetId);
        setEndState(restored.endState as EndState | null);
        setEndVisible(restored.endVisible);
        setPeerReviewCells([]);
        setPeerReviewsVisible(false);
        peerReviewsRunRef.current += 1;
        setLogs(restored.logs);
        setPanelTab(restored.panelTab);
        setPlayerNotepad(restored.playerNotepad);
        setEventRecords(restored.eventRecords);
        setRoleConfirmed(restored.roleConfirmed);
        setMatchStarted(restored.matchStarted);
        setHumanSticker(null);
        nightLoggedStepRef.current = restored.matchStarted ? restored.nightStep : null;
        setRoleVisible(restored.roleVisible);
        setReady(true);
        return;
      }
      const seatShells = [
        { id: 'me', name: humanName, isHuman: true, character: undefined },
        ...config.selectedAIIds.map((id) => {
          const character = CHARACTERS.find((entry) => entry.id === id);
          return {
            id,
            name: character?.name ?? `AI-${id}`,
            isHuman: false,
            character,
          };
        }),
      ];
      const rng = createAvalonSeededRng(`${config.matchNonce}:${restartKey}:deal`);
      const deal = dealAvalonRoles(seatShells.map((seat) => seat.id), rng);
      const artRng = createAvalonSeededRng(`${config.matchNonce}:${restartKey}:loyal-art`);
      const loyalVariantOffset = Math.floor(artRng() * LOYAL_SERVANT_CARD_IMAGES.length);
      let loyalVariantIndex = 0;
      const nextSeats: AvalonSeat[] = seatShells.map((seat) => {
        const role = deal.roleByPlayerId[seat.id]!;
        const roleArtVariant = role === 'loyal_servant'
          ? (loyalVariantOffset + loyalVariantIndex++) % LOYAL_SERVANT_CARD_IMAGES.length
          : undefined;
        return {
          ...seat,
          role,
          faction: getAvalonRoleDefinition(role).faction,
          roleArtVariant,
        };
      });
      const leaderRng = createAvalonSeededRng(`${config.matchNonce}:${restartKey}:leader`);
      const nextLeader = Math.floor(leaderRng() * nextSeats.length);
      modelRefMapRef.current = buildModelRefMap(
        nextSeats
          .filter((seat) => !seat.isHuman)
          .map((seat) => ({
            id: seat.id,
            difficulty: seat.character?.difficulty ?? config.aiDifficulty,
          }))
      );
      asyncDecisionRunRef.current += 1;
      decisionPendingRef.current = false;
      setDecisionPending(false);
      setLang(nextLang);
      setHumanAvatarIndex(avatarIndex);
      setSeats(nextSeats);
      setLeaderIndex(nextLeader);
      setPhase('night');
      setNightStep(0);
      setDiscussionIndex(0);
      setDiscussionPurpose('beforeTeamVote');
      setEvilDiscussionIndex(0);
      setEvilDiscussionSecondsLeft(EVIL_DISCUSSION_DURATION_SEC);
      evilDiscussionActiveRef.current = false;
      setActiveSpeech(null);
      setThinkingSeatId(null);
      setQuestNumber(1);
      setQuestResults([]);
      setRejectionTrack(0);
      setTeamIds([]);
      setProposalVotes(null);
      setProposalResolution(null);
      setMissionResolution(null);
      setSuspicion(Object.fromEntries(nextSeats.map((seat) => [seat.id, 0.5])));
      setAssassinationTargetId(null);
      setEndState(null);
      setEndVisible(false);
      void stopVictoryCue();
      setPeerReviewCells([]);
      setPeerReviewsVisible(false);
      peerReviewsRunRef.current += 1;
      setLogs([]);
      setPanelTab('chat');
      setPlayerNotepad('');
      setEventRecords([]);
      setRoleConfirmed(false);
      setMatchStarted(false);
      setHumanSticker(null);
      nightLoggedStepRef.current = null;
      setRoleVisible(true);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [config.aiDifficulty, config.matchNonce, config.selectedAIIds, restartKey]);

  const buildAvalonSessionSnapshot = useCallback((): AvalonSessionSnapshot => ({
    restartKey,
    lang,
    humanAvatarIndex,
    seats: serializeAvalonSeats(seats),
    leaderIndex,
    phase,
    nightStep,
    matchStarted,
    roleConfirmed,
    roleVisible,
    discussionIndex,
    discussionPurpose,
    evilDiscussionIndex,
    evilDiscussionSecondsLeft,
    questNumber,
    questResults,
    rejectionTrack,
    teamIds,
    proposalVotes,
    proposalResolution,
    missionResolution,
    suspicion,
    assassinationTargetId,
    endState,
    endVisible,
    logs,
    eventRecords,
    playerNotepad,
    panelTab,
    modelRefMap: Object.fromEntries(modelRefMapRef.current.entries()),
  }), [
    assassinationTargetId,
    discussionIndex,
    discussionPurpose,
    endState,
    endVisible,
    eventRecords,
    evilDiscussionIndex,
    evilDiscussionSecondsLeft,
    humanAvatarIndex,
    lang,
    leaderIndex,
    logs,
    matchStarted,
    missionResolution,
    nightStep,
    panelTab,
    phase,
    playerNotepad,
    proposalResolution,
    proposalVotes,
    questNumber,
    questResults,
    rejectionTrack,
    restartKey,
    roleConfirmed,
    roleVisible,
    seats,
    suspicion,
    teamIds,
  ]);

  useEffect(() => {
    if (!ready || seats.length === 0) return;
    const timer = setTimeout(() => {
      saveGameSession('avalon', config.matchNonce, buildAvalonSessionSnapshot());
    }, 350);
    return () => clearTimeout(timer);
  }, [buildAvalonSessionSnapshot, config.matchNonce, ready, seats.length]);

  useEffect(() => () => {
    asyncDecisionRunRef.current += 1;
    decisionPendingRef.current = false;
  }, []);

  useEffect(() => {
    decisionPendingRef.current = false;
    setDecisionPending(false);
  }, [phase]);

  useEffect(() => {
    if (logs.length === 0) return;
    const timer = setTimeout(() => logScrollRef.current?.scrollToEnd({ animated: true }), 40);
    return () => clearTimeout(timer);
  }, [logs]);

  const assignments = useMemo<AvalonAssignment[]>(
    () => seats.map((seat) => ({ playerId: seat.id, role: seat.role, faction: seat.faction })),
    [seats]
  );
  const humanSeat = seats.find((seat) => seat.isHuman) ?? null;
  const humanKnowledge = useMemo(
    () => humanSeat ? getAvalonPlayerKnowledge(assignments, humanSeat.id) : null,
    [assignments, humanSeat]
  );
  const currentLeader = seats[leaderIndex] ?? null;
  const discussionOrder = useMemo(
    () => seats.map((_, offset) => seats[(leaderIndex + offset) % seats.length]!).filter(Boolean),
    [leaderIndex, seats]
  );
  const evilSeats = useMemo(
    () => seats.filter((seat) => seat.faction === 'evil'),
    [seats]
  );
  const seatNumberById = useMemo(
    () => Object.fromEntries(seats.map((seat, index) => [seat.id, index + 1])),
    [seats]
  );
  const seatNameById = useMemo(
    () => Object.fromEntries(seats.map((seat) => [seat.id, seat.name])),
    [seats]
  );
  seatNameByIdRef.current = seatNameById;
  const currentDiscussionSeat = phase === 'discussion'
    ? discussionOrder[discussionIndex] ?? null
    : null;
  const currentEvilDiscussionSeat = phase === 'evilDiscussion'
    ? evilSeats[evilDiscussionIndex % Math.max(evilSeats.length, 1)] ?? null
    : null;
  const questRule = AVALON_10_PLAYER_QUESTS[questNumber - 1]!;
  const goodScore = questResults.filter((result) => result.succeeded).length;
  const evilScore = questResults.filter((result) => !result.succeeded).length;
  const humanOnTeam = humanSeat ? teamIds.includes(humanSeat.id) : false;
  const humanIsEvil = humanSeat?.faction === 'evil';
  const t = avalonCopy[lang];

  const modelActorForSeat = useCallback((seat: AvalonSeat) => {
    const difficulty = seat.character?.difficulty ?? config.aiDifficulty;
    return {
      id: seat.id,
      name: seat.name,
      personality: seat.character
        ? characterPersonalityForUi(seat.character, lang)
        : '',
      personalityDescription: seat.character
        ? characterDescriptionForUi(seat.character, lang)
        : undefined,
      difficulty,
      modelRef: modelRefMapRef.current.get(seat.id) ?? modelRefForDifficulty(difficulty),
    };
  }, [config.aiDifficulty, lang]);

  latestModelPublicStateRef.current = {
    questNumber,
    rejectionTrack,
    goodQuestWins: goodScore,
    evilQuestWins: evilScore,
    currentLeader: currentLeader ? { id: currentLeader.id, name: currentLeader.name } : undefined,
    proposedTeam: teamIds.map((id) => ({
      id,
      name: seats.find((seat) => seat.id === id)?.name ?? id,
    })),
    proposalHistory: eventRecords
      .filter((record): record is Extract<AvalonEventRecord, { kind: 'team' }> => record.kind === 'team')
      .map((record) => ({
        questNumber: record.questNumber,
        attempt: record.attempt,
        leaderName: record.leaderName,
        teamNames: record.teamNames,
        approved: record.approved,
        approveVotes: record.approveVotes,
        rejectVotes: record.rejectVotes,
        votes: record.votes,
      })),
    missionHistory: eventRecords
      .filter((record): record is Extract<AvalonEventRecord, { kind: 'mission' }> => record.kind === 'mission')
      .map((record) => ({
        questNumber: record.questNumber,
        teamNames: record.teamNames,
        succeeded: record.succeeded,
        byFiveRejections: record.byFiveRejections,
      })),
    questResults: questResults.map(({ questNumber, succeeded }) => ({ questNumber, succeeded })),
    recentPublicLog: logs.map((row) => row.text),
  };

  const currentModelPublicState = useCallback(
    () => latestModelPublicStateRef.current!,
    []
  );

  const beginAsyncDecision = useCallback((): number | null => {
    if (decisionPendingRef.current) return null;
    decisionPendingRef.current = true;
    setDecisionPending(true);
    return ++asyncDecisionRunRef.current;
  }, []);

  const cancelAsyncDecision = useCallback((runId: number) => {
    if (asyncDecisionRunRef.current !== runId) return;
    decisionPendingRef.current = false;
    setDecisionPending(false);
  }, []);

  const showHumanSticker = useCallback((stickerId: RoomStickerId) => {
    if (stickerTimerRef.current) clearTimeout(stickerTimerRef.current);
    setHumanSticker(stickerId);
    stickerTimerRef.current = setTimeout(() => {
      setHumanSticker(null);
      stickerTimerRef.current = null;
    }, 2200);
  }, []);

  useEffect(() => () => {
    if (stickerTimerRef.current) clearTimeout(stickerTimerRef.current);
  }, []);

  useEffect(() => {
    if (!ready || !roleConfirmed || !matchStarted || phase !== 'night') return;
    if (nightLoggedStepRef.current !== nightStep) {
      nightLoggedStepRef.current = nightStep;
      appendLog(t.nightCommands[nightStep]);
    }

    const delayMs = nightStep >= 1 && nightStep <= 3 ? 5000 : 1800;
    let cancelled = false;
    const delay = new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    void Promise.all([
      playAvalonOpeningCue(nightStep as AvalonOpeningCueStep, lang),
      delay,
    ]).then(() => {
      if (cancelled) return;
      if (nightStep < 4) {
        setNightStep((step) => (step + 1) as AvalonNightStep);
        return;
      }
      setDiscussionIndex(0);
      setPhase('proposal');
    });
    return () => {
      cancelled = true;
      void stopAvalonOpeningCue();
    };
  }, [appendLog, lang, matchStarted, nightStep, phase, ready, roleConfirmed, t.nightCommands]);

  const seedFor = useCallback(
    (label: string) => createAvalonSeededRng(`${config.matchNonce}:${restartKey}:${label}`),
    [config.matchNonce, restartKey]
  );

  const advanceDiscussionTurn = useCallback(() => {
    setActiveSpeech(null);
    const isLast = discussionIndex >= discussionOrder.length - 1;
    if (isLast) {
      setDiscussionIndex(0);
      if (discussionPurpose === 'beforeTeamVote') {
        setPhase('teamVote');
        return;
      }
      setLeaderIndex((index) => (index + 1) % seats.length);
      setQuestNumber((number) => Math.min(5, number + 1) as AvalonQuestNumber);
      setRejectionTrack(0);
      setTeamIds([]);
      setProposalVotes(null);
      setProposalResolution(null);
      setMissionResolution(null);
      setPhase('proposal');
    } else {
      setDiscussionIndex((index) => index + 1);
    }
  }, [discussionIndex, discussionOrder.length, discussionPurpose, seats.length]);

  const endEvilDiscussion = useCallback(() => {
    if (!evilDiscussionActiveRef.current) return;
    evilDiscussionActiveRef.current = false;
    setActiveSpeech(null);
    setThinkingSeatId(null);
    appendLog(t.evilDiscussionEnd);
    setPhase('assassination');
  }, [appendLog, t]);
  endEvilDiscussionRef.current = endEvilDiscussion;

  const advanceEvilDiscussionTurn = useCallback(() => {
    if (!evilDiscussionActiveRef.current) return;
    setActiveSpeech(null);
    setEvilDiscussionIndex((index) => index + 1);
  }, []);

  const finishEvilDiscussionTurn = useCallback((text?: string) => {
    if (!currentEvilDiscussionSeat || phase !== 'evilDiscussion') return;
    const spoken = text?.trim();
    if (!spoken) {
      advanceEvilDiscussionTurn();
      return;
    }
    void (async () => {
      await deliverAvalonSeatSpeech(
        currentEvilDiscussionSeat.id,
        currentEvilDiscussionSeat.name,
        spoken
      );
      advanceEvilDiscussionTurn();
    })();
  }, [advanceEvilDiscussionTurn, currentEvilDiscussionSeat, deliverAvalonSeatSpeech, phase]);

  const finishDiscussionTurn = useCallback((text?: string) => {
    if (!currentDiscussionSeat) return;
    const spoken = text?.trim();
    if (!spoken) {
      setActiveSpeech(null);
      setTimeout(advanceDiscussionTurn, 120);
      return;
    }
    void (async () => {
      await deliverAvalonSeatSpeech(
        currentDiscussionSeat.id,
        currentDiscussionSeat.name,
        spoken
      );
      advanceDiscussionTurn();
    })();
  }, [advanceDiscussionTurn, currentDiscussionSeat, deliverAvalonSeatSpeech]);

  useEffect(() => {
    setThinkingSeatId(null);
  }, [currentDiscussionSeat?.id, currentEvilDiscussionSeat?.id, phase]);

  useEffect(() => {
    if (phase !== 'evilDiscussion') {
      evilDiscussionActiveRef.current = false;
      return;
    }
    evilDiscussionActiveRef.current = true;
    if (evilDiscussionSkipResetRef.current) {
      evilDiscussionSkipResetRef.current = false;
    } else {
      setEvilDiscussionSecondsLeft(EVIL_DISCUSSION_DURATION_SEC);
      setEvilDiscussionIndex(0);
    }
    const interval = setInterval(() => {
      setEvilDiscussionSecondsLeft((previous) => {
        if (previous <= 1) {
          clearInterval(interval);
          endEvilDiscussionRef.current();
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => {
      clearInterval(interval);
      evilDiscussionActiveRef.current = false;
    };
  }, [phase]);

  useEffect(() => {
    if (!ready || !roleConfirmed || phase !== 'evilDiscussion' || !currentEvilDiscussionSeat || currentEvilDiscussionSeat.isHuman) return;
    if (evilSeats.length === 0) return;
    if (restoredSkipAutoRef.current.has('evilDiscussion')) {
      restoredSkipAutoRef.current.delete('evilDiscussion');
      return;
    }
    const turnKey = `evil:${evilDiscussionIndex}:${currentEvilDiscussionSeat.id}`;
    if (seatSpeechPendingRef.current === turnKey) return;
    seatSpeechPendingRef.current = turnKey;

    const seat = currentEvilDiscussionSeat;
    const abortGen = seatSpeechAbortRef.current;
    const leaderName = currentLeader?.name ?? seat.name;

    enqueueAvalonSeatSpeech(async () => {
      await runAvalonAiSeatSpeech({
        seatId: seat.id,
        seatName: seat.name,
        abortGen,
        voice: avalonAiVoiceProfile(seat, lang),
        isActive: () => phaseRef.current === 'evilDiscussion' && evilDiscussionActiveRef.current,
        request: () =>
          requestAvalonSpeech({
            actor: modelActorForSeat(seat),
            knowledge: getAvalonPlayerKnowledge(assignments, seat.id),
            state: currentModelPublicState(),
            lang,
            purpose: 'evilDiscussion',
            leaderName,
            playerNamesById: seatNameByIdRef.current,
            speechTurnOrder: {
              order: evilSeats.map((evilSeat) => ({
                name: evilSeat.name,
                seatNumber: seatNumberById[evilSeat.id]!,
              })),
              currentIndex: evilDiscussionIndex % Math.max(evilSeats.length, 1),
              mode: 'cycle',
            },
          }),
        advance: advanceEvilDiscussionTurn,
      });
      seatSpeechPendingRef.current = null;
    });
  }, [
    advanceEvilDiscussionTurn,
    assignments,
    currentEvilDiscussionSeat?.id,
    currentLeader?.name,
    enqueueAvalonSeatSpeech,
    evilDiscussionIndex,
    evilSeats,
    lang,
    modelActorForSeat,
    phase,
    ready,
    roleConfirmed,
    runAvalonAiSeatSpeech,
    seatNumberById,
  ]);

  useEffect(() => {
    if (!ready || !roleConfirmed || phase !== 'discussion' || !currentDiscussionSeat || !currentLeader || currentDiscussionSeat.isHuman) return;
    if (restoredSkipAutoRef.current.has('discussion')) {
      restoredSkipAutoRef.current.delete('discussion');
      return;
    }
    const turnKey = `disc:${discussionIndex}:${currentDiscussionSeat.id}:${discussionPurpose}`;
    if (seatSpeechPendingRef.current === turnKey) return;
    seatSpeechPendingRef.current = turnKey;

    const seat = currentDiscussionSeat;
    const abortGen = seatSpeechAbortRef.current;
    const purpose = discussionPurpose;
    const leaderName = currentLeader.name;

    enqueueAvalonSeatSpeech(async () => {
      await runAvalonAiSeatSpeech({
        seatId: seat.id,
        seatName: seat.name,
        abortGen,
        voice: avalonAiVoiceProfile(seat, lang),
        isActive: () => phaseRef.current === 'discussion',
        request: () =>
          requestAvalonSpeech({
            actor: modelActorForSeat(seat),
            knowledge: getAvalonPlayerKnowledge(assignments, seat.id),
            state: currentModelPublicState(),
            lang,
            purpose,
            leaderName,
            playerNamesById: seatNameByIdRef.current,
            speechTurnOrder: {
              order: discussionOrder.map((discussionSeat) => ({
                name: discussionSeat.name,
                seatNumber: seatNumberById[discussionSeat.id]!,
              })),
              currentIndex: discussionIndex,
              mode: 'once',
            },
          }),
        advance: advanceDiscussionTurn,
      });
      seatSpeechPendingRef.current = null;
    });
  }, [
    advanceDiscussionTurn,
    assignments,
    currentDiscussionSeat?.id,
    currentLeader?.id,
    discussionIndex,
    discussionOrder,
    discussionPurpose,
    enqueueAvalonSeatSpeech,
    lang,
    modelActorForSeat,
    phase,
    ready,
    roleConfirmed,
    runAvalonAiSeatSpeech,
    seatNumberById,
  ]);

  useEffect(() => {
    if (!ready || !roleConfirmed || phase !== 'proposal' || !currentLeader || currentLeader.isHuman) return;
    if (restoredSkipAutoRef.current.has('proposal')) {
      restoredSkipAutoRef.current.delete('proposal');
      return;
    }
    let cancelled = false;
    void (async () => {
      setThinkingSeatId(currentLeader.id);
      const knowledge = getAvalonPlayerKnowledge(assignments, currentLeader.id);
      const fallbackDecision = selectAvalonTeam({
        questNumber,
        candidateIds: seats.map((seat) => seat.id),
        knowledge,
        suspicionByPlayerId: suspicion,
        style: aiStyleForSeat(currentLeader, config.aiDifficulty),
        rng: seedFor(`team:${questNumber}:${rejectionTrack}:${currentLeader.id}`),
      });
      const modelTeam = await requestAvalonTeam({
        actor: modelActorForSeat(currentLeader),
        knowledge,
        state: currentModelPublicState(),
        lang,
        candidates: seats.map((seat) => ({ id: seat.id, name: seat.name })),
        teamSize: questRule.teamSize,
      });
      if (cancelled) return;
      setThinkingSeatId(null);
      const nextTeam = [...(modelTeam ?? fallbackDecision.teamIds)];
      setTeamIds(nextTeam);
      const names = nextTeam.map((id) => seats.find((seat) => seat.id === id)?.name ?? id).join(lang === 'zh' ? '、' : ', ');
      appendLog(t.aiProposed(currentLeader.name, names, rejectionTrack + 1));
      setDiscussionPurpose('beforeTeamVote');
      setDiscussionIndex(0);
      appendLog(t.discussionPrompt);
      setPhase('discussion');
    })();
    return () => {
      cancelled = true;
    };
  }, [appendLog, assignments, config.aiDifficulty, currentLeader, currentModelPublicState, lang, modelActorForSeat, phase, questNumber, questRule.teamSize, ready, rejectionTrack, roleConfirmed, seats, seedFor, suspicion, t]);

  const leaveGame = useCallback(() => {
    promptExitGameWithConfirm(navigation, lang, allowGameExitRef, clearGameSession);
  }, [lang, navigation]);

  const leaveEndedGame = useCallback(() => {
    allowGameExitRef.current = true;
    clearGameSession();
    exitToHome(navigation);
  }, [navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener(
      'beforeRemove',
      (event: { preventDefault: () => void }) => {
        if (allowGameExitRef.current) return;
        event.preventDefault();
        leaveGame();
      }
    );
    return unsubscribe;
  }, [leaveGame, navigation]);

  const toggleTeamSeat = (playerId: string) => {
    if (phase !== 'proposal' || !currentLeader?.isHuman || !roleConfirmed) return;
    setTeamIds((previous) => {
      if (previous.includes(playerId)) return previous.filter((id) => id !== playerId);
      if (previous.length >= questRule.teamSize) return previous;
      return [...previous, playerId];
    });
  };

  const confirmHumanTeam = () => {
    if (!currentLeader?.isHuman || teamIds.length !== questRule.teamSize) return;
    const names = teamIds.map((id) => seats.find((seat) => seat.id === id)?.name ?? id).join(lang === 'zh' ? '、' : ', ');
    appendLog(t.aiProposed(currentLeader.name, names, rejectionTrack + 1));
    setDiscussionPurpose('beforeTeamVote');
    setDiscussionIndex(0);
    appendLog(t.discussionPrompt);
    setPhase('discussion');
  };

  const resolveProposalVotes = async (humanVote?: AvalonProposalVote) => {
    if (phase !== 'teamVote' || !humanSeat || !currentLeader || teamIds.length !== questRule.teamSize) return;
    const humanIsLeader = currentLeader.id === humanSeat.id;
    if (!humanIsLeader && humanVote == null) return;
    const runId = beginAsyncDecision();
    if (runId === null) return;
    try {
      const votingSeats = seats.filter((seat) => seat.id !== currentLeader.id);
      const voteEntries = await Promise.all(votingSeats.map(async (seat): Promise<[string, AvalonProposalVote]> => {
        if (seat.isHuman) return [seat.id, humanVote!];
        const knowledge = getAvalonPlayerKnowledge(assignments, seat.id);
        const fallbackVote = decideAvalonProposalVote({
          questNumber,
          teamIds,
          knowledge,
          rejectionTrack,
          suspicionByPlayerId: suspicion,
          style: aiStyleForSeat(seat, config.aiDifficulty),
          rng: seedFor(`proposal-vote:${questNumber}:${rejectionTrack}:${seat.id}`),
        }).vote;
        const modelVote = await requestAvalonProposalVote({
          actor: modelActorForSeat(seat),
          knowledge,
          state: currentModelPublicState(),
          lang,
          playerNamesById: seatNameByIdRef.current,
        });
        return [
          seat.id,
          resolveAvalonSeatProposalVote(rejectionTrack, knowledge, modelVote, fallbackVote),
        ];
      }));
      if (asyncDecisionRunRef.current !== runId) return;
      const voteById = {
        [currentLeader.id]: 'approve' as const,
        ...Object.fromEntries(voteEntries),
      } as Record<string, AvalonProposalVote>;
      const resolution = resolveAvalonProposalVotes(
        voteById,
        seats.map((seat) => seat.id),
        currentLeader.id,
        rejectionTrack
      );
      setProposalVotes(voteById);
      setProposalResolution(resolution);
      setRejectionTrack(resolution.rejectionTrackAfter);
      const voteRecords = seats.map((seat) => ({
        playerName: seat.name,
        vote: voteById[seat.id]!,
        autoApprove: seat.id === currentLeader.id,
      }));
      setEventRecords((previous) => [
        ...previous,
        {
          id: `team-${questNumber}-${rejectionTrack + 1}-${previous.length}`,
          kind: 'team',
          questNumber,
          attempt: rejectionTrack + 1,
          approved: resolution.approved,
          approveVotes: resolution.approveVotes,
          rejectVotes: resolution.rejectVotes,
          leaderName: currentLeader.name,
          teamNames: teamIds
            .map((id) => seats.find((seat) => seat.id === id)?.name ?? id)
            .join(lang === 'zh' ? '、' : ', '),
          votes: voteRecords,
        },
      ]);
      appendLog(`${t.approveCount(resolution.approveVotes, resolution.rejectVotes)} · ${resolution.approved ? t.proposalPassed : t.proposalRejected}`);
      if (resolution.evilWinsByFiveRejections) {
        const rejectedQuest: AvalonQuestResolution = {
          questNumber,
          succeeded: false,
          successVotes: 0,
          failVotes: 0,
          failVotesRequired: questRule.failVotesRequired,
        };
        const nextResults = [...questResults, rejectedQuest];
        const nextGoodScore = nextResults.filter((result) => result.succeeded).length;
        const nextEvilScore = nextResults.filter((result) => !result.succeeded).length;
        setQuestResults(nextResults);
        setEventRecords((previous) => [
          ...previous,
          {
            id: `mission-rejections-${questNumber}-${previous.length}`,
            kind: 'mission',
            questNumber,
            succeeded: false,
            failVotes: 0,
            teamNames: teamIds
              .map((id) => seats.find((seat) => seat.id === id)?.name ?? id)
              .join(lang === 'zh' ? '、' : ', '),
            byFiveRejections: true,
          },
        ]);
        appendLog(t.fiveRejectionsMissionFail);
        if (nextEvilScore >= 3) {
          setEndState({ winner: 'evil', reason: 'three_failed_quests' });
          appendLog(t.threeFails);
          setPhase('ended');
          setEndVisible(true);
          void playVictoryCue('avalonEvil', lang);
          return;
        }
        if (nextGoodScore >= 3) {
          appendLog(t.enterAssassinationPhase);
          appendLog(t.evilDiscussionStart);
          setTeamIds([]);
          setProposalVotes(null);
          setProposalResolution(null);
          setPhase('evilDiscussion');
          return;
        }
      }
      setPhase('teamVoteResult');
    } finally {
      if (asyncDecisionRunRef.current === runId) {
        decisionPendingRef.current = false;
        setDecisionPending(false);
      }
    }
  };

  const castProposalVote = async (humanVote: AvalonProposalVote) => {
    await resolveProposalVotes(humanVote);
  };

  useEffect(() => {
    if (phase !== 'teamVote' || !currentLeader?.isHuman || decisionPending) return;
    if (restoredSkipAutoRef.current.has('teamVoteLeader')) {
      restoredSkipAutoRef.current.delete('teamVoteLeader');
      return;
    }
    const timer = setTimeout(() => {
      void resolveProposalVotes();
    }, 450);
    return () => clearTimeout(timer);
  }, [currentLeader?.id, currentLeader?.isHuman, decisionPending, phase, questNumber, rejectionTrack, teamIds.length]);

  const continueAfterProposal = () => {
    if (!proposalResolution) return;
    if (proposalResolution.approved) {
      setPhase('missionVote');
      return;
    }
    if (proposalResolution.evilWinsByFiveRejections) {
      setTeamIds([]);
      setProposalVotes(null);
      setProposalResolution(null);
      setDiscussionIndex(0);
      setDiscussionPurpose('afterMission');
      appendLog(
        lang === 'zh'
          ? '任务结果已公布。现在全员根据本轮队伍与结果进行复盘发言。'
          : 'The quest result is public. Everyone now discusses the team and outcome.'
      );
      setPhase('discussion');
      return;
    }
    setLeaderIndex((index) => (index + 1) % seats.length);
    setTeamIds([]);
    setProposalVotes(null);
    setProposalResolution(null);
    setPhase('proposal');
  };

  const resolveMission = async (humanVote?: AvalonMissionVote) => {
    if (phase !== 'missionVote' || !humanSeat) return;
    if (humanOnTeam && !humanVote) return;
    const runId = beginAsyncDecision();
    if (runId === null) return;
    const missionVotes = await Promise.all(teamIds.map(async (playerId): Promise<AvalonMissionVote> => {
      const seat = seats.find((entry) => entry.id === playerId)!;
      if (seat.isHuman) return humanVote ?? 'success';
      const knowledge = getAvalonPlayerKnowledge(assignments, seat.id);
      const fallbackVote = decideAvalonMissionVote({
        questNumber,
        teamIds,
        knowledge,
        goodQuestWins: goodScore,
        evilQuestWins: evilScore,
        style: aiStyleForSeat(seat, config.aiDifficulty),
        rng: seedFor(`mission:${questNumber}:${seat.id}`),
      }).vote;
      const modelVote = await requestAvalonMissionVote({
        actor: modelActorForSeat(seat),
        knowledge,
        state: currentModelPublicState(),
        lang,
      });
      return modelVote ?? fallbackVote;
    }));
    if (asyncDecisionRunRef.current !== runId) return;
    const resolution = resolveAvalonMissionVotes(questNumber, missionVotes);
    const nextResults = [...questResults, resolution];
    setQuestResults(nextResults);
    setMissionResolution(resolution);
    setEventRecords((previous) => [
      ...previous,
      {
        id: `mission-${questNumber}-${previous.length}`,
        kind: 'mission',
        questNumber,
        succeeded: resolution.succeeded,
        failVotes: resolution.failVotes,
        teamNames: teamIds
          .map((id) => seats.find((seat) => seat.id === id)?.name ?? id)
          .join(lang === 'zh' ? '、' : ', '),
      },
    ]);
    setSuspicion((previous) => {
      const next = { ...previous };
      for (const playerId of teamIds) {
        const current = next[playerId] ?? 0.5;
        next[playerId] = resolution.succeeded
          ? Math.max(0.05, current - 0.08)
          : Math.min(0.95, current + 0.14 + resolution.failVotes * 0.04);
      }
      return next;
    });
    appendLog(
      resolution.succeeded ? t.missionOutcomeSuccess : t.missionOutcomeFail
    );
    const nextGood = nextResults.filter((result) => result.succeeded).length;
    const nextEvil = nextResults.filter((result) => !result.succeeded).length;
    if (nextEvil >= 3) {
      setEndState({ winner: 'evil', reason: 'three_failed_quests' });
      appendLog(t.threeFails);
      setPhase('ended');
      setEndVisible(true);
      void playVictoryCue('avalonEvil', lang);
      return;
    }
    setRejectionTrack(0);
    setDiscussionIndex(0);
    if (nextGood >= 3) {
      appendLog(t.enterAssassinationPhase);
      appendLog(t.evilDiscussionStart);
      setPhase('evilDiscussion');
      return;
    }
    appendLog(
      lang === 'zh'
        ? '任务结果已公布。现在全员根据本轮队伍与结果进行复盘发言。'
        : 'The quest result is public. Everyone now discusses the team and outcome.'
    );
    setDiscussionPurpose('afterMission');
    setPhase('discussion');
  };

  useEffect(() => {
    if (phase !== 'missionVote' || humanOnTeam || decisionPending) return;
    if (restoredSkipAutoRef.current.has('missionVote')) {
      restoredSkipAutoRef.current.delete('missionVote');
      return;
    }
    const timer = setTimeout(() => {
      void resolveMission();
    }, 450);
    return () => clearTimeout(timer);
  }, [decisionPending, humanOnTeam, phase]);

  const assassinSeat = seats.find((seat) => seat.role === 'assassin') ?? null;
  const assassinationCandidates = useMemo(() => {
    if (!assassinSeat) return [] as string[];
    const knowledge = getAvalonPlayerKnowledge(assignments, assassinSeat.id);
    return seats
      .map((seat) => seat.id)
      .filter((id) => id !== assassinSeat.id && !knowledge.evilTeammateIds.includes(id));
  }, [assignments, assassinSeat, seats]);

  const finishAssassination = (targetId: string) => {
    const target = seats.find((seat) => seat.id === targetId);
    const merlin = seats.find((seat) => seat.role === 'merlin');
    if (!target || !merlin) return;
    const hit = target.role === 'merlin';
    const targetNumber = seatNumberById[targetId] ?? 0;
    setAssassinationTargetId(targetId);
    setEndState({
      winner: hit ? 'evil' : 'good',
      reason: hit ? 'merlin_assassinated' : 'merlin_survived',
      assassinationTargetId: targetId,
    });
    appendLog(t.assassinationPick(targetNumber, target.name));
    appendLog(t.assassinationReveal(targetNumber, target.name, roleName(target.role, lang), hit));
    setPhase('ended');
    setEndVisible(true);
    void playVictoryCue(hit ? 'avalonEvil' : 'good', lang);
  };

  const executeAssassination = async () => {
    if (!assassinSeat) return;
    const runId = beginAsyncDecision();
    if (runId === null) return;
    if (assassinSeat.isHuman) {
      if (assassinationTargetId) finishAssassination(assassinationTargetId);
      else cancelAsyncDecision(runId);
      return;
    }
    setThinkingSeatId(assassinSeat.id);
    const knowledge = getAvalonPlayerKnowledge(assignments, assassinSeat.id);
    const likelihood = Object.fromEntries(
      seats.map((seat) => [seat.id, Math.max(0.05, 1 - (suspicion[seat.id] ?? 0.5))])
    );
    const decision = chooseAvalonAssassinationTarget({
      candidateIds: assassinationCandidates,
      knowledge,
      merlinLikelihoodByPlayerId: likelihood,
      suspicionByPlayerId: suspicion,
      style: aiStyleForSeat(assassinSeat, config.aiDifficulty),
      rng: seedFor(`assassination:${assassinSeat.id}`),
    });
    const modelTarget = await requestAvalonAssassinationTarget({
      actor: modelActorForSeat(assassinSeat),
      knowledge,
      state: currentModelPublicState(),
      lang,
      candidates: assassinationCandidates.map((id) => ({
        id,
        name: seats.find((seat) => seat.id === id)?.name ?? id,
      })),
    });
    if (asyncDecisionRunRef.current !== runId) return;
    setThinkingSeatId(null);
    finishAssassination(modelTarget ?? decision.targetId);
  };

  useEffect(() => {
    if (phase !== 'assassination' || !assassinSeat || assassinSeat.isHuman || decisionPending) return;
    if (restoredSkipAutoRef.current.has('assassination')) {
      restoredSkipAutoRef.current.delete('assassination');
      return;
    }
    const timer = setTimeout(() => {
      void executeAssassination();
    }, 450);
    return () => clearTimeout(timer);
  }, [assassinSeat, decisionPending, phase]);

  const seatAvatar = (seat: AvalonSeat): ImageSourcePropType =>
    seat.isHuman
      ? getPlayerGridAvatar(seat.id, humanAvatarIndex)
      : getCharacterPickerPortraitById(seat.id);

  const seatPositions = useMemo(
    () => avalonRingPositions(seats.length, tableLayout.width, tableLayout.height, compact),
    [compact, seats.length, tableLayout.height, tableLayout.width]
  );

  const nightEmojiForSeat = (seat: AvalonSeat): string | null => {
    if (!humanSeat || phase !== 'night' || !matchStarted) return null;
    if (nightStep === 2) {
      const shouldRaise = seat.faction === 'evil' && seat.role !== 'mordred';
      return shouldRaise && humanSeat.role === 'merlin' ? raisedHandEmoji(seat) : null;
    }
    if (nightStep === 3) {
      const shouldRaise = seat.role === 'merlin' || seat.role === 'morgana';
      return shouldRaise && humanSeat.role === 'percival' ? raisedHandEmoji(seat) : null;
    }
    return null;
  };

  const knowledgeEmojiForSeat = (seat: AvalonSeat): string | null => {
    if (!humanSeat || !roleConfirmed || !matchStarted) return null;
    const afterNightStep = (step: number) => phase !== 'night' || nightStep >= step;
    if (seat.id === humanSeat.id) {
      return humanSeat.role === 'mordred' && afterNightStep(1) ? '🦹' : null;
    }

    if (
      humanSeat.faction === 'evil' &&
      humanSeat.role !== 'oberon' &&
      afterNightStep(1) &&
      seat.faction === 'evil' &&
      seat.role !== 'oberon'
    ) {
      return seat.role === 'mordred' ? '🦹' : '😈';
    }
    if (
      humanSeat.role === 'merlin' &&
      afterNightStep(3) &&
      seat.faction === 'evil' &&
      seat.role !== 'mordred'
    ) {
      return '👁';
    }
    if (
      humanSeat.role === 'percival' &&
      afterNightStep(4) &&
      (seat.role === 'merlin' || seat.role === 'morgana')
    ) {
      return '🧙‍♂️';
    }
    return null;
  };

  const canSelectAssassination = phase === 'assassination' && assassinSeat?.isHuman === true;
  const handleSeatPress = (seat: AvalonSeat) => {
    if (phase === 'proposal' && currentLeader?.isHuman) {
      toggleTeamSeat(seat.id);
      return;
    }
    if (canSelectAssassination && assassinationCandidates.includes(seat.id)) {
      setAssassinationTargetId(seat.id);
    }
  };

  const endReasonText = useMemo(() => {
    if (!endState) return '';
    if (endState.reason === 'five_rejected_teams') return t.fiveRejects;
    if (endState.reason === 'three_failed_quests') return t.threeFails;
    const target = seats.find((seat) => seat.id === endState.assassinationTargetId);
    const merlin = seats.find((seat) => seat.role === 'merlin');
    if (endState.reason === 'merlin_assassinated') return t.merlinHit(target?.name ?? '');
    return t.merlinSafe(target?.name ?? '', merlin?.name ?? '');
  }, [endState, seats, t]);

  useEffect(() => {
    if (!endState || !humanSeat) return;
    const runId = ++peerReviewsRunRef.current;
    const reviewers = seats.filter((seat) => !seat.isHuman);
    setPeerReviewCells(reviewers.map((reviewer) => ({
      key: `${humanSeat.id}|${reviewer.id}`,
      targetId: humanSeat.id,
      targetName: humanSeat.name,
      targetRole: ROLE_CARD_NAME[humanSeat.role],
      reviewerId: reviewer.id,
      reviewerName: reviewer.name,
      side: reviewer.faction === humanSeat.faction ? 'teammate' : 'opponent',
      status: 'pending',
      text: '',
    })));
    const revealedRoles = seats.map((seat) => ({
      name: seat.name,
      role: ROLE_CARD_NAME[seat.role],
      faction: seat.faction,
    }));
    void Promise.all(reviewers.map(async (reviewer) => {
      const review = await requestAvalonPeerReview({
        actor: modelActorForSeat(reviewer),
        knowledge: getAvalonPlayerKnowledge(assignments, reviewer.id),
        state: currentModelPublicState(),
        lang,
        targetName: humanSeat.name,
        targetRole: ROLE_CARD_NAME[humanSeat.role],
        targetFaction: humanSeat.faction,
        reviewerFaction: reviewer.faction,
        winner: endState.winner,
        revealedRoles,
      });
      if (peerReviewsRunRef.current !== runId) return;
      const fallback = lang === 'zh'
        ? `${humanSeat.name}这局的组队和发言我都记住了，下次还得继续观察。`
        : `I will remember ${humanSeat.name}'s teams and speeches next game.`;
      setPeerReviewCells((cells) => cells.map((cell) =>
        cell.reviewerId === reviewer.id
          ? { ...cell, status: 'ready', text: review ?? fallback }
          : cell
      ));
    }));
    return () => {
      if (peerReviewsRunRef.current === runId) peerReviewsRunRef.current += 1;
    };
  }, [assignments, currentModelPublicState, endState, humanSeat, lang, modelActorForSeat, seats]);

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

  const actionColumnParchmentImage = useMemo(() => {
    const height = actionParchmentLayout.height;
    const width = actionParchmentLayout.width;
    if (height <= 0) {
      return {
        style: { ...PIXEL_ART_SPRITE, width: 1, height: 1, opacity: 0 } as const,
        resizeMode: 'contain' as const,
      };
    }
    const aspect = GAME_ROOM_PARCHMENT_DESIGN_W / GAME_ROOM_PARCHMENT_DESIGN_H;
    const naturalWidth = height * aspect;
    const spanWidth = width > 0 ? actionColumnParchmentSpanW(width, height) : naturalWidth;
    return {
      style: {
        ...PIXEL_ART_SPRITE,
        position: 'absolute' as const,
        right: 0,
        top: 0,
        width: spanWidth,
        height,
      },
      resizeMode: spanWidth > naturalWidth + 0.5 ? ('stretch' as const) : ('contain' as const),
    };
  }, [actionParchmentLayout.height, actionParchmentLayout.width]);

  if (!ready || !humanSeat || !humanKnowledge || !currentLeader) {
    return (
      <View style={[styles.root, screenFillStyle, styles.loading]}>
        <View style={styles.gameScreenBackdropWrap} pointerEvents="none">
          <Image
            accessibilityIgnoresInvertColors
            source={GAME_ROOM_BACKGROUND_NIGHT}
            style={[PIXEL_ART_BACKGROUND_IMAGE, styles.gameScreenBackdrop, gameBackdropPanStyle]}
            resizeMode="contain"
          />
        </View>
        <View style={styles.roomBootOverlay} accessibilityLabel="Loading">
          <ActivityIndicator size="large" color={GOLD} />
        </View>
      </View>
    );
  }

  const humanRoleImage = humanSeat.role === 'loyal_servant'
    ? LOYAL_SERVANT_CARD_IMAGES[(humanSeat.roleArtVariant ?? 0) % LOYAL_SERVANT_CARD_IMAGES.length]
    : undefined;
  return (
    <View style={[styles.root, screenFillStyle]}>
      <StatusBar hidden />
      <View style={styles.gameScreenBackdropWrap} pointerEvents="none">
        <Image
          accessibilityIgnoresInvertColors
          source={phase === 'night' ? GAME_ROOM_BACKGROUND_NIGHT : GAME_ROOM_BACKGROUND_DAY}
          style={[PIXEL_ART_BACKGROUND_IMAGE, styles.gameScreenBackdrop, gameBackdropPanStyle]}
          resizeMode="contain"
        />
      </View>
      <SafeAreaView style={styles.safe}>
        <View style={[styles.main, compact && styles.mainCompact]}>
          <View style={styles.leftColumn}>
        <View style={[styles.header, compact && styles.headerCompact]}>
          <View style={styles.headerSideRail}>
            <TouchableOpacity
              style={styles.headerExit}
              onPress={leaveGame}
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t.leave}
            >
              <ChevronLeft color="#ffffff" size={26} />
            </TouchableOpacity>
            <View style={[styles.phaseStatusPill, styles.headerStatusBadge]}>
              {phase === 'night' && matchStarted ? (
                <Moon size={18} color={SDV.ink} />
              ) : (
                <Sun size={18} color={SDV.ink} />
              )}
              <Text style={styles.headerStatusText}>
                {avalonPhaseStatus(phase, matchStarted, lang)}
              </Text>
            </View>
          </View>
          <View style={styles.scoreGroup}>
            <Text style={styles.scoreText} allowFontScaling={false}>
              SUCCESS {String(goodScore).padStart(2, '0')}
              {'   '}
              FAIL {String(evilScore).padStart(2, '0')}
            </Text>
          </View>
          <View style={[styles.headerSideRail, styles.headerSideRailEnd]}>
            <HubSettingsIconButton
              onPress={() => navigation.navigate('Settings')}
              accessibilityLabel={lang === 'zh' ? '设置' : 'Settings'}
            />
          </View>
        </View>

          <View style={styles.tableArea}>
            <View
              style={styles.seatGrid}
              onLayout={(event) => {
                const { width, height } = event.nativeEvent.layout;
                if (width > 0 && height > 0) setTableLayout({ width, height });
              }}
            >
              {seats.map((seat, index) => {
                const isLeader = seat.id === currentLeader.id;
                const onTeam = teamIds.includes(seat.id);
                const selectedAssassination = assassinationTargetId === seat.id && phase === 'assassination';
                const position = seatPositions[index] ?? { left: 0, top: 0 };
                const nightEmoji = nightEmojiForSeat(seat);
                const knowledgeEmoji = knowledgeEmojiForSeat(seat);
                const topEmoji = `${isLeader ? '👑' : ''}${nightEmoji ?? knowledgeEmoji ?? ''}`;
                const speaking = activeSpeech?.playerId === seat.id;
                const thinking = thinkingSeatId === seat.id;
                const stickerSource = seat.isHuman && humanSticker
                  ? resolveStickerSource(humanSticker)
                  : null;
                const selectable =
                  (phase === 'proposal' && currentLeader.isHuman) ||
                  (canSelectAssassination && assassinationCandidates.includes(seat.id));
                return (
                  <TouchableOpacity
                    key={seat.id}
                    activeOpacity={selectable ? 0.82 : 1}
                    onPress={() => handleSeatPress(seat)}
                    disabled={!selectable}
                    style={[
                      styles.seatCard,
                      compact && styles.seatCardCompact,
                      onTeam && styles.seatCardOnTeam,
                      selectedAssassination && styles.seatCardAssassination,
                      seat.isHuman && styles.seatCardHuman,
                      (speaking || thinking) && styles.seatCardSpeaking,
                      { left: position.left, top: position.top },
                    ]}
                  >
                    {speaking || thinking ? (
                      <View style={[styles.speechBubble, thinking && styles.thinkingBubble]} pointerEvents="none">
                        <Text style={styles.speechBubbleText}>
                          {thinking ? gameCopy[lang].aiThinking : activeSpeech?.text}
                        </Text>
                        <View style={styles.speechBubbleArrow} />
                      </View>
                    ) : null}
                    {stickerSource ? (
                      <View style={styles.seatStickerBubble} pointerEvents="none">
                        <Image
                          source={stickerSource}
                          style={[PIXEL_ART_SPRITE, styles.seatStickerImage]}
                          resizeMode="contain"
                        />
                      </View>
                    ) : null}
                    {onTeam ? (
                      <View style={styles.teamBadge}>
                        <Swords size={12} color="#fff7df" />
                      </View>
                    ) : null}
                    <View style={styles.portraitSlotWrap}>
                      <Text style={styles.topEmoji} pointerEvents="none">{topEmoji || ' '}</Text>
                      <View style={styles.seatNumberBadge} pointerEvents="none">
                        <View style={styles.seatNumberInset}>
                          <Text style={styles.seatNumberText}>{index + 1}</Text>
                        </View>
                      </View>
                      <View style={[styles.portraitWoodOuter, compact && styles.portraitWoodOuterCompact]}>
                        <View style={[styles.portraitGoldRing, compact && styles.portraitGoldRingCompact]}>
                          <View style={[styles.portraitFaceClip, compact && styles.portraitFaceClipCompact]}>
                            {seat.isHuman ? (
                              humanPixelAvatar ? (
                                <PixelAvatarSprite
                                  config={humanPixelAvatar}
                                  size={compact ? 28 : 36}
                                  transforms={humanPixelAvatarTransforms}
                                />
                              ) : (
                                <Image
                                  source={seatAvatar(seat)}
                                  style={[PIXEL_ART_SPRITE, styles.seatAvatar, compact && styles.seatAvatarCompact]}
                                  resizeMode="contain"
                                />
                              )
                            ) : (
                              <BodyPortraitImage
                                source={seatAvatar(seat)}
                                showStandGrass={false}
                                style={[styles.aiPortrait, compact && styles.aiPortraitCompact]}
                                resizeMode="contain"
                              />
                            )}
                          </View>
                        </View>
                      </View>
                    </View>
                    <Text style={[styles.seatName, compact && styles.seatNameCompact]} numberOfLines={1}>
                      {seat.name}{seat.isHuman ? ` · ${t.you}` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.tableFooter}>
              <View style={styles.rolePill}>
                <Sparkles size={13} color={GOLD} />
                <Text style={styles.rolePillText}>{roleName(humanSeat.role, lang)}</Text>
              </View>
              <View style={styles.rejectionPill}>
                <Text style={styles.rejectionLabel}>{t.attempt(rejectionTrack + 1)}</Text>
                <View style={styles.rejectionDots}>
                  {[0, 1, 2, 3, 4].map((dot) => (
                    <View key={dot} style={[styles.rejectionDot, dot < rejectionTrack && styles.rejectionDotOn]} />
                  ))}
                </View>
              </View>
            </View>
          </View>
          </View>

          <View
            style={[styles.sidePanel, compact && styles.sidePanelCompact]}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              if (width > 0 && height > 0) setActionParchmentLayout({ width, height });
            }}
          >
            <View style={styles.sidePanelParchmentWrap} pointerEvents="none">
              <Image
                source={GAME_ROOM_RIGHT_PARCHMENT}
                style={actionColumnParchmentImage.style}
                resizeMode={actionColumnParchmentImage.resizeMode}
                accessibilityIgnoresInvertColors
              />
            </View>
            <View style={[styles.sidePanelForeground, compact && styles.sidePanelForegroundCompact]}>
            <TouchableOpacity
              style={[styles.phaseStatusPill, styles.parchmentNotepadToggle]}
              activeOpacity={1}
              onPress={() => setPanelTab((tab) => (tab === 'notepad' ? 'chat' : 'notepad'))}
              accessibilityRole="button"
              accessibilityLabel={lang === 'zh' ? '记事本' : 'Notepad'}
            >
              <NotebookPen size={18} color={SDV.ink} strokeWidth={2.4} />
              <Text style={styles.phaseStatusPillText}>{lang === 'zh' ? '记事本' : 'Notepad'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.phaseStatusPill, styles.parchmentPanelToggle]}
              onPress={() => setPanelTab((tab) => (tab === 'chat' ? 'events' : 'chat'))}
              accessibilityRole="button"
              accessibilityLabel={panelTab === 'chat' ? (lang === 'zh' ? '事件' : 'Events') : (lang === 'zh' ? '聊天' : 'Chat')}
            >
              {panelTab === 'chat' ? (
                <ClipboardList size={18} color={SDV.ink} strokeWidth={2.4} />
              ) : (
                <MessageCircle size={18} color={SDV.ink} strokeWidth={2.4} />
              )}
              <Text style={styles.phaseStatusPillText}>
                {panelTab === 'chat' ? (lang === 'zh' ? '事件' : 'Events') : (lang === 'zh' ? '聊天' : 'Chat')}
              </Text>
            </TouchableOpacity>

            {panelTab === 'notepad' ? (
              <View style={styles.logBlock}>
                <GameRoomNotepadPanel
                  value={playerNotepad}
                  onChangeText={setPlayerNotepad}
                  placeholder={lang === 'zh' ? '记录你的判断…' : 'Write down your reads…'}
                  contentPaddingH={35}
                  contentPaddingTop={56}
                />
              </View>
            ) : panelTab === 'events' ? (
              <ScrollView style={styles.logBlock} contentContainerStyle={styles.eventContent} showsVerticalScrollIndicator={false}>
                <View style={styles.eventQuestTrack}>
                  {AVALON_10_PLAYER_QUESTS.map((rule, index) => {
                    const result = questResults[index];
                    const active = rule.questNumber === questNumber && phase !== 'ended';
                    return (
                      <View
                        key={rule.questNumber}
                        style={[
                          styles.eventQuestNode,
                          active && styles.questNodeActive,
                          result?.succeeded && styles.questNodeSuccess,
                          result && !result.succeeded && styles.questNodeFail,
                        ]}
                      >
                        <Text style={[styles.eventQuestNumber, result && styles.questNumberDone]}>{rule.questNumber}</Text>
                        <Text style={styles.eventQuestSize}>{t.questTeam(rule.teamSize)}</Text>
                        {rule.failVotesRequired === 2 ? <Text style={styles.eventTwoFail}>{t.twoFails}</Text> : null}
                      </View>
                    );
                  })}
                </View>
                <Text style={styles.eventHeading}>{lang === 'zh' ? '对局事件' : 'MATCH EVENTS'}</Text>
                {eventRecords.length === 0 ? (
                  <Text style={styles.eventEmpty}>{lang === 'zh' ? '尚无组队或任务记录。' : 'No team or quest events yet.'}</Text>
                ) : null}
                {eventRecords.map((record) => (
                  <View key={record.id} style={styles.eventRow}>
                    <View
                      style={[
                        styles.eventResultMark,
                        { backgroundColor: (record.kind === 'team' ? record.approved : record.succeeded) ? GOOD : EVIL },
                      ]}
                    />
                    <Text style={styles.eventText}>
                      {record.kind === 'team'
                        ? (lang === 'zh'
                          ? `第 ${record.questNumber} 轮 · 第 ${record.attempt} 次组队${record.approved ? '通过' : '未通过'}（${record.approveVotes}:${record.rejectVotes}）\n队长：${record.leaderName} · 队员：${record.teamNames}`
                          : `Quest ${record.questNumber} · Team ${record.attempt} ${record.approved ? 'approved' : 'rejected'} (${record.approveVotes}:${record.rejectVotes})\nLeader: ${record.leaderName} · Members: ${record.teamNames}`)
                        : (lang === 'zh'
                          ? (record.byFiveRejections
                            ? `第 ${record.questNumber} 轮任务失败 · 连续五次组队未通过`
                            : `第 ${record.questNumber} 轮任务${record.succeeded ? '成功' : '失败'}`)
                          : (record.byFiveRejections
                            ? `Quest ${record.questNumber} failed · five rejected teams`
                            : `Quest ${record.questNumber} ${record.succeeded ? 'succeeded' : 'failed'}`))}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.logBlock}>
                <ScrollView ref={logScrollRef} style={styles.logScroll} contentContainerStyle={styles.logContent} showsVerticalScrollIndicator={false}>
                  {logs.length === 0 ? (
                    <View style={styles.logItemModerator}>
                      <Text style={styles.logLine}>{systemLogPrefix(lang)}{t.roleReveal}</Text>
                    </View>
                  ) : null}
                  {logs.map((row, index) => (
                    <View
                      key={`${index}-${row.text}`}
                      style={[
                        styles.logRowContainer,
                        index === logs.length - 1 && styles.logRowContainerHighlight,
                      ]}
                    >
                      <View style={row.isSystem ? styles.logItemModerator : styles.logItemSpeech}>
                        <Text style={styles.logLine}>
                          {row.isSystem ? `${systemLogPrefix(lang)}${row.text}` : row.text}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.actionArea}>
              {matchStarted && phase !== 'ended' ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.stickerStrip}
                  contentContainerStyle={styles.stickerStripInner}
                  keyboardShouldPersistTaps="handled"
                >
                  {ROOM_STICKER_PACK.map(({ id, source }) => (
                    <TouchableOpacity
                      key={id}
                      style={styles.stickerChip}
                      onPress={() => showHumanSticker(id)}
                      accessibilityRole="button"
                      accessibilityLabel={id}
                    >
                      <Image
                        source={source}
                        style={[PIXEL_ART_SPRITE, styles.stickerChipImage]}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : null}

              {roleConfirmed && !matchStarted ? (
                <NightRpgPillButton
                  variant="wood"
                  label={
                    llmLinkStatus === 'pending'
                      ? gameCopy[lang].waitModelConnect
                      : llmLinkStatus === 'failed'
                        ? gameCopy[lang].retryModelConnect
                        : lang === 'zh'
                          ? '开始本局'
                          : 'Start game'
                  }
                  leftIcon={<Play size={21} color={GAME_ROOM_FOOTER_ICON_COLOR} strokeWidth={2.5} />}
                  style={styles.startMatchButton}
                  disabled={llmLinkStatus === 'pending'}
                  onPress={() => {
                    if (llmLinkStatus === 'failed') {
                      retryLlmProbe();
                      return;
                    }
                    if (llmLinkStatus !== 'ready') return;
                    nightLoggedStepRef.current = null;
                    setNightStep(0);
                    setMatchStarted(true);
                  }}
                />
              ) : null}

              {phase === 'proposal' && currentLeader.isHuman ? (
                <>
                  <Text style={styles.actionLead}>{t.selectTeam(teamIds.length, questRule.teamSize)}</Text>
                  <GameWoodButton
                    variant="text"
                    label={t.confirmTeam}
                    onPress={confirmHumanTeam}
                    disabled={teamIds.length !== questRule.teamSize}
                    style={styles.actionButton}
                  />
                </>
              ) : null}

              {phase === 'teamVote' ? (
                <>
                  <Text style={styles.actionLead}>{t.proposedTeam}</Text>
                  <Text style={styles.teamNames} numberOfLines={3}>
                    {teamIds.map((id) => seats.find((seat) => seat.id === id)?.name ?? id).join(lang === 'zh' ? '、' : ', ')}
                  </Text>
                  {currentLeader.isHuman ? (
                    <>
                      <Text style={styles.actionLead}>{t.leaderAutoApprove(currentLeader.name)}</Text>
                      <ActivityIndicator size="small" color={SDV.wood} />
                    </>
                  ) : (
                    <View style={styles.binaryActions}>
                      <GameWoodButton
                        variant="text"
                        label={t.approve}
                        leftIcon={<Check size={18} color="#e8c44a" strokeWidth={3} />}
                        style={styles.decisionButton}
                        onPress={() => castProposalVote('approve')}
                        disabled={decisionPending}
                      />
                      <GameWoodButton
                        variant="text"
                        label={t.reject}
                        leftIcon={<X size={18} color="#e8c44a" strokeWidth={3} />}
                        style={styles.decisionButton}
                        onPress={() => castProposalVote('reject')}
                        disabled={decisionPending}
                      />
                    </View>
                  )}
                </>
              ) : null}

              {phase === 'teamVoteResult' && proposalResolution ? (
                <>
                  <Text style={[styles.resultHeadline, { color: proposalResolution.approved ? GOOD : EVIL }]}>
                    {proposalResolution.evilWinsByFiveRejections
                      ? t.missionOutcomeFail
                      : proposalResolution.approved
                        ? t.proposalPassed
                        : t.proposalRejected}
                  </Text>
                  <Text style={styles.actionLead}>
                    {proposalResolution.evilWinsByFiveRejections
                      ? t.fiveRejectionsMissionFail
                      : t.approveCount(proposalResolution.approveVotes, proposalResolution.rejectVotes)}
                  </Text>
                  <GameWoodButton variant="text" label={t.continue} onPress={continueAfterProposal} style={styles.actionButton} />
                </>
              ) : null}

              {phase === 'missionVote' ? (
                <>
                  <Text style={styles.actionLead}>{t.waitingMission}</Text>
                  {humanOnTeam ? (
                    <View style={styles.missionActions}>
                      <GameWoodButton
                        variant="text"
                        label={t.playSuccess}
                        leftIcon={<ShieldCheck size={19} color="#e8c44a" />}
                        style={styles.decisionButton}
                        onPress={() => resolveMission('success')}
                        disabled={decisionPending}
                      />
                      {humanIsEvil ? (
                        <GameWoodButton
                          variant="text"
                          label={t.playFail}
                          leftIcon={<ShieldX size={19} color="#e8c44a" />}
                          style={styles.decisionButton}
                          onPress={() => resolveMission('fail')}
                          disabled={decisionPending}
                        />
                      ) : null}
                    </View>
                  ) : (
                    <ActivityIndicator size="small" color={SDV.wood} />
                  )}
                </>
              ) : null}

              {phase === 'evilDiscussion' ? (
                <>
                  <Text style={[styles.resultHeadline, { color: EVIL }]}>
                    {t.evilDiscussionTimer(formatCountdown(evilDiscussionSecondsLeft))}
                  </Text>
                  <Text style={styles.actionLead}>
                    {currentEvilDiscussionSeat?.isHuman
                      ? t.currentSpeaker(currentEvilDiscussionSeat.name)
                      : humanIsEvil
                        ? t.evilDiscussionWaiting
                        : t.evilDiscussionPrompt}
                  </Text>
                </>
              ) : null}

              {phase === 'assassination' ? (
                <>
                  <Text style={styles.assassinationLead}>{t.selectAssassination}</Text>
                  {assassinSeat?.isHuman ? (
                    <GameWoodButton
                      variant="text"
                      label={t.confirmAssassination}
                      onPress={executeAssassination}
                      disabled={!assassinationTargetId || decisionPending}
                      style={styles.actionButton}
                    />
                  ) : (
                    <ActivityIndicator size="small" color={SDV.wood} />
                  )}
                </>
              ) : null}
            </View>
            {matchStarted && phase === 'discussion' && currentDiscussionSeat?.isHuman ? (
              <HumanSpeechBar
                visible
                placeholder={t.speechPlaceholder}
                passLabel={t.pass}
                submitLabel={t.speak}
                onSubmit={(text) => finishDiscussionTurn(text)}
                onPass={() => finishDiscussionTurn()}
              />
            ) : null}
            {matchStarted && phase === 'evilDiscussion' && currentEvilDiscussionSeat?.isHuman ? (
              <HumanSpeechBar
                visible
                placeholder={t.speechPlaceholder}
                passLabel={t.pass}
                submitLabel={t.speak}
                onSubmit={(text) => finishEvilDiscussionTurn(text)}
                onPass={() => finishEvilDiscussionTurn()}
              />
            ) : null}
            </View>
          </View>
        </View>
      </SafeAreaView>

      <RoleIdentityCard
        visible={roleVisible}
        role={ROLE_CARD_NAME[humanSeat.role]}
        lang={lang}
        privateIntel=""
        imageSource={humanRoleImage}
        onConfirm={() => {
          setRoleVisible(false);
          setRoleConfirmed(true);
        }}
      />

      <Modal
        visible={endVisible && endState !== null}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        supportedOrientations={['landscape-left', 'landscape-right']}
        onRequestClose={leaveEndedGame}
      >
        <View style={styles.endBackdrop}>
          <View style={[styles.endPanel, compact && styles.endPanelCompact]}>
            <Text style={styles.endCardHeading}>{gameEpilogueCardUi[lang].title}</Text>
            <View style={[styles.endBanner, endState?.winner === 'good' ? styles.endBannerGood : styles.endBannerEvil]}>
              {endState?.winner === 'good' ? <ShieldCheck size={26} color="#fff" /> : <ShieldX size={26} color="#fff" />}
              <Text style={styles.endTitle}>{endState?.winner === 'good' ? t.goodVictory : t.evilVictory}</Text>
            </View>
            <Text style={styles.endReason}>{endReasonText}</Text>
            <Text style={styles.endRolesTitle}>{t.roles}</Text>
            <ScrollView style={styles.endRolesScroll} contentContainerStyle={styles.endRolesGrid} showsVerticalScrollIndicator={false}>
              {seats.map((seat) => (
                <View key={seat.id} style={[styles.endRoleRow, seat.faction === 'good' ? styles.endRoleGood : styles.endRoleEvil]}>
                  {seat.isHuman && humanPixelAvatar ? (
                    <PixelAvatarSprite
                      config={humanPixelAvatar}
                      size={28}
                      transforms={humanPixelAvatarTransforms}
                    />
                  ) : (
                    <Image source={seatAvatar(seat)} style={[PIXEL_ART_SPRITE, styles.endAvatar]} resizeMode="contain" />
                  )}
                  <View style={styles.endRoleCopy}>
                    <Text style={styles.endPlayerName} numberOfLines={1}>{seat.name}</Text>
                    <Text style={[styles.endRoleName, { color: seat.faction === 'good' ? GOOD : EVIL }]} numberOfLines={1}>
                      {roleName(seat.role, lang)}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={styles.endActions}>
              <GameWoodButton
                variant="text"
                tone="muted"
                label={gameCopy[lang].viewPeerReviews}
                onPress={() => {
                  setEndVisible(false);
                  setPeerReviewsVisible(true);
                }}
              />
              <GameWoodButton variant="text" tone="outline" label={t.returnHome} onPress={leaveEndedGame} />
              <GameWoodButton
                variant="text"
                label={t.playAgain}
                onPress={() => {
                  clearGameSession();
                  setEndVisible(false);
                  setRestartKey((key) => key + 1);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <GameEndPeerReviewsModal
        visible={peerReviewsVisible}
        lang={lang}
        cells={peerReviewCells}
        seatOrder={seats.map((seat) => seat.id)}
        onClose={() => {
          setPeerReviewsVisible(false);
          setEndVisible(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#101319' },
  loading: { alignItems: 'center', justifyContent: 'center' },
  roomBootOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 19, 25, 0.35)',
  },
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
  safe: { flex: 1 },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    position: 'relative',
  },
  headerCompact: { height: 45 },
  headerSideRail: {
    width: 136,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  headerSideRailEnd: { justifyContent: 'flex-end' },
  headerExit: { width: 36, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerStatusBadge: { marginLeft: 6, maxWidth: 200 },
  headerStatusText: {
    marginLeft: 6,
    fontWeight: '900',
    fontSize: 12,
    textTransform: 'uppercase',
    color: SDV.ink,
  },
  headerIcon: { width: 40, height: 40 },
  headerTitleBlock: { flex: 1, minWidth: 0 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  headerTitle: { color: '#fff5d8', fontSize: 20, fontWeight: '900', letterSpacing: 0 },
  headerTitleCompact: { fontSize: 16 },
  headerSubtitle: { color: 'rgba(255,245,216,0.72)', fontSize: 10, fontWeight: '700', marginTop: 2 },
  scoreGroup: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  scoreBadge: { minWidth: 48, height: 32, borderRadius: 6, borderWidth: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  scoreGood: { backgroundColor: GOOD_LIGHT, borderColor: GOOD },
  scoreEvil: { backgroundColor: EVIL_LIGHT, borderColor: EVIL },
  scoreText: {
    fontFamily: GAME_PIXEL_FONT_FAMILY,
    fontSize: 11,
    lineHeight: 16,
    color: '#ffffff',
    letterSpacing: 0,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  questTrack: {
    width: '66%',
    maxWidth: 760,
    alignSelf: 'center',
    height: 42,
    flexDirection: 'row',
    gap: 4,
    padding: 3,
    backgroundColor: 'rgba(20,19,22,0.74)',
    borderWidth: 2,
    borderColor: '#8d6d35',
    borderRadius: 7,
  },
  questTrackCompact: { width: '62%', height: 36, padding: 2, gap: 3 },
  questNode: { flex: 1, minWidth: 0, borderWidth: 2, borderColor: '#665c50', borderRadius: 6, backgroundColor: 'rgba(246,236,211,0.86)', alignItems: 'center', justifyContent: 'center', position: 'relative', paddingHorizontal: 3 },
  questNodeCompact: { borderWidth: 1 },
  questNodeActive: { borderColor: GOLD, backgroundColor: '#fff0bd' },
  questNodeSuccess: { borderColor: GOOD, backgroundColor: GOOD_LIGHT },
  questNodeFail: { borderColor: EVIL, backgroundColor: EVIL_LIGHT },
  questNumber: { color: INK, fontSize: 11, fontWeight: '900', lineHeight: 12 },
  questNumberDone: { fontSize: 10 },
  questSize: { color: SDV.inkMuted, fontSize: 6, lineHeight: 8, fontWeight: '800', textAlign: 'center' },
  twoFail: { color: EVIL, fontSize: 5, lineHeight: 6, fontWeight: '900', textAlign: 'center' },
  main: { flex: 1, flexDirection: 'row', gap: 0, minHeight: 0, alignItems: 'stretch' },
  mainCompact: { gap: 0 },
  leftColumn: {
    flexGrow: 5,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 200,
    minHeight: 0,
    paddingHorizontal: 12,
    paddingTop: 7,
    paddingBottom: 9,
  },
  tableArea: { flex: 1, minWidth: 0, justifyContent: 'space-between' },
  seatGrid: { flex: 1, minHeight: 0, position: 'relative', overflow: 'visible' },
  seatCard: {
    position: 'absolute',
    width: AVALON_SEAT_W,
    height: AVALON_SEAT_H,
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'visible',
  },
  seatCardCompact: { width: 62, height: 92 },
  seatCardOnTeam: {},
  seatCardAssassination: {},
  seatCardHuman: {},
  seatCardSpeaking: { zIndex: 1000, elevation: 20 },
  topEmoji: {
    position: 'absolute',
    top: -12,
    left: '50%',
    width: 48,
    marginLeft: -24,
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
    zIndex: 20,
    elevation: 5,
  },
  teamBadge: { position: 'absolute', top: 31, right: 0, zIndex: 30, width: 19, height: 19, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#8d6b25' },
  portraitSlotWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  seatNumberBadge: {
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
  seatNumberBadgeCompact: { minWidth: 22, height: 19, left: -1 },
  seatNumberInset: {
    flex: 1,
    alignSelf: 'stretch',
    width: '100%',
    borderRadius: 2,
    backgroundColor: '#3A2416',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatNumberText: { color: '#FFE09F', fontSize: 10, fontWeight: '900', marginTop: -1 },
  portraitWoodOuter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#6D4526',
    backgroundColor: '#523626',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  portraitWoodOuterCompact: { width: 56, height: 56, borderRadius: 28 },
  portraitGoldRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: '#C49A4A',
    backgroundColor: '#6D4526',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  portraitGoldRingCompact: { width: 49, height: 49, borderRadius: 25 },
  portraitFaceClip: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#e3c992',
  },
  portraitFaceClipCompact: { width: 44, height: 44, borderRadius: 22 },
  seatAvatar: { width: 56, height: 56 },
  seatAvatarCompact: { width: 44, height: 44 },
  aiPortrait: { width: 70, height: 84, alignSelf: 'center', marginTop: -3 },
  aiPortraitCompact: { width: 56, height: 67, marginTop: -2 },
  seatName: {
    color: '#E8C78B',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
    width: '100%',
    marginTop: -2,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  seatNameCompact: { fontSize: 7 },
  seatMetaRow: { height: 15, marginTop: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  speechBubble: {
    position: 'absolute',
    bottom: 102,
    left: '50%',
    width: 154,
    marginLeft: -77,
    minHeight: 34,
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: SDV.wood,
    backgroundColor: SDV.panel,
    zIndex: 1001,
    elevation: 22,
  },
  thinkingBubble: {
    width: 96,
    marginLeft: -48,
  },
  speechBubbleText: { color: SDV.ink, fontSize: 8, lineHeight: 11, fontWeight: '800', textAlign: 'center' },
  speechBubbleArrow: {
    position: 'absolute',
    bottom: -7,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderLeftColor: 'transparent',
    borderRightWidth: 6,
    borderRightColor: 'transparent',
    borderTopWidth: 7,
    borderTopColor: SDV.wood,
  },
  knowledgeTag: { height: 15, maxWidth: '94%', flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 4, borderRadius: 3, backgroundColor: '#ead59d' },
  knowledgeTagEvil: { backgroundColor: '#e8aaa8' },
  knowledgeTagText: { color: INK, fontSize: 7, fontWeight: '900' },
  voteMini: { width: 16, height: 16, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  voteMiniApprove: { backgroundColor: GOOD },
  voteMiniReject: { backgroundColor: EVIL },
  tableFooter: { minHeight: 38, marginTop: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  rolePill: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, backgroundColor: 'rgba(28,24,24,0.82)', borderWidth: 1, borderColor: GOLD, borderRadius: 5 },
  rolePillText: { color: '#fff1ca', fontSize: 10, fontWeight: '900' },
  rejectionPill: { minHeight: 32, alignSelf: 'flex-end', flexGrow: 0, flexShrink: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 10, backgroundColor: 'rgba(28,24,24,0.82)', borderRadius: 5 },
  rejectionLabel: { color: '#fff1ca', fontSize: 9, fontWeight: '800', textAlign: 'right', flexShrink: 0 },
  rejectionDots: { flexDirection: 'row', gap: 3 },
  rejectionDot: { width: 8, height: 8, borderRadius: 2, borderWidth: 1, borderColor: '#d6bc84', backgroundColor: 'transparent' },
  rejectionDotOn: { backgroundColor: EVIL, borderColor: '#ffb3a7' },
  sidePanel: {
    flexGrow: 3,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 250,
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  sidePanelCompact: { minWidth: 220 },
  sidePanelParchmentWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: 'hidden',
  },
  sidePanelForeground: {
    flex: 1,
    zIndex: 1,
    minHeight: 0,
    minWidth: 0,
    position: 'relative',
  },
  sidePanelForegroundCompact: {},
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
  parchmentNotepadToggle: {
    position: 'absolute',
    top: 10,
    left: 36,
    zIndex: 10,
  },
  parchmentPanelToggle: {
    position: 'absolute',
    top: 10,
    right: 36,
    zIndex: 10,
  },
  phaseHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 7, borderBottomWidth: 2, borderBottomColor: 'rgba(111,82,48,0.25)' },
  phaseIcon: { width: 30, height: 30, borderRadius: 5, borderWidth: 1, borderColor: '#b08b4f', backgroundColor: '#fff1c9', alignItems: 'center', justifyContent: 'center' },
  phaseHeadingCopy: { flex: 1, minWidth: 0 },
  phaseEyebrow: { color: SDV.inkMuted, fontSize: 8, fontWeight: '900' },
  phaseTitle: { color: INK, fontSize: 14, fontWeight: '900', marginTop: 1 },
  actionArea: {
    minHeight: 72,
    alignItems: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: GAME_ROOM_FOOTER_PANEL_BG,
    borderWidth: 2,
    borderColor: PICKER_GLASS_PANEL_BORDER,
  },
  actionLead: { color: SDV.inkMuted, fontSize: 10, fontWeight: '800', textAlign: 'center', marginBottom: 7 },
  nightCommand: { color: INK, fontSize: 12, lineHeight: 18, fontWeight: '900', textAlign: 'center', marginBottom: 5 },
  nightHint: { color: SDV.inkMuted, fontSize: 8, lineHeight: 12, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  nightAutoAdvance: { color: SDV.inkMuted, fontSize: 9, fontWeight: '800', textAlign: 'center' },
  startMatchButton: { alignSelf: 'stretch', minHeight: 54 },
  currentSpeaker: { color: INK, fontSize: 12, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  aiThinking: { color: SDV.inkMuted, fontSize: 9, fontWeight: '700', textAlign: 'center' },
  actionButton: { alignSelf: 'center', minHeight: 38, paddingVertical: 6 },
  teamNames: { color: INK, fontSize: 11, fontWeight: '900', lineHeight: 16, textAlign: 'center', marginBottom: 8 },
  binaryActions: { flexDirection: 'row', gap: 7 },
  decisionButton: { flex: 1, minWidth: 0 },
  binaryButton: { flex: 1, minHeight: 40, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  approveButton: { backgroundColor: GOOD, borderColor: '#28553b' },
  rejectButton: { backgroundColor: EVIL, borderColor: '#612431' },
  binaryButtonText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  resultHeadline: { fontSize: 13, lineHeight: 18, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  missionActions: { flexDirection: 'row', gap: 7 },
  missionButton: { flex: 1, minHeight: 44, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4, paddingHorizontal: 4 },
  missionSuccessButton: { backgroundColor: GOOD_LIGHT, borderColor: GOOD },
  missionFailButton: { backgroundColor: EVIL_LIGHT, borderColor: EVIL },
  missionButtonText: { fontSize: 10, fontWeight: '900', textAlign: 'center' },
  missionSeal: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 7, backgroundColor: '#fff8e7' },
  assassinationLead: { color: EVIL, fontSize: 10, lineHeight: 15, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  logBlock: { flex: 1, minHeight: 78, overflow: 'hidden' },
  logTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  logTitle: { color: SDV.wood, fontSize: 9, fontWeight: '900' },
  logScroll: {
    flex: 1,
    minHeight: 0,
  },
  logContent: {
    width: '100%',
    paddingLeft: 35,
    paddingRight: 35,
    paddingTop: 48,
    paddingBottom: 8,
  },
  eventContent: {
    width: '100%',
    paddingLeft: 28,
    paddingRight: 28,
    paddingTop: 58,
    paddingBottom: 12,
  },
  eventQuestTrack: {
    width: '100%',
    height: 48,
    flexDirection: 'row',
    gap: 3,
    padding: 3,
    marginBottom: 14,
    backgroundColor: 'rgba(20,19,22,0.74)',
    borderWidth: 2,
    borderColor: '#8d6d35',
    borderRadius: 7,
  },
  eventQuestNode: {
    flex: 1,
    minWidth: 0,
    borderWidth: 2,
    borderColor: '#665c50',
    borderRadius: 5,
    backgroundColor: 'rgba(246,236,211,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 1,
  },
  eventQuestNumber: { color: INK, fontSize: 10, fontWeight: '900', lineHeight: 11 },
  eventQuestSize: { color: SDV.inkMuted, fontSize: 5, lineHeight: 7, fontWeight: '800', textAlign: 'center' },
  eventTwoFail: { color: EVIL, fontSize: 4, lineHeight: 5, fontWeight: '900', textAlign: 'center' },
  eventHeading: { color: SDV.wood, fontSize: 12, fontWeight: '900', marginBottom: 8 },
  eventEmpty: { color: SDV.inkMuted, fontSize: 12, lineHeight: 18 },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 8,
    marginBottom: 7,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  eventResultMark: { width: 7, minHeight: 34, borderRadius: 3 },
  eventText: { flex: 1, color: SDV.ink, fontSize: 11, lineHeight: 16, fontWeight: '700' },
  logEmpty: { color: SDV.inkMuted, fontSize: 8, lineHeight: 12 },
  logRowContainer: { width: '100%', marginBottom: 9 },
  logRowContainerHighlight: {
    backgroundColor: PARCHMENT_LOG_ROW_HIGHLIGHT_BG,
    borderRadius: 4,
  },
  logItemSpeech: { width: '100%', paddingLeft: 0, paddingVertical: 4 },
  logItemModerator: {
    width: '100%',
    borderLeftWidth: 3,
    borderLeftColor: SDV.woodMid,
    paddingLeft: 14,
    paddingVertical: 4,
  },
  logLine: {
    color: SDV.ink,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    flexShrink: 1,
    textShadowColor: 'rgba(255, 248, 220, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  logLineLatest: { color: INK, fontWeight: '800', backgroundColor: GLASS_SOFT },
  stickerStrip: { maxHeight: 56, marginBottom: 8, flexGrow: 0 },
  stickerStripInner: { alignItems: 'center', paddingRight: 4, gap: 8 },
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
  },
  stickerChipImage: { width: 36, height: 36 },
  seatStickerBubble: {
    position: 'absolute',
    top: -14,
    right: -12,
    zIndex: 1200,
    width: 48,
    height: 48,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: SDV.wood,
    backgroundColor: SDV.panelLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatStickerImage: { width: 40, height: 40 },
  endBackdrop: { flex: 1, backgroundColor: 'rgba(62,39,35,0.55)', alignItems: 'center', justifyContent: 'center', padding: 14 },
  endPanel: { width: '92%', maxWidth: 680, maxHeight: '94%', borderWidth: 4, borderColor: SDV.wood, borderRadius: 8, backgroundColor: SDV.panel, padding: 12 },
  endPanelCompact: { width: '96%', padding: 8 },
  endCardHeading: { color: SDV.subtext, fontSize: 11, fontWeight: '800', letterSpacing: 1, textAlign: 'center', marginBottom: 8 },
  endBanner: { minHeight: 52, borderRadius: 5, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  endBannerGood: { backgroundColor: GOOD },
  endBannerEvil: { backgroundColor: EVIL },
  endTitle: { color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  endReason: { color: INK, fontSize: 11, lineHeight: 16, fontWeight: '800', textAlign: 'center', marginVertical: 8 },
  endRolesTitle: { color: SDV.wood, fontSize: 10, fontWeight: '900', marginBottom: 5 },
  endRolesScroll: { maxHeight: 260 },
  endRolesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  endRoleRow: { width: '19%', minWidth: 104, minHeight: 58, borderWidth: 2, borderRadius: 5, flexDirection: 'row', alignItems: 'center', padding: 4, gap: 4 },
  endRoleGood: { borderColor: GOOD, backgroundColor: GOOD_LIGHT },
  endRoleEvil: { borderColor: EVIL, backgroundColor: EVIL_LIGHT },
  endAvatar: { width: 36, height: 44 },
  endRoleCopy: { flex: 1, minWidth: 0 },
  endPlayerName: { color: INK, fontSize: 8, fontWeight: '900' },
  endRoleName: { fontSize: 7, fontWeight: '900', marginTop: 2 },
  endActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 10 },
});
