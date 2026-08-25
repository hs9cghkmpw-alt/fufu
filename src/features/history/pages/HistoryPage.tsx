import { useEffect, useState } from 'react';
import { AgreementCard } from '../../agreements/components/AgreementCard';
import type { Agreement } from '../../agreements/types/agreement';
import { RequestCard } from '../../requests/components/RequestCard';
import type { RequestSummary } from '../../requests/types/request';
import { getHistoryData } from '../services/historyService';

export function HistoryPage() {
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [completed, setCompleted] = useState<Agreement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    void getHistoryData()
      .then((data) => {
        setRequests(data.requests);
        setCompleted(data.completedAgreements);
      })
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : '履歴を取得できませんでした。')
      )
      .finally(() => setIsLoading(false));
  }, []);
  if (isLoading) return <p>履歴を読み込んでいます…</p>;
  if (error) return <p className="form-error">{error}</p>;
  return (
    <section className="page" aria-labelledby="history-title">
      <p className="eyebrow">History</p>
      <h1 id="history-title">履歴</h1>
      <h2>申請の結果</h2>
      <div className="request-list">
        {requests.map((request) => (
          <RequestCard request={request} key={request.id} />
        ))}
        {!requests.length && <p>確定した申請履歴はありません。</p>}
      </div>
      <h2>実行済みの合意</h2>
      <div className="request-list">
        {completed.map((agreement) => (
          <AgreementCard agreement={agreement} key={agreement.id} />
        ))}
        {!completed.length && <p>実行済みの合意はありません。</p>}
      </div>
    </section>
  );
}
