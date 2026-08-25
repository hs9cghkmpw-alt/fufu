import { RequestCard } from './RequestCard';
import type { RequestSummary } from '../types/request';

export function RequestSection({
  title,
  requests,
  emptyText
}: {
  title: string;
  requests: RequestSummary[];
  emptyText: string;
}) {
  return (
    <section className="request-section">
      <h2>{title}</h2>
      {requests.length ? (
        requests.map((request) => <RequestCard key={request.id} request={request} />)
      ) : (
        <p className="empty-state">{emptyText}</p>
      )}
    </section>
  );
}
