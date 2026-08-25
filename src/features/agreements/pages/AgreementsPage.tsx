import { AgreementCard } from '../components/AgreementCard';
import { useAgreements } from '../hooks/useAgreements';

export function AgreementsPage() {
  const { agreements, isLoading, error } = useAgreements();
  if (isLoading) return <p>合意を読み込んでいます…</p>;
  if (error) return <p className="form-error">{error}</p>;
  return (
    <section className="page" aria-labelledby="agreements-title">
      <p className="eyebrow">Agreements</p>
      <h1 id="agreements-title">合意一覧</h1>
      <div className="request-list">
        {agreements.map((agreement) => (
          <AgreementCard agreement={agreement} key={agreement.id} />
        ))}
        {!agreements.length && <p>確定した合意はまだありません。</p>}
      </div>
    </section>
  );
}
