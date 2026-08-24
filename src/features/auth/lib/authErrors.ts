import { AuthApiError } from '@supabase/supabase-js';

const messages: Record<string, string> = {
  invalid_credentials: 'メールアドレスまたはパスワードが正しくありません。',
  email_not_confirmed: 'メールアドレスの確認が完了していません。',
  user_already_exists: 'このメールアドレスはすでに登録されています。',
  weak_password: 'より安全なパスワードを入力してください。',
  over_request_rate_limit: '操作が多すぎます。しばらく待ってから再度お試しください。'
};

export function mapAuthError(error: unknown): string {
  if (error instanceof AuthApiError) return messages[error.code ?? ''] ?? '認証に失敗しました。';
  return '通信に失敗しました。時間をおいて再度お試しください。';
}
