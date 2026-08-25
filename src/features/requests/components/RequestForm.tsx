import { useState, type FormEvent } from 'react';
import { categoryLabels } from '../lib/requestConstants';
import {
  getRequestFormError,
  parseRequestForm,
  type RequestFormValues
} from '../lib/requestValidation';
import { requestCategories, type CreateRequestInput } from '../types/request';

const initialValues: RequestFormValues = {
  title: '',
  category: 'purchase',
  amount: '',
  amountType: '',
  details: '',
  scheduledAt: '',
  dueAt: ''
};

export function RequestForm({
  onSubmit
}: {
  onSubmit: (input: CreateRequestInput) => Promise<void>;
}) {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (name: keyof RequestFormValues, value: string) =>
    setValues((current) => ({ ...current, [name]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const input = parseRequestForm(values);
      setIsSubmitting(true);
      await onSubmit(input);
    } catch (submitError) {
      setError(getRequestFormError(submitError));
      setIsSubmitting(false);
    }
  };

  return (
    <form className="request-form" onSubmit={submit}>
      <label>
        タイトル
        <input
          value={values.title}
          maxLength={120}
          onChange={(event) => update('title', event.target.value)}
        />
      </label>
      <label>
        カテゴリ
        <select
          value={values.category}
          onChange={(event) => update('category', event.target.value)}
        >
          {requestCategories.map((category) => (
            <option key={category} value={category}>
              {categoryLabels[category]}
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
          value={values.details}
          maxLength={5000}
          rows={6}
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
      <button className="primary-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? '送信しています…' : '相手に申請を送る'}
      </button>
    </form>
  );
}
