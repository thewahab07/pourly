/**
 * Level selection.
 *
 * Shows all 25 levels with their lock state. Locked levels are disabled here,
 * and the game route independently refuses to open one, so the lock cannot be
 * bypassed by navigating directly.
 */
import { useCallback, useMemo } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { LevelCard, type LevelCardState } from '../src/components/ui/LevelCard';
import { PaperBackground } from '../src/components/ui/PaperBackground';
import { ScreenHeader } from '../src/components/ui/ScreenHeader';
import { LEVELS, TOTAL_LEVELS } from '../src/levels';
import { useProgressStore } from '../src/state/progressStore';
import { UI_COLORS } from '../src/theme/colors';

const GRID_COLUMNS = 4;
const GRID_GAP = 12;
const SCREEN_PADDING = 20;

export default function LevelsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const unlockedLevel = useProgressStore((state) => state.unlockedLevel);
  const completedLevels = useProgressStore((state) => state.completedLevels);

  const cardSize = useMemo(() => {
    const available = width - SCREEN_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1);
    return Math.floor(available / GRID_COLUMNS);
  }, [width]);

  const completedSet = useMemo(() => new Set(completedLevels), [completedLevels]);

  const handleSelect = useCallback(
    (levelId: number) => {
      router.push({ pathname: '/game/[id]', params: { id: String(levelId) } });
    },
    [router],
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <PaperBackground>
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <ScreenHeader
          title="Levels"
          subtitle={`${completedLevels.length} of ${TOTAL_LEVELS} complete`}
          onBack={handleBack}
          backLabel="Back to home"
        />

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: SCREEN_PADDING,
            paddingBottom: 32,
            paddingTop: 8,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP }}>
            {LEVELS.map((level, index) => {
              const state: LevelCardState = completedSet.has(level.id)
                ? 'completed'
                : level.id <= unlockedLevel
                  ? 'unlocked'
                  : 'locked';

              return (
                <LevelCard
                  key={level.id}
                  levelId={level.id}
                  name={level.name}
                  difficulty={level.difficulty}
                  state={state}
                  size={cardSize}
                  index={index}
                  onPress={handleSelect}
                />
              );
            })}
          </View>

          <Text
            className="mt-7 text-center text-sm"
            style={{ color: UI_COLORS.inkMuted }}
          >
            Finish a level to unlock the next one.{'\n'}Completed levels stay open for replays.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </PaperBackground>
  );
}
