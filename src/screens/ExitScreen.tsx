import React, { useEffect, useMemo } from 'react';
import { Alert, BackHandler, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';

export default function ExitScreen() {
  const { theme, hydrateTheme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  useEffect(() => {
    hydrateTheme().catch(() => undefined);
    const t = setTimeout(() => {
      if (Platform.OS === 'android') {
        BackHandler.exitApp();
      } else {
        Alert.alert("Quitter l'application", "iOS ne permet pas de quitter automatiquement l'application.");
      }
    }, 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.title}>Quitter…</Text>
        <Text style={styles.sub}>Fermeture de l’application.</Text>
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    title: { color: theme.text, fontSize: 18, fontWeight: '800' },
    sub: { color: theme.textMuted, fontSize: 13 },
  });
}

