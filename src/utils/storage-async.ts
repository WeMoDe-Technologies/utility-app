/**
 * storage-async.ts
 *
 * Drop-in AsyncStorage adapter for use in Expo Go (where MMKV is unavailable).
 * To switch from MMKV to AsyncStorage:
 *   Replace all imports of '@/utils/storage' with '@/utils/storage-async'
 *
 * Usage is identical — except functions are async.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageKeys = {
  PREFERENCES: 'preferences',
  FAVOURITES: 'favourites',
  RECENTS: 'recents',
  UTILITY_PREFIX: 'utility:',
} as const;

export function getStorageKey(utilityId: string): string {
  return `${StorageKeys.UTILITY_PREFIX}${utilityId}`;
}

export async function saveJSONAsync<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[AsyncStorage] Failed to save ${key}`, e);
  }
}

export async function loadJSONAsync<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`[AsyncStorage] Failed to load ${key}`, e);
    return fallback;
  }
}

export async function deleteKeyAsync(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export async function clearUtilityDataAsync(utilityId: string): Promise<void> {
  await AsyncStorage.removeItem(getStorageKey(utilityId));
}

export async function getAllUtilityKeysAsync(): Promise<string[]> {
  const all = await AsyncStorage.getAllKeys();
  return all.filter((k) => k.startsWith(StorageKeys.UTILITY_PREFIX));
}
