import { DefaultTheme, NavigationContainer, Theme as NavigationTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '../context/AuthContext';
import { useThemeContext } from '../context/ThemeContext';
import type { RootStackParamList } from '../types';
import CameraCaptureScreen from '../screens/CameraCaptureScreen';
import DashboardScreen from '../screens/DashboardScreen';
import HistoryScreen from '../screens/HistoryScreen';
import LandingScreen from '../screens/LandingScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ResultScreen from '../screens/ResultScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SignInScreen from '../screens/SignInScreen';
import UploadImageScreen from '../screens/UploadImageScreen';
import UserProfileScreen from '../screens/UserProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { authStatus } = useAuth();
  const { palette, mode } = useThemeContext();

  const navTheme: NavigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: palette.background,
      card: palette.background,
      border: palette.border,
      primary: palette.primary,
      text: palette.text,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator
        key={authStatus}
        initialRouteName={authStatus === 'authenticated' ? 'Dashboard' : authStatus === 'profile-setup' ? 'ProfileSetup' : 'Landing'}
        screenOptions={{
          headerShadowVisible: false,
          headerTintColor: palette.text,
          headerTitle: '',
          headerStyle: {
            backgroundColor: palette.background,
          },
          headerTitleStyle: {
            color: palette.text,
            fontSize: 18,
            fontWeight: '700',
          },
          contentStyle: {
            backgroundColor: palette.background,
          },
        }}
      >
        {authStatus === 'unauthenticated' ? (
          <>
            <Stack.Screen name="Landing" component={LandingScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : null}

        {authStatus === 'profile-setup' ? (
          <Stack.Screen
            name="ProfileSetup"
            component={ProfileSetupScreen}
            initialParams={{ mode: 'create' }}
            options={{ headerBackVisible: false }}
          />
        ) : null}

        {authStatus === 'authenticated' ? (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="ProfileSetup"
              component={ProfileSetupScreen}
              initialParams={{ mode: 'edit' }}
            />
            <Stack.Screen name="UploadImage" component={UploadImageScreen} />
            <Stack.Screen name="CameraCapture" component={CameraCaptureScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Result" component={ResultScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="UserProfile" component={UserProfileScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </>
        ) : null}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
