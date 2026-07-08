import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getChoices, getPersistentActions } from '../../core/choices';
import type { GameState } from '../../core/types';
import { enemies } from '../../data/enemies';
import { uiTexts } from '../../data/texts/ui';
import { ChoiceColumn } from '../components/ChoiceColumn';
import { IllustrationView } from '../components/IllustrationView';
import { LogView } from '../components/LogView';
import { SystemMenuBar } from '../components/SystemMenuBar';
import { useGameStore } from '../store/gameStore';
import { colors, fontSizes, spacing } from '../theme';

/**
 * ゲーム本体の画面。横3分割レイアウト（GAME_DESIGN.md UI方針）:
 * 左=選択肢1〜4 / 中央=ステータス帯・イラスト7・ログ3・常設行動バー /
 * 右=システムボタン（右上隅）+ 選択肢5〜8。
 * 状態の解釈はすべて core の純粋関数に任せ、ここは表示と入力の橋渡しだけを行う。
 */

function sceneName(state: GameState): string {
  if (state.phase === 'creation' || !state.life) return uiTexts.sceneNames.creation;
  if (state.life.scene === 'combat' && state.life.combat) {
    return enemies[state.life.combat.enemy.defId].name;
  }
  return uiTexts.sceneNames[state.life.scene];
}

function statusLine(state: GameState): string {
  if (state.phase !== 'life' || !state.life) return uiTexts.statusLineEmpty;
  const { character, dungeon } = state.life;
  return uiTexts.statusLine(
    character.stats.hp,
    character.stats.maxHp,
    character.gold,
    character.ageYears,
    dungeon?.depth,
  );
}

export function GameScreen() {
  const state = useGameStore((s) => s.state);
  const entries = useGameStore((s) => s.entries);
  const dispatch = useGameStore((s) => s.dispatch);
  const pushSystemMessage = useGameStore((s) => s.pushSystemMessage);

  // hydrate（セーブ読み込み）が終わるまでは黒画面のまま待つ
  if (!state) {
    return <View style={styles.container} />;
  }

  const bindings = getChoices(state);
  const persistent = getPersistentActions(state);
  const onSelect = (choiceId: string) => {
    const binding = [...bindings, ...persistent].find((b) => b.choice.id === choiceId);
    if (binding) dispatch(binding.action);
  };

  return (
    <View style={styles.container}>
      <View style={styles.side}>
        <View style={styles.sideTop} />
        <ChoiceColumn choices={bindings.slice(0, 4).map((b) => b.choice)} onSelect={onSelect} />
      </View>
      <View style={styles.center}>
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>{statusLine(state)}</Text>
        </View>
        <View style={styles.illustration}>
          <IllustrationView sceneName={sceneName(state)} />
        </View>
        <View style={styles.log}>
          <LogView entries={entries} />
        </View>
        {persistent.length > 0 && (
          <View style={styles.persistentBar}>
            {persistent.map((b) => (
              <Pressable
                key={b.choice.id}
                style={({ pressed }) => [
                  styles.persistentButton,
                  pressed && styles.persistentButtonPressed,
                ]}
                onPress={() => onSelect(b.choice.id)}
              >
                <Text style={styles.persistentLabel}>{b.choice.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
      <View style={styles.side}>
        <View style={styles.sideTop}>
          <SystemMenuBar
            onSelect={(id) =>
              pushSystemMessage(uiTexts.systemNotImplemented(uiTexts.systemLabels[id]))
            }
          />
        </View>
        <ChoiceColumn choices={bindings.slice(4, 8).map((b) => b.choice)} onSelect={onSelect} />
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
  persistentBar: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  persistentButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  persistentButtonPressed: {
    backgroundColor: colors.border,
  },
  persistentLabel: {
    color: colors.textDim,
    fontSize: fontSizes.sm,
  },
});
