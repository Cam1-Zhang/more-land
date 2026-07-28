import React, { useEffect, useRef } from 'react';
import { View, TextInput, StyleSheet, Platform } from 'react-native';
import { SDV } from '../theme/stardewPixel';

const NOTEPAD_PANEL_ID = 'game-room-notepad-panel';
const NOTEPAD_FOCUS_STYLE_ID = 'game-room-notepad-no-focus-ring';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  contentPaddingH: number;
  contentPaddingTop: number;
};

function stripWebFocusRing(el: unknown): void {
  if (Platform.OS !== 'web' || !el || typeof el !== 'object') return;
  const node = el as HTMLElement & { style?: CSSStyleDeclaration };
  if (!node.style) return;
  node.style.outline = 'none';
  node.style.outlineWidth = '0';
  node.style.boxShadow = 'none';
  node.style.border = 'none';
  node.style.borderColor = 'transparent';
}

/** 对局右栏牛皮纸：玩家私有记事（本局内 state 保存） */
export default function GameRoomNotepadPanel({
  value,
  onChangeText,
  placeholder,
  contentPaddingH,
  contentPaddingTop,
}: Props) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (document.getElementById(NOTEPAD_FOCUS_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = NOTEPAD_FOCUS_STYLE_ID;
    style.textContent = `
      #${NOTEPAD_PANEL_ID} textarea,
      #${NOTEPAD_PANEL_ID} textarea:focus,
      #${NOTEPAD_PANEL_ID} textarea:focus-visible,
      #${NOTEPAD_PANEL_ID} textarea:active {
        outline: none !important;
        outline-width: 0 !important;
        outline-style: none !important;
        box-shadow: none !important;
        border: none !important;
        border-color: transparent !important;
      }
    `;
    document.head.appendChild(style);
  }, []);

  const handleFocus = () => {
    if (Platform.OS !== 'web') return;
    stripWebFocusRing(document.activeElement);
    stripWebFocusRing(inputRef.current as unknown);
  };

  return (
    <View
      nativeID={NOTEPAD_PANEL_ID}
      style={[
        styles.wrap,
        { paddingHorizontal: contentPaddingH, paddingTop: contentPaddingTop },
      ]}
    >
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={SDV.inkMuted}
        multiline
        scrollEnabled
        textAlignVertical="top"
        autoCorrect={false}
        spellCheck={false}
        accessibilityLabel={placeholder}
        onFocus={handleFocus}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 0,
    paddingBottom: 8,
  },
  input: {
    flex: 1,
    minHeight: 120,
    fontSize: 14,
    lineHeight: 21,
    color: SDV.ink,
    fontWeight: '600',
    backgroundColor: 'transparent',
    borderWidth: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none' as const,
        outlineWidth: 0,
        boxShadow: 'none',
      },
      default: {},
    }),
  },
});
