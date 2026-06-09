import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({
  id: 'utility-kit-storage',
  encryptionKey: 'uk-secure-key-2024',
});

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
