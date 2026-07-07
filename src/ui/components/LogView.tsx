import { useRef } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import type { LogEntry } from '../../core/types';
import { colors, fontSizes, spacing } from '../theme';

interface Props {
  entries: LogEntry[];
}

/** テキストログ表示。新しい行が追加されたら自動で最下部までスクロールする */
export function LogView({ entries }: Props) {
  const scrollRef = useRef<ScrollView>(null);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
    >
      {entries.map((entry) => (
        <Text key={entry.id} style={styles.line}>
          {entry.text}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  line: {
    color: colors.text,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.6,
  },
});
