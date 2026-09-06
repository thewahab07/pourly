/**
 * Centralised haptics.
 *
 * Feedback is deliberately sparse — selection, rejection and success only —
 * so the game never feels buzzy. Every call is a no-op when the player has
 * turned haptics off, and on platforms where the API is unavailable.
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let enabled = true;

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

function isAvailable(): boolean {
  return enabled && (Platform.OS === 'ios' || Platform.OS === 'android');
}

/** Light tick when a tube is picked up or put down. */
export function hapticSelection(): void {
  if (!isAvailable()) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

/** Slightly firmer tick confirming liquid actually moved. */
export function hapticPour(): void {
  if (!isAvailable()) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
}

/** Warning buzz for a move the rules reject. */
export function hapticInvalid(): void {
  if (!isAvailable()) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
}

/** Celebration pattern when a level is solved. */
export function hapticSuccess(): void {
  if (!isAvailable()) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}
