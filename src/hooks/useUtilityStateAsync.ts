/**
 * useUtilityStateAsync.ts
 *
 * AsyncStorage version of useUtilityState for Expo Go compatibility.
 * Replace useUtilityState import with this file when using Expo Go.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEBOUNCE_MS = 500;

function getKey(utilityId: string) {
  return `utility:${utilityId}`;
}

export function useUtilityStateAsync<T>(
  utilityId: string,
  defaultState: T
): {
  state: T;
  setState: (updater: T | ((prev: T) => T)) => void;
  clearState: () => void;
  isHydrated: boolean;
} {
  const key = getKey(utilityId);
  const [state, setStateInternal] = useState<T>(defaultState);
  const [isHydrated, setIsHydrated] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate on mount
  useEffect(() => {
    AsyncStorage.getItem(key).then((raw) => {
      if (raw) {
        try {
          setStateInternal(JSON.parse(raw));
        } catch {
          setStateInternal(defaultState);
        }
      }
      setIsHydrated(true);
    });
  }, [key]);

  const setState = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setStateInternal((prev) => {
        const next =
          typeof updater === 'function'
            ? (updater as (prev: T) => T)(prev)
            : updater;

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          AsyncStorage.setItem(key, JSON.stringify(next)).catch((e) =>
            console.warn('[AsyncStorage] Save failed:', e)
          );
        }, DEBOUNCE_MS);

        return next;
      });
    },
    [key]
  );

  const clearState = useCallback(() => {
    AsyncStorage.removeItem(key);
    setStateInternal(defaultState);
  }, [key, defaultState]);

  return { state, setState, clearState, isHydrated };
}
