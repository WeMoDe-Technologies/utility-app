import { useState, useEffect, useRef, useCallback } from 'react';
import { loadJSON, saveJSON, clearUtilityData, getStorageKey } from '@/utils/storage';

const DEBOUNCE_MS = 400;

export function useUtilityState<T>(utilityId: string, defaultState: T) {
  const [state, setStateRaw] = useState<T>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a ref so the debounced save always captures the latest value
  const latestStateRef = useRef<T>(defaultState);

  // ── Hydrate from AsyncStorage on mount ──────────────────────────────────
  useEffect(() => {
    loadJSON<T>(getStorageKey(utilityId), defaultState).then((loaded) => {
      setStateRaw(loaded);
      latestStateRef.current = loaded;
      setHydrated(true);
    });
  }, [utilityId]);

  // ── Debounced persist whenever state changes (after hydration) ───────────
  useEffect(() => {
    if (!hydrated) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveJSON(getStorageKey(utilityId), latestStateRef.current);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [state, hydrated, utilityId]);

  // ── setState wrapper keeps the ref in sync ───────────────────────────────
  const setState = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setStateRaw((prev) => {
        const next =
          typeof updater === 'function'
            ? (updater as (prev: T) => T)(prev)
            : updater;
        latestStateRef.current = next;
        return next;
      });
    },
    []
  );

  // ── Clear: reset to default and wipe storage ─────────────────────────────
  const clearState = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setStateRaw(defaultState);
    latestStateRef.current = defaultState;
    clearUtilityData(utilityId);
  }, [utilityId, defaultState]);

  return { state, setState, clearState, hydrated };
}