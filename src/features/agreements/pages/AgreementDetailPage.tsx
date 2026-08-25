import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AgreementDetail } from '../components/AgreementDetail';
import { getAgreement } from '../services/agreementService';
import type { Agreement } from '../types/agreement';

export function AgreementDetailPage() {
  const { id } = useParams();
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      setAgreement(await getAgreement(id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '合意を取得できませんでした。');
    } finally {
      setIsLoading(false);
    }
  }, [id]);
  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  if (isLoading) return <p>合意を読み込んでいます…</p>;
  if (error || !agreement) return <p className="form-error">{error || '合意が見つかりません。'}</p>;
  return (
    <article className="page">
      <p className="eyebrow">Agreement detail</p>
      <h1>{agreement.proposal.title}</h1>
      <AgreementDetail agreement={agreement} onCompleted={refresh} />
    </article>
  );
}
