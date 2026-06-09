import { useEffect } from 'react';
import { useRecentsStore } from '@/stores/recentsStore';

/**
 * Call this at the top of any utility screen to record usage.
 * Also records a second time on unmount to bump useCount for re-visits.
 */
export function useTrackUsage(utilityId: string) {
  const { recordUsage } = useRecentsStore();

  useEffect(() => {
    recordUsage(utilityId);
  }, [utilityId]);
}
