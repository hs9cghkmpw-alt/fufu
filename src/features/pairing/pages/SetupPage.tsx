import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupabaseClient } from '../../../shared/lib/supabase/client';
import { InvitationForm } from '../components/InvitationForm';
import { usePairing } from '../context/PairingContext';
import { mapPairingError } from '../lib/pairingErrors';

interface IssuedInvitation {
  id: string;
  code: string;
  expiresAt: string;
}

export function SetupPage() {
  const {
    coupleId,
    members,
    isLoading,
    error: loadError,
    refresh,
    createCouple,
    joinCouple
  } = usePairing();
  const [invitation, setInvitation] = useState<IssuedInvitation | null>(null);
  const [actionError, setActionError] = useState('');
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<void>) {
    setPending(true);
    setActionError('');
    try {
      await action();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : '処理を完了できませんでした。');
    } finally {
      setPending(false);
    }
  }

  async function issueInvitation() {
    if (!coupleId) return;
    const { data, error } = await getSupabaseClient().rpc('create_couple_invitation', {
      target_couple_id: coupleId
    });
    if (error) throw new Error(mapPairingError(error));
    const issued = data[0];
    if (!issued) throw new Error('招待コードを発行できませんでした。');
    setInvitation({
      id: issued.invitation_id,
      code: issued.invite_code,
      expiresAt: issued.expires_at
    });
  }

  async function revokeInvitation() {
    if (!invitation) return;
    const { error } = await getSupabaseClient().rpc('revoke_couple_invitation', {
      target_invitation_id: invitation.id
    });
    if (error) throw new Error(mapPairingError(error));
    setInvitation(null);
  }

  if (isLoading)
    return (
      <main className="setup-page" aria-busy="true">
        <p>ペアリング状態を確認しています…</p>
      </main>
    );

  if (loadError)
    return (
      <main className="setup-page">
        <p className="form-error" role="alert">
          {loadError}
        </p>
        <button type="button" className="primary-button" onClick={() => void refresh()}>
          再読み込み
        </button>
      </main>
    );

  if (coupleId && members.length >= 2)
    return (
      <main className="setup-page">
        <section className="setup-card">
          <p className="eyebrow">ふたりのスペース</p>
          <h1>ペアリング完了</h1>
          <p>2人が同じ夫婦スペースに参加しています。</p>
          <Link className="primary-button" to="/home">
            ホームへ進む
          </Link>
        </section>
      </main>
    );

  if (coupleId)
    return (
      <main className="setup-page">
        <section className="setup-card">
          <p className="eyebrow">ふたりのスペース</p>
          <h1>相手を招待</h1>
          <p>現在1人が参加しています。招待コードを相手へ安全な方法で共有してください。</p>
          {actionError && (
            <p className="form-error" role="alert">
              {actionError}
            </p>
          )}
          {invitation ? (
            <div className="invitation-result" role="status">
              <span>招待コード</span>
              <code>{invitation.code}</code>
              <small>
                有効期限:{' '}
                {new Intl.DateTimeFormat('ja-JP', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                }).format(new Date(invitation.expiresAt))}
              </small>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void run(revokeInvitation)}
                disabled={pending}
              >
                招待を取り消す
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="primary-button"
              onClick={() => void run(issueInvitation)}
              disabled={pending}
            >
              {pending ? '発行中…' : '招待コードを発行'}
            </button>
          )}
          <button type="button" className="text-button" onClick={() => void refresh()}>
            参加状況を更新
          </button>
        </section>
      </main>
    );

  return (
    <main className="setup-page">
      <section className="setup-card">
        <p className="eyebrow">初期セットアップ</p>
        <h1>ふたりのスペースを始める</h1>
        <p>どちらから始めても機能と権限は同じです。</p>
        {actionError && (
          <p className="form-error" role="alert">
            {actionError}
          </p>
        )}
        <div className="setup-actions">
          <section>
            <h2>新しく作る</h2>
            <p>最初の1人としてスペースを作り、相手を招待します。</p>
            <button
              type="button"
              className="primary-button"
              disabled={pending}
              onClick={() => void run(createCouple)}
            >
              新しい夫婦スペースを作る
            </button>
          </section>
          <section>
            <h2>招待で参加</h2>
            <InvitationForm onJoin={joinCouple} />
          </section>
        </div>
      </section>
    </main>
  );
}
