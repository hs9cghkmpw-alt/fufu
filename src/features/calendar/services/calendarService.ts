import type {
  CalendarDirectEventRpcArgs,
  CalendarEventRow,
  CalendarRangeRpcArgs
} from '../../../shared/lib/supabase/calendar.database.types';
import { getSupabaseClient } from '../../../shared/lib/supabase/client';
import type { CalendarEvent, CalendarEventInput, CalendarRange } from '../types/calendar';

interface RpcError {
  message: string;
}

interface CalendarRpcResult<T> {
  data: T | null;
  error: RpcError | null;
}

interface CalendarRpcClient {
  rpc(
    name: 'get_calendar_range',
    args: CalendarRangeRpcArgs
  ): Promise<CalendarRpcResult<CalendarEventRow[]>>;
  rpc(
    name: 'get_calendar_event',
    args: { target_event_id: string }
  ): Promise<CalendarRpcResult<CalendarEventRow[]>>;
  rpc(
    name: 'create_personal_event' | 'create_shared_event',
    args: CalendarDirectEventRpcArgs
  ): Promise<CalendarRpcResult<string>>;
  rpc(
    name:
      | 'approve_shared_event'
      | 'reject_shared_event'
      | 'withdraw_shared_event'
      | 'cancel_personal_event',
    args: { target_event_id: string }
  ): Promise<CalendarRpcResult<string>>;
}

function calendarClient() {
  return getSupabaseClient() as unknown as CalendarRpcClient;
}

function mapCalendarEvent(row: CalendarEventRow): CalendarEvent {
  return {
    id: row.id,
    coupleId: row.couple_id,
    ownerUserId: row.owner_user_id,
    visibility: row.visibility,
    eventType: row.event_type,
    status: row.status,
    approvalStatus: row.approval_status,
    currentActorUserId: row.current_actor_user_id,
    sourceRequestId: row.source_request_id,
    sourceProposalVersionId: row.source_proposal_version_id,
    sourceAgreementId: row.source_agreement_id,
    sourceResponseId: row.source_response_id,
    title: row.title,
    details: row.details,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    startDate: row.start_date,
    endDate: row.end_date,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    createdByUserId: row.created_by_user_id,
    approvedByUserId: row.approved_by_user_id,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function eventArgs(input: CalendarEventInput): CalendarDirectEventRpcArgs {
  return {
    p_title: input.title,
    p_details: input.details,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_start_date: input.startDate,
    p_end_date: input.endDate
  };
}

function calendarError(error: RpcError | null, fallback: string) {
  if (!error) return new Error(fallback);
  if (error.message.includes('not_current_actor')) {
    return new Error('この予定への回答担当ではありません。最新の状態を確認してください。');
  }
  if (error.message.includes('self_approval_forbidden')) {
    return new Error('自分で登録した共有予定を自分で承認することはできません。');
  }
  if (error.message.includes('shared_event_not_found')) {
    return new Error('共有予定が更新されています。カレンダーを再読み込みしてください。');
  }
  if (error.message.includes('personal_event_not_found')) {
    return new Error('個人予定が見つからないか、既に取り消されています。');
  }
  return new Error(fallback);
}

export async function listCalendarEvents(range: CalendarRange): Promise<CalendarEvent[]> {
  const { data, error } = await calendarClient().rpc('get_calendar_range', {
    range_start: range.rangeStart,
    range_end: range.rangeEnd,
    date_start: range.dateStart,
    date_end: range.dateEnd
  });
  if (error) throw calendarError(error, 'カレンダーを取得できませんでした。');
  return (data ?? []).map(mapCalendarEvent);
}

export async function getCalendarEvent(eventId: string): Promise<CalendarEvent | null> {
  const { data, error } = await calendarClient().rpc('get_calendar_event', {
    target_event_id: eventId
  });
  if (error) throw calendarError(error, '予定を取得できませんでした。');
  const row = data?.[0];
  return row ? mapCalendarEvent(row) : null;
}

export async function createPersonalCalendarEvent(input: CalendarEventInput) {
  const { data, error } = await calendarClient().rpc('create_personal_event', eventArgs(input));
  if (error || !data) throw calendarError(error, '個人予定を作成できませんでした。');
  return data;
}

export async function createSharedCalendarEvent(input: CalendarEventInput) {
  const { data, error } = await calendarClient().rpc('create_shared_event', eventArgs(input));
  if (error || !data) throw calendarError(error, '共有予定を作成できませんでした。');
  return data;
}

async function calendarAction(
  name:
    | 'approve_shared_event'
    | 'reject_shared_event'
    | 'withdraw_shared_event'
    | 'cancel_personal_event',
  eventId: string,
  fallback: string
) {
  const { error } = await calendarClient().rpc(name, { target_event_id: eventId });
  if (error) throw calendarError(error, fallback);
}

export async function approveSharedCalendarEvent(eventId: string) {
  await calendarAction('approve_shared_event', eventId, '共有予定を承認できませんでした。');
}

export async function rejectSharedCalendarEvent(eventId: string) {
  await calendarAction('reject_shared_event', eventId, '共有予定を却下できませんでした。');
}

export async function withdrawSharedCalendarEvent(eventId: string) {
  await calendarAction('withdraw_shared_event', eventId, '共有予定を取り下げできませんでした。');
}

export async function cancelPersonalCalendarEvent(eventId: string) {
  await calendarAction('cancel_personal_event', eventId, '個人予定を取り消せませんでした。');
}
