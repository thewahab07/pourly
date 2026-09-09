/**
 * Drives the pour choreography.
 *
 * Sequence: lift → travel+tilt → stream appears → liquid transfers → stream
 * fades → tube returns → settle. All on the UI thread via Reanimated.
 *
 * The engine commits the move before this runs; this hook only controls
 * what is drawn.
 */
import { useEffect, useRef } from 'react';
import {
  Easing,
  cancelAnimation,
  runOnJS,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { ActivePour } from '../state/gameStore';

// ─── Stage durations (ms) ────────────────────────────────────────────────────
const LIFT          = 180;   // tube rises out of its slot
const TRAVEL_DELAY  = 70;    // brief pause before traveling
const TRAVEL        = 360;   // tube sweeps to position above destination
const TILT_OVERLAP  = 70;    // stream starts slightly before travel finishes
const STREAM_IN     = 130;   // stream grows into view
const FLOW_PER_LAYER = 145;  // time per liquid layer transferred
const FLOW_MIN      = 240;   // minimum flow time even for 1 layer
const STREAM_OUT    = 120;   // stream fades after flow ends
const RETURN_DELAY  = 50;    // brief pause before tube returns
const RETURN        = 340;   // tube sweeps back to its slot
const SETTLE        = 220;   // tube eases back down into slot

// ─── Derived timing ──────────────────────────────────────────────────────────

/** When flow (liquid transfer) begins, relative to animation start. */
const FLOW_START = TRAVEL_DELAY + TRAVEL - TILT_OVERLAP;

/** How long it takes to transfer `amount` layers. */
const flowDuration = (amount: number): number =>
  Math.max(FLOW_MIN, amount * FLOW_PER_LAYER);

/** Total duration of the full pour sequence. */
export function pourDuration(amount: number): number {
  const flowTime = flowDuration(amount);
  return FLOW_START + flowTime + STREAM_OUT + RETURN_DELAY + RETURN + SETTLE;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PourTimeline {
  /** 0 = resting in slot, 1 = raised ready to travel. */
  readonly lift: SharedValue<number>;
  /** 0 = in slot, 1 = tilted over destination. */
  readonly travel: SharedValue<number>;
  /** 0 = no liquid transferred, 1 = fully transferred. */
  readonly flow: SharedValue<number>;
  /** Stream scale: 0 = hidden, 1 = full stream visible. */
  readonly streamScale: SharedValue<number>;
  /** Stream opacity. */
  readonly streamOpacity: SharedValue<number>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePourAnimation(
  activePour: ActivePour | null,
  onFinished: (token: number) => void,
): PourTimeline {
  const lift         = useSharedValue(0);
  const travel       = useSharedValue(0);
  const flow         = useSharedValue(0);
  const streamScale  = useSharedValue(0);
  const streamOpacity = useSharedValue(0);

  const finishedRef = useRef(onFinished);
  finishedRef.current = onFinished;

  useEffect(() => {
    if (activePour === null) {
      // Cancel everything and snap back to resting state.
      cancelAnimation(lift);
      cancelAnimation(travel);
      cancelAnimation(flow);
      cancelAnimation(streamScale);
      cancelAnimation(streamOpacity);
      lift.value         = 0;
      travel.value       = 0;
      flow.value         = 0;
      streamScale.value  = 0;
      streamOpacity.value = 0;
      return;
    }

    const { token, amount } = activePour;
    const flowTime = flowDuration(amount);

    const notify = (): void => { finishedRef.current(token); };

    // Reset to initial state
    lift.value         = 0;
    travel.value       = 0;
    flow.value         = 0;
    streamScale.value  = 0;
    streamOpacity.value = 0;

    // ── Lift ─────────────────────────────────────────────────────────────────
    // Rise, hold through the pour, then settle back down.
    const holdDuration = FLOW_START + flowTime + STREAM_OUT + RETURN_DELAY + RETURN - LIFT;
    lift.value = withSequence(
      withTiming(1, { duration: LIFT, easing: Easing.out(Easing.cubic) }),
      withDelay(
        holdDuration,
        withTiming(0, { duration: SETTLE, easing: Easing.out(Easing.cubic) }, (finished) => {
          'worklet';
          if (finished === true) runOnJS(notify)();
        }),
      ),
    );

    // ── Travel (tilt to destination and back) ────────────────────────────────
    // Accelerate into position, then decelerate smoothly before returning.
    travel.value = withSequence(
      withDelay(
        TRAVEL_DELAY,
        withTiming(1, { duration: TRAVEL, easing: Easing.inOut(Easing.cubic) }),
      ),
      withDelay(
        flowTime + STREAM_OUT + RETURN_DELAY,
        withTiming(0, { duration: RETURN, easing: Easing.inOut(Easing.quad) }),
      ),
    );

    // ── Liquid flow ──────────────────────────────────────────────────────────
    // Smooth ease-in at the start (liquid takes a moment to start flowing),
    // ease-out at the end (last drops fall slowly).
    flow.value = withDelay(
      FLOW_START,
      withTiming(1, { duration: flowTime, easing: Easing.inOut(Easing.cubic) }),
    );

    // ── Stream appearance ────────────────────────────────────────────────────
    // Grows in quickly as pouring starts, shrinks out after flow ends.
    streamScale.value = withSequence(
      withDelay(
        FLOW_START - STREAM_IN * 0.4,
        withTiming(1, { duration: STREAM_IN, easing: Easing.out(Easing.quad) }),
      ),
      withDelay(
        flowTime,
        withTiming(0, { duration: STREAM_OUT, easing: Easing.in(Easing.quad) }),
      ),
    );

    streamOpacity.value = withSequence(
      withDelay(
        FLOW_START - STREAM_IN * 0.4,
        withTiming(1, { duration: STREAM_IN * 0.6, easing: Easing.out(Easing.quad) }),
      ),
      withDelay(
        flowTime + STREAM_OUT * 0.3,
        withTiming(0, { duration: STREAM_OUT * 0.7, easing: Easing.in(Easing.quad) }),
      ),
    );

    // Safety watchdog: release board if animation callback is ever lost.
    const watchdog = setTimeout(notify, pourDuration(amount) + 800);
    return () => { clearTimeout(watchdog); };
  }, [activePour, lift, travel, flow, streamScale, streamOpacity]);

  return { lift, travel, flow, streamScale, streamOpacity };
}
