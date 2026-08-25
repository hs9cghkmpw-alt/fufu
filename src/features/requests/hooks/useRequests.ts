import { useCallback, useEffect, useState } from 'react';
import { listRequests } from '../services/requestService';
import type { RequestSummary } from '../types/request';

export function useRequests() {
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setRequests(await listRequests());
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : '申請一覧を取得できませんでした。'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  return { requests, isLoading, error, refresh };
}
