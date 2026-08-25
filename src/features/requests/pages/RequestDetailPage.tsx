import { useParams } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { ResponseActions } from '../components/ResponseActions';
import { DiscussionResultForm } from '../components/DiscussionResultForm';
import { ProposalHistory } from '../components/ProposalHistory';
import { WithdrawAction } from '../components/WithdrawAction';
import { useRequestDetail } from '../hooks/useRequestDetail';
import { categoryLabels, requestStatusLabels } from '../lib/requestConstants';
import { useState } from 'react';
import { formatAmount, formatDateTime } from '../lib/requestFormatting';
import { RequestAgreementPanel } from '../../agreements/components/RequestAgreementPanel';

export function RequestDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { request, isLoading, error, refresh } = useRequestDetail(id);
  const [notice, setNotice] = useState('');
  if (isLoading) return <p>申請を読み込んでいます…</p>;
  if (error || !request) return <p className="form-error">{error || '申請が見つかりません。'}</p>;
  const proposal = request.proposal;
  return (
    <article className="page request-detail">
      <p className="eyebrow">Request detail</p>
      <h1>{proposal.title}</h1>
      <span className="request-status">
        {requestStatusLabels[request.status] ?? request.status}
      </span>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <dl className="detail-grid">
        <dt>カテゴリ</dt>
        <dd>{categoryLabels[request.category]}</dd>
        <dt>金額</dt>
        <dd>{formatAmount(proposal.amount, proposal.amountType)}</dd>
        <dt>内容・理由</dt>
        <dd>{proposal.details ?? '未入力'}</dd>
        <dt>予定日時</dt>
        <dd>{formatDateTime(proposal.scheduledAt)}</dd>
        <dt>期限</dt>
        <dd>{formatDateTime(proposal.dueAt)}</dd>
        <dt>申請者</dt>
        <dd>{request.requesterUserId === user?.id ? 'あなた' : '相手'}</dd>
        <dt>次の対応者</dt>
        <dd>{request.currentActorUserId === user?.id ? 'あなた' : '相手'}</dd>
        <dt>提案</dt>
        <dd>v{proposal.versionNo}</dd>
        <dt>作成日時</dt>
        <dd>{formatDateTime(request.createdAt)}</dd>
        {request.status === 'discussion_scheduled' && (
          <>
            <dt>話し合う日時</dt>
            <dd>{formatDateTime(request.discussionAt)}</dd>
          </>
        )}
      </dl>
      {request.currentActorUserId === user?.id && (
        <ResponseActions
          requestId={request.id}
          expectedVersion={request.currentProposalVersion}
          category={request.category}
          proposal={proposal}
          onCompleted={async (message) => {
            await refresh();
            setNotice(message);
          }}
        />
      )}
      {request.status === 'discussion_scheduled' && (
        <DiscussionResultForm
          requestId={request.id}
          expectedVersion={request.currentProposalVersion}
          category={request.category}
          proposal={proposal}
          onCompleted={async (message) => {
            await refresh();
            setNotice(message);
          }}
        />
      )}
      {request.requesterUserId === user?.id &&
        ['pending_response', 'negotiating'].includes(request.status) && (
          <WithdrawAction
            requestId={request.id}
            expectedVersion={request.currentProposalVersion}
            onCompleted={async (message) => {
              await refresh();
              setNotice(message);
            }}
          />
        )}
      {request.status === 'approved' && <RequestAgreementPanel requestId={request.id} />}
      <ProposalHistory
        proposals={request.proposals}
        currentVersion={request.currentProposalVersion}
        currentUserId={user?.id}
      />
    </article>
  );
}
