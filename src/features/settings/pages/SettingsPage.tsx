import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { getSupabaseClient } from '../../../shared/lib/supabase/client';
export function SettingsPage() {
  const { user, signOut } = useAuth();
  const [error, setError] = useState('');
  const [profileReady, setProfileReady] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    if (!user) return;
    void getSupabaseClient()
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setProfileReady(Boolean(data)));
  }, [user]);
  async function logout() {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch {
      setError('ログアウトに失敗しました。');
    }
  }
  return (
    <section className="page">
      <p className="eyebrow">アカウント</p>
      <h1>設定</h1>
      <div className="placeholder-card">
        <p>{user?.email}</p>
        <p role="status">{profileReady ? 'プロフィール準備完了' : 'プロフィールを確認中…'}</p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary-button" type="button" onClick={() => void logout()}>
          ログアウト
        </button>
      </div>
    </section>
  );
}
