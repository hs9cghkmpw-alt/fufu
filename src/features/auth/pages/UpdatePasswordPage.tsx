import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../../../shared/lib/supabase/client';
import { mapAuthError } from '../lib/authErrors';

export function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  async function submit(event: FormEvent) {
    event.preventDefault();
    const { error: authError } = await getSupabaseClient().auth.updateUser({ password });
    if (authError) setError(mapAuthError(authError));
    else navigate('/home', { replace: true });
  }
  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>新しいパスワード</h1>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <form className="auth-form" onSubmit={(e) => void submit(e)}>
          <label>
            新しいパスワード
            <input
              type="password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="primary-button" type="submit">
            パスワードを更新
          </button>
        </form>
      </div>
    </main>
  );
}
