import { useState } from 'react';
import {
  approveRequest,
  rejectRequest,
  ResponseServiceError,
  scheduleDiscussion
} from '../services/responseService';
import { counterProposal, NegotiationServiceError } from '../services/negotiationService';
import type { RequestCategory, RequestProposal } from '../types/request';
import { NegotiationProposalForm } from './NegotiationProposalForm';

interface Props {
  requestId: string;
  expectedVersion: number;
  onCompleted: (message: string) => Promise<void>;
  category?: RequestCategory;
  proposal?: RequestProposal;
}

type Mode = 'approve' | 'reject' | 'discussion' | 'counter' | null;

export function ResponseActions({
  requestId,
  expectedVersion,
  onCompleted,
  category,
  proposal
}: Props) {
  const [mode, setMode] = useState<Mode>(null);
  const [reason, setReason] = useState('');
  const [discussionAt, setDiscussionAt] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const run = async (action: () => Promise<void>, successMessage: string) => {
    setPending(true);
    setError('');
    try {
      await action();
      await onCompleted(successMessage);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '回答を保存できませんでした。');
      if (actionError instanceof ResponseServiceError && actionError.code === 'stale') {
        await onCompleted(actionError.message);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="response-actions" aria-label="申請への回答">
      <h2>この申請への回答</h2>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!mode && (
        <div className="response-button-grid">
          <button className="primary-button" type="button" onClick={() => setMode('approve')}>
            承認する
          </button>
          <button className="secondary-button" type="button" onClick={() => setMode('reject')}>
            却下する
          </button>
          {proposal && category && (
            <button className="secondary-button" type="button" onClick={() => setMode('counter')}>
              条件を変えて提案する
            </button>
          )}
          <button className="secondary-button" type="button" onClick={() => setMode('discussion')}>
            家で話す
          </button>
        </div>
      )}
      {mode === 'approve' && (
        <div className="response-panel">
          <p>proposal v{expectedVersion}の内容全体に合意しますか？</p>
          <button
            className="primary-button"
            disabled={pending}
            type="button"
            onClick={() =>
              void run(() => approveRequest(requestId, expectedVersion), '申請を承認しました。')
            }
          >
            内容を確認して承認する
          </button>
          <button className="text-button" type="button" onClick={() => setMode(null)}>
            戻る
          </button>
        </div>
      )}
      {mode === 'reject' && (
        <form
          className="response-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void run(
              () => rejectRequest(requestId, expectedVersion, reason),
              '申請を却下しました。'
            );
          }}
        >
          <label>
            却下する理由
            <textarea
              required
              maxLength={2000}
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <button className="primary-button" disabled={pending || !reason.trim()} type="submit">
            理由を記録して却下する
          </button>
          <button className="text-button" type="button" onClick={() => setMode(null)}>
            戻る
          </button>
        </form>
      )}
      {mode === 'discussion' && (
        <form
          className="response-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void run(
              () => scheduleDiscussion(requestId, expectedVersion, discussionAt),
              '話し合う日時を記録しました。'
            );
          }}
        >
          <label>
            話し合う日時
            <input
              required
              type="datetime-local"
              value={discussionAt}
              onChange={(event) => setDiscussionAt(event.target.value)}
            />
          </label>
          <button className="primary-button" disabled={pending || !discussionAt} type="submit">
            話し合う日時を記録する
          </button>
          <button className="text-button" type="button" onClick={() => setMode(null)}>
            戻る
          </button>
        </form>
      )}
      {mode === 'counter' && proposal && category && (
        <div className="response-panel">
          <h3>v{expectedVersion + 1}の提案</h3>
          <NegotiationProposalForm
            proposal={proposal}
            category={category}
            submitLabel="変更後の条件を相手に提案する"
            onSubmit={async (input) => {
              try {
                await counterProposal(requestId, expectedVersion, input);
                await onCompleted('新しい条件を相手に提案しました。');
              } catch (actionError) {
                const message =
                  actionError instanceof Error
                    ? actionError.message
                    : '提案を保存できませんでした。';
                setError(message);
                if (actionError instanceof NegotiationServiceError && actionError.code === 'stale')
                  await onCompleted(message);
                throw actionError;
              }
            }}
          />
          <button className="text-button" type="button" onClick={() => setMode(null)}>
            戻る
          </button>
        </div>
      )}
    </section>
  );
}
