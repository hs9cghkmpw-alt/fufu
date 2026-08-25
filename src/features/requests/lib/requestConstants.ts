import type { AmountType, RequestCategory } from '../types/request';

export const categoryLabels: Record<RequestCategory, string> = {
  purchase: '買い物',
  money: 'お金',
  monthly_cost: '月額支出',
  schedule: '正式に合意したい予定',
  house: '家のこと',
  rule: 'ルール',
  promise: '約束',
  other: 'その他'
};

export const amountTypeLabels: Record<AmountType, string> = {
  one_time: '単発',
  monthly: '月額'
};

export const requestStatusLabels: Record<string, string> = {
  pending_response: '回答待ち',
  approved: '合意済み',
  rejected: '却下',
  discussion_scheduled: '話し合い予定',
  negotiating: '条件調整中',
  withdrawn: '取下げ',
  cancelled: '取消済み'
};
