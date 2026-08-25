import { useState, type FormEvent } from 'react';
import { categoryLabels } from '../lib/requestConstants';
import { getRequestFormError, parseRequestForm } from '../lib/requestValidation';
import {
  requestCategories,
  type NegotiationProposalInput,
  type RequestCategory,
  type RequestProposal
} from '../types/request';

function asLocalDateTime(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

interface Props {
  proposal: RequestProposal;
  category: RequestCategory;
  submitLabel: string;
  onSubmit: (input: NegotiationProposalInput) => Promise<void>;
}

export function NegotiationProposalForm({ proposal, category, submitLabel, onSubmit }: Props) {
  const [values, setValues] = useState({
    title: proposal.title,
    category,
    amount: proposal.amount?.toString() ?? '',
    amountType: proposal.amountType ?? '',
    details: proposal.details ?? '',
    scheduledAt: asLocalDateTime(proposal.scheduledAt),
    dueAt: asLocalDateTime(proposal.dueAt),
    reason: ''
  });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const update = (name: keyof typeof values, value: string) =>
    setValues((current) => ({ ...current, [name]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      if (!values.reason.trim()) throw new Error('変更理由を入力してください。');
      if (values.reason.trim().length > 2000) throw new Error('変更理由は2000文字以内です。');
      const proposalInput = parseRequestForm(values);
      setPending(true);
      await onSubmit({ ...proposalInput, reason: values.reason.trim() });
    } catch (submitError) {
      setError(getRequestFormError(submitError));
      setPending(false);
    }
  };

  return (
    <form className="request-form response-panel" onSubmit={submit}>
      <label>
        変更理由
        <textarea
          required
          maxLength={2000}
          rows={3}
          value={values.reason}
          onChange={(event) => update('reason', event.target.value)}
        />
      </label>
      <label>
        タイトル
        <input
          required
          maxLength={120}
          value={values.title}
          onChange={(event) => update('title', event.target.value)}
        />
      </label>
      <label>
        カテゴリ
        <select
          value={values.category}
          onChange={(event) => update('category', event.target.value)}
        >
          {requestCategories.map((item) => (
            <option key={item} value={item}>
              {categoryLabels[item]}
            </option>
          ))}
        </select>
      </label>
      <div className="form-row">
        <label>
          金額（任意・円）
          <input
            inputMode="numeric"
            value={values.amount}
            onChange={(event) => update('amount', event.target.value)}
          />
        </label>
        <label>
          金額種別
          <select
            value={values.amountType}
            onChange={(event) => update('amountType', event.target.value)}
          >
            <option value="">選択してください</option>
            <option value="one_time">単発</option>
            <option value="monthly">月額</option>
          </select>
        </label>
      </div>
      <label>
        内容・理由（任意）
        <textarea
          maxLength={5000}
          rows={5}
          value={values.details}
          onChange={(event) => update('details', event.target.value)}
        />
      </label>
      <div className="form-row">
        <label>
          予定日時（任意）
          <input
            type="datetime-local"
            value={values.scheduledAt}
            onChange={(event) => update('scheduledAt', event.target.value)}
          />
        </label>
        <label>
          期限（任意）
          <input
            type="datetime-local"
            value={values.dueAt}
            onChange={(event) => update('dueAt', event.target.value)}
          />
        </label>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="primary-button" disabled={pending || !values.reason.trim()} type="submit">
        {pending ? '送信しています…' : submitLabel}
      </button>
    </form>
  );
}
