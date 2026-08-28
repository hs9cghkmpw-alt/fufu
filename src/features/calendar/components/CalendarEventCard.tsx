import { Link } from 'react-router-dom';
import { formatCalendarEventWhen } from '../lib/calendarDates';
import { calendarEventLabel } from '../lib/calendarEventPresentation';
import type { CalendarEvent } from '../types/calendar';

export function CalendarEventCard({
  event,
  currentUserId
}: {
  event: CalendarEvent;
  currentUserId?: string;
}) {
  return (
    <Link className="calendar-event-card" to={`/calendar/${event.id}`}>
      <span className={`calendar-event-kind kind-${event.eventType}`}>
        {calendarEventLabel(event, currentUserId)}
      </span>
      <strong>{event.title}</strong>
      <small>{formatCalendarEventWhen(event)}</small>
      {event.eventType === 'agreement' && <small>合意から作成された予定</small>}
    </Link>
  );
}
