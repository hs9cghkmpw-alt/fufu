export const requestCategories = [
  'purchase',
  'money',
  'monthly_cost',
  'schedule',
  'house',
  'rule',
  'promise',
  'other'
] as const;

export type RequestCategory = (typeof requestCategories)[number];
export type AmountType = 'one_time' | 'monthly';

export interface RequestProposal {
  id: string;
  requestId: string;
  versionNo: number;
  authorUserId: string;
  title: string;
  details: string | null;
  amount: number | null;
  amountType: AmountType | null;
  scheduledAt: string | null;
  dueAt: string | null;
  createdAt: string;
}

export interface RequestSummary {
  id: string;
  requesterUserId: string;
  currentActorUserId: string | null;
  category: RequestCategory;
  status: string;
  currentProposalVersion: number;
  createdAt: string;
  proposal: RequestProposal;
}

export interface CreateRequestInput {
  title: string;
  category: RequestCategory;
  amount: number | null;
  amountType: AmountType | null;
  details: string | null;
  scheduledAt: string | null;
  dueAt: string | null;
}
