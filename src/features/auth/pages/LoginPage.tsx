import { Link } from 'react-router-dom';

export function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <span className="auth-logo" aria-hidden="true">
          ♡
        </span>
        <p className="eyebrow">ふたりの約束</p>
        <h1>ログイン</h1>
        <p>夫婦それぞれのアカウントでログインします。</p>
        <div className="notice">認証フォームはSprint 1で実装します。</div>
        <Link className="primary-button" to="/home">
          仮画面を確認
        </Link>
      </div>
    </main>
  );
}
