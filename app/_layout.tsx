import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import { ThemeProvider } from '@/theme/ThemeProvider';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { useFavouritesStore } from '@/stores/favouritesStore';
import { useRecentsStore } from '@/stores/recentsStore';

export default function RootLayout() {
  const hydratePreferences = usePreferencesStore((s) => s.hydrate);
  const hydrateFavourites  = useFavouritesStore((s) => s.hydrate);
  const hydrateRecents     = useRecentsStore((s) => s.hydrate);

  // Hydrate all stores once — before any screen renders meaningful state
  useEffect(() => {
    Promise.all([
      hydratePreferences(),
      hydrateFavourites(),
      hydrateRecents(),
    ]);
  }, []);

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