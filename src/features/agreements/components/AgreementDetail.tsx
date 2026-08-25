import { useState } from 'react';
import { formatAmount, formatDateTime } from '../../requests/lib/requestFormatting';
import { completeAgreement } from '../services/agreementService';
import { getAgreementDisplayStatus } from '../lib/agreementFormatting';
import type { Agreement } from '../types/agreement';

export function AgreementDetail({
  agreement,
  onCompleted
}: {
  agreement: Agreement;
  onCompleted: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return (
    <section className="agreement-detail" aria-label="確定した合意">
      <h2>確定した合意</h2>
      <span className="request-status">{getAgreementDisplayStatus(agreement)}</span>
      <dl className="detail-grid">
        <dt>確定proposal</dt>
        <dd>v{agreement.proposal.versionNo}</dd>
        <dt>金額</dt>
        <dd>{formatAmount(agreement.proposal.amount, agreement.proposal.amountType)}</dd>
        <dt>内容</dt>
        <dd>{agreement.proposal.details ?? '未入力'}</dd>
        <dt>予定日時</dt>
        <dd>{formatDateTime(agreement.scheduledAt)}</dd>
        <dt>期限</dt>
        <dd>{formatDateTime(agreement.dueAt)}</dd>
        <dt>合意日時</dt>
        <dd>{formatDateTime(agreement.createdAt)}</dd>
        {agreement.completedAt && (
          <>
            <dt>完了日時</dt>
            <dd>{formatDateTime(agreement.completedAt)}</dd>
          </>
        )}
      </dl>
      {error && <p className="form-error">{error}</p>}
      {agreement.executionStatus === 'pending' && (
        <button
          className="primary-button"
          disabled={pending}
          type="button"
          onClick={() => {
            setPending(true);
            setError('');
            void completeAgreement(agreement.id)
              .then(onCompleted)
              .catch((actionError) =>
                setError(
                  actionError instanceof Error
                    ? actionError.message
                    : '完了を記録できませんでした。'
                )
              )
              .finally(() => setPending(false));
          }}
        >
          実行済みにする
        </button>
      )}
    </section>
  );
}
