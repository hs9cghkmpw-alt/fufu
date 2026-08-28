import type { CalendarEvent } from '../types/calendar';
import { isCalendarEventOverdue } from './calendarDates';

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
