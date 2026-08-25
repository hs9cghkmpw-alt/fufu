import { expect, test, type Browser, type Page } from '@playwright/test';
import { loadEnv } from 'vite';

test.describe.configure({ mode: 'serial' });

const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const password = `Request!${Date.now()}Aa`;
const env = loadEnv('test', process.cwd(), 'VITE_');

interface SessionPage {
  context: Awaited<ReturnType<Browser['newContext']>>;
  page: Page;
  userId: string;
}

async function signup(browser: Browser, name: string): Promise<SessionPage> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/signup');
  await page.getByLabel('メールアドレス').fill(`request-${name}-${runId}@example.com`);
  await page.getByLabel('パスワード').fill(password);
  await page.getByRole('button', { name: '登録する' }).click();
  await expect(page).toHaveURL(/\/setup$/, { timeout: 20_000 });
  const userId = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(
      (candidate) => candidate.startsWith('sb-') && candidate.endsWith('-auth-token')
    );
    const value = key ? localStorage.getItem(key) : null;
    if (!value) throw new Error('Auth session was not persisted');
    return (JSON.parse(value) as { user: { id: string } }).user.id;
  });
  return { context, page, userId };
}

async function rest(page: Page, path: string, method = 'GET', body?: Record<string, unknown>) {
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
      return { status: response.status, data: await response.json() };
    },
    { url: env.VITE_SUPABASE_URL, key: env.VITE_SUPABASE_PUBLISHABLE_KEY, path, method, body }
  );
}

async function createAndInvite(page: Page) {
  await page.getByRole('button', { name: '新しい夫婦スペースを作る' }).click();
  await expect(page.getByRole('heading', { name: '相手を招待' })).toBeVisible();
  await page.getByRole('button', { name: '招待コードを発行' }).click();
  return (await page.locator('.invitation-result code').innerText()).trim();
}

test('A creates requests, B responds, and another couple cannot read them', async ({
  browser
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'Run remote mutations once to respect rate limits'
  );
  test.setTimeout(600_000);

  const a = await signup(browser, 'a');
  const inviteCode = await createAndInvite(a.page);
  const b = await signup(browser, 'b');
  await b.page.getByLabel('招待コード').fill(inviteCode);
  await b.page.getByRole('button', { name: '招待コードで参加' }).click();
  await expect(b.page.getByRole('heading', { name: 'ペアリング完了' })).toBeVisible();

  await a.page.getByRole('button', { name: '参加状況を更新' }).click();
  await expect(a.page.getByRole('heading', { name: 'ペアリング完了' })).toBeVisible();
  await a.page.goto('/requests/new');
  await a.page.getByLabel('タイトル').fill('新しい掃除機の提案');
  await a.page.getByLabel('カテゴリ').selectOption('purchase');
  await a.page.getByLabel('金額（任意・円）').fill('4800');
  await a.page.getByLabel('金額種別').selectOption('one_time');
  await a.page.getByLabel('内容・理由（任意）').fill('二人で使う掃除機について相談したい');
  await a.page.getByRole('button', { name: '相手に申請を送る' }).click();
  await expect(a.page).toHaveURL(/\/requests\/[0-9a-f-]+$/);
  const detailUrl = new URL(a.page.url()).pathname;
  await expect(a.page.getByRole('heading', { name: '新しい掃除機の提案' })).toBeVisible();
  await expect(a.page.getByText('4,800円').first()).toBeVisible();
  await expect(a.page.getByText('v1').first()).toBeVisible();

  const requestId = detailUrl.split('/').at(-1)!;
  const requestRows = await rest(
    a.page,
    `requests?select=couple_id,requester_user_id,current_actor_user_id,status,current_proposal_version&id=eq.${requestId}`
  );
  expect(requestRows.status).toBe(200);
  expect(requestRows.data).toEqual([
    {
      couple_id: expect.any(String),
      requester_user_id: a.userId,
      current_actor_user_id: b.userId,
      status: 'pending_response',
      current_proposal_version: 1
    }
  ]);
  const coupleId = (requestRows.data as { couple_id: string }[])[0]!.couple_id;
  const proposalRows = await rest(
    a.page,
    `proposal_versions?select=id,version_no,author_user_id&request_id=eq.${requestId}`
  );
  expect(proposalRows.status).toBe(200);
  expect(proposalRows.data).toEqual([
    expect.objectContaining({ version_no: 1, author_user_id: a.userId })
  ]);
  const proposalId = (proposalRows.data as { id: string }[])[0]!.id;
  const auditRows = await rest(a.page, `audit_logs?select=action&request_id=eq.${requestId}`);
  expect((auditRows.data as { action: string }[]).map((row) => row.action)).toEqual(
    expect.arrayContaining(['request_created', 'proposal_created'])
  );
  expect(
    (
      await rest(a.page, 'requests', 'POST', {
        couple_id: coupleId,
        requester_user_id: a.userId,
        current_actor_user_id: b.userId,
        category: 'other'
      })
    ).status
  ).toBe(403);
  expect(
    (await rest(a.page, `proposal_versions?id=eq.${proposalId}`, 'PATCH', { title: '改ざん' })).data
  ).toEqual([]);
  expect(
    (
      await rest(a.page, 'proposal_versions', 'POST', {
        request_id: requestId,
        couple_id: coupleId,
        version_no: 1,
        author_user_id: a.userId,
        title: 'v1 duplicate'
      })
    ).status
  ).toBe(403);
  expect((await rest(a.page, `proposal_versions?id=eq.${proposalId}`, 'DELETE')).data).toEqual([]);
  expect(
    (
      await rest(a.page, `audit_logs?request_id=eq.${requestId}`, 'PATCH', {
        metadata: { changed: true }
      })
    ).data
  ).toEqual([]);
  expect(
    (
      await rest(a.page, 'rpc/create_request', 'POST', {
        p_title: '不正金額',
        p_category: 'money',
        p_amount: 1.5,
        p_amount_type: 'one_time'
      })
    ).status
  ).toBe(400);
  expect(
    (
      await rest(a.page, 'rpc/create_request', 'POST', {
        p_title: '不正カテゴリ',
        p_category: 'invalid'
      })
    ).status
  ).toBe(400);

  await a.page.goto('/requests');
  await expect(a.page.getByText('新しい掃除機の提案').first()).toBeVisible();
  await b.page.goto('/requests');
  await expect(b.page.getByRole('heading', { name: 'あなたの対応が必要' })).toBeVisible();
  await b.page.getByText('新しい掃除機の提案').first().click();
  await expect(b.page.getByText('二人で使う掃除機について相談したい').first()).toBeVisible();
  expect(
    (
      await rest(a.page, 'rpc/approve_request', 'POST', {
        target_request_id: requestId,
        expected_version: 1
      })
    ).status
  ).toBe(400);
  const v2Result = await rest(b.page, 'rpc/counter_proposal', 'POST', {
    target_request_id: requestId,
    expected_version: 1,
    p_title: '新しい掃除機の提案',
    p_category: 'purchase',
    p_amount: 2000,
    p_amount_type: 'one_time',
    p_details: 'v2の条件',
    p_scheduled_at: null,
    p_due_at: '2026-08-24T20:00:00+09:00',
    p_reason: '予算を抑えたい'
  });
  expect(v2Result).toEqual({ status: 200, data: expect.any(String) });
  expect(
    (
      await rest(b.page, 'rpc/approve_request', 'POST', {
        target_request_id: requestId,
        expected_version: 1
      })
    ).status
  ).toBe(400);

  await a.page.goto(detailUrl);
  await expect(a.page.getByText('v2').first()).toBeVisible();
  const v3Result = await rest(a.page, 'rpc/counter_proposal', 'POST', {
    target_request_id: requestId,
    expected_version: 2,
    p_title: '新しい掃除機の提案',
    p_category: 'purchase',
    p_amount: 3000,
    p_amount_type: 'one_time',
    p_details: 'v3の条件',
    p_scheduled_at: null,
    p_due_at: '2026-08-24T20:00:00+09:00',
    p_reason: '中間の金額を提案したい'
  });
  expect(v3Result).toEqual({ status: 200, data: expect.any(String) });

  await b.page.goto(detailUrl);
  await expect(b.page.getByText('v3').first()).toBeVisible();
  await expect(b.page.getByText('現在の提案')).toBeVisible();
  await b.page.getByRole('button', { name: '承認する' }).click();
  await b.page.getByRole('button', { name: '内容を確認して承認する' }).click();
  await expect(b.page.getByText('申請を承認しました。')).toBeVisible();
  await expect(b.page.getByText('合意済み').first()).toBeVisible();
  await a.page.goto(detailUrl);
  await expect(a.page.getByText('合意済み').first()).toBeVisible();
  await expect(a.page.getByRole('button', { name: '承認する' })).toHaveCount(0);
  const negotiationProposals = await rest(
    a.page,
    `proposal_versions?select=id,version_no,author_user_id,counter_reason&request_id=eq.${requestId}&order=version_no.asc`
  );
  expect(negotiationProposals.data).toEqual([
    expect.objectContaining({ version_no: 1, author_user_id: a.userId, counter_reason: null }),
    expect.objectContaining({
      version_no: 2,
      author_user_id: b.userId,
      counter_reason: '予算を抑えたい'
    }),
    expect.objectContaining({
      version_no: 3,
      author_user_id: a.userId,
      counter_reason: '中間の金額を提案したい'
    })
  ]);
  const v3ProposalId = (negotiationProposals.data as { id: string; version_no: number }[]).find(
    (proposal) => proposal.version_no === 3
  )!.id;
  const approvedResponse = await rest(
    a.page,
    `responses?select=id,response_type,proposal_version_id,responder_user_id&request_id=eq.${requestId}`
  );
  expect(approvedResponse.data).toEqual([
    expect.objectContaining({
      response_type: 'approved',
      proposal_version_id: v3ProposalId,
      responder_user_id: b.userId
    })
  ]);
  const responseId = (approvedResponse.data as { id: string }[])[0]!.id;
  const agreementRows = await rest(
    a.page,
    `agreements?select=id,source_request_id,source_proposal_version_id,approved_response_id,execution_status,completed_at,completed_by_user_id&source_request_id=eq.${requestId}`
  );
  expect(agreementRows.data).toEqual([
    expect.objectContaining({
      source_request_id: requestId,
      source_proposal_version_id: v3ProposalId,
      approved_response_id: responseId,
      execution_status: 'pending',
      completed_at: null,
      completed_by_user_id: null
    })
  ]);
  const agreementId = (agreementRows.data as { id: string }[])[0]!.id;
  await a.page.goto('/home');
  const overdueSection = a.page.getByRole('region', { name: '未実行・期限超過' });
  await expect(overdueSection.getByText('新しい掃除機の提案')).toBeVisible();
  await expect(
    a.page.getByRole('region', { name: '最近の合意' }).getByText('新しい掃除機の提案')
  ).toBeVisible();

  const concurrentCompletion = await Promise.all([
    rest(a.page, 'rpc/complete_agreement', 'POST', {
      target_agreement_id: agreementId,
      expected_execution_status: 'pending'
    }),
    rest(b.page, 'rpc/complete_agreement', 'POST', {
      target_agreement_id: agreementId,
      expected_execution_status: 'pending'
    })
  ]);
  expect(concurrentCompletion.map((result) => result.status).sort()).toEqual([200, 400]);
  await a.page.goto(`/agreements/${agreementId}`);
  await expect(a.page.getByText('実行済み').first()).toBeVisible();
  await expect(a.page.getByRole('button', { name: '実行済みにする' })).toHaveCount(0);
  await a.page.goto('/home');
  await expect(
    a.page.getByRole('region', { name: '未実行・期限超過' }).getByText('新しい掃除機の提案')
  ).toHaveCount(0);
  expect(
    (await rest(b.page, `responses?id=eq.${responseId}`, 'PATCH', { reason: '改ざん' })).data
  ).toEqual([]);
  expect((await rest(b.page, `responses?id=eq.${responseId}`, 'DELETE')).data).toEqual([]);
  expect(
    (await rest(a.page, `proposal_versions?select=id&request_id=eq.${requestId}&version_no=eq.4`))
      .data
  ).toEqual([]);
  expect((await rest(a.page, `audit_logs?select=action&request_id=eq.${requestId}`)).data).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ action: 'request_approved' }),
      expect.objectContaining({ action: 'agreement_created' }),
      expect.objectContaining({ action: 'agreement_completed' })
    ])
  );

  await a.page.goto('/requests/new');
  await a.page.getByLabel('タイトル').fill('却下シナリオ');
  await a.page.getByRole('button', { name: '相手に申請を送る' }).click();
  await expect(a.page).toHaveURL(/\/requests\/[0-9a-f-]+$/);
  const rejectUrl = new URL(a.page.url()).pathname;
  const rejectId = rejectUrl.split('/').at(-1)!;
  expect(
    (
      await rest(
        a.page,
        `requests?select=requester_user_id,current_actor_user_id&id=eq.${rejectId}`
      )
    ).data
  ).toEqual([{ requester_user_id: a.userId, current_actor_user_id: b.userId }]);
  expect(
    (
      await rest(b.page, 'rpc/reject_request', 'POST', {
        target_request_id: rejectId,
        expected_version: 1,
        rejection_reason: '今回は見送ります'
      })
    ).status
  ).toBe(200);
  await b.page.goto(rejectUrl);
  await expect(b.page.getByText('却下').first()).toBeVisible();

  await a.page.goto('/requests/new');
  await a.page.getByLabel('タイトル').fill('話し合いシナリオ');
  await a.page.getByRole('button', { name: '相手に申請を送る' }).click();
  await expect(a.page).toHaveURL(/\/requests\/[0-9a-f-]+$/);
  const discussionUrl = new URL(a.page.url()).pathname;
  const discussionId = discussionUrl.split('/').at(-1)!;
  expect(
    (
      await rest(b.page, 'rpc/schedule_discussion', 'POST', {
        target_request_id: discussionId,
        expected_version: 1,
        scheduled_for: '2026-08-26T20:00:00+09:00'
      })
    ).status
  ).toBe(200);
  await b.page.goto(discussionUrl);
  await expect(b.page.getByText('話し合い予定').first()).toBeVisible();
  await expect(b.page.getByText(/2026\/08\/26 20:00/)).toBeVisible();
  await b.page.getByRole('button', { name: '話し合った結果を登録する' }).click();
  await b.page.getByLabel('変更理由').fill('話し合った結果');
  await b.page.getByLabel('内容・理由（任意）').fill('二人で話した条件');
  await b.page.getByRole('button', { name: 'v2として相手に提案する' }).click();
  await expect(b.page.getByText('話し合い結果を新しい提案として登録しました。')).toBeVisible();
  expect(
    (
      await rest(
        b.page,
        `requests?select=status,current_actor_user_id,current_proposal_version&id=eq.${discussionId}`
      )
    ).data
  ).toEqual([
    { status: 'negotiating', current_actor_user_id: a.userId, current_proposal_version: 2 }
  ]);

  await a.page.goto('/requests/new');
  await a.page.getByLabel('タイトル').fill('取下げシナリオ');
  await a.page.getByRole('button', { name: '相手に申請を送る' }).click();
  await a.page.getByRole('button', { name: '申請を取り下げる' }).click();
  await a.page.getByRole('button', { name: '取下げを確定する' }).click();
  await expect(a.page.getByText('申請を取り下げました。')).toBeVisible();
  await expect(a.page.getByText('取下げ').first()).toBeVisible();

  await a.page.goto('/requests/new');
  await a.page.getByLabel('タイトル').fill('同時回答シナリオ');
  await a.page.getByRole('button', { name: '相手に申請を送る' }).click();
  await expect(a.page).toHaveURL(/\/requests\/[0-9a-f-]+$/);
  const concurrentId = new URL(a.page.url()).pathname.split('/').at(-1)!;
  const concurrent = await Promise.all([
    rest(b.page, 'rpc/approve_request', 'POST', {
      target_request_id: concurrentId,
      expected_version: 1
    }),
    rest(b.page, 'rpc/reject_request', 'POST', {
      target_request_id: concurrentId,
      expected_version: 1,
      rejection_reason: '同時回答テスト'
    })
  ]);
  expect(concurrent.map((result) => result.status).sort()).toEqual([200, 400]);
  expect(
    (await rest(a.page, `responses?select=id&request_id=eq.${concurrentId}`)).data
  ).toHaveLength(1);

  await a.page.goto('/requests/new');
  await a.page.getByLabel('タイトル').fill('同時対案シナリオ');
  await a.page.getByRole('button', { name: '相手に申請を送る' }).click();
  await expect(a.page).toHaveURL(/\/requests\/[0-9a-f-]+$/);
  const concurrentCounterId = new URL(a.page.url()).pathname.split('/').at(-1)!;
  const counterBody = {
    target_request_id: concurrentCounterId,
    expected_version: 1,
    p_title: '同時対案',
    p_category: 'other',
    p_amount: null,
    p_amount_type: null,
    p_details: null,
    p_scheduled_at: null,
    p_due_at: null,
    p_reason: '同時実行テスト'
  };
  const concurrentCounters = await Promise.all([
    rest(b.page, 'rpc/counter_proposal', 'POST', counterBody),
    rest(b.page, 'rpc/counter_proposal', 'POST', counterBody)
  ]);
  expect(concurrentCounters.map((result) => result.status).sort()).toEqual([200, 400]);
  expect(
    (await rest(a.page, `proposal_versions?select=id&request_id=eq.${concurrentCounterId}`)).data
  ).toHaveLength(2);

  const c = await signup(browser, 'c');
  await createAndInvite(c.page);
  expect(
    (
      await rest(c.page, 'rpc/create_request', 'POST', {
        p_title: '一人では作れない申請',
        p_category: 'other'
      })
    ).status
  ).toBe(400);
  await c.page.goto(detailUrl);
  await expect(c.page.getByText('申請が見つかりません。')).toBeVisible();
  expect((await rest(c.page, `requests?select=id&id=eq.${requestId}`)).data).toEqual([]);
  expect(
    (await rest(c.page, `proposal_versions?select=id&request_id=eq.${requestId}`)).data
  ).toEqual([]);
  expect((await rest(c.page, `audit_logs?select=id&request_id=eq.${requestId}`)).data).toEqual([]);
  expect((await rest(c.page, `responses?select=id&request_id=eq.${requestId}`)).data).toEqual([]);
  expect(
    (await rest(c.page, `agreements?select=id&source_request_id=eq.${requestId}`)).data
  ).toEqual([]);
  expect(
    (
      await rest(c.page, 'rpc/approve_request', 'POST', {
        target_request_id: requestId,
        expected_version: 1
      })
    ).status
  ).toBe(400);

  await a.context.close();
  await b.context.close();
  await c.context.close();
});
