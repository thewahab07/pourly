/**
 * One interactive tube on the board.
 *
 * Handles three kinds of motion, all on the UI thread:
 *   - the selection lift when the player picks a tube up,
 *   - the travel-and-tilt when this tube is pouring, and
 *   - a short shake when a tap is rejected.
 *
 * The liquid that is currently in flight is drawn as a band clipped to a window
 * inside the tube and moved with a transform, so the level rises and falls
 * smoothly instead of jumping between layer counts.
 */
import { memo, useCallback, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg from 'react-native-svg';

import type { LiquidColor } from '../../engine/types';
import { SPRING } from '../../theme/tokens';
import type { TubeSlot } from '../../utils/layout';
import { GlassTube } from './GlassTube';
import { LiquidBand } from './LiquidColumn';
import { surfaceY, tubeGeometry, meniscusHeight } from './tubeGeometry';

export interface PourTarget {
  /** Translation, relative to this tube's slot, that puts its mouth over the destination. */
  readonly x: number;
  readonly y: number;
  /** Tilt in degrees; positive tips the mouth to the right. */
  readonly angle: number;
}

interface TubeViewProps {
  readonly index: number;
  readonly layers: readonly LiquidColor[];
  readonly width: number;
  readonly height: number;
  readonly layerHeight: number;
  readonly slot: TubeSlot;
  readonly selected: boolean;
  readonly disabled: boolean;
  /** Whether this tube is giving or receiving liquid in the current pour. */
  readonly pourRole: 'source' | 'destination' | null;
  readonly pourAmount: number;
  readonly pourColor: LiquidColor | null;
  readonly pourTarget: PourTarget | null;
  /** Shared timeline driven by the board: lift, travel to the destination, flow. */
  readonly lift: SharedValue<number>;
  readonly travel: SharedValue<number>;
  readonly flow: SharedValue<number>;
  /** Changes whenever this tube should shake to reject a tap. */
  readonly shakeToken: number | null;
  readonly onPress: (index: number) => void;
  readonly accessibilityLabel: string;
}

/** How far a selected tube rises out of its slot, as a fraction of its height. */
const SELECT_LIFT_RATIO = 0.12;
/** Extra rise while pouring, before the tube travels across. */
const POUR_LIFT_RATIO = 0.2;

function TubeViewComponent({
  index,
  layers,
  width,
  height,
  layerHeight,
  slot,
  selected,
  disabled,
  pourRole,
  pourAmount,
  pourColor,
  pourTarget,
  lift,
  travel,
  flow,
  shakeToken,
  onPress,
  accessibilityLabel,
}: TubeViewProps) {
  const geometry = useMemo(
    () => tubeGeometry(width, height, layerHeight),
    [width, height, layerHeight],
  );

  const selection = useSharedValue(0);
  const shake = useSharedValue(0);
  const press = useSharedValue(0);

  useEffect(() => {
    selection.value = withSpring(selected ? 1 : 0, SPRING.tube);
  }, [selected, selection]);

  useEffect(() => {
    if (shakeToken === null) return;
    // A short, low-amplitude wobble: enough to read as "no", not punishing.
    shake.value = withSequence(
      withTiming(1, { duration: 55 }),
      withTiming(-1, { duration: 70 }),
      withTiming(0.6, { duration: 60 }),
      withTiming(0, { duration: 55 }),
    );
  }, [shakeToken, shake]);

  const selectLift = height * SELECT_LIFT_RATIO;
  const pourLift = height * POUR_LIFT_RATIO;
  const shakeDistance = Math.max(4, width * 0.16);

  const isSource = pourRole === 'source';
  const targetX = pourTarget?.x ?? 0;
  const targetY = pourTarget?.y ?? 0;
  const targetAngle = pourTarget?.angle ?? 0;

  const containerStyle = useAnimatedStyle(() => {
    const travelValue = isSource ? travel.value : 0;
    // The travel target already positions the tube exactly over the
    // destination, so the lift is blended out as the tube travels — otherwise
    // it would hover above the pour position and detach from its stream.
    const settled = 1 - travelValue;
    const liftOffset = isSource ? lift.value * pourLift * settled : 0;

    return {
      transform: [
        { translateX: shake.value * shakeDistance + travelValue * targetX },
        {
          translateY:
            -selection.value * selectLift * settled - liftOffset + travelValue * targetY,
        },
        { rotate: `${travelValue * targetAngle}deg` },
        { scale: 1 + selection.value * 0.04 - press.value * 0.04 },
      ],
    };
  });

  const handlePressIn = useCallback(() => {
    press.value = withTiming(1, { duration: 80 });
  }, [press]);

  const handlePressOut = useCallback(() => {
    press.value = withTiming(0, { duration: 140 });
  }, [press]);

  const handlePress = useCallback(() => {
    onPress(index);
  }, [index, onPress]);

  // While pouring, the destination's arriving layers are drawn by the moving
  // band rather than the static column, so they rise into place.
  const staticLayers = useMemo(() => {
    if (pourRole === 'destination' && pourAmount > 0) {
      return layers.slice(0, Math.max(0, layers.length - pourAmount));
    }
    return layers;
  }, [layers, pourRole, pourAmount]);

  const band = useMemo(() => {
    if (pourRole === null || pourColor === null || pourAmount <= 0) return null;

    const bandHeight = pourAmount * layerHeight;
    // Source: the departing liquid used to sit above what is left.
    // Destination: the arriving liquid sits above what was already there.
    const restingLayers =
      pourRole === 'source' ? layers.length : layers.length - pourAmount;
    const top = surfaceY(geometry, restingLayers) - bandHeight;

    return {
      top,
      height: bandHeight,
      // Round the band's floor only when it actually sits on the tube's floor.
      bottomRadius: restingLayers === 0 ? geometry.interiorWidth / 2 : 0,
    };
  }, [pourRole, pourColor, pourAmount, layers.length, layerHeight, geometry]);

  const bandStyle = useAnimatedStyle(() => {
    const bandHeight = band?.height ?? 0;
    // Source liquid sinks out of its window; destination liquid rises into its own.
    const offset = pourRole === 'source' ? flow.value : 1 - flow.value;
    return { transform: [{ translateY: offset * bandHeight }] };
  });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          left: slot.x - width / 2,
          top: slot.y - height / 2,
          width,
          height,
          // A pouring tube must pass in front of everything it travels over.
          zIndex: isSource ? 20 : selected ? 10 : 1,
        },
        containerStyle,
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected, disabled }}
        style={styles.pressable}
      >
        <GlassTube
          width={width}
          height={height}
          layerHeight={layerHeight}
          layers={staticLayers}
          tubeId={`tube-${index}`}
          highlighted={selected}
        />

        {band !== null && pourColor !== null ? (
          <View
            pointerEvents="none"
            style={[
              styles.bandWindow,
              {
                left: geometry.interiorLeft,
                top: band.top,
                width: geometry.interiorWidth,
                height: band.height,
              },
            ]}
          >
            <Animated.View style={bandStyle}>
              <Svg
                width={geometry.interiorWidth}
                height={band.height}
                viewBox={`0 0 ${geometry.interiorWidth} ${band.height}`}
              >
                <LiquidBand
                  width={geometry.interiorWidth}
                  height={band.height}
                  color={pourColor}
                  idPrefix={`band-${index}`}
                  bottomRadius={band.bottomRadius}
                  meniscus={meniscusHeight(geometry)}
                />
              </Svg>
            </Animated.View>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
  pressable: {
    flex: 1,
  },
  bandWindow: {
    position: 'absolute',
    overflow: 'hidden',
  },
});

export const TubeView = memo(TubeViewComponent);
