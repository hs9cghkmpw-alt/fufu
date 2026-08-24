import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../../../shared/lib/supabase/client';
import { AuthForm } from '../components/AuthForm';
import { mapAuthError } from '../lib/authErrors';

export function LoginPage() {
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  async function login(email: string, password: string) {
    setError('');
    const { error: authError } = await getSupabaseClient().auth.signInWithPassword({
      email,
      password
    });
    if (authError) {
      setError(mapAuthError(authError));
      return;
    }
    const destination = (location.state as { from?: string } | null)?.from ?? '/home';
    navigate(destination, { replace: true });
  }
  return (
    <main className="auth-page">
      <div className="auth-card">
        <span className="auth-logo" aria-hidden="true">
          ♡
        </span>
        <p className="eyebrow">ふたりの約束</p>
        <h1>ログイン</h1>
        <p>夫婦それぞれのアカウントでログインします。</p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <AuthForm submitLabel="ログイン" onSubmit={login} />
        <nav className="auth-links">
          <Link to="/signup">アカウントを作成</Link>
          <Link to="/password-reset">パスワードを再設定</Link>
        </nav>
      </div>
    </main>
  );
}
