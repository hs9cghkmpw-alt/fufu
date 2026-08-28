import { useState, type FormEvent } from 'react';
import type { CalendarEventFormInput } from '../types/calendar';

interface FormValues {
  title: string;
  details: string;
  visibility: 'personal' | 'shared';
  allDay: boolean;
  startsAt: string;
  endsAt: string;
  startDate: string;
  endDate: string;
}

const initialValues: FormValues = {
  title: '',
  details: '',
  visibility: 'personal',
  allDay: false,
  startsAt: '',
  endsAt: '',
  startDate: '',
  endDate: ''
};

function tokyoTimestamp(value: string) {
  return value ? `${value}:00+09:00` : null;
}

function parseCalendarForm(values: FormValues): CalendarEventFormInput {
  const title = values.title.trim();
  const details = values.details.trim() || null;
  if (!title || title.length > 120) throw new Error('タイトルを1〜120文字で入力してください。');

  if (values.allDay) {
    if (!values.startDate) throw new Error('開始日を入力してください。');
    if (values.endDate && values.endDate < values.startDate) {
      throw new Error('終了日は開始日以降にしてください。');
    }
    return {
      visibility: values.visibility,
      title,
      details,
      startsAt: null,
      endsAt: null,
      startDate: values.startDate,
      endDate: values.endDate || null
    };
  }

  if (!values.startsAt) throw new Error('開始日時を入力してください。');
  if (values.endsAt && values.endsAt < values.startsAt) {
    throw new Error('終了日時は開始日時以降にしてください。');
  }
  return {
    visibility: values.visibility,
    title,
    details,
    startsAt: tokyoTimestamp(values.startsAt),
    endsAt: tokyoTimestamp(values.endsAt),
    startDate: null,
    endDate: null
  };
}

export function CalendarEventForm({
  defaultDate,
  onSubmit
}: {
  defaultDate?: string;
  onSubmit: (input: CalendarEventFormInput) => Promise<void>;
}) {
  const [values, setValues] = useState<FormValues>(() => ({
    ...initialValues,
    startDate: defaultDate ?? ''
  }));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = <K extends keyof FormValues>(name: K, value: FormValues[K]) =>
    setValues((current) => ({ ...current, [name]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const input = parseCalendarForm(values);
      setIsSubmitting(true);
      await onSubmit(input);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '予定を保存できませんでした。');
      setIsSubmitting(false);
    }
  };

  return (
    <form className="request-form calendar-event-form" onSubmit={submit}>
      <label>
        予定の種類
        <select
          value={values.visibility}
          onChange={(event) =>
            update('visibility', event.target.value === 'shared' ? 'shared' : 'personal')
          }
        >
          <option value="personal">個人予定（自分だけ）</option>
          <option value="shared">共有予定（相手の承認が必要）</option>
        </select>
      </label>

      {values.visibility === 'shared' && (
        <p className="notice">
          共有予定は相手が承認すると確定します。正式な約束・金額の合意は「申請」から登録してください。
        </p>
      )}

      <label>
        タイトル
        <input
          value={values.title}
          maxLength={120}
          required
          onChange={(event) => update('title', event.target.value)}
        />
      </label>

      <label>
        メモ（任意）
        <textarea
          value={values.details}
          maxLength={5000}
          rows={4}
          onChange={(event) => update('details', event.target.value)}
        />
      </label>

      <label className="calendar-check-label">
        <input
          type="checkbox"
          checked={values.allDay}
          onChange={(event) => update('allDay', event.target.checked)}
        />
        終日予定
      </label>

      {values.allDay ? (
        <div className="form-row">
          <label>
            開始日
            <input
              type="date"
              value={values.startDate}
              required
              onChange={(event) => update('startDate', event.target.value)}
            />
          </label>
          <label>
            終了日（任意）
            <input
              type="date"
              value={values.endDate}
              onChange={(event) => update('endDate', event.target.value)}
            />
          </label>
        </div>
      ) : (
        <div className="form-row">
          <label>
            開始日時
            <input
              type="datetime-local"
              value={values.startsAt}
              required
              onChange={(event) => update('startsAt', event.target.value)}
            />
          </label>
          <label>
            終了日時（任意）
            <input
              type="datetime-local"
              value={values.endsAt}
              onChange={(event) => update('endsAt', event.target.value)}
            />
          </label>
        </div>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? '保存しています…'
          : values.visibility === 'shared'
            ? '相手に共有予定を送る'
            : '個人予定を保存する'}
      </button>
    </form>
  );
}
