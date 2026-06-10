// import { MMKV } from 'react-native-mmkv';

// export const storage = new MMKV({
//   id: 'utility-kit-storage',
//   encryptionKey: 'uk-secure-key-2024',
// });
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  set: async (key: string, value: any) => {
    try {
      const serialized =
        typeof value === 'string'
          ? value
          : JSON.stringify(value);

      await AsyncStorage.setItem(key, serialized);
    } catch (error) {
      console.warn('[Storage] Failed to save', key, error);
    }
  },

  getString: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn('[Storage] Failed to load', key, error);
      return null;
    }
  },

  delete: async (key: string) => {
    await AsyncStorage.removeItem(key);
  },

  clearAll: async () => {
    await AsyncStorage.clear();
  },
};

// ─── Typed storage helpers ─────────────────────────────────────────────────
export const StorageKeys = {
  PREFERENCES: 'preferences',
  FAVOURITES: 'favourites',
  RECENTS: 'recents',
  UTILITY_PREFIX: 'utility:',
} as const;

export function getStorageKey(utilityId: string): string {
  return `${StorageKeys.UTILITY_PREFIX}${utilityId}`;
}

export function saveJSON<T>(key: string, value: T): void {
  try {
    storage.set(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[Storage] Failed to save ${key}`, e);
  }
}

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = storage.getString(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`[Storage] Failed to load ${key}`, e);
    return fallback;
  }
}

export function deleteKey(key: string): void {
  storage.delete(key);
}

export function clearUtilityData(utilityId: string): void {
  const key = getStorageKey(utilityId);
  storage.delete(key);
}
