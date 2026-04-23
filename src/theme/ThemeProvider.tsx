import React, { createContext, useContext, useMemo, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme, lightTheme, THEME_KEY, Theme, ThemeName } from './theme';

type ThemeContextValue = {
  theme: Theme;
  themeName: ThemeName;
  setThemeName: (next: ThemeName) => Promise<void>;
  toggleTheme: () => Promise<void>;
  hydrateTheme: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveTheme(saved: ThemeName | null, system: 'light' | 'dark' | null | undefined): Theme {
  const resolved: ThemeName = saved ?? (system === 'light' ? 'light' : 'dark');
  return resolved === 'light' ? lightTheme : darkTheme;
}

export function ThemeProvider(props: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [savedTheme, setSavedTheme] = useState<ThemeName | null>(null);

  const theme = useMemo(() => resolveTheme(savedTheme, systemScheme), [savedTheme, systemScheme]);

  async function setThemeName(next: ThemeName) {
    setSavedTheme(next);
    await AsyncStorage.setItem(THEME_KEY, next);
    Appearance.setColorScheme(next);
  }

  async function toggleTheme() {
    const next: ThemeName = theme.name === 'dark' ? 'light' : 'dark';
    await setThemeName(next);
  }

  async function hydrateTheme() {
    const v = (await AsyncStorage.getItem(THEME_KEY)) as ThemeName | null;
    if (v === 'dark' || v === 'light') setSavedTheme(v);
  }

  const value: ThemeContextValue = useMemo(
    () => ({
      theme,
      themeName: theme.name,
      setThemeName,
      toggleTheme,
      hydrateTheme,
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{props.children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

