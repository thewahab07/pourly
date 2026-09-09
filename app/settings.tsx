/**
 * Settings: audio and haptics toggles, and a guarded progress reset.
 *
 * Every change is written to storage immediately through the progress store, so
 * there is nothing to "save" and nothing to lose if the app is killed.
 */
import { useCallback, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Button } from "../src/components/ui/Button";
import { Icon } from "../src/components/ui/Icon";
import { PaperBackground } from "../src/components/ui/PaperBackground";
import { ScreenHeader } from "../src/components/ui/ScreenHeader";
import { SettingRow } from "../src/components/ui/SettingRow";
import { TOTAL_LEVELS } from "../src/levels";
import { hapticSelection } from "../src/services/haptics";
import { useProgressStore } from "../src/state/progressStore";
import { UI_COLORS } from "../src/theme/colors";
import { SHADOW } from "../src/theme/tokens";
import { rf, rs, rsp } from "../src/utils/responsive";

export default function SettingsScreen() {
  const router = useRouter();

  const settings = useProgressStore((state) => state.settings);
  const completedLevels = useProgressStore((state) => state.completedLevels);
  const setSoundEnabled = useProgressStore((state) => state.setSoundEnabled);
  const setMusicEnabled = useProgressStore((state) => state.setMusicEnabled);
  const setHapticsEnabled = useProgressStore(
    (state) => state.setHapticsEnabled,
  );
  const resetProgress = useProgressStore((state) => state.resetProgress);

  const [resetting, setResetting] = useState(false);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleHaptics = useCallback(
    (value: boolean) => {
      setHapticsEnabled(value);
      // Demonstrate the setting the moment it is switched on.
      if (value) hapticSelection();
    },
    [setHapticsEnabled],
  );

  const handleReset = useCallback(() => {
    Alert.alert(
      "Reset all progress?",
      `This permanently deletes your progress. All ${TOTAL_LEVELS} levels will be locked again except level 1. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete progress",
          style: "destructive",
          onPress: () => {
            setResetting(true);
            void resetProgress().finally(() => setResetting(false));
          },
        },
      ],
    );
  }, [resetProgress]);

  return (
    <PaperBackground>
      <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
        <ScreenHeader
          title="Settings"
          onBack={handleBack}
          backLabel="Back to home"
        />

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: rsp(18),
            paddingBottom: rs(34),
            paddingTop: rs(6),
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            className="overflow-hidden rounded-card border"
            style={[
              {
                backgroundColor: UI_COLORS.paper,
                borderColor: UI_COLORS.paperLine,
              },
              SHADOW.card,
            ]}
          >
            <SettingRow
              icon="sound"
              label="Sound effects"
              description="Taps, pours and level completion"
              value={settings.soundEnabled}
              onChange={setSoundEnabled}
            />
            <View
              className="h-px"
              style={{ backgroundColor: UI_COLORS.paperLine }}
            />
            <SettingRow
              icon="music"
              label="Background music"
              description="A calm loop while you play"
              value={settings.musicEnabled}
              onChange={setMusicEnabled}
            />
            <View
              className="h-px"
              style={{ backgroundColor: UI_COLORS.paperLine }}
            />
            <SettingRow
              icon="vibrate"
              label="Haptics"
              description="Subtle vibration on selection and success"
              value={settings.hapticsEnabled}
              onChange={handleHaptics}
            />
          </View>

          <Text
            style={{
              marginTop: rs(28),
              marginBottom: rs(10),
              paddingHorizontal: rs(4),
              fontSize: rf(11),
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: 1,
              color: UI_COLORS.inkMuted,
            }}
          >
            Progress
          </Text>

          <View
            className="rounded-card border"
            style={[
              {
                backgroundColor: UI_COLORS.paper,
                borderColor: UI_COLORS.paperLine,
                padding: rs(16),
              },
              SHADOW.card,
            ]}
          >
            <Text style={{ fontSize: rf(15), color: UI_COLORS.inkSoft }}>
              You have completed{" "}
              <Text style={{ fontWeight: "700", color: UI_COLORS.ink }}>
                {completedLevels.length} of {TOTAL_LEVELS}
              </Text>{" "}
              levels.
            </Text>

            <View style={{ marginTop: rs(14) }}>
              <Button
                label={resetting ? "Resetting…" : "Reset progress"}
                onPress={handleReset}
                variant="danger"
                size="medium"
                fullWidth
                disabled={resetting || completedLevels.length === 0}
                icon={<Icon name="trash" size={rs(17)} color="#FFFFFF" />}
                accessibilityHint="Asks for confirmation before deleting all progress"
              />
            </View>
          </View>

          <Text
            style={{
              marginTop: rs(28),
              textAlign: "center",
              fontSize: rf(11),
              color: UI_COLORS.inkMuted,
            }}
          >
            Pourly plays entirely offline.{"\n"}No ads, no accounts,
            no tracking.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </PaperBackground>
  );
}
