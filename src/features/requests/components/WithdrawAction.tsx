import { useState } from 'react';
import { NegotiationServiceError, withdrawRequest } from '../services/negotiationService';

interface Props {
  requestId: string;
  expectedVersion: number;
  onCompleted: (message: string) => Promise<void>;
}

export function WithdrawAction({ requestId, expectedVersion, onCompleted }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  if (!confirming)
    return (
      <button className="text-button" type="button" onClick={() => setConfirming(true)}>
        申請を取り下げる
      </button>
    );
  return (
    <section className="response-panel" aria-label="申請の取下げ">
      <p>提案履歴を残したまま、この申請を取り下げます。</p>
      {error && <p className="form-error">{error}</p>}
      <button
        className="secondary-button"
        disabled={pending}
        type="button"
        onClick={() => {
          setPending(true);
          setError('');
          void withdrawRequest(requestId, expectedVersion)
            .then(() => onCompleted('申請を取り下げました。'))
            .catch(async (actionError) => {
              const message =
                actionError instanceof Error ? actionError.message : '取り下げできませんでした。';
              setError(message);
              if (actionError instanceof NegotiationServiceError && actionError.code === 'stale')
                await onCompleted(message);
            })
            .finally(() => setPending(false));
        }}
      >
        取下げを確定する
      </button>
      <button className="text-button" type="button" onClick={() => setConfirming(false)}>
        戻る
      </button>
    </section>
  );
}
