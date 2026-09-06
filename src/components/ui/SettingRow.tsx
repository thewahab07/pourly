/**
 * A labelled toggle row used by the settings screen.
 */
import { memo, useCallback } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { playSound } from '../../services/audio';
import { UI_COLORS } from '../../theme/colors';
import { Icon, type IconName } from './Icon';

interface SettingRowProps {
  readonly icon: IconName;
  readonly label: string;
  readonly description: string;
  readonly value: boolean;
  readonly onChange: (value: boolean) => void;
}

function SettingRowComponent({ icon, label, description, value, onChange }: SettingRowProps) {
  const handleChange = useCallback(
    (next: boolean) => {
      onChange(next);
      // Play the confirmation *after* the change, so turning sound on is audible
      // and turning it off is silent.
      playSound('click');
    },
    [onChange],
  );

  return (
    <View style={styles.row}>
      <View style={styles.iconBubble}>
        <Icon name={icon} size={20} color={UI_COLORS.inkSoft} />
      </View>

      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <Switch
        value={value}
        onValueChange={handleChange}
        accessibilityLabel={label}
        accessibilityHint={description}
        accessibilityRole="switch"
        trackColor={{ false: UI_COLORS.paperDeep, true: UI_COLORS.brandLight }}
        thumbColor={value ? UI_COLORS.brand : UI_COLORS.paperSoft}
        ios_backgroundColor={UI_COLORS.paperDeep}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI_COLORS.paperSoft,
    borderWidth: 1.5,
    borderColor: UI_COLORS.paperLine,
  },
  text: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: UI_COLORS.ink,
  },
  description: {
    marginTop: 2,
    fontSize: 13,
    color: UI_COLORS.inkMuted,
  },
});

export const SettingRow = memo(SettingRowComponent);
