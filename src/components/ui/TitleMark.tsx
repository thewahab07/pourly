/**
 * The home screen's hero mark: three tubes of liquid arranged like the app
 * icon, gently drifting so the screen feels alive without demanding attention.
 */
import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { LiquidColor } from '../../engine/types';
import { GlassTube } from '../game/GlassTube';

interface TitleMarkProps {
  readonly tubeWidth: number;
}

/** A pleasing, partly-sorted arrangement — it hints at the puzzle. */
const SHOWCASE: readonly (readonly LiquidColor[])[] = [
  ['cyan', 'cyan', 'orange'],
  ['orange', 'orange', 'green', 'green'],
  ['green', 'cyan'],
];

/** Each tube bobs on its own slightly different cycle. */
const PHASES = [0, 420, 840];

function FloatingTube({
  layers,
  width,
  height,
  layerHeight,
  delay,
  tubeId,
}: {
  layers: readonly LiquidColor[];
  width: number;
  height: number;
  layerHeight: number;
  delay: number;
  tubeId: string;
}) {
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2100 + delay, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2100 + delay, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [drift, delay]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -6 * drift.value },
      { rotate: `${(drift.value - 0.5) * 2.4}deg` },
    ],
  }));

  return (
    <Animated.View style={style}>
      <GlassTube
        width={width}
        height={height}
        layerHeight={layerHeight}
        layers={layers}
        tubeId={tubeId}
        highlighted={false}
      />
    </Animated.View>
  );
}

function TitleMarkComponent({ tubeWidth }: TitleMarkProps) {
  const capacity = 4;
  const height = tubeWidth * (capacity * 0.74 + 0.92);
  const layerHeight = (height - tubeWidth * 0.085 * 2 - tubeWidth * 0.42) / capacity;

  return (
    <View style={styles.row}>
      {SHOWCASE.map((layers, index) => (
        <FloatingTube
          key={index}
          layers={layers}
          width={tubeWidth}
          height={height}
          layerHeight={layerHeight}
          delay={PHASES[index] ?? 0}
          tubeId={`hero-${index}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 16,
  },
});

export const TitleMark = memo(TitleMarkComponent);
