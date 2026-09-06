# Working on Liquid Color Sort

## Layout of the project

- `src/engine/` — pure game rules and the level-validation solver. No React, no
  imports from anywhere else in `src/`. Change rules here, never in a component.
- `src/levels/` — the 25 fixed level definitions. Static data only.
- `src/state/` — Zustand stores. `gameStore` owns the level in play;
  `progressStore` owns unlocks and settings.
- `src/services/` — the only modules allowed to touch AsyncStorage, expo-audio
  or expo-haptics.
- `src/components/game/` — tube and liquid rendering, and the pour animation.
- `src/components/ui/` — the shared design system.
- `app/` — Expo Router routes; screens wire things together and hold no rules.
- `scripts/` — development tools. Never imported by the app.

## Before you commit

```bash
npm run typecheck   # app + dev scripts, strict, no `any`
npm test            # engine, stores, storage, layout, and all 25 levels
```

`__tests__/levels.test.ts` runs the solver against every shipped level and
replays the solution through the engine, so a level that is not solvable fails
the build. If you change a level, that test is the gate.

## Regenerating assets

Icons and audio are generated, not hand-drawn, so they stay reproducible:

```bash
npm run generate:assets   # app icon, splash icon, adaptive icons, favicon
npm run generate:audio    # sound effects and the music loop
npm run design:levels     # re-derives level boards from their specifications
npm run probe:difficulty  # measures difficulty distributions per board shape
```

## Dependencies that look unused but are not

`expo-asset` is never imported by application code, but it is a required
*native* peer dependency of `expo-audio` and must stay a direct dependency —
`npx expo-doctor` fails without it, and builds outside Expo Go can crash.
`expo-constants` and `expo-linking` are non-optional peers of `expo-router`, and
`react-native-worklets` provides the Babel plugin Reanimated 4 needs.

## Things to keep true

- The engine is committed to *before* the pour animation runs; `activePour`
  describes only what is still being drawn. Never move rule evaluation into a
  component or an animation callback.
- Every pour carries a token. Animation callbacks must check it, so a late
  callback from a cancelled pour cannot unlock the board.
- No network calls, ads, analytics or accounts. The game is fully offline.
