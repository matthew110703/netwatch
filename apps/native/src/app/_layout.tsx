import '../../global.css';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WatchlistProvider } from '@/context/WatchlistContext';
import { NetwatchThemeProvider, useNetwatchTheme } from '@/theme/ThemeContext';

SplashScreen.preventAutoHideAsync();

function ThemedNavigation() {
  const { colors, isDark } = useNetwatchTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.surface },
          animation: 'slide_from_right',
        }}
      />
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NetwatchThemeProvider>
          <WatchlistProvider>
            <ThemedNavigation />
          </WatchlistProvider>
        </NetwatchThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
