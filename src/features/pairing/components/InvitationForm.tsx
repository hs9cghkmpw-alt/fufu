import { useState, type FormEvent } from 'react';

interface Props {
  onJoin: (code: string) => Promise<void>;
}

export function InvitationForm({ onJoin }: Props) {
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      await onJoin(code);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '参加できませんでした。');
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="pairing-action" onSubmit={(event) => void submit(event)}>
      <label>
        招待コード
        <input
          aria-describedby="invite-help"
          autoCapitalize="none"
          autoCorrect="off"
          required
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      </label>
      <small id="invite-help">相手から共有された36文字のコードを入力してください。</small>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? '参加中…' : '招待コードで参加'}
      </button>
    </form>
  );
}
