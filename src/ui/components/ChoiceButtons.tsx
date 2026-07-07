import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Choice } from '../../core/types';
import { colors, fontSizes, spacing } from '../theme';

interface Props {
  choices: Choice[];
  onSelect: (choiceId: string) => void;
}

/** 選択肢ボタン群。最大8つを2列×4段で表示する（GAME_DESIGN.md UI方針） */
export function ChoiceButtons({ choices, onSelect }: Props) {
  return (
    <View style={styles.grid}>
      {choices.slice(0, 8).map((choice) => (
        <Pressable
          key={choice.id}
          style={({ pressed }) => [
            styles.button,
            choice.disabled && styles.buttonDisabled,
            pressed && !choice.disabled && styles.buttonPressed,
          ]}
          disabled={choice.disabled}
          onPress={() => onSelect(choice.id)}
        >
          <Text style={[styles.label, choice.disabled && styles.labelDisabled]}>
            {choice.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    gap: spacing.sm,
  },
  button: {
    width: '48.5%',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  buttonPressed: {
    backgroundColor: colors.border,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  label: {
    color: colors.text,
    fontSize: fontSizes.md,
  },
  labelDisabled: {
    color: colors.textDim,
  },
});
