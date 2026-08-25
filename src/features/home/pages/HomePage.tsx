import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { AgreementCard } from '../../agreements/components/AgreementCard';
import { RequestCard } from '../../requests/components/RequestCard';
import { HomeSection } from '../components/HomeSection';
import { useHomeData } from '../hooks/useHomeData';

export function HomePage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useHomeData(user?.id);
  if (isLoading) return <p>ホームを読み込んでいます…</p>;
  if (error) return <p className="form-error">{error}</p>;
  return (
    <section className="page" aria-labelledby="home-title">
      <p className="eyebrow">ふたりの現在地</p>
      <h1 id="home-title">ホーム</h1>
      <Link className="primary-button button-link" to="/requests/new">
        ＋ 申請を作る
      </Link>
      <HomeSection
        title="あなたの対応が必要"
        count={data.actionRequired.length}
        emptyMessage="対応が必要な申請はありません。"
      >
        {data.actionRequired.map((request) => (
          <RequestCard request={request} key={request.id} />
        ))}
      </HomeSection>
      <HomeSection
        title="未実行・期限超過"
        count={data.overdue.length}
        emptyMessage="期限を過ぎた未実行の合意はありません。"
      >
        {data.overdue.map((agreement) => (
          <AgreementCard agreement={agreement} key={agreement.id} />
        ))}
      </HomeSection>
      <HomeSection
        title="今日・近日の予定"
        count={data.upcoming.length}
        emptyMessage="近日の合意済み予定はありません。"
      >
        {data.upcoming.map((agreement) => (
          <AgreementCard agreement={agreement} key={agreement.id} />
        ))}
      </HomeSection>
      <HomeSection
        title="相手の回答待ち"
        count={data.awaitingPartner.length}
        emptyMessage="相手の回答を待っている申請はありません。"
      >
        {data.awaitingPartner.map((request) => (
          <RequestCard request={request} key={request.id} />
        ))}
      </HomeSection>
      <HomeSection
        title="話し合い予定"
        count={data.discussions.length}
        emptyMessage="話し合い予定はありません。"
      >
        {data.discussions.map((request) => (
          <RequestCard request={request} key={request.id} />
        ))}
      </HomeSection>
      <HomeSection
        title="最近の合意"
        count={data.recentAgreements.length}
        emptyMessage="最近の合意はありません。"
      >
        {data.recentAgreements.map((agreement) => (
          <AgreementCard agreement={agreement} key={agreement.id} />
        ))}
      </HomeSection>
    </section>
  );
}
