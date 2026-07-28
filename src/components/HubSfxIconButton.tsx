import React from 'react';
import { Volume2, VolumeX } from 'lucide-react-native';
import { GameWoodButton } from './GameWoodButton';
import { GAME_WOOD_BTN } from '../theme/gameButton';

type Props = {
  enabled: boolean;
  onPress: () => void;
  accessibilityLabelOn?: string;
  accessibilityLabelOff?: string;
};

/** 游戏音效（法官播报、狼嚎等，非 BGM） */
export default function HubSfxIconButton({
  enabled,
  onPress,
  accessibilityLabelOn = '关闭游戏音效',
  accessibilityLabelOff = '打开游戏音效',
}: Props) {
  return (
    <GameWoodButton
      variant="icon"
      onPress={onPress}
      accessibilityLabel={enabled ? accessibilityLabelOn : accessibilityLabelOff}
    >
      {enabled ? (
        <Volume2 size={22} color={GAME_WOOD_BTN.text} strokeWidth={2.4} />
      ) : (
        <VolumeX size={22} color={GAME_WOOD_BTN.textMuted} strokeWidth={2.4} />
      )}
    </GameWoodButton>
  );
}
