import { useCallback, useEffect, useState } from 'react';
import { getHomeData } from '../services/homeService';
import type { HomeData } from '../types/home';

const emptyData: HomeData = {
  actionRequired: [],
  overdue: [],
  upcoming: [],
  awaitingPartner: [],
  discussions: [],
  recentAgreements: []
};

export function useHomeData(userId?: string) {
  const [data, setData] = useState(emptyData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError('');
    try {
      setData(await getHomeData(userId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'ホームを取得できませんでした。');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);
  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  return { data, isLoading, error, refresh };
}
