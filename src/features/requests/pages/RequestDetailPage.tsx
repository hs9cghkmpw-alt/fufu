import { useParams } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { useRequestDetail } from '../hooks/useRequestDetail';
import { categoryLabels } from '../lib/requestConstants';
import { formatAmount, formatDateTime } from '../lib/requestFormatting';

export function RequestDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { request, isLoading, error } = useRequestDetail(id);
  if (isLoading) return <p>申請を読み込んでいます…</p>;
  if (error || !request) return <p className="form-error">{error || '申請が見つかりません。'}</p>;
  const proposal = request.proposal;
  return (
    <article className="page request-detail">
      <p className="eyebrow">Request detail</p>
      <h1>{proposal.title}</h1>
      <span className="request-status">回答待ち</span>
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
      </dl>
    </article>
  );
}
