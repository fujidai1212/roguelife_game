import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Choice } from '../../core/types';
import { colors, fontSizes, spacing } from '../theme';

interface Props {
  /** このカラムに割り当てる選択肢（最大4つ）。足りない分は空白スロットになる */
  choices: Choice[];
  onSelect: (choiceId: string) => void;
}

const SLOTS_PER_COLUMN = 4;

/**
 * 選択肢ボタンの縦カラム。画面の左右に1つずつ置き、計8スロットにする
 * （GAME_DESIGN.md UI方針）。使わないスロットは空白の枠のまま表示し、
 * レイアウトを常に固定する。ボタンの高さは固定（縦に小さめ）。
 */
export function ChoiceColumn({ choices, onSelect }: Props) {
  const slots: (Choice | undefined)[] = Array.from(
    { length: SLOTS_PER_COLUMN },
    (_, i) => choices[i],
  );

  return (
    <View style={styles.column}>
      {slots.map((choice, i) =>
        choice ? (
          <Pressable
            key={choice.id}
            style={({ pressed }) => [
              styles.slot,
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
        ) : (
          <View key={`empty-${i}`} style={[styles.slot, styles.emptySlot]} />
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  slot: {
    height: 48,
    borderRadius: 4,
    borderWidth: 1,
  },
  button: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  buttonPressed: {
    backgroundColor: colors.border,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  emptySlot: {
    borderColor: colors.surface,
    backgroundColor: 'transparent',
  },
  label: {
    color: colors.text,
    fontSize: fontSizes.md,
    textAlign: 'center',
  },
  labelDisabled: {
    color: colors.textDim,
  },
});
