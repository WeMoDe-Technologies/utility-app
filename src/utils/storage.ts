import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Raw async storage wrapper ─────────────────────────────────────────────
export const storage = {
  set: async (key: string, value: string): Promise<void> => {
    await AsyncStorage.setItem(key, value);
  },
  getString: async (key: string): Promise<string | null> => {
    return AsyncStorage.getItem(key);
  },
  delete: async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(key);
  },
  clearAll: async (): Promise<void> => {
    await AsyncStorage.clear();
  },
};

// ─── Keys ──────────────────────────────────────────────────────────────────
export const StorageKeys = {
  PREFERENCES: 'preferences',
  FAVOURITES:  'favourites',
  RECENTS:     'recents',
  UTILITY_PREFIX: 'utility:',
} as const;

export function getStorageKey(utilityId: string): string {
  return `${StorageKeys.UTILITY_PREFIX}${utilityId}`;
}

// ─── Typed async helpers ───────────────────────────────────────────────────

export async function saveJSON<T>(key: string, value: T): Promise<void> {
  try {
    await storage.set(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[Storage] Failed to save ${key}`, e);
  }
}

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await storage.getString(key);
    // Key not yet written — return default silently
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`[Storage] Failed to load ${key}`, e);
    // Wipe corrupt value so it self-heals on next write
    await storage.delete(key);
    return fallback;
  }
}

export async function deleteKey(key: string): Promise<void> {
  try {
    await storage.delete(key);
  } catch (e) {
    console.warn(`[Storage] Failed to delete ${key}`, e);
  }
}

export async function clearUtilityData(utilityId: string): Promise<void> {
  await deleteKey(getStorageKey(utilityId));
}