import { StatusBar } from 'expo-status-bar';
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import StudentsStack from './src/navigation/StudentsStack';
import FloatingTabBar from './src/components/FloatingTabBar';
import StudentFormScreen from './src/screens/StudentFormScreen';
import ExitScreen from './src/screens/ExitScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';

export type RootTabsParamList = {
  Accueil: undefined;
  Ajouter: undefined;
  Quitter: undefined;
};

type RootStackParamList = {
  Welcome: undefined;
  Main: undefined;
};

const Tabs = createBottomTabNavigator<RootTabsParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  const { theme } = useTheme();

  // Wrapper component for StudentFormScreen to work with tab navigation
  const StudentFormTab = (props: any) => <StudentFormScreen {...props} />;

  return (
    <Tabs.Navigator
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: theme.bg },
        }}
      >
        <Tabs.Screen
          name="Accueil"
          component={StudentsStack}
          options={{
            title: 'Accueil',
            tabBarLabel: 'Accueil',
            tabBarIcon: () => 'home-outline',
          }}
        />
        <Tabs.Screen
          name="Ajouter"
          component={StudentFormTab}
          options={{
            title: 'Ajouter',
            tabBarLabel: 'Ajouter',
            tabBarIcon: () => 'add-circle-outline',
          }}
        />
        <Tabs.Screen
          name="Quitter"
          component={ExitScreen}
          options={{
            title: 'Quitter',
            tabBarLabel: 'Quitter',
            tabBarIcon: () => 'log-out-outline',
          }}
        />
      </Tabs.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Main" component={MainTabs} />
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
