/**
 * A cartoon glass tube: transparent body, soft outline, inner highlight, open
 * top and a rounded bottom, with its liquid drawn inside.
 *
 * Everything is one SVG per tube. The component is memoised on its contents, so
 * tubes that are not involved in a pour do no work while one is animating.
 */
import { memo, useMemo } from 'react';
import Svg, { ClipPath, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { LiquidColor } from '../../engine/types';
import { UI_COLORS } from '../../theme/colors';
import { LiquidColumn } from './LiquidColumn';
import { tubeGeometry, tubePath } from './tubeGeometry';

interface GlassTubeProps {
  readonly width: number;
  readonly height: number;
  readonly layerHeight: number;
  readonly layers: readonly LiquidColor[];
  /** Distinguishes this tube's SVG element ids from every other tube's. */
  readonly tubeId: string;
  /** Slight emphasis while the tube is selected. */
  readonly highlighted: boolean;
}

function GlassTubeComponent({
  width,
  height,
  layerHeight,
  layers,
  tubeId,
  highlighted,
}: GlassTubeProps) {
  const geometry = useMemo(
    () => tubeGeometry(width, height, layerHeight),
    [width, height, layerHeight],
  );

  const paths = useMemo(
    () => ({
      outer: tubePath(geometry, 0),
      interior: tubePath(geometry, geometry.wall),
      // The shadow is a copy of the silhouette nudged down, which reads as a
      // soft contact shadow without needing an SVG filter.
      shadow: tubePath(geometry, 0),
    }),
    [geometry],
  );

  const clipId = `${tubeId}-clip`;
  const glassId = `${tubeId}-glass`;
  const rimRy = Math.max(2, width * 0.075);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <ClipPath id={clipId}>
          <Path d={paths.interior} />
        </ClipPath>
        <LinearGradient id={glassId} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" />
          <Stop offset="0.35" stopColor="#FFFFFF" stopOpacity="0.2" />
          <Stop offset="1" stopColor="#DCE9EF" stopOpacity="0.34" />
        </LinearGradient>
      </Defs>

      {/* Contact shadow. */}
      <Path
        d={paths.shadow}
        fill={UI_COLORS.shadow}
        opacity={0.1}
        translateY={geometry.wall * 1.3}
      />

      {/* Glass body. */}
      <Path d={paths.interior} fill={`url(#${glassId})`} />

      <LiquidColumn geometry={geometry} layers={layers} idPrefix={tubeId} clipId={clipId} />

      {/* Inner highlight down the left wall, over the liquid. */}
      <Rect
        x={geometry.interiorLeft + geometry.interiorWidth * 0.1}
        y={geometry.interiorTop + height * 0.06}
        width={Math.max(1.5, geometry.interiorWidth * 0.1)}
        height={height * 0.46}
        rx={Math.max(1, geometry.interiorWidth * 0.05)}
        fill="#FFFFFF"
        opacity={0.5}
      />

      {/* A narrower sheen on the right, to round the glass off. */}
      <Rect
        x={geometry.interiorLeft + geometry.interiorWidth * 0.82}
        y={geometry.interiorTop + height * 0.1}
        width={Math.max(1, geometry.interiorWidth * 0.05)}
        height={height * 0.3}
        rx={Math.max(1, geometry.interiorWidth * 0.03)}
        fill="#FFFFFF"
        opacity={0.32}
      />

      {/* Outline. Drawn last so it sits cleanly over liquid and highlights. */}
      <Path
        d={paths.outer}
        fill="none"
        stroke={highlighted ? UI_COLORS.brandDark : UI_COLORS.glassStroke}
        strokeWidth={geometry.wall}
        strokeOpacity={highlighted ? 0.95 : 0.55}
      />

      {/* Elliptical rim, which makes the top read as open rather than sealed. */}
      <Ellipse
        cx={width / 2}
        cy={geometry.wall / 2 + rimRy * 0.35}
        rx={width / 2 - geometry.wall / 2}
        ry={rimRy}
        fill="none"
        stroke={highlighted ? UI_COLORS.brandDark : UI_COLORS.glassStroke}
        strokeWidth={geometry.wall * 0.85}
        strokeOpacity={highlighted ? 0.9 : 0.5}
      />
    </Svg>
  );
}

export const GlassTube = memo(GlassTubeComponent);
