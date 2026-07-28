import React from 'react';
import { Music } from 'lucide-react-native';
import { GameWoodButton } from './GameWoodButton';
import { GAME_WOOD_BTN } from '../theme/gameButton';

type Props = {
  enabled: boolean;
  onPress: () => void;
  accessibilityLabelOn?: string;
  accessibilityLabelOff?: string;
};

/** 背景音乐开关：音符图标，与选人页图标钮同尺寸（44×44） */
export default function HubBgmIconButton({
  enabled,
  onPress,
  accessibilityLabelOn = '关闭背景音乐',
  accessibilityLabelOff = '打开背景音乐',
}: Props) {
  return (
    <GameWoodButton
      variant="icon"
      onPress={onPress}
      accessibilityLabel={enabled ? accessibilityLabelOn : accessibilityLabelOff}
    >
      <Music
        size={22}
        color={enabled ? GAME_WOOD_BTN.text : GAME_WOOD_BTN.textMuted}
        strokeWidth={2.4}
      />
    </GameWoodButton>
  );
}
