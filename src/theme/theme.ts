export type ThemeName = 'dark' | 'light';

export const THEME_KEY = 'ui:theme';

export type Theme = {
  name: ThemeName;
  bg: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  placeholder: string;
  inputBg: string;
  primary: string;
  dangerBorder: string;
  dangerBg: string;
  dangerText: string;
  pillBorder: string;
  tabBarBg: string;
  tabBarBorder: string;
  tabIcon: string;
  tabIconOn: string;
  tabPill: string;
};

export const darkTheme: Theme = {
  name: 'dark',
  bg: '#0b1220',
  card: '#0f1b33',
  border: '#203152',
  text: '#ffffff',
  textMuted: '#b7c0d6',
  placeholder: '#6f7a96',
  inputBg: '#0b1220',
  primary: '#3b82f6',
  dangerBorder: '#5b1b1b',
  dangerBg: '#220b0b',
  dangerText: '#ffb4b4',
  pillBorder: '#2a3d63',
  tabBarBg: '#0f1b33',
  tabBarBorder: '#203152',
  tabIcon: '#c9d3ea',
  tabIconOn: '#ffffff',
  tabPill: '#6d28d9',
};

export const lightTheme: Theme = {
  name: 'light',
  bg: '#f6f7fb',
  card: '#ffffff',
  border: '#d6dbe8',
  text: '#0b1220',
  textMuted: '#4a5672',
  placeholder: '#7683a3',
  inputBg: '#ffffff',
  primary: '#2563eb',
  dangerBorder: '#f1c3c3',
  dangerBg: '#fff4f4',
  dangerText: '#8a1f1f',
  pillBorder: '#cfd6ea',
  tabBarBg: '#ffffff',
  tabBarBorder: '#d6dbe8',
  tabIcon: '#4a5672',
  tabIconOn: '#0b1220',
  tabPill: '#2563eb',
};

