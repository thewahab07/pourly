/**
 * The falling stream of liquid between a pouring tube and its destination.
 *
 * Draws a curved SVG arc from the source tube's tilted mouth down into the
 * destination tube, mimicking how a real liquid pour looks: thin at the top,
 * slightly wider as it falls, with a smooth cubic-bezier curve.
 *
 * The whole SVG is animated via opacity + scaleY from the top so it appears
 * to grow downward as the pour starts and shrink back as it ends.
 */
import { memo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop, RadialGradient, Ellipse } from 'react-native-svg';

import type { LiquidColor } from '../../engine/types';
import { liquidPalette } from '../../theme/colors';

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
  endX,
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

  // Stream width: starts narrow at source mouth, thickens slightly as it falls
  const streamW = Math.max(4, (svgWidth * 0.18));
  const halfW = streamW / 2;
  const halfWEnd = halfW * 1.35; // slightly wider at the destination end

  // Control points for the cubic bezier. The stream arcs naturally from the
  // tilted mouth down into the destination tube.
  const dx = endX - startX;
  const dy = endY - startY;

  // Bezier control point 1: extend from the start along the arc direction
  const cp1x = startX + dx * 0.25;
  const cp1y = startY + dy * 0.55;
  // Bezier control point 2: come in from above the destination, near-vertical
  const cp2x = endX - dx * 0.08;
  const cp2y = endY - dy * 0.2;

  // Build a tapered ribbon path for the stream:
  // Left edge goes from (startX-halfW, startY) to (endX-halfWEnd, endY)
  // Right edge goes back from (endX+halfWEnd, endY) to (startX+halfW, startY)
  const leftPath = `M ${startX - halfW} ${startY}
    C ${cp1x - halfW * 0.9} ${cp1y}, ${cp2x - halfWEnd * 0.9} ${cp2y}, ${endX - halfWEnd} ${endY}`;
  const rightPath = `L ${endX + halfWEnd} ${endY}
    C ${cp2x + halfWEnd * 0.9} ${cp2y}, ${cp1x + halfW * 0.9} ${cp1y}, ${startX + halfW} ${startY} Z`;

  const fullPath = leftPath + rightPath;

  // Entry bead at source tube mouth
  const beadRx = halfW * 1.1;
  const beadRy = halfW * 0.55;

  // Splash/entry ellipse at destination
  const splashRx = halfWEnd * 1.4;
  const splashRy = halfWEnd * 0.55;

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
          {/* Horizontal gradient so the stream has depth: darker edges, lighter centre */}
          <LinearGradient id="stream-h-grad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={palette.dark} stopOpacity="0.9" />
            <Stop offset="0.3" stopColor={palette.base} />
            <Stop offset="0.55" stopColor={palette.light} stopOpacity="0.95" />
            <Stop offset="1" stopColor={palette.dark} stopOpacity="0.9" />
          </LinearGradient>
          {/* Radial glow for the entry bead */}
          <RadialGradient id="bead-grad" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={palette.light} stopOpacity="1" />
            <Stop offset="1" stopColor={palette.base} stopOpacity="0.7" />
          </RadialGradient>
          {/* Radial glow for the splash at destination */}
          <RadialGradient id="splash-grad" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={palette.light} stopOpacity="0.8" />
            <Stop offset="1" stopColor={palette.base} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* The curved stream ribbon */}
        <Path
          d={fullPath}
          fill="url(#stream-h-grad)"
        />

        {/* Bright bead where the liquid leaves the tube mouth */}
        <Ellipse
          cx={startX}
          cy={startY}
          rx={beadRx}
          ry={beadRy}
          fill="url(#bead-grad)"
        />

        {/* Soft splash circle where stream enters the destination */}
        <Ellipse
          cx={endX}
          cy={endY}
          rx={splashRx}
          ry={splashRy}
          fill="url(#splash-grad)"
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 15,
  },
});

export const PourStream = memo(PourStreamComponent);
