import React, { type ReactNode } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
  type TouchableOpacityProps,
} from 'react-native';
import {
  GAME_WOOD_BTN,
  gameButtonStyles,
  gameWoodButtonFace,
  gameWoodButtonLabel,
  type GameWoodButtonTone,
} from '../theme/gameButton';

type BaseProps = {
  onPress: () => void;
  tone?: GameWoodButtonTone;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  hitSlop?: TouchableOpacityProps['hitSlop'];
  activeOpacity?: number;
};

type IconProps = BaseProps & {
  variant: 'icon';
  children: ReactNode;
};

type TextProps = BaseProps & {
  variant: 'text';
  label: string;
  compact?: boolean;
  /** 主 CTA：左右留白更大（如「开始本局」） */
  wide?: boolean;
  leftIcon?: ReactNode;
};

export type GameWoodButtonProps = IconProps | TextProps;

/**
 * 游戏内统一按钮：选人页返回钮同源（#4a3728 + 2px #2f2118 + 圆角 10）
 */
export function GameWoodButton(props: GameWoodButtonProps) {
  const {
    onPress,
    tone = 'default',
    disabled = false,
    style,
    accessibilityLabel,
    hitSlop = GAME_WOOD_BTN.hitSlop,
    activeOpacity = 0.88,
  } = props;

  const resolvedTone: GameWoodButtonTone = disabled ? 'muted' : tone;

  if (props.variant === 'icon') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={activeOpacity}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={hitSlop}
        style={[
          styles.iconTouch,
          gameWoodButtonFace(resolvedTone),
          disabled && styles.disabled,
          style,
        ]}
      >
        {props.children}
      </TouchableOpacity>
    );
  }

  const c = props.compact === true;
  const wide = props.wide === true;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={activeOpacity}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? props.label}
      hitSlop={hitSlop}
      style={[
        styles.textTouch,
        gameWoodButtonFace(resolvedTone),
        c && styles.textTouchCompact,
        wide && styles.textTouchWide,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={[styles.textRow, c && styles.textRowCompact]}>
        {props.leftIcon != null ? <View style={styles.iconSlot}>{props.leftIcon}</View> : null}
        <Text
          style={[
            styles.textLabel,
            gameWoodButtonLabel(resolvedTone),
            c && styles.textLabelCompact,
            props.labelStyle,
          ]}
          numberOfLines={2}
        >
          {props.label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  iconTouch: {
    width: GAME_WOOD_BTN.iconSize,
    height: GAME_WOOD_BTN.iconSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textTouch: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: GAME_WOOD_BTN.textPaddingH,
    paddingVertical: 10,
    minWidth: GAME_WOOD_BTN.textMinWidth,
    minHeight: GAME_WOOD_BTN.iconSize,
  },
  textTouchCompact: gameButtonStyles.textTouchCompact,
  textTouchWide: gameButtonStyles.textTouchWide,
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  textRowCompact: { gap: 5 },
  iconSlot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textLabel: {
    fontSize: 14,
    textAlign: 'center',
    flexShrink: 1,
  },
  textLabelCompact: gameButtonStyles.textLabelCompact,
  disabled: {
    opacity: 0.92,
  },
});
