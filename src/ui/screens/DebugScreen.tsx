import { StyleSheet, Text, View } from 'react-native';

import type { Choice } from '../../core/types';
import { debugTexts } from '../../data/texts/debug';
import { ChoiceColumn } from '../components/ChoiceColumn';
import { IllustrationView } from '../components/IllustrationView';
import { LogView } from '../components/LogView';
import { SystemMenuBar, type SystemMenuId } from '../components/SystemMenuBar';
import { useDebugStore } from '../store/debugStore';
import { colors, fontSizes, spacing } from '../theme';

/**
 * フェーズ0の動作確認画面。レイアウトは本実装と同じ横3分割
 * （GAME_DESIGN.md UI方針）:
 * 左=ボタン4（上部は空き）/ 中央=ステータス帯・イラスト7・ログ3 /
 * 右=システムボタン（右上隅）+ ボタン4。
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

const systemLabels: Record<SystemMenuId, string> = {
  status: 'ステータス',
  pause: '中断',
  settings: '設定',
};

export function DebugScreen() {
  const entries = useDebugStore((s) => s.entries);
  const tap = useDebugStore((s) => s.tap);
  const tapSystem = useDebugStore((s) => s.tapSystem);

  return (
    <View style={styles.container}>
      <View style={styles.side}>
        <View style={styles.sideTop} />
        <ChoiceColumn choices={leftChoices} onSelect={tap} />
      </View>
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
      <View style={styles.side}>
        <View style={styles.sideTop}>
          <SystemMenuBar onSelect={(id) => tapSystem(systemLabels[id])} />
        </View>
        <ChoiceColumn choices={rightChoices} onSelect={tap} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  side: {
    flex: 1,
  },
  sideTop: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
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
    flex: 7,
  },
  log: {
    flex: 3,
  },
});
