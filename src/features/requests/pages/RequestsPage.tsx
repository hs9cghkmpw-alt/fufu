import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { RequestSection } from '../components/RequestSection';
import { useRequests } from '../hooks/useRequests';

export function RequestsPage() {
  const { user } = useAuth();
  const { requests, isLoading, error, refresh } = useRequests();

  if (isLoading) return <p>申請を読み込んでいます…</p>;
  if (error)
    return (
      <div className="form-error">
        <p>{error}</p>
        <button className="secondary-button" onClick={() => void refresh()}>
          再読み込み
        </button>
      </div>
    );

  const needsAction = requests.filter((request) => request.currentActorUserId === user?.id);
  const waiting = requests.filter(
    (request) =>
      request.requesterUserId === user?.id &&
      request.currentActorUserId !== user.id &&
      ['pending_response', 'negotiating'].includes(request.status)
  );
  const approved = requests.filter((request) => request.status === 'approved');
  const discussions = requests.filter((request) => request.status === 'discussion_scheduled');
  return (
    <div className="page requests-page">
      <p className="eyebrow">Formal requests</p>
      <div className="page-title-row">
        <h1>申請</h1>
        <Link className="primary-button compact" to="/requests/new">
          新しい申請
        </Link>
      </div>
      <RequestSection
        title="あなたの対応が必要"
        requests={needsAction}
        emptyText="現在、対応が必要な申請はありません。"
      />
      <RequestSection
        title="相手の回答待ち"
        requests={waiting}
        emptyText="現在、回答待ちの申請はありません。"
      />
      <RequestSection
        title="話し合い予定"
        requests={discussions}
        emptyText="話し合い予定はありません。"
      />
      <RequestSection
        title="最近の合意"
        requests={approved}
        emptyText="合意済みの申請はまだありません。"
      />
      <RequestSection
        title="最近の申請"
        requests={requests.slice(0, 10)}
        emptyText="申請はまだありません。"
      />
    </div>
  );
}
