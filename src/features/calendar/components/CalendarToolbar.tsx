import type { CalendarMonth } from '../lib/calendarDates';
import { formatCalendarMonth } from '../lib/calendarDates';

export function CalendarToolbar({
  month,
  onPrevious,
  onToday,
  onNext
}: {
  month: CalendarMonth;
  onPrevious: () => void;
  onToday: () => void;
  onNext: () => void;
}) {
  return (
    <div className="calendar-toolbar">
      <button className="secondary-button" type="button" onClick={onPrevious} aria-label="前月">
        ‹
      </button>
      <div>
        <strong>{formatCalendarMonth(month)}</strong>
        <button className="calendar-today-button" type="button" onClick={onToday}>
          今日
        </button>
      </div>
      <button className="secondary-button" type="button" onClick={onNext} aria-label="次月">
        ›
      </button>
    </div>
  );
}
