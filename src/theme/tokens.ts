/**
 * Design tokens that need numeric values.
 *
 * Spacing, radii and typography are expressed as NativeWind classes; these are
 * the pieces that Reanimated and React Native style objects need as numbers.
 */

/** Reanimated spring configuration used for tube motion. */
export const SPRING = {
  tube: { damping: 18, stiffness: 190, mass: 0.9 },
  gentle: { damping: 20, stiffness: 140, mass: 1 },
  pop: { damping: 12, stiffness: 260, mass: 0.8 },
} as const;

export const SHADOW = {
  card: {
    shadowColor: '#2A2015',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
  },
  button: {
    shadowColor: '#2A2015',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;
