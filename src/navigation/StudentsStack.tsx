import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import StudentsListScreen from '../screens/StudentsListScreen';
import StudentsSearchScreen from '../screens/StudentsSearchScreen';
import StudentFormScreen from '../screens/StudentFormScreen';
import BulletinFormScreen from '../screens/BulletinFormScreen';
import StudentsTrashScreen from '../screens/StudentsTrashScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useTheme } from '../theme/ThemeProvider';

export type StudentsStackParamList = {
  StudentsList: undefined;
  StudentsSearch: undefined;
  StudentForm: { id?: string } | undefined;
  BulletinForm: { studentId: string } | undefined;
  StudentsTrash: undefined;
  Settings: undefined;
};
const Stack = createNativeStackNavigator<StudentsStackParamList>();


export default function StudentsStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator
      initialRouteName="StudentsList"
      screenOptions={{
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen
        name="StudentsList"
        component={StudentsListScreen}
        options={{ title: 'Accueil' }}
      />
      <Stack.Screen
        name="StudentsSearch"
        component={StudentsSearchScreen}
        options={{ title: 'Recherche' }}
      />
      <Stack.Screen
        name="StudentForm"
        component={StudentFormScreen}
        options={{ title: 'Étudiant' }}
      />
      <Stack.Screen
        name="BulletinForm"
        component={BulletinFormScreen}
        options={{ title: 'Bulletin scolaire' }}
      />
      <Stack.Screen
        name="StudentsTrash"
        component={StudentsTrashScreen}
        options={{ title: 'Corbeille des étudiants' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Paramètres' }}
      />
    </Stack.Navigator>
  );
}

