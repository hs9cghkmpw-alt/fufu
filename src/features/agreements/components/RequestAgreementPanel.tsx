import { useCallback, useEffect, useState } from 'react';
import { AgreementDetail } from './AgreementDetail';
import { getAgreementByRequest } from '../services/agreementService';
import type { Agreement } from '../types/agreement';

export function RequestAgreementPanel({ requestId }: { requestId: string }) {
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      setAgreement(await getAgreementByRequest(requestId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '合意を取得できませんでした。');
    }
  }, [requestId]);
  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  if (error) return <p className="form-error">{error}</p>;
  if (!agreement) return <p>合意内容を読み込んでいます…</p>;
  return <AgreementDetail agreement={agreement} onCompleted={refresh} />;
}
