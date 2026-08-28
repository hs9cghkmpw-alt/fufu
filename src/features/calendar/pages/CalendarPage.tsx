import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { CalendarEventCard } from '../components/CalendarEventCard';
import { CalendarToolbar } from '../components/CalendarToolbar';
import { MonthGrid } from '../components/MonthGrid';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import {
  calendarMonthFromDateKey,
  calendarRangeForMonth,
  groupCalendarEvents,
  monthGridDateKeys,
  shiftCalendarMonth,
  todayTokyoDateKey
} from '../lib/calendarDates';
import '../calendar.css';

function monthDateKey(year: number, month: number) {
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-01`;
}

export function CalendarPage() {
  const { user } = useAuth();
  const today = todayTokyoDateKey();
  const [month, setMonth] = useState(() => calendarMonthFromDateKey(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const range = useMemo(() => calendarRangeForMonth(month), [month]);
  const dateKeys = useMemo(() => monthGridDateKeys(month), [month]);
  const { events, isLoading, error, refresh } = useCalendarEvents(range);
  const eventsByDate = useMemo(() => groupCalendarEvents(events), [events]);
  const selectedEvents = eventsByDate.get(selectedDate) ?? [];

  const moveMonth = (offset: number) => {
    const next = shiftCalendarMonth(month, offset);
    setMonth(next);
    setSelectedDate(monthDateKey(next.year, next.month));
  };

  const goToday = () => {
    const dateKey = todayTokyoDateKey();
    setMonth(calendarMonthFromDateKey(dateKey));
    setSelectedDate(dateKey);
  };

  return (
    <div className="page calendar-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Calendar</p>
          <h1>カレンダー</h1>
        </div>
        <Link className="primary-button compact" to={`/calendar/new?date=${selectedDate}`}>
          ＋予定
        </Link>
      </div>

      <p className="page-intro">
        合意・申請中・話し合い・共有予定・自分だけの予定を、同じ日付軸で確認できます。
      </p>

      <CalendarToolbar
        month={month}
        onPrevious={() => moveMonth(-1)}
        onToday={goToday}
        onNext={() => moveMonth(1)}
      />

      {error && (
        <div className="form-error" role="alert">
          <p>{error}</p>
          <button className="secondary-button" type="button" onClick={() => void refresh()}>
            再読み込み
          </button>
        </div>
      )}

      <MonthGrid
        month={month}
        dateKeys={dateKeys}
        eventsByDate={eventsByDate}
        selectedDate={selectedDate}
        today={today}
        onSelectDate={setSelectedDate}
      />

      <section className="calendar-day-section" aria-labelledby="selected-day-title">
        <div className="calendar-day-heading">
          <h2 id="selected-day-title">{selectedDate} の予定</h2>
          <span>{selectedEvents.length}件</span>
        </div>

        {isLoading ? (
          <p className="empty-state">予定を読み込んでいます…</p>
        ) : selectedEvents.length ? (
          <div className="calendar-event-list">
            {selectedEvents.map((event) => (
              <CalendarEventCard key={event.id} event={event} currentUserId={user?.id} />
            ))}
          </div>
        ) : (
          <div className="calendar-empty-day">
            <p>この日の予定はありません。</p>
            <Link to={`/calendar/new?date=${selectedDate}`}>予定を追加</Link>
          </div>
        )}
      </section>

      <p className="calendar-formal-note">
        金額・約束・ルールなど、相手との正式な合意が必要な内容は
        <Link to="/requests/new">「申請」</Link>から登録します。
      </p>
    </div>
  );
}
