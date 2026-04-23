import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PlaceholderScreen(props: { title: string }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.title}>{props.title}</Text>
        <Text style={styles.sub}>Écran à compléter.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b1220' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  title: { color: 'white', fontSize: 18, fontWeight: '800' },
  sub: { color: '#b7c0d6', fontSize: 13 },
});

