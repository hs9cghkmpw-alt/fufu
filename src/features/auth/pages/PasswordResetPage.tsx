import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getSupabaseClient } from '../../../shared/lib/supabase/client';
import { mapAuthError } from '../lib/authErrors';

export function PasswordResetPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const redirectTo = `${window.location.origin}/update-password`;
    const { error: authError } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
      redirectTo
    });
    if (authError) setError(mapAuthError(authError));
    else setMessage('登録状況にかかわらず、再設定用メールを送信しました。');
  }
  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>パスワード再設定</h1>
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
        <form className="auth-form" onSubmit={(e) => void submit(e)}>
          <label>
            メールアドレス
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className="primary-button" type="submit">
            再設定メールを送信
          </button>
        </form>
        <div className="auth-links">
          <Link to="/login">ログインへ戻る</Link>
        </div>
      </div>
    </main>
  );
}
