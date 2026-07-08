import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';

import { GameScreen } from './src/ui/screens/GameScreen';
import { useGameStore } from './src/ui/store/gameStore';
import { colors } from './src/ui/theme';

export default function App() {
  const hydrate = useGameStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <GameScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
