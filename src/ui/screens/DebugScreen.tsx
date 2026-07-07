import { StyleSheet, Text, View } from 'react-native';

import type { Choice } from '../../core/types';
import { debugTexts } from '../../data/texts/debug';
import { ChoiceButtons } from '../components/ChoiceButtons';
import { LogView } from '../components/LogView';
import { useDebugStore } from '../store/debugStore';
import { colors, fontSizes, spacing } from '../theme';

/**
 * フェーズ0の動作確認画面。
 * レイアウトは本実装と同じ3段構成: 上部=ステータスバー / 中央=ログ / 下部=選択肢。
 */

const choices: Choice[] = [
  { id: 'look', label: debugTexts.choices.look },
  { id: 'shout', label: debugTexts.choices.shout },
  { id: 'sleep', label: debugTexts.choices.sleep },
  { id: 'dice', label: debugTexts.choices.dice },
];

export function DebugScreen() {
  const entries = useDebugStore((s) => s.entries);
  const tap = useDebugStore((s) => s.tap);

  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>HP -/-　金 -G　年齢 -　日数 -　深度 -</Text>
      </View>
      <LogView entries={entries} />
      <ChoiceButtons choices={choices} onSelect={tap} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statusBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusText: {
    color: colors.textDim,
    fontSize: fontSizes.sm,
  },
});
