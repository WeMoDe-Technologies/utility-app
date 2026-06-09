import { useState, useEffect, useCallback, useRef } from 'react';
import { getStorageKey, loadJSON, saveJSON, deleteKey } from '@/utils/storage';

const DEBOUNCE_MS = 400;

/**
 * A generic hook that automatically persists state to MMKV storage.
 * Use this in every utility screen.
 */
export function useUtilityState<T>(
  utilityId: string,
  defaultState: T
): {
  state: T;
  setState: (updater: T | ((prev: T) => T)) => void;
  clearState: () => void;
  isHydrated: boolean;
} {
  const key = getStorageKey(utilityId);
  const [state, setStateInternal] = useState<T>(() =>
    loadJSON<T>(key, defaultState)
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Hydrate from storage on mount
    const saved = loadJSON<T>(key, defaultState);
    setStateInternal(saved);
    setIsHydrated(true);
  }, []);

  const setState = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setStateInternal((prev) => {
        const next =
          typeof updater === 'function'
            ? (updater as (prev: T) => T)(prev)
            : updater;

        // Debounced save
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          saveJSON(key, next);
        }, DEBOUNCE_MS);

        return next;
      });
    },
    [key]
  );

  const clearState = useCallback(() => {
    deleteKey(key);
    setStateInternal(defaultState);
  }, [key, defaultState]);

  return { state, setState, clearState, isHydrated };
}
