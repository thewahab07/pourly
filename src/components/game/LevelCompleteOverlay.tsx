/**
 * The celebration shown when a level is solved.
 *
 * Mounted only once the winning pour has finished animating, so the board is
 * settled behind it. The confetti is a small fixed set of shapes animated on
 * the UI thread — no timers, no per-frame JS.
 */
import { memo, useEffect, useMemo } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { LIQUID_COLORS } from "../../engine/types";
import { liquidPalette } from "../../theme/colors";
import { UI_COLORS } from "../../theme/colors";
import { SHADOW, SPRING } from "../../theme/tokens";
import { rf, rs, rsp } from "../../utils/responsive";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

interface LevelCompleteOverlayProps {
  readonly levelId: number;
  readonly levelName: string;
  readonly moveCount: number;
  readonly hasNextLevel: boolean;
  readonly onReplay: () => void;
  readonly onContinue: () => void;
  readonly onHome: () => void;
}

const CONFETTI_COUNT = 18;

interface ConfettiSpec {
  readonly x: number;
  readonly delay: number;
  readonly distance: number;
  readonly drift: number;
  readonly spin: number;
  readonly size: number;
  readonly color: string;
}

function ConfettiPiece({ spec }: { spec: ConfettiSpec }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      spec.delay,
      withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) }),
    );
  }, [progress, spec.delay]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value < 0.75 ? 1 : (1 - progress.value) * 4,
    transform: [
      { translateY: progress.value * spec.distance },
      { translateX: Math.sin(progress.value * Math.PI * 1.6) * spec.drift },
      { rotate: `${progress.value * spec.spin}deg` },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.confetti,
        {
          left: spec.x,
          width: spec.size,
          height: spec.size * 1.6,
          backgroundColor: spec.color,
        },
        style,
      ]}
    />
  );
}

function LevelCompleteOverlayComponent({
  levelId,
  levelName,
  moveCount,
  hasNextLevel,
  onReplay,
  onContinue,
  onHome,
}: LevelCompleteOverlayProps) {
  const { width, height } = useWindowDimensions();

  const backdrop = useSharedValue(0);
  const card = useSharedValue(0);
  const badge = useSharedValue(0);

  useEffect(() => {
    backdrop.value = withTiming(1, { duration: 220 });
    card.value = withDelay(90, withSpring(1, SPRING.gentle));
    badge.value = withDelay(
      260,
      withSequence(withSpring(1.12, SPRING.pop), withSpring(1, SPRING.pop)),
    );
  }, [backdrop, card, badge]);

  const confetti = useMemo<ConfettiSpec[]>(() => {
    let seed = levelId * 7919 + 13;
    const random = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    return Array.from({ length: CONFETTI_COUNT }, () => {
      const color =
        LIQUID_COLORS[Math.floor(random() * LIQUID_COLORS.length)] ?? "orange";
      return {
        x: random() * width,
        delay: random() * 380,
        distance: height * (0.55 + random() * 0.4),
        drift: (random() - 0.5) * 70,
        spin: (random() - 0.5) * 720,
        size: rs(6) + random() * rs(6),
        color: liquidPalette(color).base,
      };
    });
  }, [levelId, width, height]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value * 0.55,
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: card.value,
    transform: [
      { translateY: (1 - card.value) * 34 },
      { scale: 0.94 + card.value * 0.06 },
    ],
  }));
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: badge.value },
      { rotate: `${(1 - badge.value) * -22}deg` },
    ],
  }));

  const badgeSize = rs(60);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
      />

      {confetti.map((spec, index) => (
        <ConfettiPiece key={index} spec={spec} />
      ))}

      <View
        style={[styles.centre, { paddingHorizontal: rsp(24) }]}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[styles.card, SHADOW.card, cardStyle]}
          accessibilityViewIsModal
          accessibilityLiveRegion="polite"
        >
          <Animated.View
            style={[
              styles.badge,
              badgeStyle,
              {
                width: badgeSize,
                height: badgeSize,
                borderRadius: badgeSize / 2,
                top: -(badgeSize / 2),
              },
            ]}
          >
            <Icon
              name="check"
              size={rs(34)}
              color="#FFFFFF"
              strokeWidth={3.4}
            />
          </Animated.View>

          <Text style={styles.title} accessibilityRole="header">
            Level Complete!
          </Text>
          <Text style={styles.subtitle}>
            {levelName} · solved in {moveCount}{" "}
            {moveCount === 1 ? "move" : "moves"}
          </Text>

          <View style={styles.actions}>
            <Button
              label={hasNextLevel ? "Continue" : "Back to levels"}
              onPress={onContinue}
              variant="primary"
              size="medium"
              fullWidth
              icon={<Icon name="play" size={rs(17)} color="#FFFFFF" />}
              accessibilityHint={
                hasNextLevel
                  ? "Unlocks and opens the next level"
                  : "Returns to level selection"
              }
            />
            <View style={styles.secondaryRow}>
              <View style={styles.secondaryButton}>
                <Button
                  label="Replay"
                  onPress={onReplay}
                  variant="secondary"
                  size="medium"
                  fullWidth
                  icon={
                    <Icon name="restart" size={rs(17)} color={UI_COLORS.ink} />
                  }
                  accessibilityHint="Play this level again from the start"
                />
              </View>
              <View style={styles.secondaryButton}>
                <Button
                  label="Home"
                  onPress={onHome}
                  variant="ghost"
                  size="medium"
                  fullWidth
                  icon={
                    <Icon
                      name="levels"
                      size={rs(17)}
                      color={UI_COLORS.inkSoft}
                    />
                  }
                  accessibilityHint="Return to the home screen"
                />
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: UI_COLORS.ink,
  },
  centre: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: rs(400),
    alignItems: "center",
    borderRadius: rs(24),
    borderWidth: 2,
    borderColor: UI_COLORS.paperLine,
    backgroundColor: UI_COLORS.paper,
    paddingHorizontal: rsp(22),
    paddingTop: rs(38),
    paddingBottom: rs(20),
  },
  badge: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI_COLORS.success,
    borderWidth: rs(3),
    borderColor: UI_COLORS.paper,
  },
  title: {
    marginTop: rs(8),
    fontSize: rf(24),
    fontWeight: "800",
    color: UI_COLORS.ink,
  },
  subtitle: {
    marginTop: rs(5),
    marginBottom: rs(20),
    fontSize: rf(13),
    textAlign: "center",
    color: UI_COLORS.inkMuted,
  },
  actions: {
    width: "100%",
    gap: rs(9),
  },
  secondaryRow: {
    flexDirection: "row",
    gap: rs(9),
  },
  secondaryButton: {
    flex: 1,
  },
  confetti: {
    position: "absolute",
    top: -40,
    borderRadius: 2,
  },
});

export const LevelCompleteOverlay = memo(LevelCompleteOverlayComponent);
