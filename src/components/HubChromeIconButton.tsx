import React from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { GameWoodButton } from './GameWoodButton';
import { GAME_WOOD_BTN } from '../theme/gameButton';

type Props = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  accessibilityLabel?: string;
};

/** 顶栏图标钮：与选人页返回钮一致（44×44） */
export default function HubChromeIconButton({ onPress, style, children, accessibilityLabel }: Props) {
  return (
    <GameWoodButton
      variant="icon"
      onPress={onPress}
      style={style}
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      {children}
    </GameWoodButton>
  );
}

export { GAME_WOOD_BTN as HUB_CHROME_BTN_SIZE };
