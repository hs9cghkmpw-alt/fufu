import { getSupabaseClient } from '../../../shared/lib/supabase/client';
import type { AmountType, RequestProposal } from '../../requests/types/request';
import type { Agreement, AgreementLifecycleStatus, ExecutionStatus } from '../types/agreement';

type AgreementRow = {
  id: string;
  couple_id: string;
  source_request_id: string;
  source_proposal_version_id: string;
  approved_response_id: string;
  lifecycle_status: string;
  execution_status: string;
  scheduled_at: string | null;
  due_at: string | null;
  completed_at: string | null;
  completed_by_user_id: string | null;
  created_at: string;
};

type ProposalRow = {
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
};

function mapProposal(row: ProposalRow): RequestProposal {
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

function mapAgreement(row: AgreementRow, proposal: ProposalRow): Agreement {
  return {
    id: row.id,
    coupleId: row.couple_id,
    sourceRequestId: row.source_request_id,
    sourceProposalVersionId: row.source_proposal_version_id,
    approvedResponseId: row.approved_response_id,
    lifecycleStatus: row.lifecycle_status as AgreementLifecycleStatus,
    executionStatus: row.execution_status as ExecutionStatus,
    scheduledAt: row.scheduled_at,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    completedByUserId: row.completed_by_user_id,
    createdAt: row.created_at,
    proposal: mapProposal(proposal)
  };
}

export async function listAgreements(): Promise<Agreement[]> {
  const supabase = getSupabaseClient();
  const { data: agreements, error } = await supabase
    .from('agreements')
    .select(
      'id,couple_id,source_request_id,source_proposal_version_id,approved_response_id,lifecycle_status,execution_status,scheduled_at,due_at,completed_at,completed_by_user_id,created_at'
    )
    .order('created_at', { ascending: false });
  if (error) throw new Error('合意一覧を取得できませんでした。');
  if (!agreements.length) return [];
  const { data: proposals, error: proposalError } = await supabase
    .from('proposal_versions')
    .select(
      'id,request_id,version_no,author_user_id,title,details,amount,amount_type,scheduled_at,due_at,counter_reason,created_at'
    )
    .in(
      'id',
      agreements.map((agreement) => agreement.source_proposal_version_id)
    );
  if (proposalError) throw new Error('合意内容を取得できませんでした。');
  const proposalById = new Map(proposals.map((proposal) => [proposal.id, proposal]));
  return agreements.flatMap((agreement) => {
    const proposal = proposalById.get(agreement.source_proposal_version_id);
    return proposal ? [mapAgreement(agreement, proposal)] : [];
  });
}

export async function getAgreement(agreementId: string) {
  return (await listAgreements()).find((agreement) => agreement.id === agreementId) ?? null;
}

export async function getAgreementByRequest(requestId: string) {
  return (
    (await listAgreements()).find((agreement) => agreement.sourceRequestId === requestId) ?? null
  );
}

export async function completeAgreement(agreementId: string) {
  const { error } = await getSupabaseClient().rpc('complete_agreement', {
    target_agreement_id: agreementId,
    expected_execution_status: 'pending'
  });
  if (!error) return;
  if (error.message.includes('stale_agreement'))
    throw new Error('実行状態が更新されています。最新の状態を確認してください。');
  throw new Error('完了を記録できませんでした。最新の状態を確認してください。');
}
