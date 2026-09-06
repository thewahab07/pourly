/**
 * Home screen: the game's title mark and the three ways into the app.
 */
import { useCallback, useMemo } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '../src/components/ui/Button';
import { Icon } from '../src/components/ui/Icon';
import { PaperBackground } from '../src/components/ui/PaperBackground';
import { TitleMark } from '../src/components/ui/TitleMark';
import { TOTAL_LEVELS } from '../src/levels';
import { useProgressStore } from '../src/state/progressStore';
import { UI_COLORS } from '../src/theme/colors';

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const unlockedLevel = useProgressStore((state) => state.unlockedLevel);
  const completedCount = useProgressStore((state) => state.completedLevels.length);

  // The hero mark scales with the screen so it stays balanced on any phone.
  const tubeWidth = useMemo(() => Math.min(64, Math.max(40, width * 0.15)), [width]);

  const handlePlay = useCallback(() => {
    router.push({ pathname: '/game/[id]', params: { id: String(unlockedLevel) } });
  }, [router, unlockedLevel]);

  const handleLevels = useCallback(() => {
    router.push('/levels');
  }, [router]);

  const handleSettings = useCallback(() => {
    router.push('/settings');
  }, [router]);

  const playLabel = completedCount === 0 ? 'Play' : 'Continue';

  return (
    <PaperBackground>
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-between px-7 py-6">
          <View className="w-full items-center pt-6">
            <Text
              className="text-center font-extrabold tracking-tight"
              style={{ color: UI_COLORS.ink, fontSize: Math.min(42, width * 0.11), lineHeight: Math.min(48, width * 0.125) }}
              accessibilityRole="header"
            >
              Liquid{'\n'}Color Sort
            </Text>
            <Text className="mt-3 text-center text-base" style={{ color: UI_COLORS.inkMuted }}>
              Pour, match, and sort every tube
            </Text>
          </View>

          <View className="items-center justify-center py-4">
            <TitleMark tubeWidth={tubeWidth} />
          </View>

          <View className="w-full items-center">
            <View
              className="mb-6 flex-row items-center rounded-pill border px-5 py-2"
              style={{ backgroundColor: UI_COLORS.paperSoft, borderColor: UI_COLORS.paperLine }}
              accessibilityRole="text"
              accessibilityLabel={`${completedCount} of ${TOTAL_LEVELS} levels completed`}
            >
              <Text className="text-sm font-semibold" style={{ color: UI_COLORS.inkSoft }}>
                {completedCount} / {TOTAL_LEVELS} levels complete
              </Text>
            </View>

            <View className="w-full gap-3">
              <Button
                label={`${playLabel} — Level ${unlockedLevel}`}
                onPress={handlePlay}
                variant="primary"
                size="large"
                fullWidth
                icon={<Icon name="play" size={20} color="#FFFFFF" />}
                accessibilityLabel={`${playLabel}, level ${unlockedLevel}`}
                accessibilityHint="Opens the highest level you have unlocked"
              />
              <Button
                label="Levels"
                onPress={handleLevels}
                variant="secondary"
                size="large"
                fullWidth
                icon={<Icon name="levels" size={20} color={UI_COLORS.ink} />}
                accessibilityHint="Choose any level you have unlocked"
              />
              <Button
                label="Settings"
                onPress={handleSettings}
                variant="ghost"
                size="medium"
                fullWidth
                icon={<Icon name="settings" size={18} color={UI_COLORS.inkSoft} />}
                accessibilityHint="Sound, music, haptics and progress"
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </PaperBackground>
  );
}
