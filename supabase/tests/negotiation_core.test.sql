begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

insert into auth.users (id, email) values
  ('30000000-0000-0000-0000-0000000000a1', 'negotiation-a@example.test'),
  ('30000000-0000-0000-0000-0000000000b1', 'negotiation-b@example.test'),
  ('30000000-0000-0000-0000-0000000000c1', 'negotiation-c@example.test');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.create_couple() as couple_a \gset
select invite_code as code_a from public.create_couple_invitation(:'couple_a') \gset
select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select public.join_couple(:'code_a');
select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.create_request('家電', 'purchase', 4800, 'one_time', 'v1', null, null) as negotiation_id \gset
select public.create_request('取下げ対象', 'other') as withdraw_id \gset
select public.create_request('非申請者取下げ対象', 'other') as forbidden_withdraw_id \gset
select public.create_request('話し合い対象', 'schedule') as discussion_id \gset

select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select throws_ok(format($$select public.counter_proposal(%L, 1, '家電', 'purchase', 2000, 'one_time', 'v2', null, null, '   ')$$, :'negotiation_id'), 'P0001', 'invalid_counter_reason', 'blank counter reason is rejected');
select lives_ok(format($$select public.counter_proposal(%L, 1, '家電', 'purchase', 2000, 'one_time', 'v2', null, null, '予算を抑えたい')$$, :'negotiation_id'), 'B creates v2');
select is((select status from public.requests where id = :'negotiation_id'), 'negotiating', 'counter sets negotiating');
select is((select current_proposal_version from public.requests where id = :'negotiation_id'), 2, 'counter advances version');
select is((select current_actor_user_id from public.requests where id = :'negotiation_id'), '30000000-0000-0000-0000-0000000000a1'::uuid, 'counter returns action to A');
select throws_ok(format($$select public.counter_proposal(%L, 1, 'stale', 'other', null, null, null, null, null, 'old screen')$$, :'negotiation_id'), 'P0001', 'stale_request', 'stale v1 counter is rejected');

select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok(format($$select public.counter_proposal(%L, 2, '家電', 'purchase', 3000, 'one_time', 'v3', null, null, '中間案')$$, :'negotiation_id'), 'A creates v3');
select is((select count(*) from public.proposal_versions where request_id = :'negotiation_id'), 3::bigint, 'v1 v2 v3 are retained');
select is((select string_agg(author_user_id::text, ',' order by version_no) from public.proposal_versions where request_id = :'negotiation_id'), '30000000-0000-0000-0000-0000000000a1,30000000-0000-0000-0000-0000000000b1,30000000-0000-0000-0000-0000000000a1', 'authors alternate A B A');
select is((select counter_reason from public.proposal_versions where request_id = :'negotiation_id' and version_no = 1), null, 'v1 reason remains null');
select is((select counter_reason from public.proposal_versions where request_id = :'negotiation_id' and version_no = 2), '予算を抑えたい', 'v2 reason is stored');
select is((select current_actor_user_id from public.requests where id = :'negotiation_id'), '30000000-0000-0000-0000-0000000000b1'::uuid, 'v3 action moves to B');

select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select lives_ok(format('select public.approve_request(%L, 3)', :'negotiation_id'), 'B approves v3');
select is((select status from public.requests where id = :'negotiation_id'), 'approved', 'latest approval sets approved');
select is((select count(*) from public.proposal_versions where request_id = :'negotiation_id'), 3::bigint, 'approval does not create v4');
select is((select pv.version_no from public.responses response join public.proposal_versions pv on pv.id = response.proposal_version_id where response.request_id = :'negotiation_id'), 3, 'approved response points to v3');
select is((select count(*) from public.audit_logs where request_id = :'negotiation_id' and action in ('proposal_countered', 'proposal_reproposed', 'request_approved')), 3::bigint, 'negotiation and approval audits exist');
select throws_ok(format($$select public.counter_proposal(%L, 3, 'late', 'other', null, null, null, null, null, 'late')$$, :'negotiation_id'), 'P0001', 'not_current_actor', 'approved request cannot be changed');

select throws_ok(format('select public.withdraw_request(%L, 1)', :'forbidden_withdraw_id'), 'P0001', 'withdrawal_forbidden', 'non-requester cannot withdraw');
select lives_ok(format('select public.schedule_discussion(%L, 1, %L)', :'discussion_id', '2026-08-27T20:00:00+09:00'), 'B schedules discussion');
select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok(format($$select public.record_discussion_result(%L, 1, '話し合い結果', 'schedule', null, null, '結果', null, null, '二人で話した結果')$$, :'discussion_id'), 'either member can record discussion result');
select is((select status from public.requests where id = :'discussion_id'), 'negotiating', 'discussion result reopens negotiation');
select is((select current_actor_user_id from public.requests where id = :'discussion_id'), '30000000-0000-0000-0000-0000000000b1'::uuid, 'discussion result waits for the other member');
select is((select count(*) from public.proposal_versions where request_id = :'discussion_id'), 2::bigint, 'discussion result creates v2');
select isnt((select status from public.requests where id = :'discussion_id'), 'approved', 'discussion result alone is not approval');
select is((select count(*) from public.audit_logs where request_id = :'discussion_id' and action = 'discussion_result_recorded'), 1::bigint, 'discussion result audit exists');

select lives_ok(format('select public.withdraw_request(%L, 1)', :'withdraw_id'), 'requester can withdraw');
select is((select status from public.requests where id = :'withdraw_id'), 'withdrawn', 'withdraw sets terminal status');
select is((select current_actor_user_id from public.requests where id = :'withdraw_id'), null, 'withdraw clears actor');
select throws_ok(format('select public.withdraw_request(%L, 1)', :'withdraw_id'), 'P0001', 'request_not_withdrawable', 'withdrawn request cannot be withdrawn again');
select is((select count(*) from public.audit_logs where request_id = :'withdraw_id' and action = 'request_withdrawn'), 1::bigint, 'withdraw audit exists');

select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select public.create_couple();
select throws_ok(format($$select public.record_discussion_result(%L, 2, 'bad', 'other', null, null, null, null, null, 'bad')$$, :'discussion_id'), 'P0001', 'request_not_found', 'other couple cannot record result');
select is((select count(*) from public.proposal_versions where request_id = :'negotiation_id'), 0::bigint, 'other couple sees no proposal history');

reset role;
select ok(pg_get_functiondef('public.counter_proposal(uuid,integer,text,text,numeric,text,text,timestamptz,timestamptz,text)'::regprocedure) ilike '%for update%', 'counter locks request row');
select ok(pg_get_functiondef('public.withdraw_request(uuid,integer)'::regprocedure) ilike '%for update%', 'withdraw locks request row');
select * from finish();
rollback;
