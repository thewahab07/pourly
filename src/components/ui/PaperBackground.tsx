/**
 * The warm paper backdrop used by every screen.
 *
 * The grain is a sparse, deterministic scatter of very low-opacity dots plus a
 * few soft fibre strokes — enough to break up the flat fill, far too faint to
 * compete with the tubes. It is generated once and memoised, so it costs
 * nothing after the first render.
 */
import { memo, useMemo, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Rect, RadialGradient, Stop } from 'react-native-svg';

import { UI_COLORS } from '../../theme/colors';

interface PaperBackgroundProps {
  readonly children: ReactNode;
}

const GRAIN_TILE = 160;
const GRAIN_DOTS = 90;

/** Deterministic scatter, so the texture never shifts between renders. */
function useGrain(): { cx: number; cy: number; r: number; o: number }[] {
  return useMemo(() => {
    let seed = 20260906;
    const random = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    return Array.from({ length: GRAIN_DOTS }, () => ({
      cx: random() * GRAIN_TILE,
      cy: random() * GRAIN_TILE,
      r: 0.5 + random() * 1.1,
      o: 0.03 + random() * 0.05,
    }));
  }, []);
}

function PaperBackgroundComponent({ children }: PaperBackgroundProps) {
  const grain = useGrain();
  const { width, height } = useWindowDimensions();

  // Explicit pixel sizes rather than percentages: percentage-sized SVG roots do
  // not reliably fill an absolutely positioned parent on every platform.
  const columns = Math.ceil(width / GRAIN_TILE);
  const rows = Math.ceil(height / GRAIN_TILE);

  return (
    <View style={styles.root}>
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={styles.backdrop}
        pointerEvents="none"
      >
        <Defs>
          {/* A gentle warm vignette keeps the centre of the screen brighter. */}
          <RadialGradient id="paper-vignette" cx="50%" cy="38%" r="78%">
            <Stop offset="0" stopColor="#FFFCF4" stopOpacity="1" />
            <Stop offset="0.6" stopColor={UI_COLORS.paper} stopOpacity="1" />
            <Stop offset="1" stopColor={UI_COLORS.paperDeep} stopOpacity="1" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#paper-vignette)" />
      </Svg>

      {/* The grain tile is repeated by stretching a single small SVG across the
          screen; at this opacity the repetition is invisible. */}
      <View style={styles.grainLayer} pointerEvents="none">
        {Array.from({ length: rows }, (_, row) => (
          <View key={row} style={styles.grainRow}>
            {Array.from({ length: columns }, (_, column) => (
              <Svg
                key={column}
                width={GRAIN_TILE}
                height={GRAIN_TILE}
                viewBox={`0 0 ${GRAIN_TILE} ${GRAIN_TILE}`}
              >
                {grain.map((dot, index) => (
                  <Circle
                    key={index}
                    cx={dot.cx}
                    cy={dot.cy}
                    r={dot.r}
                    fill={UI_COLORS.ink}
                    opacity={dot.o}
                  />
                ))}
              </Svg>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: UI_COLORS.paper,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  grainLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  grainRow: {
    flexDirection: 'row',
  },
  content: {
    flex: 1,
  },
});

export const PaperBackground = memo(PaperBackgroundComponent);
