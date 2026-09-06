/**
 * The tube board.
 *
 * Owns the responsive layout, renders every tube, and runs the pour timeline.
 * All game rules live in the store and the engine — this component only decides
 * what the board looks like and where things are.
 */
import { memo, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { LiquidColor } from '../../engine/types';
import { usePourAnimation } from '../../hooks/usePourAnimation';
import type { ActivePour, RejectedMove } from '../../state/gameStore';
import { liquidPalette } from '../../theme/colors';
import { computeBoardLayout } from '../../utils/layout';
import { PourStream } from './PourStream';
import { TubeView } from './TubeView';
import { computePourGeometry, pourHeadroom } from './pourGeometry';

interface GameBoardProps {
  readonly tubes: readonly (readonly LiquidColor[])[];
  readonly capacity: number;
  readonly selectedTube: number | null;
  readonly activePour: ActivePour | null;
  readonly rejected: RejectedMove | null;
  readonly locked: boolean;
  /** Space the board may occupy, measured by the screen. */
  readonly width: number;
  readonly height: number;
  readonly onTapTube: (index: number) => void;
  readonly onPourFinished: (token: number) => void;
}

/**
 * Horizontal breathing room kept inside the board. Applied here rather than by
 * the caller so a measured container's padding can never be double-counted.
 */
const BOARD_INSET = 14;

/** Describes a tube for screen readers: its position, contents and state. */
function describeTube(
  index: number,
  layers: readonly LiquidColor[],
  capacity: number,
  selected: boolean,
): string {
  const position = `Tube ${index + 1}`;
  if (layers.length === 0) {
    return `${position}, empty${selected ? ', selected' : ''}`;
  }

  // Read the contents top-down, which is the order they will pour out.
  const topDown = [...layers].reverse().map((color) => liquidPalette(color).label);
  const contents = topDown.join(', ');
  const fullness = layers.length === capacity ? 'full' : `${layers.length} of ${capacity} layers`;
  return `${position}, ${fullness}, from top: ${contents}${selected ? ', selected' : ''}`;
}

function GameBoardComponent({
  tubes,
  capacity,
  selectedTube,
  activePour,
  rejected,
  locked,
  width,
  height,
  onTapTube,
  onPourFinished,
}: GameBoardProps) {
  const layout = useMemo(
    () =>
      computeBoardLayout({
        width: Math.max(1, width - BOARD_INSET * 2),
        // Leave room above and below for a tilted tube during a pour.
        height: Math.max(1, height * 0.72),
        tubeCount: tubes.length,
        capacity,
      }),
    [width, height, tubes.length, capacity],
  );

  const headroom = useMemo(() => pourHeadroom(layout), [layout]);

  const pourGeometry = useMemo(() => {
    if (activePour === null) return null;
    return computePourGeometry(layout, activePour.from, activePour.to);
  }, [activePour, layout]);

  const timeline = usePourAnimation(activePour, onPourFinished);

  const handleTap = useCallback(
    (index: number) => {
      onTapTube(index);
    },
    [onTapTube],
  );

  return (
    // Headroom is reserved above *and* below, so the resting board stays
    // vertically centred while a pour still has room to tilt into.
    <View style={[styles.root, { height: layout.boardHeight + headroom * 2 }]}>
      <View
        style={[
          styles.board,
          {
            width: layout.boardWidth,
            height: layout.boardHeight,
            marginTop: headroom,
          },
        ]}
      >
        {tubes.map((layers, index) => {
          const slot = layout.slots[index];
          if (slot === undefined) return null;

          const isSource = activePour?.from === index;
          const isDestination = activePour?.to === index;
          const selected = selectedTube === index;

          return (
            <TubeView
              key={index}
              index={index}
              layers={layers}
              width={layout.tubeWidth}
              height={layout.tubeHeight}
              layerHeight={layout.layerHeight}
              slot={slot}
              selected={selected}
              disabled={locked}
              pourRole={isSource ? 'source' : isDestination ? 'destination' : null}
              pourAmount={isSource || isDestination ? (activePour?.amount ?? 0) : 0}
              pourColor={isSource || isDestination ? (activePour?.color ?? null) : null}
              pourTarget={isSource ? (pourGeometry?.target ?? null) : null}
              lift={timeline.lift}
              travel={timeline.travel}
              flow={timeline.flow}
              shakeToken={rejected?.tube === index ? rejected.token : null}
              onPress={handleTap}
              accessibilityLabel={describeTube(index, layers, capacity, selected)}
            />
          );
        })}

        {activePour !== null && pourGeometry !== null ? (
          <PourStream
            color={activePour.color}
            left={pourGeometry.stream.left}
            top={pourGeometry.stream.top}
            svgWidth={pourGeometry.stream.svgWidth}
            svgHeight={pourGeometry.stream.svgHeight}
            startX={pourGeometry.stream.startX}
            startY={pourGeometry.stream.startY}
            endX={pourGeometry.stream.endX}
            endY={pourGeometry.stream.endY}
            progress={timeline.streamScale}
            opacity={timeline.streamOpacity}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  board: {
    position: 'relative',
  },
});

export const GameBoard = memo(GameBoardComponent);
