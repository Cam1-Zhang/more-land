import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import RoomFriendChatDock, { type FriendChatMessage } from '../components/RoomFriendChatDock';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  Share,
  Image,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, UserPlus, Trash2 } from 'lucide-react-native';
import {
  APP_LANGUAGE_KEY,
  createRoomCopy,
  joinRoomCopy,
  teamLobbyScreenCopy,
  homeCopy,
  type AppLanguage,
} from '../i18n/appStrings';
import HubSettingsIconButton from '../components/HubSettingsIconButton';
import { USER_NICKNAME_KEY, USER_NICKNAME_MAX_LEN } from '../constants/userProfileKeys';
import type { GameBoard } from '../types/game';
import type { DifficultyType } from '../types';
import {
  buildTeamLobbyInviteUrl,
  readJoinIntentFromWebUrl,
  readRoomFromCurrentWebUrl,
  setHostRoomQueryOnWeb,
} from '../utils/roomInviteChannel';
import {
  createTeamLobbyConnection,
  getTeamLobbyWsUrl,
  type LobbyMember,
} from '../utils/teamLobbyWs';
import HubDayNightBackground from '../components/HubDayNightBackground';
import { GameWoodButton } from '../components/GameWoodButton';
import {
  GAME_WOOD_BTN,
  gameButtonStyles,
  gameWoodButtonFace,
  gameWoodButtonLabel,
  PICKER_GLASS_PANEL_BG,
  PICKER_GLASS_PANEL_BORDER,
} from '../theme/gameButton';
import { SDV } from '../theme/stardewPixel';
import { PIXEL_ART_SPRITE } from '../theme/pixelArtImage';

type Invite = { id: string; name: string; ready: boolean };

const MIN_INVITES = 1;
const GLASS_INNER_BG = 'rgba(255, 252, 245, 0.64)' as const;
const PARCHMENT_BG = '#fff8e7' as const;
const CARD_BG = '#fffdf8' as const;
const LOBBY_SHELL_MAX_W = 1120;
const LOBBY_CONTENT_MAX_W = 1080;

function LobbySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={lobbyStyles.lobbySection}>
      <Text style={lobbyStyles.lobbySectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const CREATE_ROOM_DIFFICULTIES: DifficultyType[] = ['Easy', 'Medium', 'Hard'];

function makeRoomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default function TeamLobbyScreen({ navigation }: any) {
  const { width: screenW } = useWindowDimensions();
  const shellW = Math.min(screenW - 28, LOBBY_SHELL_MAX_W);
  const contentW = Math.min(shellW - 28, LOBBY_CONTENT_MAX_W);
  const useWideLobbyLayout = contentW >= 760;

  const roomWsUrl = getTeamLobbyWsUrl();
  const mpEnabled = Boolean(roomWsUrl);

  const [lang, setLang] = useState<AppLanguage>('zh');
  const langRef = useRef(lang);
  langRef.current = lang;

  const [roomCode, setRoomCode] = useState(() => {
    if (mpEnabled) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const fromUrl = readRoomFromCurrentWebUrl();
        if (fromUrl && readJoinIntentFromWebUrl()) return fromUrl;
      }
      return '';
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const fromUrl = readRoomFromCurrentWebUrl();
      if (fromUrl) return fromUrl;
    }
    return makeRoomCode();
  });
  const [invites, setInvites] = useState<Invite[]>([]);
  const [hostReady, setHostReady] = useState(false);
  const [selectedDiff, setSelectedDiff] = useState<DifficultyType>('Easy');
  const [selectedBoard, setSelectedBoard] = useState<GameBoard>('Standard12');
  const [joinCode, setJoinCode] = useState('');
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [lobbyChatMessages, setLobbyChatMessages] = useState<FriendChatMessage[]>([]);

  const [displayName, setDisplayName] = useState('');
  const displayNameRef = useRef('');
  const [mpConnected, setMpConnected] = useState(false);
  const [mpInRoom, setMpInRoom] = useState(false);
  const mpInRoomRef = useRef(false);
  const [mpYourId, setMpYourId] = useState('');
  const [mpHostId, setMpHostId] = useState('');
  const mpYourIdRef = useRef('');
  const mpHostIdRef = useRef('');
  const [mpMembers, setMpMembers] = useState<LobbyMember[]>([]);
  const wsRef = useRef<ReturnType<typeof createTeamLobbyConnection> | null>(null);
  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;

  const t = createRoomCopy[lang];
  const j = joinRoomCopy[lang];
  const tls = teamLobbyScreenCopy[lang];

  const effectiveDisplayName = useMemo(() => {
    const n = displayName.trim().slice(0, USER_NICKNAME_MAX_LEN);
    if (n.length > 0) return n;
    return lang === 'zh' ? '玩家' : 'Player';
  }, [displayName, lang]);

  const refreshLang = useCallback(() => {
    AsyncStorage.getItem(APP_LANGUAGE_KEY).then((v) => {
      if (v === 'zh' || v === 'en') setLang(v);
      else setLang('zh');
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshLang();
    }, [refreshLang])
  );

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(USER_NICKNAME_KEY).then((raw) => {
      if (cancelled) return;
      const n = (raw ?? '').trim().slice(0, USER_NICKNAME_MAX_LEN);
      setDisplayName(n);
      displayNameRef.current = n;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    mpInRoomRef.current = mpInRoom;
  }, [mpInRoom]);

  useEffect(() => {
    mpYourIdRef.current = mpYourId;
    mpHostIdRef.current = mpHostId;
  }, [mpYourId, mpHostId]);

  useEffect(() => {
    if (!roomWsUrl) return undefined;
    const conn = createTeamLobbyConnection(roomWsUrl, {
      onOpen: () => setMpConnected(true),
      onClose: () => setMpConnected(false),
      onRoom: (p) => {
        setRoomCode(p.code);
        setMpInRoom(true);
        setMpYourId(p.yourId);
        setMpHostId(p.hostId);
        mpYourIdRef.current = p.yourId;
        mpHostIdRef.current = p.hostId;
        setMpMembers(p.members);
        setJoinModalOpen(false);
      },
      onSettings: (s) => {
        setSelectedDiff(s.lockedDifficulty);
        setSelectedBoard(s.lockBoardWithPreset);
      },
      onGoCharacterSelect: (p) => {
        const isHost = mpHostIdRef.current === mpYourIdRef.current && mpHostIdRef.current !== '';
        navigationRef.current.navigate('CharacterSelect', {
          lockedDifficulty: p.lockedDifficulty,
          lockBoardWithPreset: p.lockBoardWithPreset,
          fromCreateRoom: isHost,
          createRoomCode: isHost ? p.code : undefined,
          fromJoinRoom: !isHost,
          joinRoomCode: !isHost ? p.code : undefined,
        });
      },
      onError: (m) => {
        const L = teamLobbyScreenCopy[langRef.current];
        const map = L.mpErrors as Record<string, string>;
        const label = map[m] ?? m;
        Alert.alert('', label);
      },
      onLeft: () => {
        setMpInRoom(false);
        setMpMembers([]);
        setMpYourId('');
        setMpHostId('');
        setRoomCode('');
      },
    });
    wsRef.current = conn;
    return () => {
      if (mpInRoomRef.current) {
        try {
          conn.send({ type: 'leave' });
        } catch {
          /* noop */
        }
      }
      conn.close();
      wsRef.current = null;
      setMpConnected(false);
      setMpInRoom(false);
      setMpMembers([]);
      setMpYourId('');
      setMpHostId('');
    };
  }, [roomWsUrl]);

  const isHostOnline = mpEnabled && mpInRoom && mpHostId !== '' && mpYourId !== '' && mpHostId === mpYourId;

  /**
   * 网页：先处理邀请链接（join=1）再同步房主地址栏，避免 `setHostRoomQuery` 提前去掉 `join` 导致无法弹层。
   */
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (readJoinIntentFromWebUrl()) {
      const code = readRoomFromCurrentWebUrl();
      if (code) {
        setJoinCode(code);
        setJoinModalOpen(true);
      }
    }
    setHostRoomQueryOnWeb(roomCode);
  }, [roomCode]);

  const copyInviteLink = useCallback(async () => {
    if (roomCode.replace(/\D/g, '').length !== 6) {
      Alert.alert('', t.linkCopyFail);
      return;
    }
    const url = buildTeamLobbyInviteUrl(roomCode, { openJoinModal: true });
    const fail = () => Alert.alert('', t.linkCopyFail);
    if (Platform.OS === 'web') {
      if (!url || !navigator.clipboard?.writeText) {
        fail();
        return;
      }
      try {
        await navigator.clipboard.writeText(url);
        Alert.alert('', t.linkCopied);
      } catch {
        fail();
      }
      return;
    }
    const msg = url || `${t.roomCodeLabel} ${roomCode}`;
    try {
      await Share.share({ message: msg, title: t.title });
    } catch {
      /* 用户取消分享 */
    }
  }, [roomCode, t]);

  const shareRoomInvite = useCallback(async () => {
    if (roomCode.replace(/\D/g, '').length !== 6) {
      Alert.alert('', t.linkCopyFail);
      return;
    }
    const url = buildTeamLobbyInviteUrl(roomCode, { openJoinModal: true });
    const body =
      lang === 'zh'
        ? `${t.roomCodeLabel}：${roomCode}${url ? `\n${url}` : ''}`
        : `${t.roomCodeLabel}: ${roomCode}${url ? `\n${url}` : ''}`;
    try {
      await Share.share({ message: body, title: t.title });
    } catch {
      /* 取消 */
    }
  }, [roomCode, lang, t]);

  const digits = joinCode.replace(/\D/g, '').slice(0, 6);

  const appendLobbyChat = useCallback((items: Omit<FriendChatMessage, 'id' | 'createdAt'>[]) => {
    if (items.length === 0) return;
    const base = Date.now();
    setLobbyChatMessages((prev) => {
      const full: FriendChatMessage[] = items.map((it, i) => ({
        ...it,
        id: `lobby-${base}-${i}-${Math.random().toString(36).slice(2, 9)}`,
        createdAt: base + i,
      }));
      return [...prev, ...full];
    });
  }, []);

  const settingsUnlocked = mpEnabled ? mpMembers.length >= MIN_INVITES : invites.length >= MIN_INVITES;
  const allFriendsReady = invites.length > 0 && invites.every((i) => i.ready);
  const onlineAllReady = mpMembers.length >= 2 && mpMembers.every((m) => m.ready);
  const offlineReadyOk = allFriendsReady && hostReady;
  const readyOk = mpEnabled ? onlineAllReady : offlineReadyOk;
  const canGoCharacter = settingsUnlocked && readyOk && (!mpEnabled || isHostOnline);

  const hostCanEditSettings = !mpEnabled || isHostOnline;

  /** 模拟：未邀请任何人；联机：房内仅自己 → 展示空状态插图 */
  const showEmptyFriendsArt = useMemo(
    () =>
      (!mpEnabled && invites.length === 0) ||
      (mpEnabled && mpInRoom && mpMembers.length <= 1),
    [mpEnabled, mpInRoom, mpMembers.length, invites.length]
  );

  useEffect(() => {
    if (!mpEnabled || !isHostOnline || !settingsUnlocked) return;
    const c = wsRef.current;
    if (!c) return;
    c.send({
      type: 'sync_settings',
      lockedDifficulty: selectedDiff,
      lockBoardWithPreset: selectedBoard,
    });
  }, [mpEnabled, isHostOnline, settingsUnlocked, selectedDiff, selectedBoard]);

  const addInvite = () => {
    const n = invites.length + 1;
    const name = lang === 'zh' ? `好友${n}` : `Friend ${n}`;
    setInvites((prev) => [
      ...prev,
      { id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, ready: false },
    ]);
    setHostReady(false);
  };

  const removeInvite = (id: string) => {
    setInvites((prev) => prev.filter((x) => x.id !== id));
    setHostReady(false);
  };

  const markAllFriendsReady = () => {
    setInvites((prev) => prev.map((i) => ({ ...i, ready: true })));
  };

  const createOnlineRoom = useCallback(() => {
    if (!wsRef.current) return;
    if (!mpConnected) {
      Alert.alert('', teamLobbyScreenCopy[lang].waitWsConnect);
      return;
    }
    wsRef.current.send({ type: 'create', displayName: effectiveDisplayName });
  }, [mpConnected, effectiveDisplayName, lang]);

  const onJoinByCode = () => {
    if (digits.length !== 6) {
      Alert.alert('', j.invalidCode);
      return;
    }
    if (mpEnabled) {
      if (!mpConnected || !wsRef.current) {
        Alert.alert('', tls.waitWsConnect);
        return;
      }
      wsRef.current.send({ type: 'join', code: digits, displayName: effectiveDisplayName });
      return;
    }
    Alert.alert('', j.demoJoined, [
      {
        text: j.pickAi,
        onPress: () => {
          setJoinModalOpen(false);
          navigation.replace('CharacterSelect', {
            joinRoomCode: digits,
            fromJoinRoom: true,
          });
        },
      },
    ]);
  };

  const toggleSelfReady = () => {
    if (mpEnabled && mpInRoom && wsRef.current) {
      const me = mpMembers.find((m) => m.id === mpYourId);
      wsRef.current.send({ type: 'ready', ready: !me?.ready });
      return;
    }
    setHostReady((v) => !v);
  };

  const onPrimaryFooter = () => {
    if (mpEnabled) {
      if (!isHostOnline) return;
      wsRef.current?.send({
        type: 'start',
        lockedDifficulty: selectedDiff,
        lockBoardWithPreset: selectedBoard,
      });
      return;
    }
    navigation.navigate('CharacterSelect', {
      lockedDifficulty: selectedDiff,
      lockBoardWithPreset: selectedBoard,
      fromCreateRoom: true,
      createRoomCode: roomCode,
    });
  };

  const h = homeCopy[lang];

  return (
    <HubDayNightBackground style={lobbyStyles.root}>
      <SafeAreaView style={lobbyStyles.safe}>
        <StatusBar barStyle="dark-content" />
        <KeyboardAvoidingView
          style={lobbyStyles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={lobbyStyles.pageBody}>
            <View style={[lobbyStyles.pageBodyInner, { maxWidth: shellW }]}>
              <View style={lobbyStyles.mainShell}>
                <View style={lobbyStyles.chromeHeader}>
                  <GameWoodButton
                    variant="icon"
                    onPress={() => navigation.goBack()}
                    accessibilityLabel={h.settingsBack}
                  >
                    <ChevronLeft color={GAME_WOOD_BTN.text} size={22} strokeWidth={2.5} />
                  </GameWoodButton>
                  <View style={lobbyStyles.headerCenter}>
                    <Text style={lobbyStyles.pageTitle}>{h.teamLobbyTitle}</Text>
                    <Text style={lobbyStyles.pageSubtitle}>{h.teamLobbySubtitle}</Text>
                  </View>
                  <HubSettingsIconButton
                    onPress={() => navigation.navigate('Settings')}
                    accessibilityLabel={h.settingsTitle}
                  />
                </View>

                <ScrollView
                  style={lobbyStyles.panelScroll}
                  contentContainerStyle={lobbyStyles.panelScrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <View
                    style={[
                      lobbyStyles.contentColumn,
                      useWideLobbyLayout && lobbyStyles.contentColumnWide,
                      { width: contentW, maxWidth: contentW },
                    ]}
                  >
                    <LobbySection title={mpEnabled ? t.inviteSectionOnline : t.inviteSection}>
          <Text style={lobbyStyles.hint}>{mpEnabled ? t.inviteHintOnline : t.inviteHint}</Text>

          {mpEnabled ? (
            <>
              <Text style={lobbyStyles.mpBanner}>{tls.onlineBanner}</Text>
              {!mpConnected ? <Text style={lobbyStyles.mpWarn}>{tls.wsDisconnected}</Text> : null}
            </>
          ) : null}

          <View style={lobbyStyles.roomCodeCard}>
            <Text style={lobbyStyles.roomCodeLabel}>{t.roomCodeLabel}</Text>
            <Text style={lobbyStyles.roomCodeValue}>
              {mpEnabled && roomCode.replace(/\D/g, '').length !== 6 ? tls.roomCodePending : roomCode}
            </Text>
            <Text style={lobbyStyles.roomCodeSub}>{t.roomCodeHint}</Text>
            <View style={lobbyStyles.inviteChannelRow}>
              <TouchableOpacity
                style={lobbyStyles.inviteChannelBtn}
                onPress={() => void copyInviteLink()}
                activeOpacity={0.88}
              >
                <Text style={lobbyStyles.inviteChannelBtnText}>{t.copyInviteLink}</Text>
              </TouchableOpacity>
              <View style={lobbyStyles.inviteChannelGap} />
              <TouchableOpacity
                style={lobbyStyles.inviteChannelBtnOutline}
                onPress={() => void shareRoomInvite()}
                activeOpacity={0.88}
              >
                <Text style={lobbyStyles.inviteChannelBtnOutlineText}>{t.shareInvite}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {mpEnabled && !mpInRoom ? (
            <TouchableOpacity style={lobbyStyles.inviteBtn} onPress={createOnlineRoom} activeOpacity={0.85}>
              <Text style={lobbyStyles.inviteBtnText}>{tls.createOnlineRoom}</Text>
            </TouchableOpacity>
          ) : null}

          {!mpEnabled ? (
            <TouchableOpacity style={lobbyStyles.inviteBtn} onPress={addInvite} activeOpacity={0.85}>
              <UserPlus color={SDV.panelLight} size={20} />
              <Text style={[lobbyStyles.inviteBtnText, { marginLeft: 8 }]}>{t.inviteBtn}</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={lobbyStyles.joinCodeBtn}
            onPress={() => setJoinModalOpen(true)}
            activeOpacity={0.88}
          >
            <Text style={lobbyStyles.joinCodeBtnText}>{tls.joinWithCodeBtn}</Text>
          </TouchableOpacity>

          {mpEnabled ? (
            !mpInRoom ? (
              <Text style={lobbyStyles.empty}>{tls.beforeOnlineRoom}</Text>
            ) : (
              <>
                {mpMembers.map((m) => (
                  <View key={m.id} style={lobbyStyles.inviteRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={lobbyStyles.inviteName}>
                        {m.displayName}
                        {m.id === mpYourId ? (lang === 'zh' ? '（我）' : ' (me)') : ''}
                      </Text>
                      <Text style={lobbyStyles.inviteReady}>
                        {m.ready ? t.friendReady : t.friendPending}
                      </Text>
                    </View>
                  </View>
                ))}
                {showEmptyFriendsArt ? (
                  <View style={lobbyStyles.emptyFriendsPanel} accessibilityRole="image">
                    <Image
                      source={require('../../assets/teamLobbyEmptyFriends.png')}
                      style={[PIXEL_ART_SPRITE, lobbyStyles.emptyFriendsImg]}
                      resizeMode="contain"
                      accessibilityIgnoresInvertColors
                    />
                    <Text style={lobbyStyles.emptyFriendsCaption}>{tls.emptyFriendsIllustrationHint}</Text>
                  </View>
                ) : null}
              </>
            )
          ) : invites.length === 0 ? (
            <View style={lobbyStyles.emptyFriendsPanel} accessibilityRole="image">
              <Image
                source={require('../../assets/teamLobbyEmptyFriends.png')}
                style={[PIXEL_ART_SPRITE, lobbyStyles.emptyFriendsImg]}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
              <Text style={lobbyStyles.emptyFriendsCaption}>{tls.emptyFriendsIllustrationHint}</Text>
            </View>
          ) : (
            invites.map((inv) => (
              <View key={inv.id} style={lobbyStyles.inviteRow}>
                <View style={{ flex: 1 }}>
                  <Text style={lobbyStyles.inviteName}>{inv.name}</Text>
                  <Text style={lobbyStyles.inviteReady}>
                    {inv.ready ? t.friendReady : t.friendPending}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeInvite(inv.id)} style={lobbyStyles.trash}>
                  <Trash2 color={SDV.ink} size={20} />
                </TouchableOpacity>
              </View>
            ))
          )}

          {!mpEnabled && invites.length > 0 ? (
            <TouchableOpacity style={lobbyStyles.secondaryBtn} onPress={markAllFriendsReady}>
              <Text style={lobbyStyles.secondaryBtnText}>{t.mockFriendsReady}</Text>
            </TouchableOpacity>
          ) : null}

                    </LobbySection>

                    <LobbySection title={t.settingsSection}>
          {!settingsUnlocked ? (
            <Text style={lobbyStyles.locked}>{mpEnabled ? t.settingsLockedOnline : t.settingsLocked}</Text>
          ) : (
            <>
              <Text style={lobbyStyles.subLabel}>{t.difficultyHeading}</Text>
              <Text style={lobbyStyles.difficultyNote}>{t.difficultyNoNovice}</Text>
              <View style={lobbyStyles.tabRow}>
                {CREATE_ROOM_DIFFICULTIES.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      lobbyStyles.tab,
                      selectedDiff === d && lobbyStyles.tabActive,
                      !hostCanEditSettings && lobbyStyles.tabDisabled,
                    ]}
                    onPress={() => {
                      if (!hostCanEditSettings) return;
                      setSelectedDiff(d);
                    }}
                  >
                    <Text style={[lobbyStyles.tabText, selectedDiff === d && lobbyStyles.tabTextActive]}>
                      {d === 'Easy'
                        ? lang === 'zh'
                          ? '简单'
                          : 'Easy'
                        : d === 'Medium'
                          ? lang === 'zh'
                            ? '中等'
                            : 'Med'
                          : lang === 'zh'
                            ? '困难'
                            : 'Hard'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={lobbyStyles.subLabel}>{t.boardHeading}</Text>
              <View style={lobbyStyles.boardRow}>
                <TouchableOpacity
                  style={[
                    lobbyStyles.boardChip,
                    lobbyStyles.boardChipSpacing,
                    selectedBoard === 'Standard12' && lobbyStyles.boardChipActive,
                    !hostCanEditSettings && lobbyStyles.tabDisabled,
                  ]}
                  onPress={() => {
                    if (!hostCanEditSettings) return;
                    setSelectedBoard('Standard12');
                  }}
                >
                  <Text
                    style={[
                      lobbyStyles.boardChipText,
                      selectedBoard === 'Standard12' && lobbyStyles.boardChipTextActive,
                    ]}
                  >
                    {t.boardStandard}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    lobbyStyles.boardChip,
                    selectedBoard === 'WolfBeauty' && lobbyStyles.boardChipActive,
                    !hostCanEditSettings && lobbyStyles.tabDisabled,
                  ]}
                  onPress={() => {
                    if (!hostCanEditSettings) return;
                    setSelectedBoard('WolfBeauty');
                  }}
                >
                  <Text
                    style={[
                      lobbyStyles.boardChipText,
                      selectedBoard === 'WolfBeauty' && lobbyStyles.boardChipTextActive,
                    ]}
                  >
                    {t.boardBeauty}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    lobbyStyles.boardChip,
                    lobbyStyles.boardChipSpacing,
                    selectedBoard === 'SeerWitch6' && lobbyStyles.boardChipActive,
                    !hostCanEditSettings && lobbyStyles.tabDisabled,
                  ]}
                  onPress={() => {
                    if (!hostCanEditSettings) return;
                    setSelectedBoard('SeerWitch6');
                  }}
                >
                  <Text
                    style={[
                      lobbyStyles.boardChipText,
                      selectedBoard === 'SeerWitch6' && lobbyStyles.boardChipTextActive,
                    ]}
                  >
                    {t.boardSeerWitch6}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {settingsUnlocked && (!mpEnabled || mpInRoom) ? (
            <>
              <Text style={lobbyStyles.readyHeading}>{t.readySection}</Text>
              <TouchableOpacity
                style={[
                  lobbyStyles.secondaryBtn,
                  (mpEnabled
                    ? Boolean(mpMembers.find((m) => m.id === mpYourId)?.ready)
                    : hostReady) && lobbyStyles.hostReadyOn,
                ]}
                onPress={toggleSelfReady}
              >
                <Text style={lobbyStyles.secondaryBtnText}>
                  {mpEnabled
                    ? mpMembers.find((m) => m.id === mpYourId)?.ready
                      ? t.hostReadyUndo
                      : t.hostReadyTap
                    : hostReady
                      ? t.hostReadyUndo
                      : t.hostReadyTap}
                </Text>
              </TouchableOpacity>
            </>
          ) : null}
                    </LobbySection>
                  </View>
                </ScrollView>

        <RoomFriendChatDock
          lang={lang}
          messages={lobbyChatMessages}
          onAppend={appendLobbyChat}
          stickersEnabled
          allowTextInput
          startWithChatLogCollapsed
          emptyChatIllustration={require('../../assets/teamLobbyChatEmpty.png')}
        />

        <View style={lobbyStyles.footer}>
          {mpEnabled && mpInRoom && !isHostOnline ? (
            <Text style={lobbyStyles.waitingHostText}>{tls.waitingHostStart}</Text>
          ) : (
            <TouchableOpacity
              style={[lobbyStyles.primaryBtn, !canGoCharacter && lobbyStyles.primaryDisabled]}
              disabled={!canGoCharacter}
              onPress={onPrimaryFooter}
            >
              <Text style={lobbyStyles.primaryBtnText}>{t.goPickCharacters}</Text>
            </TouchableOpacity>
          )}
        </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>

      <Modal visible={joinModalOpen} transparent animationType="fade" onRequestClose={() => setJoinModalOpen(false)}>
        <Pressable style={lobbyStyles.modalBackdrop} onPress={() => setJoinModalOpen(false)}>
          <Pressable style={lobbyStyles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={lobbyStyles.modalTitle}>{tls.joinModalTitle}</Text>
            <Text style={lobbyStyles.modalHint}>{mpEnabled ? j.hintReal : j.hint}</Text>
            <TextInput
              style={lobbyStyles.joinInput}
              value={digits}
              onChangeText={(v) => setJoinCode(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder={j.placeholder}
              placeholderTextColor={SDV.inkMuted}
              autoFocus
            />
            <TouchableOpacity style={lobbyStyles.joinBtn} onPress={onJoinByCode} activeOpacity={0.9}>
              <Text style={lobbyStyles.joinBtnText}>{j.join}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={lobbyStyles.modalCancel} onPress={() => setJoinModalOpen(false)}>
              <Text style={lobbyStyles.modalCancelText}>{tls.cancel}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
      </SafeAreaView>
    </HubDayNightBackground>
  );
}

const lobbyStyles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  pageBody: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 10,
  },
  pageBodyInner: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    alignSelf: 'center',
  },
  mainShell: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    backgroundColor: PICKER_GLASS_PANEL_BG,
    borderRadius: 16,
    borderWidth: 0,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 18px 48px rgba(61, 41, 20, 0.18)' } as any,
      default: {
        shadowColor: '#3d2914',
        shadowOpacity: 0.14,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 3,
      },
    }),
  },
  chromeHeader: {
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
  headerCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: GAME_WOOD_BTN.bg,
    letterSpacing: 0,
  },
  pageSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: SDV.subtext,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 16,
  },
  panelScroll: { flex: 1, minHeight: 0 },
  panelScrollContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
  },
  contentColumn: {
    alignSelf: 'center',
    width: '100%',
    alignItems: 'stretch',
  },
  contentColumnWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 14,
  },
  lobbySection: {
    flexGrow: 1,
    flexBasis: 330,
    minWidth: 0,
    backgroundColor: PARCHMENT_BG,
    borderWidth: 1,
    borderColor: '#e5dcc8',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 16,
    marginBottom: 14,
    overflow: 'hidden',
  },
  lobbySectionTitle: {
    marginHorizontal: -16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: GAME_WOOD_BTN.bg,
    borderBottomWidth: 2,
    borderBottomColor: GAME_WOOD_BTN.border,
    fontSize: 14,
    fontWeight: '900',
    color: GAME_WOOD_BTN.text,
  },
  readyHeading: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '900',
    color: SDV.ink,
  },
  hint: { fontSize: 11, fontWeight: '600', color: SDV.subtext, marginTop: 2, lineHeight: 18 },
  roomCodeCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderTopColor: '#9a7a58',
    borderLeftColor: '#9a7a58',
    borderBottomColor: '#2a1810',
    borderRightColor: '#2a1810',
    backgroundColor: CARD_BG,
  },
  roomCodeLabel: { fontSize: 11, fontWeight: '800', color: SDV.subtext, letterSpacing: 0.5 },
  roomCodeValue: {
    marginTop: 6,
    fontSize: 26,
    fontWeight: '900',
    color: '#2a1810',
    letterSpacing: 3,
  },
  roomCodeSub: { marginTop: 8, fontSize: 11, fontWeight: '600', color: SDV.subtext, lineHeight: 16 },
  inviteChannelRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  inviteChannelGap: { width: 8 },
  inviteChannelBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...gameWoodButtonFace('default'),
  },
  inviteChannelBtnText: { ...gameWoodButtonLabel('default'), fontSize: 11 },
  inviteChannelBtnOutline: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...gameWoodButtonFace('outline'),
  },
  inviteChannelBtnOutlineText: { ...gameWoodButtonLabel('outline'), fontSize: 11 },
  inviteBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    ...gameWoodButtonFace('default'),
  },
  inviteBtnText: { ...gameWoodButtonLabel('default'), fontSize: 13 },
  joinCodeBtn: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
    ...gameWoodButtonFace('outline'),
  },
  joinCodeBtnText: { ...gameWoodButtonLabel('outline'), fontSize: 13 },
  empty: { marginTop: 16, fontSize: 12, color: SDV.inkMuted, fontWeight: '600' },
  emptyFriendsPanel: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderTopColor: '#9a7a58',
    borderLeftColor: '#9a7a58',
    borderBottomColor: '#2a1810',
    borderRightColor: '#2a1810',
    backgroundColor: CARD_BG,
  },
  emptyFriendsImg: {
    width: 200,
    height: 168,
    maxWidth: '88%',
  },
  emptyFriendsCaption: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '700',
    color: SDV.ink,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 8,
  },
  inviteRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 2,
    borderTopColor: '#d8c6a8',
    borderLeftColor: '#d8c6a8',
    borderBottomColor: '#5c3d24',
    borderRightColor: '#5c3d24',
    borderRadius: 8,
    backgroundColor: '#f4e7c8',
  },
  inviteName: { fontSize: 14, fontWeight: '800', color: SDV.ink },
  inviteReady: { fontSize: 11, fontWeight: '700', color: SDV.subtext, marginTop: 4 },
  trash: { padding: 8 },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    ...gameWoodButtonFace('outline'),
  },
  secondaryBtnText: { ...gameWoodButtonLabel('outline'), fontSize: 13 },
  hostReadyOn: { backgroundColor: SDV.leaf },
  joinInput: {
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: PICKER_GLASS_PANEL_BORDER,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 6,
    textAlign: 'center',
    color: SDV.ink,
    backgroundColor: GLASS_INNER_BG,
  },
  joinBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
    ...gameWoodButtonFace('default'),
  },
  joinBtnText: { ...gameWoodButtonLabel('default'), fontSize: 14 },
  locked: {
    marginTop: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8d4bc',
    backgroundColor: '#fcefd8',
    fontSize: 11,
    fontWeight: '700',
    color: SDV.subtext,
  },
  subLabel: { marginTop: 14, fontSize: 11, fontWeight: '900', color: SDV.inkMuted },
  difficultyNote: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: SDV.subtext,
    lineHeight: 16,
  },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginHorizontal: -4 },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    margin: 4,
    borderWidth: 1,
    borderColor: '#c9b89a',
    borderRadius: 8,
    backgroundColor: '#faf6ef',
  },
  tabActive: gameButtonStyles.segmentCellOn,
  tabText: { ...gameButtonStyles.segmentTxt, fontSize: 11 },
  tabTextActive: { ...gameButtonStyles.segmentTxtOn, fontSize: 11 },
  boardRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 10 },
  boardChipSpacing: { marginRight: 0 },
  boardChip: {
    flex: 1,
    minWidth: 136,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#c9b89a',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#faf6ef',
  },
  boardChipActive: {
    backgroundColor: GAME_WOOD_BTN.bg,
    borderColor: GAME_WOOD_BTN.border,
  },
  boardChipText: { fontSize: 12, fontWeight: '800', textAlign: 'center', color: SDV.ink },
  boardChipTextActive: { color: GAME_WOOD_BTN.text },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(74, 55, 40, 0.12)',
    backgroundColor: 'transparent',
  },
  primaryBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    ...gameWoodButtonFace('default'),
  },
  primaryDisabled: { opacity: 0.35 },
  primaryBtnText: { ...gameWoodButtonLabel('default'), fontSize: 14 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(62,39,35,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: PICKER_GLASS_PANEL_BG,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: PICKER_GLASS_PANEL_BORDER,
    padding: 18,
  },
  modalTitle: { fontSize: 15, fontWeight: '900', textAlign: 'center', marginBottom: 8, color: SDV.ink },
  modalHint: { fontSize: 11, fontWeight: '600', color: SDV.subtext, lineHeight: 16, marginBottom: 6 },
  modalCancel: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  modalCancelText: { fontSize: 13, fontWeight: '800', color: SDV.ink },
  mpBanner: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: PICKER_GLASS_PANEL_BORDER,
    backgroundColor: GLASS_INNER_BG,
    fontSize: 11,
    fontWeight: '700',
    color: SDV.ink,
    lineHeight: 17,
  },
  mpWarn: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '800',
    color: '#B71C1C',
  },
  waitingHostText: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    color: SDV.subtext,
    paddingVertical: 10,
  },
  tabDisabled: { opacity: 0.38 },
});
