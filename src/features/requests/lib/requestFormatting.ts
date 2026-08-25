import type { RequestProposal } from '../types/request';

export function formatAmount(amount: number | null, amountType: RequestProposal['amountType']) {
  if (amount === null) return '金額なし';
  const suffix = amountType === 'monthly' ? '/月' : '';
  return `${new Intl.NumberFormat('ja-JP').format(amount)}円${suffix}`;
}

export function formatDateTime(value: string | null) {
  if (!value) return '未設定';
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Tokyo'
  }).format(new Date(value));
}
