import { getSupabaseClient } from '../../../shared/lib/supabase/client';

export class ResponseServiceError extends Error {
  constructor(
    message: string,
    readonly code: 'stale' | 'forbidden' | 'invalid' | 'unknown'
  ) {
    super(message);
  }
}

function mapResponseError(error: { message: string }) {
  if (error.message.includes('stale_request')) {
    return new ResponseServiceError(
      '内容が更新されています。最新の状態を読み込みました。',
      'stale'
    );
  }
  if (
    error.message.includes('not_current_actor') ||
    error.message.includes('self_approval_forbidden') ||
    error.message.includes('request_not_respondable')
  ) {
    return new ResponseServiceError(
      'この申請には現在回答できません。最新の状態を確認してください。',
      'forbidden'
    );
  }
  if (error.message.includes('invalid_')) {
    return new ResponseServiceError('入力内容を確認してください。', 'invalid');
  }
  return new ResponseServiceError(
    '回答を保存できませんでした。時間をおいて再度お試しください。',
    'unknown'
  );
}

export async function approveRequest(requestId: string, expectedVersion: number) {
  const { error } = await getSupabaseClient().rpc('approve_request', {
    target_request_id: requestId,
    expected_version: expectedVersion
  });
  if (error) throw mapResponseError(error);
}

export async function rejectRequest(requestId: string, expectedVersion: number, reason: string) {
  const { error } = await getSupabaseClient().rpc('reject_request', {
    target_request_id: requestId,
    expected_version: expectedVersion,
    rejection_reason: reason.trim()
  });
  if (error) throw mapResponseError(error);
}

export async function scheduleDiscussion(
  requestId: string,
  expectedVersion: number,
  discussionAt: string
) {
  const { error } = await getSupabaseClient().rpc('schedule_discussion', {
    target_request_id: requestId,
    expected_version: expectedVersion,
    scheduled_for: new Date(discussionAt).toISOString()
  });
  if (error) throw mapResponseError(error);
}
