import { useNavigate } from 'react-router-dom';
import { RequestForm } from '../components/RequestForm';
import { createRequest } from '../services/requestService';

export function NewRequestPage() {
  const navigate = useNavigate();
  return (
    <div className="page">
      <p className="eyebrow">New request</p>
      <h1>新しい申請</h1>
      <p className="page-intro">後で確認できるよう、正式に合意したい内容を相手へ提案します。</p>
      <RequestForm
        onSubmit={async (input) => navigate(`/requests/${await createRequest(input)}`)}
      />
    </div>
  );
}
