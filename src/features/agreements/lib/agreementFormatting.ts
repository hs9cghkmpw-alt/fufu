import type { Agreement } from '../types/agreement';

export const executionStatusLabels = {
  not_required: '実行確認なし',
  pending: '実行待ち',
  completed: '実行済み',
  cancelled: '取消済み'
} as const;

export function isAgreementOverdue(agreement: Agreement, now = new Date()) {
  return (
    agreement.executionStatus === 'pending' &&
    agreement.dueAt !== null &&
    new Date(agreement.dueAt).getTime() < now.getTime()
  );
}

export function getAgreementDisplayStatus(agreement: Agreement, now = new Date()) {
  return isAgreementOverdue(agreement, now)
    ? '期限超過・未実行'
    : executionStatusLabels[agreement.executionStatus];
}
