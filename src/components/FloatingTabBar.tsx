import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

export default function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const options = descriptors[route.key].options;
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : typeof options.title === 'string'
                ? options.title
                : route.name;

          const iconName = options.tabBarIcon
            ? (options.tabBarIcon as any)({ focused: isFocused })
            : undefined;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={({ pressed }) => [
                styles.item,
                pressed ? { opacity: 0.85 } : null,
              ]}
            >
              {isFocused ? (
                <View style={styles.activePill}>
                  <Ionicons
                    name={(iconName ?? 'home') as any}
                    size={20}
                    color={theme.tabIconOn}
                  />
                </View>
              ) : (
                <Ionicons
                  name={(iconName ?? 'home') as any}
                  size={20}
                  color={theme.tabIcon}
                />
              )}
              <Text style={[styles.label, isFocused ? styles.labelOn : null]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(theme: {
  tabBarBg: string;
  tabBarBorder: string;
  tabIcon: string;
  tabIconOn: string;
  tabPill: string;
}) {
  return StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: theme.tabBarBg,
    borderWidth: 1,
    borderColor: theme.tabBarBorder,
    ...Platform.select({
      android: { elevation: 14 },
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
    }),
  },
  item: {
    width: 94,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  activePill: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.tabPill,
  },
  label: { fontSize: 11, color: theme.tabIcon, fontWeight: '700' },
  labelOn: { color: theme.tabIconOn },
  });
}

