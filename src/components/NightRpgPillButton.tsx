import React, { type ReactNode } from 'react';
import { type StyleProp, type ViewStyle, type TouchableOpacityProps } from 'react-native';
import { GameWoodButton } from './GameWoodButton';
import type { GameWoodButtonTone } from '../theme/gameButton';

export type NightRpgPillVariant = 'wood' | 'parchment';

type Props = {
  variant: NightRpgPillVariant;
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  leftIcon?: ReactNode;
  accessibilityLabel?: string;
  compact?: boolean;
  wide?: boolean;
  hitSlop?: TouchableOpacityProps['hitSlop'];
  disabled?: boolean;
  /** @deprecated 与选人返回钮统一为木框，保留参数兼容 */
  edgeless?: boolean;
};

/** 对局内文字按钮：样式与选人页 `galleryBackSquare` 同源 */
export default function NightRpgPillButton({
  variant: _variant,
  label,
  onPress,
  style,
  leftIcon,
  accessibilityLabel,
  compact,
  wide,
  hitSlop,
  disabled,
  edgeless: _edgeless,
}: Props) {
  void _variant;
  void _edgeless;
  const tone: GameWoodButtonTone = 'default';
  return (
    <GameWoodButton
      variant="text"
      tone={tone}
      label={label}
      onPress={onPress}
      style={style}
      leftIcon={leftIcon}
      accessibilityLabel={accessibilityLabel}
      compact={compact}
      wide={wide}
      hitSlop={hitSlop}
      disabled={disabled}
    />
  );
}
