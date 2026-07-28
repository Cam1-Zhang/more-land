import React from 'react';
import { Settings } from 'lucide-react-native';
import { GameWoodButton } from './GameWoodButton';
import { GAME_WOOD_BTN } from '../theme/gameButton';

type Props = {
  onPress: () => void;
  accessibilityLabel?: string;
};

/** 与 BGM 钮同尺寸（44×44），用于顶栏原音乐钮位置 */
export default function HubSettingsIconButton({
  onPress,
  accessibilityLabel = '设置',
}: Props) {
  return (
    <GameWoodButton variant="icon" onPress={onPress} accessibilityLabel={accessibilityLabel}>
      <Settings size={22} color={GAME_WOOD_BTN.text} strokeWidth={2.4} />
    </GameWoodButton>
  );
}
