/**
 * A screen title with a back control, shared by every secondary screen.
 */
import { memo, useCallback, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { playSound } from "../../services/audio";
import { UI_COLORS } from "../../theme/colors";
import { rf, rs, rsp } from "../../utils/responsive";
import { Icon } from "./Icon";

interface ScreenHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly onBack: () => void;
  readonly backLabel?: string;
  readonly trailing?: ReactNode;
}

function ScreenHeaderComponent({
  title,
  subtitle,
  onBack,
  backLabel = "Go back",
  trailing,
}: ScreenHeaderProps) {
  const handleBack = useCallback(() => {
    playSound("click");
    onBack();
  }, [onBack]);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={handleBack}
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        hitSlop={10}
        style={styles.backButton}
      >
        <Icon name="back" size={rs(20)} color={UI_COLORS.ink} />
      </Pressable>

      <View style={styles.titleBlock}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle !== undefined ? (
          <Text style={styles.subtitle}>{subtitle}</Text>
        ) : null}
      </View>

      <View style={styles.trailing}>{trailing}</View>
    </View>
  );
}

const BTN = rs(40);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rsp(16),
    paddingTop: rs(4),
    paddingBottom: rs(10),
  },
  backButton: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI_COLORS.paperSoft,
    borderWidth: 2,
    borderColor: UI_COLORS.paperLine,
  },
  titleBlock: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: rf(19),
    fontWeight: "800",
    color: UI_COLORS.ink,
  },
  subtitle: {
    marginTop: rs(2),
    fontSize: rf(12),
    color: UI_COLORS.inkMuted,
  },
  trailing: {
    width: BTN,
    alignItems: "flex-end",
  },
});

export const ScreenHeader = memo(ScreenHeaderComponent);
