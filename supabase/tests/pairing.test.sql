begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-0000000000a1', 'pair-a@example.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'pair-b@example.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'pair-c@example.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'pair-d@example.test');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok($$select public.create_couple()$$, 'user A can create a couple');
select couple_id as couple_a from public.couple_members where user_id = auth.uid() \gset
select is((select count(*) from public.couple_members where couple_id = :'couple_a' and left_at is null), 1::bigint, 'creator is the first member');
select invite_code as code_a from public.create_couple_invitation(:'couple_a') \gset
select pass('A can issue an invitation');
select ok(length(:'code_a') = 36, 'invitation uses 144 bits of random hex');
select ok(not exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'couple_invitations' and column_name = 'invite_code'), 'plaintext invitation has no storage column');
select throws_ok(format('select public.join_couple(%L)', :'code_a'), 'P0001', 'self_invitation', 'creator cannot consume own invitation');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select is(public.join_couple(:'code_a'), :'couple_a'::uuid, 'user B joins with the invitation');
select is((select count(*) from public.couple_members where couple_id = :'couple_a' and left_at is null), 2::bigint, 'A and B share one couple');
select throws_ok(format('select public.join_couple(%L)', :'code_a'), 'P0001', 'invitation_used', 'used invitation cannot be reused');

reset role;
insert into public.couple_invitations (couple_id, code_hash, created_by, expires_at, created_at)
values
  (:'couple_a', extensions.digest('expired00000000000000000000000000000', 'sha256'), '00000000-0000-0000-0000-0000000000a1', now() - interval '1 minute', now() - interval '2 hours'),
  (:'couple_a', extensions.digest('revoked00000000000000000000000000000', 'sha256'), '00000000-0000-0000-0000-0000000000a1', now() + interval '1 hour', now());
update public.couple_invitations set revoked_at = now() where code_hash = extensions.digest('revoked00000000000000000000000000000', 'sha256');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
select throws_ok($$select public.join_couple('expired00000000000000000000000000000')$$, 'P0001', 'invitation_expired', 'expired invitation is rejected');
select throws_ok($$select public.join_couple('revoked00000000000000000000000000000')$$, 'P0001', 'invitation_revoked', 'revoked invitation is rejected');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select public.create_couple() as couple_c \gset
select invite_code as code_c from public.create_couple_invitation(:'couple_c') \gset
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select throws_ok(format('select public.join_couple(%L)', :'code_c'), 'P0001', 'already_paired', 'B cannot join a second active couple');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select is((select count(*) from public.couples where id = :'couple_a'), 0::bigint, 'other couple row is hidden by RLS');
select is((select count(*) from public.couple_members where couple_id = :'couple_a'), 0::bigint, 'other couple members are hidden by RLS');
select is((select count(*) from public.couple_invitations where couple_id = :'couple_a'), 0::bigint, 'other couple invitations are hidden by RLS');
select is((select count(*) from public.pairing_audit_logs where couple_id = :'couple_a'), 0::bigint, 'other couple audit is hidden by RLS');
select throws_ok(format($$insert into public.couple_members (couple_id, user_id) values (%L, '00000000-0000-0000-0000-0000000000d1')$$, :'couple_c'), '42501', 'new row violates row-level security policy for table "couple_members"', 'direct membership insert is forbidden');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((with changed as (update public.couple_invitations set used_by = '00000000-0000-0000-0000-0000000000d1' where couple_id = :'couple_a' returning 1) select count(*) from changed), 0::bigint, 'used_by cannot be changed directly');
select throws_ok(format('select * from public.create_couple_invitation(%L)', :'couple_a'), 'P0001', 'couple_full', 'full couple cannot issue another invitation');

reset role;
insert into public.couple_invitations (couple_id, code_hash, created_by, expires_at)
values (:'couple_a', extensions.digest('full00000000000000000000000000000000', 'sha256'), '00000000-0000-0000-0000-0000000000a1', now() + interval '1 hour');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
select throws_ok($$select public.join_couple('full00000000000000000000000000000000')$$, 'P0001', 'couple_full', 'third member is rejected');
select throws_ok($$select public.create_couple(); select public.create_couple()$$, 'P0001', 'already_paired', 'one user cannot create two active couples');

reset role;
select is((select count(*) from public.couple_members where couple_id = :'couple_a' and left_at is null), 2::bigint, 'failed joins leave exactly two active members');
select ok(pg_get_functiondef('public.join_couple(text)'::regprocedure) ilike '%for update%', 'join locks invitation and couple rows');
select ok(pg_get_functiondef('public.join_couple(text)'::regprocedure) ilike '%pg_advisory_xact_lock%', 'join serializes concurrent membership changes per user');
select ok(exists(select 1 from pg_indexes where schemaname = 'public' and indexname = 'couple_members_one_active_per_user'), 'partial unique index enforces one active membership');
select ok(exists(select 1 from pg_trigger where tgname = 'enforce_couple_member_capacity_before_insert' and not tgisinternal), 'capacity trigger protects every membership insert');
select is((select count(*) from public.pairing_audit_logs where couple_id = :'couple_a' and action in ('couple_created', 'invitation_created', 'member_joined')), 3::bigint, 'important pairing actions are audited transactionally');

select * from finish();
rollback;
