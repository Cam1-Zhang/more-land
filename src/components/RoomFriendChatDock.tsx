import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  Modal,
  FlatList,
  Platform,
  PanResponder,
  Keyboard,
  useWindowDimensions,
  Alert,
  Image,
  ScrollView,
  type ImageSourcePropType,
} from 'react-native';
import { Audio } from 'expo-av';
import { ChevronUp, CornerDownLeft, Smile } from 'lucide-react-native';
import type { AppLanguage } from '../i18n/appStrings';
import { roomFriendChatCopy } from '../i18n/appStrings';
import { ROOM_STICKER_PACK, resolveStickerSource } from '../data/roomStickers';
import type { RoomStickerId } from '../data/roomStickers';
import { PIXEL_ART_SPRITE } from '../theme/pixelArtImage';

export type FriendChatMessage = {
  id: string;
  from: 'me' | 'peer';
  kind: 'text' | 'voice' | 'sticker';
  text: string;
  voiceUri?: string;
  durationSec?: number;
  stickerId?: string;
  createdAt: number;
};

async function transcribeStub(uri: string, lang: AppLanguage): Promise<string> {
  void uri;
  return roomFriendChatCopy[lang].transcribePlaceholder;
}

type Props = {
  lang: AppLanguage;
  messages: FriendChatMessage[];
  onAppend: (items: Omit<FriendChatMessage, 'id' | 'createdAt'>[]) => void;
  /** 发表情时由房间页在桌上显示，不写入聊天记录 */
  onStickerOnTable?: (stickerId: RoomStickerId) => void;
  /** 房间内 / 对局中才可展示表情包入口（房外可不挂载本组件） */
  stickersEnabled?: boolean;
  /** 对局中仅轮到发言时可打字；否则只可发表情包 */
  allowTextInput?: boolean;
  /** 轮到本局发言：发送文字走对局逻辑，不再单独占一条输入栏 */
  speechTurnActive?: boolean;
  onSubmitSpeechTurn?: (text: string) => void;
  onPassSpeechTurn?: () => void;
  speechPlaceholder?: string;
  speechPassLabel?: string;
  speechMaxLength?: number;
  /**
   * 组队页等：默认收起消息列表；仅点击/聚焦输入框后展开。
   * 点表情、发送键等不会展开记录区。
   */
  startWithChatLogCollapsed?: boolean;
  /** 无消息时在记录区中央展示插图（如组队房空状态） */
  emptyChatIllustration?: ImageSourcePropType;
};

export default function RoomFriendChatDock({
  lang,
  messages,
  onAppend,
  onStickerOnTable,
  stickersEnabled = true,
  allowTextInput = true,
  speechTurnActive = false,
  onSubmitSpeechTurn,
  onPassSpeechTurn,
  speechPlaceholder,
  speechPassLabel,
  speechMaxLength,
  startWithChatLogCollapsed = false,
  emptyChatIllustration,
}: Props) {
  const t = roomFriendChatCopy[lang];
  const { height: winH, width: winW } = useWindowDimensions();
  const chatLogMaxH = Math.min(200, Math.max(96, Math.floor(winH * 0.22)));
  const listRef = useRef<FlatList<FriendChatMessage>>(null);
  const [chatLogOpen, setChatLogOpen] = useState(!startWithChatLogCollapsed);

  const [draft, setDraft] = useState('');
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordUi, setRecordUi] = useState(false);
  const panDx = useRef(0);
  const panDy = useRef(0);
  const [zoneHint, setZoneHint] = useState<'none' | 'cancel' | 'text'>('none');
  const playingRef = useRef<Audio.Sound | null>(null);
  const recordStartedAtRef = useRef(0);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => a.createdAt - b.createdAt),
    [messages]
  );

  const logMessages = useMemo(
    () =>
      onStickerOnTable ? sortedMessages.filter((m) => m.kind !== 'sticker') : sortedMessages,
    [sortedMessages, onStickerOnTable]
  );

  useEffect(() => {
    if (logMessages.length === 0) return;
    const t = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 0);
    return () => clearTimeout(t);
  }, [logMessages.length]);

  const inputPlaceholder = speechTurnActive
    ? speechPlaceholder ?? t.placeholder
    : allowTextInput
      ? t.placeholder
      : t.placeholderStickersOnly;

  const inputMaxLen =
    speechTurnActive && typeof speechMaxLength === 'number' ? speechMaxLength : 800;

  useEffect(() => {
    if (!allowTextInput) setDraft('');
  }, [allowTextInput]);

  useEffect(() => {
    if (speechTurnActive) setDraft('');
  }, [speechTurnActive]);

  useEffect(() => {
    if (speechTurnActive) setStickerPickerOpen(false);
  }, [speechTurnActive]);

  const openChatLogFromInput = useCallback(() => {
    if (startWithChatLogCollapsed) setChatLogOpen(true);
  }, [startWithChatLogCollapsed]);

  const stopPlayback = useCallback(async () => {
    try {
      await playingRef.current?.unloadAsync();
    } catch {
      /* ignore */
    }
    playingRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      void stopPlayback();
      void recordingRef.current?.stopAndUnloadAsync().catch(() => undefined);
    };
  }, [stopPlayback]);

  const finishRecordingCleanup = useCallback(async () => {
    try {
      await recordingRef.current?.stopAndUnloadAsync();
    } catch {
      /* ignore */
    }
    recordingRef.current = null;
    setRecording(false);
    setRecordUi(false);
    setZoneHint('none');
    panDx.current = 0;
    panDy.current = 0;
  }, []);

  const startRecording = useCallback(async () => {
    if (!allowTextInput) return;
    if (Platform.OS === 'web') {
      Alert.alert('', t.webNoMic);
      return;
    }
    Keyboard.dismiss();
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) return;
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recordingRef.current = rec;
      recordStartedAtRef.current = Date.now();
      setRecording(true);
      setRecordUi(true);
      panDx.current = 0;
      panDy.current = 0;
      setZoneHint('none');
    } catch {
      await finishRecordingCleanup();
    }
  }, [allowTextInput, finishRecordingCleanup, t.webNoMic]);

  /** 松手直接发送语音消息 */
  const commitVoiceDirect = useCallback(async () => {
    const rec = recordingRef.current;
    if (!rec) return;
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      const dur = Math.max(
        1,
        Math.round((Date.now() - recordStartedAtRef.current) / 1000)
      );
      recordingRef.current = null;
      setRecording(false);
      setRecordUi(false);
      if (uri) {
        onAppend([
          {
            from: 'me',
            kind: 'voice',
            text: `${t.voiceSent} ${dur}s`,
            voiceUri: uri,
            durationSec: dur,
          },
        ]);
      }
    } catch {
      await finishRecordingCleanup();
    }
  }, [finishRecordingCleanup, onAppend, t.voiceSent]);

  const cancelRecording = useCallback(async () => {
    try {
      await recordingRef.current?.stopAndUnloadAsync();
    } catch {
      /* ignore */
    }
    recordingRef.current = null;
    setRecording(false);
    setRecordUi(false);
    setZoneHint('none');
  }, []);

  const transcribeAndCommit = useCallback(async () => {
    const rec = recordingRef.current;
    if (!rec) return;
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      recordingRef.current = null;
      setRecording(false);
      setRecordUi(false);
      if (uri) {
        const text = await transcribeStub(uri, lang);
        onAppend([{ from: 'me', kind: 'text', text }]);
      }
    } catch {
      await finishRecordingCleanup();
    }
  }, [finishRecordingCleanup, lang, onAppend]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => recordUi,
        onMoveShouldSetPanResponder: () => recordUi,
        onPanResponderGrant: () => {
          panDx.current = 0;
          panDy.current = 0;
        },
        onPanResponderMove: (_, g) => {
          panDx.current = g.dx;
          panDy.current = g.dy;
          const up = g.dy < -56;
          const left = g.dx < -48;
          const right = g.dx > 48;
          if (up && left) setZoneHint('cancel');
          else if (up && right) setZoneHint('text');
          else setZoneHint('none');
        },
        onPanResponderRelease: async () => {
          if (!recordUi) return;
          const dx = panDx.current;
          const dy = panDy.current;
          const up = dy < -56;
          const left = dx < -48;
          const right = dx > 48;
          if (up && left) await cancelRecording();
          else if (up && right) await transcribeAndCommit();
          else await commitVoiceDirect();
          setZoneHint('none');
        },
      }),
    [recordUi, cancelRecording, transcribeAndCommit, commitVoiceDirect]
  );

  const sendText = useCallback(() => {
    if (!allowTextInput) return;
    const raw = draft.trim();
    if (speechTurnActive && onSubmitSpeechTurn) {
      setDraft('');
      onSubmitSpeechTurn(raw);
      return;
    }
    if (!raw) return;
    setDraft('');
    onAppend([{ from: 'me', kind: 'text', text: raw }]);
  }, [allowTextInput, draft, onAppend, speechTurnActive, onSubmitSpeechTurn]);

  const sendSticker = useCallback(
    (id: RoomStickerId) => {
      setStickerPickerOpen(false);
      if (onStickerOnTable) {
        onStickerOnTable(id);
      } else {
        onAppend([{ from: 'me', kind: 'sticker', text: '', stickerId: id }]);
      }
    },
    [onStickerOnTable, onAppend]
  );

  const toggleStickerPicker = useCallback(() => {
    if (!stickersEnabled) return;
    Keyboard.dismiss();
    setStickerPickerOpen((o) => !o);
  }, [stickersEnabled]);

  const playVoice = useCallback(
    async (uri: string, id: string) => {
      try {
        await stopPlayback();
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync({ uri });
        playingRef.current = sound;
        sound.setOnPlaybackStatusUpdate((st) => {
          if (st.isLoaded && !st.isPlaying && st.didJustFinish) {
            void stopPlayback();
          }
        });
        await sound.playAsync();
      } catch {
        /* ignore */
      }
    },
    [stopPlayback]
  );

  const renderMsg = useCallback(
    ({ item }: { item: FriendChatMessage }) => {
      const mine = item.from === 'me';
      const stickerSrc =
        item.kind === 'sticker' && item.stickerId
          ? resolveStickerSource(item.stickerId)
          : null;
      return (
        <View style={[styles.msgRow, mine ? styles.msgRowMe : styles.msgRowPeer]}>
          <View style={[styles.msgBubble, mine ? styles.msgBubbleMe : styles.msgBubblePeer]}>
            {stickerSrc ? (
              <Image
                source={stickerSrc}
                style={[PIXEL_ART_SPRITE, styles.stickerInBubble]}
                resizeMode="contain"
              />
            ) : item.kind === 'voice' && item.voiceUri ? (
              <TouchableOpacity
                onPress={() => playVoice(item.voiceUri!, item.id)}
                accessibilityLabel={t.voicePlayA11y}
              >
                <Text style={[styles.msgText, mine && styles.msgTextMe]}>
                  🔊 {item.text}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.msgText, mine && styles.msgTextMe]}>{item.text}</Text>
            )}
          </View>
        </View>
      );
    },
    [playVoice, t.voicePlayA11y]
  );

  const collapsedBar = (
    <View style={styles.collapsedWrap}>
      {stickersEnabled && !speechTurnActive && stickerPickerOpen ? (
        <ScrollView
          horizontal={false}
          style={styles.stickerPanel}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          <View style={styles.stickerGrid}>
            {ROOM_STICKER_PACK.map(({ id, source }) => (
              <TouchableOpacity
                key={id}
                style={styles.stickerCell}
                onPress={() => sendSticker(id)}
                activeOpacity={0.85}
              >
                <Image source={source} style={[PIXEL_ART_SPRITE, styles.stickerThumb]} resizeMode="contain" />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : null}

      <View style={styles.collapsedRow}>
        {stickersEnabled ? (
          <TouchableOpacity
            style={[
              styles.smileyHit,
              stickerPickerOpen && styles.smileyHitActive,
              speechTurnActive && styles.smileyHitDisabled,
            ]}
            onPress={toggleStickerPicker}
            disabled={speechTurnActive}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={t.openStickerA11y}
          >
            <Smile
              color={
                speechTurnActive ? '#BBB' : stickerPickerOpen ? '#E53935' : '#000'
              }
              size={24}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.smileyHit} />
        )}

        {speechTurnActive && onPassSpeechTurn ? (
          <TouchableOpacity
            style={styles.speechPassHit}
            onPress={() => {
              setDraft('');
              onPassSpeechTurn();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={speechPassLabel ?? ''}
          >
            <Text style={styles.speechPassTxt}>{speechPassLabel ?? '—'}</Text>
          </TouchableOpacity>
        ) : null}

        <Pressable
          style={styles.inputPressable}
          delayLongPress={420}
          onLongPress={allowTextInput ? startRecording : undefined}
          onPressIn={openChatLogFromInput}
        >
          <TextInput
            style={[styles.input, !allowTextInput && styles.inputLocked]}
            value={draft}
            onChangeText={allowTextInput ? setDraft : undefined}
            placeholder={inputPlaceholder}
            placeholderTextColor="#999"
            multiline
            maxLength={inputMaxLen}
            editable={allowTextInput && !recording}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={sendText}
            onFocus={openChatLogFromInput}
          />
        </Pressable>

        <TouchableOpacity
          style={[styles.sendBare, !allowTextInput && styles.sendBareDim]}
          onPress={sendText}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel={t.sendA11y}
          disabled={!allowTextInput}
        >
          <CornerDownLeft color={allowTextInput ? '#000' : '#BBB'} size={26} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const showChatLog = !startWithChatLogCollapsed || chatLogOpen;

  const emptyArtMaxH = Math.max(96, Math.min(200, Math.floor(chatLogMaxH - 56)));
  const emptyArtW = Math.min(260, Math.round(emptyArtMaxH * 1.15));

  return (
    <View style={styles.root}>
      {showChatLog ? (
        <View
          style={[
            styles.chatLogPanel,
            { height: chatLogMaxH },
            emptyChatIllustration ? styles.chatLogPanelClean : null,
          ]}
        >
          <View style={styles.chatLogHeaderRow}>
            <Text style={styles.chatLogTitle}>{t.dockTitle}</Text>
            {startWithChatLogCollapsed ? (
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setChatLogOpen(false);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t.collapseA11y}
              >
                <ChevronUp color="#000" size={22} strokeWidth={2.5} />
              </TouchableOpacity>
            ) : null}
          </View>
          {logMessages.length === 0 && emptyChatIllustration ? (
            <View
              style={styles.chatLogEmptyArtWrap}
              accessibilityRole="text"
              accessibilityLabel={t.emptyChatA11y}
            >
              <Image
                source={emptyChatIllustration}
                style={[PIXEL_ART_SPRITE, { width: emptyArtW, height: emptyArtMaxH }]}
                resizeMode="contain"
              />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              style={styles.chatFlatList}
              data={logMessages}
              keyExtractor={(it) => it.id}
              renderItem={renderMsg}
              onContentSizeChange={() => {
                listRef.current?.scrollToEnd({ animated: false });
              }}
              contentContainerStyle={
                logMessages.length === 0 ? styles.msgListEmpty : styles.msgList
              }
              ListEmptyComponent={
                <View style={styles.chatLogEmpty}>
                  <Text style={styles.chatLogEmptyTxt}>{t.emptyChatA11y}</Text>
                </View>
              }
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator
            />
          )}
        </View>
      ) : null}

      {collapsedBar}

      <Modal visible={recordUi} transparent animationType="fade">
        <View style={styles.recordOverlay} {...panResponder.panHandlers}>
          <View style={[styles.slideZones, { width: winW - 32 }]}>
            <View
              style={[
                styles.zoneCell,
                zoneHint === 'cancel' && styles.zoneActive,
                { marginRight: 8 },
              ]}
            >
              <Text style={styles.zoneTxt}>{t.cancelSend}</Text>
            </View>
            <View style={[styles.zoneCell, zoneHint === 'text' && styles.zoneActive]}>
              <Text style={styles.zoneTxt}>{t.toText}</Text>
            </View>
          </View>
          <Text style={styles.recordMain}>{t.voiceRecording}</Text>
          <Text style={styles.recordSub}>{t.voiceSlideHint}</Text>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderTopWidth: 2,
    borderTopColor: '#000',
    backgroundColor: '#FFF',
    paddingBottom: 4,
  },
  chatLogPanel: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingTop: 6,
    paddingHorizontal: 4,
    backgroundColor: '#FAFAFA',
  },
  /** 组队房空状态：记录区更干净的白底 */
  chatLogPanelClean: {
    backgroundColor: '#FFF',
    borderBottomColor: '#E0E0E0',
    borderBottomWidth: 1,
  },
  chatLogHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  chatLogTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#333',
    paddingHorizontal: 6,
    flex: 1,
  },
  chatFlatList: { flex: 1, minHeight: 0 },
  chatLogEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  chatLogEmptyTxt: { fontSize: 12, fontWeight: '600', color: '#888' },
  chatLogEmptyArtWrap: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 6,
    backgroundColor: '#FFF',
    marginHorizontal: 2,
    borderRadius: 10,
  },
  collapsedWrap: {
    position: 'relative',
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputPressable: {
    flex: 1,
    minHeight: 44,
    minWidth: 0,
  },
  input: {
    minHeight: 44,
    maxHeight: 72,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'android' ? 8 : 10,
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    backgroundColor: '#FAFAFA',
    ...Platform.select({
      android: { textAlignVertical: 'center' as const },
      default: {},
    }),
  },
  sendBare: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  sendBareDim: { opacity: 0.45 },
  smileyHit: {
    width: 36,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smileyHitActive: {
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
  },
  smileyHitDisabled: {
    opacity: 0.55,
  },
  speechPassHit: {
    width: 48,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  speechPassTxt: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000',
  },
  stickerPanel: {
    maxHeight: 156,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  stickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 8,
  },
  stickerCell: {
    width: '30%',
    aspectRatio: 1,
    maxWidth: 72,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  stickerThumb: {
    width: '100%',
    height: '100%',
    maxHeight: 72,
  },
  stickerInBubble: {
    width: 80,
    height: 80,
  },
  inputLocked: {
    backgroundColor: '#F0F0F0',
    color: '#888',
  },
  msgList: { paddingBottom: 8, flexGrow: 1 },
  msgListEmpty: {
    flexGrow: 1,
    minHeight: 48,
  },
  msgRow: {
    marginBottom: 8,
    flexDirection: 'row',
  },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowPeer: { justifyContent: 'flex-start' },
  msgBubble: {
    maxWidth: '85%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#000',
  },
  msgBubbleMe: { backgroundColor: '#000' },
  msgBubblePeer: { backgroundColor: '#FFF' },
  msgText: { fontSize: 13, fontWeight: '700', color: '#000' },
  msgTextMe: { color: '#FFF' },
  recordOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  slideZones: {
    flexDirection: 'row',
    marginBottom: 28,
  },
  zoneCell: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#FFF',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  zoneActive: {
    backgroundColor: 'rgba(255,200,200,0.45)',
    borderColor: '#FFB4B4',
  },
  zoneTxt: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  recordMain: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  recordSub: {
    color: '#DDD',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});
