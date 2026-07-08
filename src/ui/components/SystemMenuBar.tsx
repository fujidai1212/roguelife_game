import { Pressable, StyleSheet, Text, View } from 'react-native';

import { uiTexts } from '../../data/texts/ui';
import { colors, fontSizes, spacing } from '../theme';

export type SystemMenuId = 'status' | 'pause' | 'settings';

interface Props {
  onSelect: (id: SystemMenuId) => void;
}

const items: { id: SystemMenuId; label: string }[] = (
  ['status', 'pause', 'settings'] as const
).map((id) => ({ id, label: uiTexts.systemLabels[id] }));

/** 右上隅のシステムボタン列（GAME_DESIGN.md UI方針） */
export function SystemMenuBar({ onSelect }: Props) {
  return (
    <View style={styles.bar}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => onSelect(item.id)}
        >
          <Text style={styles.label}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  button: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  buttonPressed: {
    backgroundColor: colors.border,
  },
  label: {
    color: colors.textDim,
    fontSize: fontSizes.sm,
  },
});
