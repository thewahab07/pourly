/**
 * The falling stream of liquid between a pouring tube and its destination.
 *
 * Draws a thin, straight vertical line from the source tube's tilted mouth
 * straight down into the destination tube — a simple direct drop, the way a
 * test tube pours when held almost on its side.
 *
 * The whole SVG is animated via opacity + scaleY from the top so it appears
 * to grow downward as the pour starts and shrink back as it ends.
 */
import { memo } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import type { LiquidColor } from "../../engine/types";
import { liquidPalette } from "../../theme/colors";

interface PourStreamProps {
  readonly color: LiquidColor;
  /**
   * Bounding box for the stream SVG, in board coordinates.
   * left/top define the top-left corner of the SVG container.
   * The SVG width/height define the canvas size.
   */
  readonly left: number;
  readonly top: number;
  readonly svgWidth: number;
  readonly svgHeight: number;
  /**
   * Start point of the arc (source tube mouth), relative to SVG origin.
   */
  readonly startX: number;
  readonly startY: number;
  /**
   * End point of the arc (destination tube mouth), relative to SVG origin.
   */
  readonly endX: number;
  readonly endY: number;
  /** 0 → hidden, 1 → fully visible/extended. */
  readonly progress: SharedValue<number>;
  readonly opacity: SharedValue<number>;
}

function PourStreamComponent({
  color,
  left,
  top,
  svgWidth,
  svgHeight,
  startX,
  startY,
  endY,
  progress,
  opacity,
}: PourStreamProps) {
  const palette = liquidPalette(color);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    // Scale from top (transformOrigin: 'top') so stream grows downward
    transform: [{ scaleY: progress.value }],
  }));

  // A thin, constant-width line — like a real stream falling from a tilted
  // test tube, not a wide tapered ribbon.
  const streamW = Math.max(2, svgWidth * 0.045);
  const halfW = streamW / 2;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          left,
          top,
          width: svgWidth,
          height: svgHeight,
          transformOrigin: `${startX}px ${startY}px`,
        },
        style,
      ]}
    >
      <Svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      >
        <Defs>
          {/* Subtle vertical gradient so the line reads as liquid, not a flat bar */}
          <LinearGradient id="stream-v-grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.light} />
            <Stop offset="0.5" stopColor={palette.base} />
            <Stop offset="1" stopColor={palette.dark} />
          </LinearGradient>
        </Defs>

        {/* The straight stream line, source mouth to destination mouth */}
        <Rect
          x={startX - halfW}
          y={startY}
          width={streamW}
          height={Math.max(0, endY - startY)}
          fill="url(#stream-v-grad)"
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 15,
  },
});

export const PourStream = memo(PourStreamComponent);
