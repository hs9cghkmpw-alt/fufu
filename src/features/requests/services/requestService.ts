import { getSupabaseClient } from '../../../shared/lib/supabase/client';
import type {
  AmountType,
  CreateRequestInput,
  RequestCategory,
  RequestProposal,
  RequestSummary
} from '../types/request';

function mapProposal(row: {
  id: string;
  request_id: string;
  version_no: number;
  author_user_id: string;
  title: string;
  details: string | null;
  amount: number | null;
  amount_type: string | null;
  scheduled_at: string | null;
  due_at: string | null;
  counter_reason: string | null;
  created_at: string;
}): RequestProposal {
  return {
    id: row.id,
    requestId: row.request_id,
    versionNo: row.version_no,
    authorUserId: row.author_user_id,
    title: row.title,
    details: row.details,
    amount: row.amount,
    amountType: row.amount_type as AmountType | null,
    scheduledAt: row.scheduled_at,
    dueAt: row.due_at,
    counterReason: row.counter_reason,
    createdAt: row.created_at
  };
}

export async function createRequest(input: CreateRequestInput) {
  const { data, error } = await getSupabaseClient().rpc('create_request', {
    p_title: input.title,
    p_category: input.category,
    p_amount: input.amount ?? undefined,
    p_amount_type: input.amountType ?? undefined,
    p_details: input.details ?? undefined,
    p_scheduled_at: input.scheduledAt ?? undefined,
    p_due_at: input.dueAt ?? undefined
  });
  if (error)
    throw new Error('申請を送信できませんでした。最新の状態を確認して再度お試しください。');
  return data;
}

export async function listRequests(): Promise<RequestSummary[]> {
  const supabase = getSupabaseClient();
  const { data: requests, error } = await supabase
    .from('requests')
    .select(
      'id,requester_user_id,current_actor_user_id,category,status,current_proposal_version,discussion_at,created_at'
    )
    .order('created_at', { ascending: false });
  if (error) throw new Error('申請一覧を取得できませんでした。');
  if (!requests.length) return [];
  const { data: proposals, error: proposalError } = await supabase
    .from('proposal_versions')
    .select(
      'id,request_id,version_no,author_user_id,title,details,amount,amount_type,scheduled_at,due_at,counter_reason,created_at'
    )
    .in(
      'request_id',
      requests.map((request) => request.id)
    );
  if (proposalError) throw new Error('申請内容を取得できませんでした。');
  const byRequest = new Map<string, typeof proposals>();
  for (const proposal of proposals) {
    const history = byRequest.get(proposal.request_id) ?? [];
    history.push(proposal);
    byRequest.set(proposal.request_id, history);
  }
  return requests.flatMap((request) => {
    const history = (byRequest.get(request.id) ?? []).sort(
      (left, right) => left.version_no - right.version_no
    );
    const proposal = history.find((item) => item.version_no === request.current_proposal_version);
    return proposal
      ? [
          {
            ...request,
            category: request.category as RequestCategory,
            currentProposalVersion: request.current_proposal_version,
            createdAt: request.created_at,
            requesterUserId: request.requester_user_id,
            currentActorUserId: request.current_actor_user_id,
            discussionAt: request.discussion_at,
            proposal: mapProposal(proposal),
            proposals: history.map(mapProposal)
          }
        ]
      : [];
  });
}

export async function getRequest(requestId: string): Promise<RequestSummary | null> {
  const requests = await listRequests();
  return requests.find((request) => request.id === requestId) ?? null;
}
