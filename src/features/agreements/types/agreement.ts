import type { RequestProposal } from '../../requests/types/request';

export type ExecutionStatus = 'not_required' | 'pending' | 'completed' | 'cancelled';
export type AgreementLifecycleStatus = 'active' | 'superseded' | 'cancelled';

export interface Agreement {
  id: string;
  coupleId: string;
  sourceRequestId: string;
  sourceProposalVersionId: string;
  approvedResponseId: string;
  lifecycleStatus: AgreementLifecycleStatus;
  executionStatus: ExecutionStatus;
  scheduledAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
  completedByUserId: string | null;
  createdAt: string;
  proposal: RequestProposal;
}
