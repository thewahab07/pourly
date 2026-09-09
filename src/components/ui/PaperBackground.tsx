/**
 * The warm paper backdrop used by every screen.
 *
 * The grain is a sparse, deterministic scatter of very low-opacity dots plus a
 * few soft fibre strokes — enough to break up the flat fill, far too faint to
 * compete with the tubes. It is generated once and memoised, so it costs
 * nothing after the first render.
 */
import { memo, useId, useMemo, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Pattern,
  Rect,
  RadialGradient,
  Stop,
} from 'react-native-svg';

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
  const instanceId = useId().replace(/:/g, '');
  const vignetteId = `paper-vignette-${instanceId}`;
  const grainId = `paper-grain-${instanceId}`;

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
          <RadialGradient id={vignetteId} cx="50%" cy="38%" r="78%">
            <Stop offset="0" stopColor="#FFFCF4" stopOpacity="1" />
            <Stop offset="0.6" stopColor={UI_COLORS.paper} stopOpacity="1" />
            <Stop offset="1" stopColor={UI_COLORS.paperDeep} stopOpacity="1" />
          </RadialGradient>
          <Pattern
            id={grainId}
            x={0}
            y={0}
            width={GRAIN_TILE}
            height={GRAIN_TILE}
            patternUnits="userSpaceOnUse"
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
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${vignetteId})`} />
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${grainId})`} />
      </Svg>

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
  content: {
    flex: 1,
  },
});

export const PaperBackground = memo(PaperBackgroundComponent);
