import { expect, test, type Browser, type Page } from '@playwright/test';
import { loadEnv } from 'vite';

test.describe.configure({ mode: 'serial' });

const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const password = `Calendar!${Date.now()}Aa`;
const env = loadEnv('test', process.cwd(), 'VITE_');
const hasRemoteEnv = Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY);

interface SessionPage {
  context: Awaited<ReturnType<Browser['newContext']>>;
  page: Page;
}

async function signup(browser: Browser, name: string): Promise<SessionPage> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/signup');
  await page.getByLabel('メールアドレス').fill(`calendar-${name}-${runId}@example.com`);
  await page.getByLabel('パスワード').fill(password);
  await page.getByRole('button', { name: '登録する' }).click();
  await expect(page).toHaveURL(/\/setup$/, { timeout: 20_000 });
  return { context, page };
}

async function rest(
  page: Page,
  path: string,
  method = 'GET',
  body?: Record<string, unknown>
) {
  return page.evaluate(
    async ({ url, key, path, method, body }) => {
      const storageKey = Object.keys(localStorage).find(
        (candidate) => candidate.startsWith('sb-') && candidate.endsWith('-auth-token')
      );
      const value = storageKey ? localStorage.getItem(storageKey) : null;
      if (!value) throw new Error('Auth session was not persisted');
      const token = (JSON.parse(value) as { access_token: string }).access_token;
      const response = await fetch(`${url}/rest/v1/${path}`, {
        method,
        headers: {
          apikey: key,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: body ? JSON.stringify(body) : undefined
      });
      const text = await response.text();
      return {
        status: response.status,
        data: text ? (JSON.parse(text) as unknown) : null
      };
    },
    {
      url: env.VITE_SUPABASE_URL,
      key: env.VITE_SUPABASE_PUBLISHABLE_KEY,
      path,
      method,
      body
    }
  );
}

async function createAndInvite(page: Page) {
  await page.getByRole('button', { name: '新しい夫婦スペースを作る' }).click();
  await expect(page.getByRole('heading', { name: '相手を招待' })).toBeVisible();
  await page.getByRole('button', { name: '招待コードを発行' }).click();
  return (await page.locator('.invitation-result code').innerText()).trim();
}

test('calendar isolates personal events and projects shared/formal state', async ({
  browser
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Run remote mutations once');
  test.skip(!hasRemoteEnv, 'Remote Supabase test environment is not configured');
  test.setTimeout(600_000);

  const a = await signup(browser, 'a');
  const inviteCode = await createAndInvite(a.page);
  const b = await signup(browser, 'b');
  await b.page.getByLabel('招待コード').fill(inviteCode);
  await b.page.getByRole('button', { name: '招待コードで参加' }).click();
  await expect(b.page.getByRole('heading', { name: 'ペアリング完了' })).toBeVisible();

  await a.page.getByRole('button', { name: '参加状況を更新' }).click();
  await expect(a.page.getByRole('heading', { name: 'ペアリング完了' })).toBeVisible();

  const personal = await rest(a.page, 'rpc/create_personal_event', 'POST', {
    p_title: 'Aの個人予定',
    p_details: null,
    p_starts_at: null,
    p_ends_at: null,
    p_start_date: '2026-09-10',
    p_end_date: null
  });
  expect(personal.status).toBe(200);
  const personalId = personal.data as string;
  expect((await rest(b.page, `calendar_events?select=id&id=eq.${personalId}`)).data).toEqual([]);

  const shared = await rest(a.page, 'rpc/create_shared_event', 'POST', {
    p_title: 'ふたりの共有予定',
    p_details: null,
    p_starts_at: '2026-09-11T18:00:00+09:00',
    p_ends_at: null,
    p_start_date: null,
    p_end_date: null
  });
  expect(shared.status).toBe(200);
  const sharedId = shared.data as string;
  const sharedForB = await rest(
    b.page,
    `calendar_events?select=id,status,approval_status&id=eq.${sharedId}`
  );
  expect(sharedForB.data).toEqual([
    expect.objectContaining({ status: 'pending', approval_status: 'pending' })
  ]);
  expect(
    (await rest(b.page, 'rpc/approve_shared_event', 'POST', { target_event_id: sharedId })).status
  ).toBe(200);
  expect(
    (
      (await rest(a.page, `calendar_events?select=status&id=eq.${sharedId}`))
        .data as { status: string }[]
    )[0]?.status
  ).toBe('confirmed');

  const request = await rest(a.page, 'rpc/create_request', 'POST', {
    p_title: '合意予定',
    p_category: 'schedule',
    p_scheduled_at: '2026-09-12T10:00:00+09:00'
  });
  expect(request.status).toBe(200);
  const requestId = request.data as string;
  const pendingRows = await rest(
    a.page,
    `calendar_events?select=id,status&source_request_id=eq.${requestId}&event_type=eq.pending_proposal`
  );
  const pending = (pendingRows.data as { id: string; status: string }[])[0];
  expect(pending?.status).toBe('pending');

  expect(
    (
      await rest(b.page, 'rpc/approve_request', 'POST', {
        target_request_id: requestId,
        expected_version: 1
      })
    ).status
  ).toBe(200);
  expect(
    (
      (await rest(a.page, `calendar_events?select=status&id=eq.${pending?.id}`))
        .data as { status: string }[]
    )[0]?.status
  ).toBe('cancelled');
  const agreementProjection = await rest(
    a.page,
    `calendar_events?select=id,status,source_agreement_id&source_request_id=eq.${requestId}&event_type=eq.agreement`
  );
  expect(agreementProjection.data).toEqual([
    expect.objectContaining({ status: 'confirmed', source_agreement_id: expect.any(String) })
  ]);

  await a.page.goto('/calendar');
  await expect(a.page.getByRole('heading', { name: 'カレンダー' })).toBeVisible();
  await expect(a.page.getByRole('button', { name: '今日' })).toBeVisible();

  await a.context.close();
  await b.context.close();
});
