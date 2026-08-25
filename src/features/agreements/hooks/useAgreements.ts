import { useCallback, useEffect, useState } from 'react';
import { listAgreements } from '../services/agreementService';
import type { Agreement } from '../types/agreement';

export function useAgreements() {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setAgreements(await listAgreements());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '合意を取得できませんでした。');
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  return { agreements, isLoading, error, refresh };
}
