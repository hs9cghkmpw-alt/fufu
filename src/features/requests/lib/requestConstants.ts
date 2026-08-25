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
