/**
 * The app's button, in the three weights the design system uses.
 *
 * Press feedback is a Reanimated scale on the UI thread, and every button
 * routes its click sound through the audio service rather than calling
 * expo-audio itself.
 */
import { memo, useCallback, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { playSound } from '../../services/audio';
import { UI_COLORS } from '../../theme/colors';
import { SHADOW, SPRING } from '../../theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'large' | 'medium' | 'small';

interface ButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly disabled?: boolean;
  readonly icon?: ReactNode;
  readonly accessibilityLabel?: string;
  readonly accessibilityHint?: string;
  readonly fullWidth?: boolean;
  readonly testID?: string;
}

const VARIANT_STYLE: Record<
  ButtonVariant,
  { background: string; border: string; text: string; shadow: boolean }
> = {
  primary: {
    background: UI_COLORS.brand,
    border: UI_COLORS.brandDark,
    text: '#FFFFFF',
    shadow: true,
  },
  secondary: {
    background: UI_COLORS.paperSoft,
    border: UI_COLORS.paperLine,
    text: UI_COLORS.ink,
    shadow: true,
  },
  ghost: {
    background: 'transparent',
    border: 'transparent',
    text: UI_COLORS.inkSoft,
    shadow: false,
  },
  danger: {
    background: UI_COLORS.danger,
    border: UI_COLORS.dangerDark,
    text: '#FFFFFF',
    shadow: true,
  },
};

const SIZE_STYLE: Record<ButtonSize, { paddingV: number; paddingH: number; font: number }> = {
  large: { paddingV: 16, paddingH: 30, font: 19 },
  medium: { paddingV: 12, paddingH: 22, font: 16 },
  small: { paddingV: 9, paddingH: 15, font: 14 },
};

function ButtonComponent({
  label,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  icon,
  accessibilityLabel,
  accessibilityHint,
  fullWidth = false,
  testID,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const palette = VARIANT_STYLE[variant];
  const metrics = SIZE_STYLE[size];

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.955, { duration: 90 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING.pop);
  }, [scale]);

  const handlePress = useCallback(() => {
    playSound('click');
    onPress();
  }, [onPress]);

  return (
    <Animated.View style={[fullWidth ? styles.fullWidth : undefined, animatedStyle]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        testID={testID}
        style={[
          styles.base,
          palette.shadow ? SHADOW.button : undefined,
          {
            backgroundColor: palette.background,
            borderColor: palette.border,
            paddingVertical: metrics.paddingV,
            paddingHorizontal: metrics.paddingH,
          },
          disabled ? styles.disabled : undefined,
        ]}
      >
        {icon !== undefined ? <View style={styles.icon}>{icon}</View> : null}
        <Text style={[styles.label, { color: palette.text, fontSize: metrics.font }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 2,
    gap: 8,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.42,
  },
});

export const Button = memo(ButtonComponent);
