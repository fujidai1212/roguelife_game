import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes } from '../theme';

interface Props {
  /** プレースホルダーに表示する場面名。画像支給後は Image 表示に差し替える */
  sceneName: string;
}

/**
 * 場面イラスト表示。画像が未支給の間は単色＋テキストのプレースホルダーで動かす
 * （CLAUDE.md 画像アセット方針）。assets/images/ に規定ファイル名で画像が置かれたら
 * 自動で差し替わる仕組みを後続フェーズで実装する。
 */
export function IllustrationView({ sceneName }: Props) {
  return (
    <View style={styles.frame}>
      <Text style={styles.placeholder}>［イラスト: {sceneName}］</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    color: colors.textDim,
    fontSize: fontSizes.sm,
  },
});
