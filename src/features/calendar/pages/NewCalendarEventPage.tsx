import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarEventForm } from '../components/CalendarEventForm';
import {
  createPersonalCalendarEvent,
  createSharedCalendarEvent
} from '../services/calendarService';
import type { CalendarEventFormInput } from '../types/calendar';

export function NewCalendarEventPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultDate = searchParams.get('date') ?? undefined;

  const submit = async (input: CalendarEventFormInput) => {
    const { visibility, ...eventInput } = input;
    const eventId =
      visibility === 'shared'
        ? await createSharedCalendarEvent(eventInput)
        : await createPersonalCalendarEvent(eventInput);
    navigate(`/calendar/${eventId}`);
  };

  return (
    <div className="page">
      <p className="eyebrow">New calendar event</p>
      <h1>予定を追加</h1>
      <p className="page-intro">
        個人予定は自分だけに表示されます。共有予定は相手の確認後に確定します。
      </p>
      <CalendarEventForm defaultDate={defaultDate} onSubmit={submit} />
    </div>
  );
}
