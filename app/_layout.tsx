import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { ToastHost } from '@/components/ui';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { useFavouritesStore } from '@/stores/favouritesStore';
import { useRecentsStore } from '@/stores/recentsStore';
import { useUpdatesStore } from '@/stores/updatesStore';
import { UpdateGate } from '@/components/common';
import { shouldInterrupt } from '@/update';
import { currentAppVersion, useUpdateCheck } from '@/update/useUpdateCheck';

// Keep the native splash up until we know which screen to show.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const hydratePreferences = usePreferencesStore((s) => s.hydrate);
  const hydrateFavourites  = useFavouritesStore((s) => s.hydrate);
  const hydrateRecents     = useRecentsStore((s) => s.hydrate);
  const hydrateUpdates     = useUpdatesStore((s) => s.hydrate);

  const onboardingCompleted = usePreferencesStore((s) => s.onboardingCompleted);

  const [hydrated, setHydrated] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  // Hydrate all stores once — before any screen renders meaningful state
  useEffect(() => {
    Promise.all([
      hydratePreferences(),
      hydrateFavourites(),
      hydrateRecents(),
      hydrateUpdates(),
    ]).finally(() => setHydrated(true));
  }, []);

  // Once persisted state is known, route to (or away from) onboarding
  useEffect(() => {
    if (!hydrated) return;

    const inOnboarding = segments[0] === 'onboarding';
    if (!onboardingCompleted && !inOnboarding) {
      router.replace('/onboarding');
    } else if (onboardingCompleted && inOnboarding) {
      router.replace('/');
    }

    SplashScreen.hideAsync().catch(() => {});
  }, [hydrated, onboardingCompleted, segments]);

  // Hold render (native splash stays visible) until stores are hydrated
  if (!hydrated) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedShell />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Lives inside ThemeProvider so the status-bar style and the screen background
 * behind push transitions both follow the active theme. Without the background
 * the shell flashed white between screens on light-on-dark themes.
 */
function ThemedShell() {
  const { colors, isDark } = useTheme();

  // Mounted here rather than per screen so the check runs once for the whole
  // app and the gate can sit above every route, including a tool in progress.
  const update = useUpdateCheck();

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack>
      <ToastHost />
      {shouldInterrupt(update.decision) ? (
        <UpdateGate
          decision={update.decision}
          currentVersion={currentAppVersion()}
          onDismiss={update.dismiss}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
