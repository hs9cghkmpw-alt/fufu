import { AuthApiError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { mapAuthError } from './authErrors';

describe('mapAuthError', () => {
  it('maps known API errors without exposing backend messages', () => {
    expect(
      mapAuthError(new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'))
    ).toBe('メールアドレスまたはパスワードが正しくありません。');
  });

  it('uses a safe fallback', () => {
    expect(mapAuthError(new Error('secret detail'))).toBe(
      '通信に失敗しました。時間をおいて再度お試しください。'
    );
  });
});
