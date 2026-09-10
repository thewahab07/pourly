/**
 * Home screen: the game's title mark and the three ways into the app.
 */
import { useCallback, useMemo } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Button } from "../src/components/ui/Button";
import { Icon } from "../src/components/ui/Icon";
import { PaperBackground } from "../src/components/ui/PaperBackground";
import { TitleMark } from "../src/components/ui/TitleMark";
import { TOTAL_LEVELS } from "../src/levels";
import { useProgressStore } from "../src/state/progressStore";
import { UI_COLORS } from "../src/theme/colors";
import { rf, rs, rsp } from "../src/utils/responsive";

export default function HomeScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const unlockedLevel = useProgressStore((state) => state.unlockedLevel);
  const completedCount = useProgressStore(
    (state) => state.completedLevels.length,
  );

  // The hero mark scales with the screen so it stays balanced on any phone.
  const tubeWidth = useMemo(
    () => Math.min(rs(62), Math.max(rs(36), width * 0.14)),
    [width],
  );

  // On very short screens (landscape or small phones) compress vertical spacing.
  const isCompact = height < 650;

  const handlePlay = useCallback(() => {
    router.push({
      pathname: "/game/[id]",
      params: { id: String(unlockedLevel) },
    });
  }, [router, unlockedLevel]);

  const handleLevels = useCallback(() => {
    router.push("/levels");
  }, [router]);

  const handleSettings = useCallback(() => {
    router.push("/settings");
  }, [router]);

  const playLabel = completedCount === 0 ? "Play" : "Continue";

  return (
    <PaperBackground>
      <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: rsp(24),
            paddingVertical: rs(isCompact ? 12 : 20),
          }}
        >
          {/* Title */}
          <View
            style={{
              width: "100%",
              alignItems: "center",
              paddingTop: rs(isCompact ? 8 : 20),
            }}
          >
            <Text
              style={{
                textAlign: "center",
                fontWeight: "900",
                letterSpacing: -0.5,
                color: UI_COLORS.ink,
                fontSize: Math.min(rf(38), width * 0.105),
                lineHeight: Math.min(rf(44), width * 0.12),
              }}
              accessibilityRole="header"
            >
              Pourly
            </Text>
            <Text
              style={{
                marginTop: rs(8),
                textAlign: "center",
                fontSize: rf(14),
                color: UI_COLORS.inkMuted,
              }}
            >
              Pour, match, and sort every tube
            </Text>
          </View>

          {/* Hero mark */}
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: rs(isCompact ? 8 : 16),
            }}
          >
            <TitleMark tubeWidth={tubeWidth} />
          </View>

          {/* Bottom CTA group */}
          <View style={{ width: "100%", alignItems: "center" }}>
            <View
              style={{
                marginBottom: rs(isCompact ? 12 : 20),
                flexDirection: "row",
                alignItems: "center",
                borderRadius: 999,
                borderWidth: 1.5,
                paddingHorizontal: rsp(18),
                paddingVertical: rs(7),
                backgroundColor: UI_COLORS.paperSoft,
                borderColor: UI_COLORS.paperLine,
              }}
              accessibilityRole="text"
              accessibilityLabel={`${completedCount} of ${TOTAL_LEVELS} levels completed`}
            >
              <Text
                style={{
                  fontSize: rf(13),
                  fontWeight: "600",
                  color: UI_COLORS.inkSoft,
                }}
              >
                {completedCount} / {TOTAL_LEVELS} levels complete
              </Text>
            </View>

            <View style={{ width: "100%", gap: rs(10) }}>
              <Button
                label={`${playLabel} — Level ${unlockedLevel}`}
                onPress={handlePlay}
                variant="primary"
                size="large"
                fullWidth
                icon={<Icon name="play" size={rs(19)} color="#FFFFFF" />}
                accessibilityLabel={`${playLabel}, level ${unlockedLevel}`}
                accessibilityHint="Opens the highest level you have unlocked"
              />
              <Button
                label="Levels"
                onPress={handleLevels}
                variant="secondary"
                size="large"
                fullWidth
                icon={
                  <Icon name="levels" size={rs(19)} color={UI_COLORS.ink} />
                }
                accessibilityHint="Choose any level you have unlocked"
              />
              <Button
                label="Settings"
                onPress={handleSettings}
                variant="ghost"
                size="medium"
                fullWidth
                icon={
                  <Icon
                    name="settings"
                    size={rs(17)}
                    color={UI_COLORS.inkSoft}
                  />
                }
                accessibilityHint="Sound, music, haptics and progress"
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </PaperBackground>
  );
}
