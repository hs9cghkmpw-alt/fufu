import { expect, test } from '@playwright/test';

test('app shell and primary navigation are available', async ({ page }) => {
  await page.goto('/home');
  await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'メインナビゲーション' })).toBeVisible();
});
