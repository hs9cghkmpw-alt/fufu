import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../../../shared/lib/supabase/client';
import { AuthForm } from '../components/AuthForm';
import { mapAuthError } from '../lib/authErrors';

export function SignupPage() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  async function signup(email: string, password: string) {
    setError('');
    setMessage('');
    const { data, error: authError } = await getSupabaseClient().auth.signUp({ email, password });
    if (authError) {
      setError(mapAuthError(authError));
      return;
    }
    if (data.session) navigate('/home', { replace: true });
    else setMessage('確認メールを送信しました。メール内のリンクから登録を完了してください。');
  }
  return (
    <main className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">ふたりの約束</p>
        <h1>アカウント作成</h1>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        <AuthForm submitLabel="登録する" onSubmit={signup} />
        <div className="auth-links">
          <Link to="/login">ログインへ戻る</Link>
        </div>
      </div>
    </main>
  );
}
