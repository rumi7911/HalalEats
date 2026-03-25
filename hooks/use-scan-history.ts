import { useCallback, useEffect, useState } from 'react';
import { clearAllScans, getRecentScans, ScanRecord } from '@/lib/database';

export function useScanHistory() {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const records = await getRecentScans(20);
      setScans(records);
    } catch {
      setError('Failed to load history.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(async () => {
    await clearAllScans();
    setScans([]);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { scans, isLoading, error, refresh, clear };
}
