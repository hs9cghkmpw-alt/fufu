import { getSupabaseClient } from '../../../shared/lib/supabase/client';
import type { Database } from '../../../shared/lib/supabase/database.types';
import type { NegotiationProposalInput } from '../types/request';

export class NegotiationServiceError extends Error {
  constructor(
    message: string,
    public readonly code: 'stale' | 'validation' | 'forbidden' | 'unknown'
  ) {
    super(message);
  }
}

function toServiceError(error: { message: string }) {
  if (error.message.includes('stale_request')) {
    return new NegotiationServiceError(
      '内容が更新されています。最新の提案を確認してください。',
      'stale'
    );
  }
  if (
    error.message.includes('invalid_') ||
    error.message.includes('request_not_negotiable') ||
    error.message.includes('discussion_not_scheduled')
  ) {
    return new NegotiationServiceError('入力内容と最新の状態を確認してください。', 'validation');
  }
  if (
    error.message.includes('not_current_actor') ||
    error.message.includes('withdrawal_forbidden') ||
    error.message.includes('request_not_found')
  ) {
    return new NegotiationServiceError('この申請を操作する権限がありません。', 'forbidden');
  }
  return new NegotiationServiceError(
    '提案を保存できませんでした。もう一度お試しください。',
    'unknown'
  );
}

function rpcProposalArgs(
  requestId: string,
  expectedVersion: number,
  input: NegotiationProposalInput
) {
  return {
    target_request_id: requestId,
    expected_version: expectedVersion,
    p_title: input.title.trim(),
    p_category: input.category,
    p_amount: input.amount,
    p_amount_type: input.amountType,
    p_details: input.details?.trim() || null,
    p_scheduled_at: input.scheduledAt,
    p_due_at: input.dueAt,
    p_reason: input.reason.trim()
  };
}

type CounterArgs = Database['public']['Functions']['counter_proposal']['Args'];
type DiscussionResultArgs = Database['public']['Functions']['record_discussion_result']['Args'];

export async function counterProposal(
  requestId: string,
  expectedVersion: number,
  input: NegotiationProposalInput
) {
  const { data, error } = await getSupabaseClient().rpc(
    'counter_proposal',
    // Postgres accepts null for these unqualified function arguments; generated RPC args omit nullability.
    rpcProposalArgs(requestId, expectedVersion, input) as unknown as CounterArgs
  );
  if (error) throw toServiceError(error);
  return data;
}

export async function recordDiscussionResult(
  requestId: string,
  expectedVersion: number,
  input: NegotiationProposalInput
) {
  const { data, error } = await getSupabaseClient().rpc(
    'record_discussion_result',
    rpcProposalArgs(requestId, expectedVersion, input) as unknown as DiscussionResultArgs
  );
  if (error) throw toServiceError(error);
  return data;
}

export async function withdrawRequest(requestId: string, expectedVersion: number) {
  const { data, error } = await getSupabaseClient().rpc('withdraw_request', {
    target_request_id: requestId,
    expected_version: expectedVersion
  });
  if (error) throw toServiceError(error);
  return data;
}
