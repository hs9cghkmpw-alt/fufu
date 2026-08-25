import { useCallback, useEffect, useState } from 'react';
import { getRequest } from '../services/requestService';
import type { RequestSummary } from '../types/request';

export function useRequestDetail(requestId: string | undefined) {
  const [request, setRequest] = useState<RequestSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!requestId) return;
    try {
      const result = await getRequest(requestId);
      setRequest(result);
      setError(result ? '' : '申請が見つかりません。');
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : '申請を取得できませんでした。'
      );
    } finally {
      setIsLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    let active = true;
    if (!requestId) return;
    const timer = window.setTimeout(() => {
      if (active) void refresh();
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [refresh, requestId]);

  return {
    request,
    isLoading: requestId ? isLoading : false,
    error: requestId ? error : '申請が見つかりません。',
    refresh
  };
}
