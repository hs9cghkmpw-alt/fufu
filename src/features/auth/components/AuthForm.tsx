import { useState, type FormEvent } from 'react';

interface Props {
  submitLabel: string;
  onSubmit: (email: string, password: string) => Promise<void>;
}

export function AuthForm({ submitLabel, onSubmit }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      await onSubmit(email, password);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={(event) => void submit(event)}>
      <label>
        メールアドレス
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label>
        パスワード
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button className="primary-button" disabled={pending} type="submit">
        {pending ? '送信中…' : submitLabel}
      </button>
    </form>
  );
}
