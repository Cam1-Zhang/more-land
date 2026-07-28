import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Platform } from 'react-native';
import { Send, SkipForward } from 'lucide-react-native';
import NightRpgPillButton from './NightRpgPillButton';
import { GAME_ROOM_FOOTER_ICON_COLOR } from '../theme/gameButton';
import { SDV, pixelChrome } from '../theme/stardewPixel';
type Props = {
  visible: boolean;
  placeholder: string;
  passLabel: string;
  submitLabel: string;
  maxLength?: number;
  onSubmit: (text: string) => void;
  onPass: () => void;
};

/** 对局内人类发言：无好友频道，仅输入 / 过麦 / 发送 */
export default function HumanSpeechBar({
  visible,
  placeholder,
  passLabel,
  submitLabel,
  maxLength,
  onSubmit,
  onPass,
}: Props) {
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!visible) setDraft('');
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <NightRpgPillButton
          compact
          variant="parchment"
          edgeless
          label={passLabel}
          style={styles.passPill}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          leftIcon={
            <SkipForward size={16} color={GAME_ROOM_FOOTER_ICON_COLOR} strokeWidth={2.4} />
          }
          onPress={() => {
            setDraft('');
            onPass();
          }}
        />
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder}
          placeholderTextColor={SDV.subtext}
          multiline
          {...(maxLength != null ? { maxLength } : {})}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={() => {
            const t = draft.trim();
            onSubmit(t);
            setDraft('');
          }}
          {...Platform.select({
            android: { textAlignVertical: 'top' as const },
            default: {},
          })}
        />
        <NightRpgPillButton
          compact
          variant="wood"
          label={submitLabel}
          style={styles.sendPill}
          leftIcon={<Send size={16} color={GAME_ROOM_FOOTER_ICON_COLOR} strokeWidth={2.4} />}
          onPress={() => {
            const t = draft.trim();
            onSubmit(t);
            setDraft('');
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /** 发言条：无边框，与右栏底区衔接 */
  wrap: {
    borderWidth: 0,
    borderBottomLeftRadius: pixelChrome.borderRadius,
    borderBottomRightRadius: pixelChrome.borderRadius,
    backgroundColor: SDV.panel,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  row: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  passPill: {
    alignSelf: 'center',
    flexShrink: 0,
    maxWidth: 100,
    minWidth: 52,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 88,
    borderWidth: 0,
    borderRadius: pixelChrome.borderRadius,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'android' ? 8 : 10,
    fontSize: 15,
    fontWeight: '600',
    color: SDV.ink,
    backgroundColor: SDV.panelLight,
  },
  sendPill: {
    alignSelf: 'center',
    flexShrink: 0,
    maxWidth: 120,
    minWidth: 64,
  },
});
