import { z } from 'zod';
import { requestCategories, type CreateRequestInput } from '../types/request';

const maxAmount = 999_999_999_999;

export interface RequestFormValues {
  title: string;
  category: string;
  amount: string;
  amountType: string;
  details: string;
  scheduledAt: string;
  dueAt: string;
}

const formSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'タイトルを入力してください。')
      .max(120, 'タイトルは120文字以内です。'),
    category: z.enum(requestCategories, { error: 'カテゴリを選択してください。' }),
    amount: z.string(),
    amountType: z.enum(['one_time', 'monthly']).or(z.literal('')),
    details: z.string().trim().max(5000, '内容・理由は5000文字以内です。'),
    scheduledAt: z.string(),
    dueAt: z.string()
  })
  .superRefine((values, context) => {
    if (!values.amount && values.amountType) {
      context.addIssue({ code: 'custom', path: ['amount'], message: '金額を入力してください。' });
      return;
    }
    if (!values.amount) return;
    if (!/^\d+$/.test(values.amount)) {
      context.addIssue({
        code: 'custom',
        path: ['amount'],
        message: '金額は0以上の整数で入力してください。'
      });
      return;
    }
    const amount = Number(values.amount);
    if (!Number.isSafeInteger(amount) || amount > maxAmount) {
      context.addIssue({ code: 'custom', path: ['amount'], message: '金額が上限を超えています。' });
    }
    if (!values.amountType) {
      context.addIssue({
        code: 'custom',
        path: ['amountType'],
        message: '金額種別を選択してください。'
      });
    }
  });

export function parseRequestForm(values: RequestFormValues): CreateRequestInput {
  const parsed = formSchema.parse(values);
  return {
    title: parsed.title,
    category: parsed.category,
    amount: parsed.amount ? Number(parsed.amount) : null,
    amountType: parsed.amount ? (parsed.amountType as 'one_time' | 'monthly') : null,
    details: parsed.details || null,
    scheduledAt: parsed.scheduledAt ? new Date(parsed.scheduledAt).toISOString() : null,
    dueAt: parsed.dueAt ? new Date(parsed.dueAt).toISOString() : null
  };
}

export function getRequestFormError(error: unknown) {
  if (error instanceof z.ZodError)
    return error.issues[0]?.message ?? '入力内容を確認してください。';
  return error instanceof Error ? error.message : '申請を送信できませんでした。';
}
