# Liquid Color Sort

A polished, completely offline liquid-sort puzzle game for Android, built with
Expo. Pour coloured liquids between glass tubes until every tube holds a single
colour, across 25 handcrafted levels of rising difficulty.

No ads, no accounts, no analytics, no network. Everything ships in the bundle.

## Running it

```bash
npm install
npx expo start
```

Then open the project on a device with Expo Go, or press `a` for an Android
emulator. The app is portrait-only.

## The game

Tap a tube to pick it up, then tap another to pour. A pour is legal when the
source has liquid, the destination has room, and the destination is either empty
or already showing the same colour on top. Only the contiguous run of colour at
the top of the source moves, and never more than the destination can hold.

Level 1 starts unlocked; finishing a level unlocks the next one. Completed
levels stay open for replays. Undo takes back moves one at a time, and restart
returns the board to its original arrangement.

## Levels

The 25 levels in `src/levels/levels.ts` are fixed data — nothing is generated at
runtime. Each was specified by hand (palette, tube count, spare tubes, capacity
and a target optimal-solution length) and materialised by
`scripts/design-levels.ts`, which grades candidate boards with the solver in
`src/engine/solver.ts`.

Difficulty rises through more colours, more tubes, deeper tubes, fewer spare
tubes and longer solutions — from 6 optimal moves at level 1 to 33 at level 25.
Levels 6, 10, 15 and 20 tighten the board to a single spare tube, which demands
real planning rather than more steps.

Every shipped level is proven solvable by `__tests__/levels.test.ts`, which runs
the solver and then replays its solution through the engine the player actually
plays against.

## Architecture

| Directory | Responsibility |
| --- | --- |
| `src/engine/` | Pure game rules and the level solver. No React. |
| `src/levels/` | The 25 fixed level definitions. |
| `src/state/` | Zustand stores for gameplay and for progress/settings. |
| `src/services/` | Storage, audio and haptics — the only modules touching those APIs. |
| `src/components/game/` | SVG tubes, liquid rendering and the pour animation. |
| `src/components/ui/` | Buttons, cards, background and other shared UI. |
| `src/theme/` | Colour system and design tokens. |
| `src/hooks/`, `src/utils/` | The pour timeline and the responsive board layout. |
| `app/` | Expo Router routes. Screens wire things up and hold no game rules. |
| `scripts/` | Development tools; never imported by the app. |

### Keeping animation and state in sync

A pour is committed to the engine the moment it is validated. The store then
exposes an `activePour` describing the transfer that is still being *drawn*, and
the renderer subtracts those layers from the destination while showing them
leaving the source — so liquid never teleports, yet the board is always correct.

Because the engine leads, an interrupted animation cannot corrupt anything:
restart, undo, and leaving the screen are all safe at any moment. Each pour
carries a token, so a late callback from a cancelled animation cannot unlock the
board or clear a newer pour. Interaction is locked for the duration of a pour,
which is what makes rapid tapping harmless.

## Assets

Icons, the splash mark and all audio are generated from code so they stay
reproducible and stay offline:

```bash
npm run generate:assets   # icon, splash icon, adaptive icons, favicon
npm run generate:audio    # sound effects and the looping music track
```

## Checks
npm e
```bash
npm run typecheck   # strict TypeScript, app and dev scripts
npm test            # engine, stores, storage, layout, and all 25 levels
npm run doctor      # Expo project diagnostics
```
