import { useCallback, useEffect, useState } from 'react';
import { listCalendarEvents } from '../services/calendarService';
import type { CalendarEvent, CalendarRange } from '../types/calendar';

export function useCalendarEvents(range: CalendarRange) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setEvents(await listCalendarEvents(range));
    } catch (loadError) {
      setEvents([]);
      setError(loadError instanceof Error ? loadError.message : 'カレンダーを取得できませんでした。');
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  return { events, isLoading, error, refresh };
}
