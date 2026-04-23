import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';

type RootStackParamList = {
  Welcome: undefined;
  Main: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  const { theme, hydrateTheme } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    hydrateTheme();
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.05,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [hydrateTheme, scale]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.top}>
          <Text style={styles.title}>Bienvenue</Text>
          <Text style={styles.subtitle}>Accédez à votre gestion d'élèves et bulletins.</Text>
        </View>

        <View style={styles.center}>
          <Animated.View style={[styles.buttonWrapper, { transform: [{ scale }] }]}> 
            <Pressable
              onPress={() => navigation.replace('Main')}
              style={({ pressed }) => [
                styles.startButton,
                pressed ? styles.startButtonPressed : null,
              ]}
            >
              <Text style={styles.startButtonText}>Commencer</Text>
            </Pressable>
          </Animated.View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.finePrint}>By Rayah</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    container: { flex: 1, padding: 24, justifyContent: 'space-between' },
    top: { marginTop: 24 },
    title: { color: theme.text, fontSize: 34, fontWeight: '900', textAlign: 'center' },
    subtitle: { color: theme.textMuted, fontSize: 15, textAlign: 'center', marginTop: 12, lineHeight: 22 },
    center: { alignItems: 'center', justifyContent: 'center', flex: 1 },
    buttonWrapper: { width: '100%' },
    startButton: {
      backgroundColor: theme.primary,
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    startButtonPressed: { opacity: 0.88 },
    startButtonText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.4 },
    footer: { alignItems: 'flex-end', marginBottom: 12 },
    finePrint: { color: theme.textMuted, fontSize: 11 },
  });
}
