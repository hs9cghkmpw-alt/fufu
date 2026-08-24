import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { loadEnv } from 'vite';

test.describe.configure({ mode: 'serial' });

const env = loadEnv('test', process.cwd(), 'VITE_');
const supabaseUrl = env.VITE_SUPABASE_URL;
const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const password = `Pairing!${Date.now()}Aa`;

interface BrowserSession {
  accessToken: string;
  userId: string;
}

async function signup(page: Page, name: string): Promise<BrowserSession> {
  await page.goto('/signup');
  await page.getByLabel('メールアドレス').fill(`pair-${name}-${runId}@example.com`);
  await page.getByLabel('パスワード').fill(password);
  await page.getByRole('button', { name: '登録する' }).click();
  await expect(page).toHaveURL(/\/setup$/, { timeout: 20_000 });
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find(
      (candidate) => candidate.startsWith('sb-') && candidate.endsWith('-auth-token')
    );
    const value = key ? localStorage.getItem(key) : null;
    if (!value) throw new Error('Auth session was not persisted');
    const session = JSON.parse(value) as { access_token: string; user: { id: string } };
    return { accessToken: session.access_token, userId: session.user.id };
  });
}

function headers(session: BrowserSession, representation = false) {
  return {
    apikey: publishableKey,
    Authorization: `Bearer ${session.accessToken}`,
    'Content-Type': 'application/json',
    ...(representation ? { Prefer: 'return=representation' } : {})
  };
}

async function rpc(
  request: APIRequestContext,
  session: BrowserSession,
  name: string,
  data: Record<string, unknown>
) {
  return request.post(`${supabaseUrl}/rest/v1/rpc/${name}`, { headers: headers(session), data });
}

test('real Supabase pairing RPC, RLS and race protections', async ({
  browser,
  page,
  request
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'Run remote mutations once to respect rate limits'
  );
  test.setTimeout(120_000);

  const sessionA = await signup(page, 'a');
  await page.getByRole('button', { name: '新しい夫婦スペースを作る' }).click();
  await expect(page.getByRole('heading', { name: '相手を招待' })).toBeVisible();

  const membershipA = await request.get(
    `${supabaseUrl}/rest/v1/couple_members?select=couple_id&user_id=eq.${sessionA.userId}`,
    { headers: headers(sessionA) }
  );
  const [{ couple_id: coupleA }] = (await membershipA.json()) as { couple_id: string }[];

  await page.getByRole('button', { name: '招待コードを発行' }).click();
  const revokedCode = (await page.locator('.invitation-result code').innerText()).trim();
  expect(revokedCode).toMatch(/^[0-9a-f]{36}$/);
  const selfJoin = await rpc(request, sessionA, 'join_couple', { invite_code: revokedCode });
  expect(selfJoin.status()).toBe(400);
  expect(await selfJoin.json()).toMatchObject({ message: 'self_invitation' });
  await page.getByRole('button', { name: '招待を取り消す' }).click();

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  const sessionB = await signup(pageB, 'b');
  const revokedJoin = await rpc(request, sessionB, 'join_couple', { invite_code: revokedCode });
  expect(revokedJoin.status()).toBe(400);
  expect(await revokedJoin.json()).toMatchObject({ message: 'invitation_revoked' });

  const expiringInvitation = await rpc(request, sessionA, 'create_couple_invitation', {
    target_couple_id: coupleA,
    valid_for: '00:01:00'
  });
  expect(expiringInvitation.ok()).toBe(true);
  const [{ invite_code: expiringCode }] = (await expiringInvitation.json()) as {
    invite_code: string;
  }[];
  await page.waitForTimeout(61_000);
  const expiredJoin = await rpc(request, sessionB, 'join_couple', { invite_code: expiringCode });
  expect(expiredJoin.status()).toBe(400);
  expect(await expiredJoin.json()).toMatchObject({ message: 'invitation_expired' });

  await page.getByRole('button', { name: '招待コードを発行' }).click();
  const activeCode = (await page.locator('.invitation-result code').innerText()).trim();
  const concurrent = await Promise.all([
    rpc(request, sessionB, 'join_couple', { invite_code: activeCode }),
    rpc(request, sessionB, 'join_couple', { invite_code: activeCode })
  ]);
  expect(concurrent.map((response) => response.status()).sort()).toEqual([200, 400]);

  await pageB.reload();
  await expect(pageB.getByRole('heading', { name: 'ペアリング完了' })).toBeVisible();
  await page.getByRole('button', { name: '参加状況を更新' }).click();
  await expect(page.getByRole('heading', { name: 'ペアリング完了' })).toBeVisible();
  await page.getByRole('link', { name: 'ホームへ進む' }).click();
  await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible();

  const contextC = await browser.newContext();
  const pageC = await contextC.newPage();
  const sessionC = await signup(pageC, 'c');
  const reused = await rpc(request, sessionC, 'join_couple', { invite_code: activeCode });
  expect(reused.status()).toBe(400);
  expect(await reused.json()).toMatchObject({ message: 'invitation_used' });

  await pageC.getByRole('button', { name: '新しい夫婦スペースを作る' }).click();
  await expect(pageC.getByRole('heading', { name: '相手を招待' })).toBeVisible();
  const membershipC = await request.get(
    `${supabaseUrl}/rest/v1/couple_members?select=couple_id&user_id=eq.${sessionC.userId}`,
    { headers: headers(sessionC) }
  );
  const [{ couple_id: coupleC }] = (await membershipC.json()) as { couple_id: string }[];
  await pageC.getByRole('button', { name: '招待コードを発行' }).click();
  const codeC = (await pageC.locator('.invitation-result code').innerText()).trim();
  const doubleMembership = await rpc(request, sessionB, 'join_couple', { invite_code: codeC });
  expect(doubleMembership.status()).toBe(400);
  expect(await doubleMembership.json()).toMatchObject({ message: 'already_paired' });

  const fullInvite = await rpc(request, sessionA, 'create_couple_invitation', {
    target_couple_id: coupleA
  });
  expect(fullInvite.status()).toBe(400);
  expect(await fullInvite.json()).toMatchObject({ message: 'couple_full' });

  const otherCouple = await request.get(
    `${supabaseUrl}/rest/v1/couples?select=id&id=eq.${coupleA}`,
    {
      headers: headers(sessionC)
    }
  );
  expect(await otherCouple.json()).toEqual([]);
  const otherMembers = await request.get(
    `${supabaseUrl}/rest/v1/couple_members?select=id&couple_id=eq.${coupleA}`,
    { headers: headers(sessionC) }
  );
  expect(await otherMembers.json()).toEqual([]);

  const directInsert = await request.post(`${supabaseUrl}/rest/v1/couple_members`, {
    headers: headers(sessionC, true),
    data: { couple_id: coupleC, user_id: sessionA.userId }
  });
  expect(directInsert.status()).toBe(403);

  const invitationsA = await request.get(
    `${supabaseUrl}/rest/v1/couple_invitations?select=id&couple_id=eq.${coupleA}`,
    { headers: headers(sessionA) }
  );
  const invitationRows = (await invitationsA.json()) as { id: string }[];
  const directUsedBy = await request.patch(
    `${supabaseUrl}/rest/v1/couple_invitations?id=eq.${invitationRows[0]?.id}`,
    { headers: headers(sessionA, true), data: { used_by: sessionC.userId } }
  );
  expect(await directUsedBy.json()).toEqual([]);

  const membersA = await request.get(
    `${supabaseUrl}/rest/v1/couple_members?select=user_id&couple_id=eq.${coupleA}`,
    { headers: headers(sessionA) }
  );
  const membersB = await request.get(
    `${supabaseUrl}/rest/v1/couple_members?select=user_id&couple_id=eq.${coupleA}`,
    { headers: headers(sessionB) }
  );
  expect(await membersA.json()).toHaveLength(2);
  expect(await membersB.json()).toHaveLength(2);

  const audit = await request.get(
    `${supabaseUrl}/rest/v1/pairing_audit_logs?select=action&couple_id=eq.${coupleA}`,
    { headers: headers(sessionA) }
  );
  const actions = ((await audit.json()) as { action: string }[]).map((row) => row.action);
  expect(actions).toEqual(
    expect.arrayContaining([
      'couple_created',
      'invitation_created',
      'invitation_revoked',
      'member_joined'
    ])
  );

  await contextB.close();
  await contextC.close();
});
