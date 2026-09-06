/**
 * The liquid inside a tube, drawn as SVG so every layer gets a real gradient.
 *
 * Rendered as its own memoised component: it only re-renders when the tube's
 * contents actually change, which keeps the board cheap during animation.
 */
import { memo } from 'react';
import { ClipPath, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { LiquidColor } from '../../engine/types';
import { liquidPalette } from '../../theme/colors';
import { layerTop, meniscusHeight, type TubeGeometry } from './tubeGeometry';

interface LiquidColumnProps {
  readonly geometry: TubeGeometry;
  readonly layers: readonly LiquidColor[];
  /** Unique per tube, so gradient ids never collide across the board. */
  readonly idPrefix: string;
  /** Id of the clip path that shapes the liquid to the tube interior. */
  readonly clipId: string;
}

/**
 * Vertical gradient for one liquid layer: lighter at the top, deeper at the
 * bottom, which reads as a small amount of depth without looking glossy.
 */
function LayerGradient({ id, color }: { id: string; color: LiquidColor }) {
  const palette = liquidPalette(color);
  return (
    <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <Stop offset="0" stopColor={palette.light} />
      <Stop offset="0.45" stopColor={palette.base} />
      <Stop offset="1" stopColor={palette.dark} />
    </LinearGradient>
  );
}

function LiquidColumnComponent({ geometry, layers, idPrefix, clipId }: LiquidColumnProps) {
  if (layers.length === 0) return null;

  const { interiorLeft, interiorWidth, layerHeight } = geometry;
  const topIndex = layers.length - 1;
  const topColor = layers[topIndex];
  const meniscus = meniscusHeight(geometry);

  return (
    <>
      <Defs>
        {layers.map((color, index) => (
          <LayerGradient key={`${idPrefix}-g-${index}`} id={`${idPrefix}-g-${index}`} color={color} />
        ))}
      </Defs>

      <G clipPath={`url(#${clipId})`}>
        {layers.map((_color, index) => (
          <Rect
            key={`${idPrefix}-l-${index}`}
            x={interiorLeft}
            // Each layer is drawn a hair taller than its slot so neighbouring
            // layers never show a seam from sub-pixel rounding.
            y={layerTop(geometry, index)}
            width={interiorWidth}
            height={layerHeight + 0.6}
            fill={`url(#${idPrefix}-g-${index})`}
          />
        ))}

        {/* Rounded surface on the topmost layer. */}
        {topColor !== undefined ? (
          <Ellipse
            cx={interiorLeft + interiorWidth / 2}
            cy={layerTop(geometry, topIndex)}
            rx={interiorWidth / 2}
            ry={meniscus}
            fill={liquidPalette(topColor).light}
          />
        ) : null}

        {/* A soft sheen down the left of the liquid, matching the glass highlight. */}
        <Path
          d={`M ${interiorLeft + interiorWidth * 0.16} ${layerTop(geometry, topIndex)}
              v ${(topIndex + 1) * layerHeight}
              h ${interiorWidth * 0.12}
              v ${-(topIndex + 1) * layerHeight} Z`}
          fill="#FFFFFF"
          opacity={0.13}
        />
      </G>
    </>
  );
}

export const LiquidColumn = memo(LiquidColumnComponent);

/**
 * A standalone band of `count` layers of a single colour, used by the pour
 * animation for liquid that is currently in motion.
 */
interface LiquidBandProps {
  readonly width: number;
  readonly height: number;
  readonly color: LiquidColor;
  readonly idPrefix: string;
  /** Rounds the bottom corners when the band sits on the tube's floor. */
  readonly bottomRadius: number;
  readonly meniscus: number;
}

function LiquidBandComponent({
  width,
  height,
  color,
  idPrefix,
  bottomRadius,
  meniscus,
}: LiquidBandProps) {
  const palette = liquidPalette(color);
  const clipId = `${idPrefix}-band-clip`;
  const gradientId = `${idPrefix}-band-grad`;
  const radius = Math.min(bottomRadius, width / 2, height);

  return (
    <>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.light} />
          <Stop offset="0.45" stopColor={palette.base} />
          <Stop offset="1" stopColor={palette.dark} />
        </LinearGradient>
        <ClipPath id={clipId}>
          <Path
            d={`M 0 0 H ${width} V ${height - radius}
                A ${radius} ${radius} 0 0 1 ${width - radius} ${height}
                H ${radius}
                A ${radius} ${radius} 0 0 1 0 ${height - radius} Z`}
          />
        </ClipPath>
      </Defs>

      <G clipPath={`url(#${clipId})`}>
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${gradientId})`} />
        <Ellipse cx={width / 2} cy={0} rx={width / 2} ry={meniscus} fill={palette.light} />
        <Rect x={width * 0.16} y={0} width={width * 0.12} height={height} fill="#FFFFFF" opacity={0.13} />
      </G>
    </>
  );
}

export const LiquidBand = memo(LiquidBandComponent);
