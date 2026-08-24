import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const email = `sprint1-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
const resetEmail = `sprint1-reset-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
const password = `Sprint1!${Date.now()}Aa`;

test('real Supabase signup, profile creation, session restore, logout and login', async ({
  page
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Run remote Auth once to respect rate limits');
  await page.goto('/home');
  await expect(page).toHaveURL(/\/login$/);

  await page.getByRole('link', { name: 'アカウントを作成' }).click();
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill(password);
  await page.getByRole('button', { name: '登録する' }).click();
  await expect(page).toHaveURL(/\/home$/, { timeout: 15_000 });

  await page.goto('/settings');
  await expect(page.getByRole('status')).toHaveText('プロフィール準備完了');

  await page.goto('/home');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible();
  await page.goto('/settings');
  await page.getByRole('button', { name: 'ログアウト' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/home');
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill(password);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await expect(page).toHaveURL(/\/home$/);
});

test('real Supabase password reset request', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Run remote Auth once to respect rate limits');
  await page.goto('/password-reset');
  await page.getByLabel('メールアドレス').fill(resetEmail);
  await page.getByRole('button', { name: '再設定メールを送信' }).click();
  await expect(page.getByRole('status')).toContainText('再設定用メールを送信しました');
});
