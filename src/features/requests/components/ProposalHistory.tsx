import { formatAmount, formatDateTime } from '../lib/requestFormatting';
import type { RequestProposal } from '../types/request';

interface Props {
  proposals: RequestProposal[];
  currentVersion: number;
  currentUserId?: string;
}

export function ProposalHistory({ proposals, currentVersion, currentUserId }: Props) {
  return (
    <section aria-labelledby="proposal-history-title">
      <h2 id="proposal-history-title">提案履歴</h2>
      <ol className="proposal-history">
        {proposals.map((proposal) => {
          const current = proposal.versionNo === currentVersion;
          return (
            <li
              className={current ? 'proposal-version current' : 'proposal-version'}
              key={proposal.id}
            >
              <header>
                <strong>v{proposal.versionNo}</strong>
                {current && <span className="request-status">現在の提案</span>}
              </header>
              <dl className="detail-grid">
                <dt>提案者</dt>
                <dd>{proposal.authorUserId === currentUserId ? 'あなた' : '相手'}</dd>
                <dt>タイトル</dt>
                <dd>{proposal.title}</dd>
                <dt>金額</dt>
                <dd>{formatAmount(proposal.amount, proposal.amountType)}</dd>
                <dt>内容</dt>
                <dd>{proposal.details ?? '未入力'}</dd>
                {proposal.counterReason && (
                  <>
                    <dt>変更理由</dt>
                    <dd>{proposal.counterReason}</dd>
                  </>
                )}
                <dt>作成日時</dt>
                <dd>{formatDateTime(proposal.createdAt)}</dd>
              </dl>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
