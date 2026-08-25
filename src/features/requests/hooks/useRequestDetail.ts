import { useEffect, useState } from 'react';
import { getRequest } from '../services/requestService';
import type { RequestSummary } from '../types/request';

export function useRequestDetail(requestId: string | undefined) {
  const [request, setRequest] = useState<RequestSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!requestId) return;
    getRequest(requestId)
      .then((result) => {
        if (!active) return;
        setRequest(result);
        setError(result ? '' : '申請が見つかりません。');
      })
      .catch((requestError: unknown) => {
        if (active)
          setError(
            requestError instanceof Error ? requestError.message : '申請を取得できませんでした。'
          );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [requestId]);

  return {
    request,
    isLoading: requestId ? isLoading : false,
    error: requestId ? error : '申請が見つかりません。'
  };
}
