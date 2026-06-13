import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

import { ThemeProvider } from '@/theme/ThemeProvider';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { useFavouritesStore } from '@/stores/favouritesStore';
import { useRecentsStore } from '@/stores/recentsStore';

// Keep the native splash up until we know which screen to show.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const hydratePreferences = usePreferencesStore((s) => s.hydrate);
  const hydrateFavourites  = useFavouritesStore((s) => s.hydrate);
  const hydrateRecents     = useRecentsStore((s) => s.hydrate);

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
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});