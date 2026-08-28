import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { calendarEventLabel } from '../components/CalendarEventCard';
import { formatCalendarEventWhen } from '../lib/calendarDates';
import {
  approveSharedCalendarEvent,
  cancelPersonalCalendarEvent,
  getCalendarEvent,
  rejectSharedCalendarEvent,
  withdrawSharedCalendarEvent
} from '../services/calendarService';
import type { CalendarEvent } from '../types/calendar';

export function CalendarEventDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [isActing, setIsActing] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError('');
    try {
      setEvent(await getCalendarEvent(id));
    } catch (error) {
      setEvent(null);
      setLoadError(error instanceof Error ? error.message : '予定を取得できませんでした。');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (action: () => Promise<void>, leaveAfter = false) => {
    setActionError('');
    setIsActing(true);
    try {
      await action();
      if (leaveAfter) navigate('/calendar');
      else await load();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '予定を更新できませんでした。');
    } finally {
      setIsActing(false);
    }
  };

  if (isLoading) return <p className="empty-state">予定を読み込んでいます…</p>;
  if (!event) {
    return (
      <div className="page">
        <h1>予定が見つかりません</h1>
        <p className="page-intro">
          {loadError || '削除・取消済みか、この予定を表示する権限がありません。'}
        </p>
        <Link to="/calendar">カレンダーへ戻る</Link>
      </div>
    );
  }

  const currentUserId = user?.id;
  const canRespondShared =
    event.eventType === 'shared' &&
    event.approvalStatus === 'pending' &&
    event.currentActorUserId === currentUserId;
  const canWithdrawShared =
    event.eventType === 'shared' &&
    event.approvalStatus === 'pending' &&
    event.createdByUserId === currentUserId;
  const canCancelPersonal =
    event.eventType === 'personal' &&
    event.ownerUserId === currentUserId &&
    event.status !== 'cancelled';

  return (
    <div className="page calendar-detail-page">
      <p className="eyebrow">Calendar event</p>
      <h1>{event.title}</h1>

      <span className={`calendar-event-kind kind-${event.eventType}`}>
        {calendarEventLabel(event, currentUserId)}
      </span>

      <dl className="detail-grid">
        <dt>日時</dt>
        <dd>{formatCalendarEventWhen(event)}</dd>
        <dt>区分</dt>
        <dd>{event.visibility === 'personal' ? '自分だけ' : 'ふたりで共有'}</dd>
        <dt>状態</dt>
        <dd>{calendarEventLabel(event, currentUserId)}</dd>
        {event.details && (
          <>
            <dt>メモ</dt>
            <dd>{event.details}</dd>
          </>
        )}
      </dl>

      {event.eventType === 'agreement' || event.eventType === 'deadline' ? (
        <div className="calendar-source-panel">
          <strong>合意から作成された予定</strong>
          <p>この予定を直接変更せず、元の合意から変更・取消を行います。</p>
          {event.sourceAgreementId && (
            <Link to={`/agreements/${event.sourceAgreementId}`}>元の合意を見る</Link>
          )}
        </div>
      ) : null}

      {(event.eventType === 'pending_proposal' || event.eventType === 'discussion') &&
        event.sourceRequestId && (
          <div className="calendar-source-panel">
            <strong>{event.eventType === 'discussion' ? '話し合い予定' : '申請中の予定'}</strong>
            <p>正式な状態と次の対応は申請側が正本です。</p>
            <Link to={`/requests/${event.sourceRequestId}`}>関連する申請を見る</Link>
          </div>
        )}

      {actionError && (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      )}

      {canRespondShared && (
        <div className="calendar-action-panel">
          <h2>あなたの確認が必要です</h2>
          <button
            className="primary-button"
            type="button"
            disabled={isActing}
            onClick={() => void runAction(() => approveSharedCalendarEvent(event.id))}
          >
            この共有予定を承認
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={isActing}
            onClick={() => void runAction(() => rejectSharedCalendarEvent(event.id), true)}
          >
            却下
          </button>
        </div>
      )}

      {canWithdrawShared && !canRespondShared && (
        <button
          className="secondary-button calendar-detail-action"
          type="button"
          disabled={isActing}
          onClick={() => void runAction(() => withdrawSharedCalendarEvent(event.id), true)}
        >
          共有予定を取り下げる
        </button>
      )}

      {canCancelPersonal && (
        <button
          className="secondary-button calendar-detail-action"
          type="button"
          disabled={isActing}
          onClick={() => void runAction(() => cancelPersonalCalendarEvent(event.id), true)}
        >
          個人予定を取り消す
        </button>
      )}
    </div>
  );
}
