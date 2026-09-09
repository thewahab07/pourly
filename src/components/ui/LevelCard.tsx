/**
 * One entry in the level grid.
 *
 * Three states, each distinguished by shape, colour *and* an icon, so the grid
 * stays readable without relying on colour alone.
 */
import { memo, useCallback, useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import type { Difficulty } from "../../engine/types";
import { UI_COLORS } from "../../theme/colors";
import { SHADOW, SPRING } from "../../theme/tokens";
import { rf, rs } from "../../utils/responsive";
import { Icon } from "./Icon";

export type LevelCardState = "locked" | "unlocked" | "completed";

interface LevelCardProps {
  readonly levelId: number;
  readonly name: string;
  readonly difficulty: Difficulty;
  readonly state: LevelCardState;
  readonly size: number;
  /** Staggers the entrance animation across the grid. */
  readonly index: number;
  readonly onPress: (levelId: number) => void;
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  tutorial: "Tutorial",
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  expert: "Expert",
};

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  tutorial: "#7FC4A0",
  easy: "#5FBF6A",
  medium: "#F2C438",
  hard: "#F28B36",
  expert: "#E8503F",
};

function LevelCardComponent({
  levelId,
  name,
  difficulty,
  state,
  size,
  index,
  onPress,
}: LevelCardProps) {
  const entrance = useSharedValue(0);
  const press = useSharedValue(0);

  useEffect(() => {
    // Cards drop in one after another, which makes a 25-item grid feel lighter.
    entrance.value = withDelay(
      Math.min(index * 26, 420),
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }),
    );
  }, [entrance, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [
      { translateY: (1 - entrance.value) * 18 },
      { scale: (0.94 + entrance.value * 0.06) * (1 - press.value * 0.05) },
    ],
  }));

  const handlePressIn = useCallback(() => {
    press.value = withTiming(1, { duration: 90 });
  }, [press]);

  const handlePressOut = useCallback(() => {
    press.value = withSpring(0, SPRING.pop);
  }, [press]);

  const handlePress = useCallback(() => {
    onPress(levelId);
  }, [levelId, onPress]);

  const locked = state === "locked";
  const completed = state === "completed";

  const background = locked
    ? UI_COLORS.paperDeep
    : completed
      ? UI_COLORS.success
      : UI_COLORS.paperSoft;
  const border = locked
    ? UI_COLORS.paperLine
    : completed
      ? UI_COLORS.successDark
      : UI_COLORS.brand;
  const numberColor = locked
    ? UI_COLORS.inkMuted
    : completed
      ? "#FFFFFF"
      : UI_COLORS.ink;

  // Responsive metrics derived from the card size (which is already responsive).
  const radius = Math.max(rs(14), size * 0.18);
  const badgeOffset = Math.max(rs(5), size * 0.07);
  const iconSize = Math.max(rs(14), size * 0.24);
  const dotSize = Math.max(rs(6), size * 0.1);
  const fontSize = rf(Math.max(11, size * 0.28));

  const accessibilityLabel = locked
    ? `Level ${levelId}, ${name}, locked. Finish the previous level to unlock it.`
    : `Level ${levelId}, ${name}, ${DIFFICULTY_LABEL[difficulty]}${completed ? ", completed" : ""}`;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={locked}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={locked ? undefined : "Opens this level"}
        accessibilityState={{ disabled: locked }}
        style={[
          styles.card,
          locked ? undefined : SHADOW.card,
          {
            width: size,
            height: size,
            backgroundColor: background,
            borderColor: border,
            borderRadius: radius,
          },
        ]}
      >
        <View style={[styles.badge, { top: badgeOffset, right: badgeOffset }]}>
          {locked ? (
            <Icon
              name="lock"
              size={iconSize}
              color={UI_COLORS.inkMuted}
              strokeWidth={2.2}
            />
          ) : completed ? (
            <Icon
              name="check"
              size={iconSize}
              color="#FFFFFF"
              strokeWidth={3}
            />
          ) : (
            <View
              style={[
                styles.dot,
                {
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                  backgroundColor: DIFFICULTY_COLOR[difficulty],
                },
              ]}
              accessibilityElementsHidden
            />
          )}
        </View>

        <Text style={[styles.number, { fontSize, color: numberColor }]}>
          {levelId}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
  },
  dot: {},
  number: {
    fontWeight: "800",
  },
});

export const LevelCard = memo(LevelCardComponent);
