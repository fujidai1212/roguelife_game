import { StyleSheet, Text, View } from 'react-native';

import type { Choice } from '../../core/types';
import { debugTexts } from '../../data/texts/debug';
import { ChoiceColumn } from '../components/ChoiceColumn';
import { IllustrationView } from '../components/IllustrationView';
import { LogView } from '../components/LogView';
import { useDebugStore } from '../store/debugStore';
import { colors, fontSizes, spacing } from '../theme';

/**
 * フェーズ0の動作確認画面。レイアウトは本実装と同じ横3分割
 * （GAME_DESIGN.md UI方針）: 左=ボタン4 / 中央=ステータス帯・イラスト・ログ / 右=ボタン4。
 */

const choices: Choice[] = [
  { id: 'look', label: debugTexts.choices.look },
  { id: 'shout', label: debugTexts.choices.shout },
  { id: 'sleep', label: debugTexts.choices.sleep },
  { id: 'dice', label: debugTexts.choices.dice },
];

// 選択肢1〜4は左カラム、5〜8は右カラムに割り当てる
const leftChoices = choices.slice(0, 4);
const rightChoices = choices.slice(4, 8);

export function DebugScreen() {
  const entries = useDebugStore((s) => s.entries);
  const tap = useDebugStore((s) => s.tap);

  return (
    <View style={styles.container}>
      <ChoiceColumn choices={leftChoices} onSelect={tap} />
      <View style={styles.center}>
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>HP -/-　金 -G　年齢 -　日数 -　深度 -</Text>
        </View>
        <View style={styles.illustration}>
          <IllustrationView sceneName="目覚めの場所" />
        </View>
        <View style={styles.log}>
          <LogView entries={entries} />
        </View>
      </View>
      <ChoiceColumn choices={rightChoices} onSelect={tap} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  center: {
    flex: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  statusBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusText: {
    color: colors.textDim,
    fontSize: fontSizes.sm,
  },
  illustration: {
    flex: 1,
  },
  log: {
    flex: 1,
  },
});
