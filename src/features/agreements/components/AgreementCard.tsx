import { Link } from 'react-router-dom';
import { formatAmount, formatDateTime } from '../../requests/lib/requestFormatting';
import { getAgreementDisplayStatus } from '../lib/agreementFormatting';
import type { Agreement } from '../types/agreement';

export function AgreementCard({ agreement }: { agreement: Agreement }) {
  return (
    <article className="request-card">
      <span className="request-status">{getAgreementDisplayStatus(agreement)}</span>
      <h3>{agreement.proposal.title}</h3>
      <p>{formatAmount(agreement.proposal.amount, agreement.proposal.amountType)}</p>
      <small>期限: {formatDateTime(agreement.dueAt)}</small>
      <Link to={`/agreements/${agreement.id}`}>合意内容を見る</Link>
    </article>
  );
}
