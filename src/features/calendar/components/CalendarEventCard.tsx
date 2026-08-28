import { Link } from 'react-router-dom';
import { formatCalendarEventWhen, isCalendarEventOverdue } from '../lib/calendarDates';
import type { CalendarEvent } from '../types/calendar';

export function calendarEventLabel(event: CalendarEvent, currentUserId?: string) {
  if (isCalendarEventOverdue(event)) return '期限超過・未実行';
  if (event.status === 'completed') return '完了';

  switch (event.eventType) {
    case 'agreement':
      return '合意済み';
    case 'deadline':
      return '期限';
    case 'discussion':
      return '話し合い';
    case 'pending_proposal':
      return '未確定';
    case 'personal':
      return '個人予定';
    case 'shared':
      if (event.approvalStatus === 'pending') {
        return event.currentActorUserId === currentUserId
          ? '共有予定・あなたの確認待ち'
          : '共有予定・相手の確認待ち';
      }
      return '共有予定';
  }
}

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
