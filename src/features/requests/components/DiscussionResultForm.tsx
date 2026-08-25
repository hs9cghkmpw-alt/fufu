import { useState } from 'react';
import { NegotiationServiceError, recordDiscussionResult } from '../services/negotiationService';
import type { RequestCategory, RequestProposal } from '../types/request';
import { NegotiationProposalForm } from './NegotiationProposalForm';

interface Props {
  requestId: string;
  expectedVersion: number;
  category: RequestCategory;
  proposal: RequestProposal;
  onCompleted: (message: string) => Promise<void>;
}

export function DiscussionResultForm(props: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  if (!open)
    return (
      <button className="primary-button" type="button" onClick={() => setOpen(true)}>
        話し合った結果を登録する
      </button>
    );
  return (
    <section aria-label="話し合い結果の登録">
      <h2>話し合い結果を新しい提案として登録</h2>
      {error && <p className="form-error">{error}</p>}
      <NegotiationProposalForm
        proposal={props.proposal}
        category={props.category}
        submitLabel={`v${props.expectedVersion + 1}として相手に提案する`}
        onSubmit={async (input) => {
          try {
            await recordDiscussionResult(props.requestId, props.expectedVersion, input);
            await props.onCompleted('話し合い結果を新しい提案として登録しました。');
          } catch (actionError) {
            const message =
              actionError instanceof Error ? actionError.message : '登録できませんでした。';
            setError(message);
            if (actionError instanceof NegotiationServiceError && actionError.code === 'stale')
              await props.onCompleted(message);
            throw actionError;
          }
        }}
      />
      <button className="text-button" type="button" onClick={() => setOpen(false)}>
        戻る
      </button>
    </section>
  );
}
