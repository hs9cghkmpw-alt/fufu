begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

insert into auth.users (id, email) values
  ('20000000-0000-0000-0000-0000000000a1', 'response-a@example.test'),
  ('20000000-0000-0000-0000-0000000000b1', 'response-b@example.test'),
  ('20000000-0000-0000-0000-0000000000c1', 'response-c@example.test');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.create_couple() as couple_a \gset
select invite_code as code_a from public.create_couple_invitation(:'couple_a') \gset
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select public.join_couple(:'code_a');
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.create_request('approve target', 'other') as approve_request_id \gset
select public.create_request('reject target', 'other') as reject_request_id \gset
select public.create_request('discussion target', 'other') as discussion_request_id \gset

select throws_ok(format('select public.approve_request(%L, 1)', :'reject_request_id'), 'P0001', 'not_current_actor', 'requester cannot answer when not current actor');
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select throws_ok(format('select public.approve_request(%L, 99)', :'approve_request_id'), 'P0001', 'stale_request', 'stale expected version is rejected');
select lives_ok(format('select public.approve_request(%L, 1)', :'approve_request_id'), 'B can approve A proposal v1');
select is((select status from public.requests where id = :'approve_request_id'), 'approved', 'approve sets approved');
select is((select current_actor_user_id from public.requests where id = :'approve_request_id'), null, 'approve clears current actor');
select is((select count(*) from public.responses response join public.proposal_versions proposal on proposal.id = response.proposal_version_id where response.request_id = :'approve_request_id' and proposal.version_no = 1 and response.responder_user_id = auth.uid()), 1::bigint, 'response fixes proposal v1 and responder B');
select is((select count(*) from public.audit_logs where request_id = :'approve_request_id' and action = 'request_approved'), 1::bigint, 'approval audit exists');
select throws_ok(format('select public.reject_request(%L, 1, %L)', :'approve_request_id', 'again'), 'P0001', 'not_current_actor', 'terminal request cannot be answered again');

select throws_ok(format('select public.reject_request(%L, 1, %L)', :'reject_request_id', '   '), 'P0001', 'invalid_rejection_reason', 'blank rejection reason is rejected');
select lives_ok(format('select public.reject_request(%L, 1, %L)', :'reject_request_id', '今回は見送る'), 'B can reject with reason');
select is((select status from public.requests where id = :'reject_request_id'), 'rejected', 'reject sets rejected');
select is((select reason from public.responses where request_id = :'reject_request_id'), '今回は見送る', 'rejection reason is stored');
select is((select count(*) from public.audit_logs where request_id = :'reject_request_id' and action = 'request_rejected'), 1::bigint, 'rejection audit exists');

select throws_ok(format('select public.schedule_discussion(%L, 1, null)', :'discussion_request_id'), 'P0001', 'invalid_discussion_at', 'discussion date is required');
select lives_ok(format('select public.schedule_discussion(%L, 1, %L)', :'discussion_request_id', '2026-08-26T20:00:00+09:00'), 'B can schedule discussion');
select is((select status from public.requests where id = :'discussion_request_id'), 'discussion_scheduled', 'discussion sets status');
select is((select discussion_at from public.requests where id = :'discussion_request_id'), '2026-08-26T11:00:00Z'::timestamptz, 'request stores discussion timestamptz');
select is((select discussion_at from public.responses where request_id = :'discussion_request_id'), '2026-08-26T11:00:00Z'::timestamptz, 'response stores discussion timestamptz');
select is((select count(*) from public.audit_logs where request_id = :'discussion_request_id' and action = 'discussion_scheduled'), 1::bigint, 'discussion audit exists');

select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select public.create_couple();
select is((select count(*) from public.responses where request_id = :'approve_request_id'), 0::bigint, 'other couple cannot see response');
select throws_ok(format('select public.approve_request(%L, 1)', :'discussion_request_id'), 'P0001', 'request_not_found', 'other couple cannot answer');

select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select throws_ok(format($$insert into public.responses (request_id, couple_id, proposal_version_id, responder_user_id, response_type) select %L, %L, id, auth.uid(), 'approved' from public.proposal_versions where request_id = %L$$, :'approve_request_id', :'couple_a', :'approve_request_id'), '42501', 'new row violates row-level security policy for table "responses"', 'direct response insert is forbidden');
select is((with changed as (update public.responses set reason = 'changed' where request_id = :'reject_request_id' returning 1) select count(*) from changed), 0::bigint, 'client response update changes zero rows');
select is((with removed as (delete from public.responses where request_id = :'reject_request_id' returning 1) select count(*) from removed), 0::bigint, 'client response delete changes zero rows');

reset role;
select ok(exists(select 1 from pg_constraint where conname = 'responses_one_per_proposal'), 'one response per proposal is unique');
select ok(pg_get_functiondef('public.lock_request_for_response(uuid,integer)'::regprocedure) ilike '%for update%', 'response path locks request row');
select ok(pg_get_functiondef('public.approve_request(uuid,integer)'::regprocedure) ilike '%self_approval_forbidden%', 'approve independently checks latest proposal author');
select ok(exists(select 1 from pg_trigger where tgname = 'prevent_response_update_or_delete' and not tgisinternal), 'response immutability trigger exists');
select ok((select relrowsecurity from pg_class where oid = 'public.responses'::regclass), 'responses RLS is enabled');

select * from finish();
rollback;
