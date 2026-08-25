import { Link } from 'react-router-dom';
import { categoryLabels } from '../lib/requestConstants';
import { formatAmount } from '../lib/requestFormatting';
import type { RequestSummary } from '../types/request';

export function RequestCard({ request }: { request: RequestSummary }) {
  return (
    <Link className="request-card" to={`/requests/${request.id}`}>
      <span className="request-status">回答待ち</span>
      <h3>{request.proposal.title}</h3>
      <p>{categoryLabels[request.category]}</p>
      <strong>{formatAmount(request.proposal.amount, request.proposal.amountType)}</strong>
    </Link>
  );
}
