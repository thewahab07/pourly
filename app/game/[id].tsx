/**
 * Gameplay screen.
 *
 * Owns nothing about the rules: it renders the board, forwards taps to the
 * store, and turns the store's outcome into sound and haptics. A level that is
 * not unlocked is refused here too, so typing the route directly cannot skip
 * the progression.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { GameBoard } from "../../src/components/game/GameBoard";
import { LevelCompleteOverlay } from "../../src/components/game/LevelCompleteOverlay";
import { Button } from "../../src/components/ui/Button";
import { Icon } from "../../src/components/ui/Icon";
import { PaperBackground } from "../../src/components/ui/PaperBackground";
import { ScreenHeader } from "../../src/components/ui/ScreenHeader";
import { getLevel, getNextLevelId } from "../../src/levels";
import { playSound } from "../../src/services/audio";
import {
  hapticInvalid,
  hapticPour,
  hapticSelection,
  hapticSuccess,
} from "../../src/services/haptics";
import {
  selectCanUndo,
  selectIsLevelComplete,
  useGameStore,
} from "../../src/state/gameStore";
import { useProgressStore } from "../../src/state/progressStore";
import { UI_COLORS } from "../../src/theme/colors";
import { rs } from "../../src/utils/responsive";

/** Parses the route parameter, which arrives as a string or an array of them. */
function parseLevelId(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const levelId = parseLevelId(params.id);

  const level = levelId === null ? undefined : getLevel(levelId);

  const isLevelUnlocked = useProgressStore((state) => state.isLevelUnlocked);
  const completeLevel = useProgressStore((state) => state.completeLevel);

  const game = useGameStore((state) => state.game);
  const selectedTube = useGameStore((state) => state.selectedTube);
  const activePour = useGameStore((state) => state.activePour);
  const rejected = useGameStore((state) => state.rejected);
  const locked = useGameStore((state) => state.locked);
  const canUndo = useGameStore(selectCanUndo);
  // True only once the winning pour has finished animating.
  const isComplete = useGameStore(selectIsLevelComplete);
  const loadLevel = useGameStore((state) => state.loadLevel);
  const tapTube = useGameStore((state) => state.tapTube);
  const finishPour = useGameStore((state) => state.finishPour);
  const undoMove = useGameStore((state) => state.undoMove);
  const restartLevel = useGameStore((state) => state.restartLevel);
  const clearLevel = useGameStore((state) => state.clearLevel);
  const cancelPour = useGameStore((state) => state.cancelPour);

  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
  const [celebrated, setCelebrated] = useState(false);

  const allowed = level !== undefined && isLevelUnlocked(level.id);

  // A locked or unknown level never loads; the player is sent to the level list.
  useEffect(() => {
    if (allowed) return;
    router.replace("/levels");
  }, [allowed, router]);

  useEffect(() => {
    if (!allowed || level === undefined) return;
    loadLevel(level);
    setCelebrated(false);
  }, [allowed, level, loadLevel]);

  // Leaving the screen must not strand an animation or a lock behind it.
  useFocusEffect(
    useCallback(() => {
      return () => {
        cancelPour();
      };
    }, [cancelPour]),
  );

  useEffect(() => {
    return () => {
      clearLevel();
    };
  }, [clearLevel]);

  // Celebrate once, when the board settles into its solved state.
  useEffect(() => {
    if (!isComplete || celebrated || level === undefined) return;
    setCelebrated(true);
    playSound("complete");
    hapticSuccess();
  }, [isComplete, celebrated, level]);

  const handleTapTube = useCallback(
    (index: number) => {
      const outcome = tapTube(index);
      switch (outcome.kind) {
        case "selected":
          playSound("select");
          hapticSelection();
          break;
        case "deselected":
          hapticSelection();
          break;
        case "poured":
          playSound("pour");
          hapticPour();
          break;
        case "rejected":
          playSound("invalid");
          hapticInvalid();
          break;
        case "ignored":
          break;
      }
    },
    [tapTube],
  );

  const handleUndo = useCallback(() => {
    if (undoMove()) {
      playSound("click");
      hapticSelection();
    }
  }, [undoMove]);

  const handleRestart = useCallback(() => {
    restartLevel();
    setCelebrated(false);
  }, [restartLevel]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleHome = useCallback(() => {
    if (level !== undefined) {
      completeLevel(level.id);
    }
    router.replace("/");
  }, [completeLevel, level, router]);

  const handleReplay = useCallback(() => {
    restartLevel();
    setCelebrated(false);
  }, [restartLevel]);

  const nextLevelId =
    level === undefined ? undefined : getNextLevelId(level.id);

  const handleContinue = useCallback(() => {
    if (level === undefined) return;
    // Completing the level is what unlocks the next one.
    completeLevel(level.id);

    if (nextLevelId === undefined) {
      router.replace("/levels");
      return;
    }
    router.replace({
      pathname: "/game/[id]",
      params: { id: String(nextLevelId) },
    });
  }, [completeLevel, level, nextLevelId, router]);

  const headerSubtitle = useMemo(() => {
    if (level === undefined || game === null) return undefined;
    return `${level.name} · ${game.moveCount} ${game.moveCount === 1 ? "move" : "moves"}`;
  }, [level, game]);

  if (level === undefined || game === null || !allowed) {
    return (
      <PaperBackground>
        <SafeAreaView className="flex-1 items-center justify-center">
          <Text style={{ color: UI_COLORS.inkMuted }}>Loading level…</Text>
        </SafeAreaView>
      </PaperBackground>
    );
  }

  return (
    <PaperBackground>
      <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
        <ScreenHeader
          title={`Level ${level.id}`}
          subtitle={headerSubtitle}
          onBack={handleBack}
          backLabel="Go back"
        />

        <View
          className="flex-1 items-center justify-center"
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setBoardSize((current) =>
              current.width === width && current.height === height
                ? current
                : { width, height },
            );
          }}
        >
          {boardSize.width > 0 ? (
            <GameBoard
              tubes={game.tubes}
              capacity={game.capacity}
              selectedTube={selectedTube}
              activePour={activePour}
              rejected={rejected}
              locked={locked}
              width={boardSize.width}
              height={boardSize.height}
              onTapTube={handleTapTube}
              onPourFinished={finishPour}
            />
          ) : null}
        </View>

        {/* Action bar: scales gap and padding with screen */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: rs(10),
            paddingHorizontal: rs(16),
            paddingBottom: rs(10),
            paddingTop: rs(4),
          }}
        >
          <Button
            label="Undo"
            onPress={handleUndo}
            variant="secondary"
            size="medium"
            disabled={!canUndo}
            icon={<Icon name="undo" size={rs(17)} color={UI_COLORS.ink} />}
            accessibilityHint={
              canUndo
                ? "Takes back your last pour"
                : "No moves to take back yet"
            }
          />
          <Button
            label="Restart"
            onPress={handleRestart}
            variant="secondary"
            size="medium"
            icon={<Icon name="restart" size={rs(17)} color={UI_COLORS.ink} />}
            accessibilityHint="Starts this level again from the beginning"
          />
        </View>
      </SafeAreaView>

      {isComplete ? (
        <LevelCompleteOverlay
          levelId={level.id}
          levelName={level.name}
          moveCount={game.moveCount}
          hasNextLevel={nextLevelId !== undefined}
          onReplay={handleReplay}
          onContinue={handleContinue}
          onHome={handleHome}
        />
      ) : null}
    </PaperBackground>
  );
}
