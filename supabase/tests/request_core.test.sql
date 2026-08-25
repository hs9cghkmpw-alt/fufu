begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-0000000000a1', 'request-a@example.test'),
  ('10000000-0000-0000-0000-0000000000b1', 'request-b@example.test'),
  ('10000000-0000-0000-0000-0000000000c1', 'request-c@example.test'),
  ('10000000-0000-0000-0000-0000000000d1', 'request-d@example.test'),
  ('10000000-0000-0000-0000-0000000000e1', 'request-e@example.test');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.create_couple() as couple_a \gset
select invite_code as code_a from public.create_couple_invitation(:'couple_a') \gset
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select public.join_couple(:'code_a');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok($$select public.create_request('掃除機を買いたい', 'purchase', 4800, 'one_time', '家で使う', null, null)$$, 'A can create a request');
select id as request_a from public.requests where couple_id = :'couple_a' \gset
select is((select requester_user_id from public.requests where id = :'request_a'), '10000000-0000-0000-0000-0000000000a1'::uuid, 'requester is A');
select is((select current_actor_user_id from public.requests where id = :'request_a'), '10000000-0000-0000-0000-0000000000b1'::uuid, 'current actor is B');
select is((select status from public.requests where id = :'request_a'), 'pending_response', 'status is pending response');
select is((select current_proposal_version from public.requests where id = :'request_a'), 1, 'current version is one');
select is((select count(*) from public.proposal_versions where request_id = :'request_a'), 1::bigint, 'v1 is created atomically');
select is((select author_user_id from public.proposal_versions where request_id = :'request_a'), '10000000-0000-0000-0000-0000000000a1'::uuid, 'v1 author is A');
select is((select version_no from public.proposal_versions where request_id = :'request_a'), 1, 'proposal starts at v1');
select is((select count(*) from public.audit_logs where request_id = :'request_a' and action in ('request_created', 'proposal_created')), 2::bigint, 'request and proposal audits are recorded');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select is((select count(*) from public.requests where id = :'request_a'), 1::bigint, 'B can see the request');
select is((select count(*) from public.proposal_versions where request_id = :'request_a'), 1::bigint, 'B can see proposal v1');
select is((select count(*) from public.audit_logs where request_id = :'request_a'), 2::bigint, 'B can see request audits');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select public.create_couple() as couple_c \gset
select invite_code as code_c from public.create_couple_invitation(:'couple_c') \gset
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
select public.join_couple(:'code_c');
select is((select count(*) from public.requests where id = :'request_a'), 0::bigint, 'another couple cannot see request');
select is((select count(*) from public.proposal_versions where request_id = :'request_a'), 0::bigint, 'another couple cannot see proposal');
select is((select count(*) from public.audit_logs where request_id = :'request_a'), 0::bigint, 'another couple cannot see audit');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select throws_ok(format($$insert into public.requests (couple_id, requester_user_id, current_actor_user_id, category) values (%L, auth.uid(), '10000000-0000-0000-0000-0000000000b1', 'money')$$, :'couple_a'), '42501', 'new row violates row-level security policy for table "requests"', 'direct request insert is forbidden');
select throws_ok(format($$insert into public.proposal_versions (request_id, couple_id, version_no, author_user_id, title) values (%L, %L, 1, auth.uid(), 'duplicate')$$, :'request_a', :'couple_a'), '42501', 'new row violates row-level security policy for table "proposal_versions"', 'direct proposal insert is forbidden');
select is((with changed as (update public.proposal_versions set title = 'changed' where request_id = :'request_a' returning 1) select count(*) from changed), 0::bigint, 'client proposal update changes zero rows');
select is((with removed as (delete from public.proposal_versions where request_id = :'request_a' returning 1) select count(*) from removed), 0::bigint, 'client proposal delete changes zero rows');
select is((with changed as (update public.audit_logs set metadata = '{"changed":true}' where request_id = :'request_a' returning 1) select count(*) from changed), 0::bigint, 'client audit update changes zero rows');

select throws_ok($$select public.create_request('bad', 'purchase', 1.5, 'one_time', null, null, null)$$, 'P0001', 'invalid_amount', 'decimal amount is rejected');
select throws_ok($$select public.create_request('bad', 'unknown', null, null, null, null, null)$$, 'P0001', 'invalid_category', 'invalid category is rejected');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select public.create_couple();
select throws_ok($$select public.create_request('one member', 'other', null, null, null, null, null)$$, 'P0001', 'partner_required', 'one-member couple cannot create a formal request');

reset role;
select throws_ok(format($$insert into public.proposal_versions (request_id, couple_id, version_no, author_user_id, title) values (%L, %L, 1, '10000000-0000-0000-0000-0000000000a1', 'wrong couple')$$, :'request_a', :'couple_c'), '23503', null, 'request and proposal couple mismatch is rejected');
select throws_ok(format($$insert into public.proposal_versions (request_id, couple_id, version_no, author_user_id, title) values (%L, %L, 1, '10000000-0000-0000-0000-0000000000a1', 'duplicate v1')$$, :'request_a', :'couple_a'), '23505', null, 'duplicate v1 is rejected');
select throws_ok(format($$update public.proposal_versions set title = 'mutation' where request_id = %L$$, :'request_a'), 'P0001', 'proposal_versions_are_immutable', 'proposal mutation trigger protects history');

update public.couples set archived_at = now() where id = :'couple_c';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select throws_ok($$select public.create_request('archived', 'other', null, null, null, null, null)$$, 'P0001', 'active_couple_not_found', 'archived couple cannot create a request');

select * from finish();
rollback;
