import type { CalendarEvent } from '../types/calendar';
import type { CalendarMonth } from '../lib/calendarDates';

const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'] as const;

function dayNumber(dateKey: string) {
  return Number(dateKey.slice(-2));
}

function isInMonth(dateKey: string, month: CalendarMonth) {
  return Number(dateKey.slice(0, 4)) === month.year && Number(dateKey.slice(5, 7)) === month.month;
}

function shortEventLabel(event: CalendarEvent) {
  switch (event.eventType) {
    case 'agreement':
      return '合意';
    case 'deadline':
      return '期限';
    case 'discussion':
      return '話合';
    case 'pending_proposal':
      return '未確定';
    case 'shared':
      return event.approvalStatus === 'pending' ? '共有待ち' : '共有';
    case 'personal':
      return '個人';
  }
}

export function MonthGrid({
  month,
  dateKeys,
  eventsByDate,
  selectedDate,
  today,
  onSelectDate
}: {
  month: CalendarMonth;
  dateKeys: string[];
  eventsByDate: Map<string, CalendarEvent[]>;
  selectedDate: string;
  today: string;
  onSelectDate: (dateKey: string) => void;
}) {
  return (
    <div className="month-grid" aria-label={`${month.year}年${month.month}月のカレンダー`}>
      {weekdayLabels.map((weekday) => (
        <div className="month-weekday" key={weekday} aria-hidden="true">
          {weekday}
        </div>
      ))}
      {dateKeys.map((dateKey) => {
        const events = eventsByDate.get(dateKey) ?? [];
        const currentMonth = isInMonth(dateKey, month);
        const selected = dateKey === selectedDate;
        const isToday = dateKey === today;
        return (
          <button
            className={[
              'month-day',
              currentMonth ? '' : 'outside-month',
              selected ? 'selected' : '',
              isToday ? 'today' : ''
            ]
              .filter(Boolean)
              .join(' ')}
            type="button"
            key={dateKey}
            aria-pressed={selected}
            aria-label={`${dateKey}${events.length ? `、予定${events.length}件` : '、予定なし'}`}
            onClick={() => onSelectDate(dateKey)}
          >
            <span className="month-day-number">{dayNumber(dateKey)}</span>
            <span className="month-day-events">
              {events.slice(0, 2).map((event) => (
                <small key={event.id}>{shortEventLabel(event)}</small>
              ))}
              {events.length > 2 && <small>他{events.length - 2}件</small>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
