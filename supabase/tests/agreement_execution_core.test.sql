begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (id, email) values
  ('40000000-0000-0000-0000-0000000000a1', 'agreement-a@example.test'),
  ('40000000-0000-0000-0000-0000000000b1', 'agreement-b@example.test'),
  ('40000000-0000-0000-0000-0000000000c1', 'agreement-c@example.test');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"40000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.create_couple() as couple_a \gset
select invite_code as code_a from public.create_couple_invitation(:'couple_a') \gset
select set_config('request.jwt.claims', '{"sub":"40000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select public.join_couple(:'code_a');
select set_config('request.jwt.claims', '{"sub":"40000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.create_request('期限付き合意', 'promise', null, null, '実行する', null, '2026-08-24T20:00:00+09:00') as request_id \gset

select set_config('request.jwt.claims', '{"sub":"40000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select lives_ok(format('select public.approve_request(%L, 1)', :'request_id'), 'approval creates agreement atomically');
select id as agreement_id from public.agreements where source_request_id = :'request_id' \gset
select is((select count(*) from public.agreements where source_request_id = :'request_id'), 1::bigint, 'request has one agreement');
select is((select pv.version_no from public.agreements agreement join public.proposal_versions pv on pv.id = agreement.source_proposal_version_id where agreement.id = :'agreement_id'), 1, 'agreement fixes proposal v1');
select is((select response.response_type from public.agreements agreement join public.responses response on response.id = agreement.approved_response_id where agreement.id = :'agreement_id'), 'approved', 'agreement fixes approved response');
select is((select execution_status from public.agreements where id = :'agreement_id'), 'pending', 'due date initializes pending execution');
select is((select count(*) from public.audit_logs where entity_id = :'agreement_id' and action = 'agreement_created'), 1::bigint, 'agreement created audit exists');
select is((select status from public.requests where id = :'request_id'), 'approved', 'request remains approved workflow');
select is((select count(*) from public.proposal_versions where request_id = :'request_id'), 1::bigint, 'approval creates no proposal version');
select throws_ok(format('select public.approve_request(%L, 1)', :'request_id'), 'P0001', 'not_current_actor', 'approved request cannot create second agreement');

select throws_ok(format($$insert into public.agreements (couple_id, source_request_id, source_proposal_version_id, approved_response_id, execution_status) select %L, %L, source_proposal_version_id, approved_response_id, 'not_required' from public.agreements where id = %L$$, :'couple_a', :'request_id', :'agreement_id'), '42501', 'new row violates row-level security policy for table "agreements"', 'direct agreement insert is forbidden');
select is((with changed as (update public.agreements set execution_status = 'cancelled' where id = :'agreement_id' returning 1) select count(*) from changed), 0::bigint, 'direct agreement update changes zero rows');
select is((with removed as (delete from public.agreements where id = :'agreement_id' returning 1) select count(*) from removed), 0::bigint, 'direct agreement delete changes zero rows');
select throws_ok(format($$select public.complete_agreement(%L, 'completed')$$, :'agreement_id'), 'P0001', 'invalid_expected_execution_status', 'invalid expected state is rejected');

select set_config('request.jwt.claims', '{"sub":"40000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok(format($$select public.complete_agreement(%L, 'pending')$$, :'agreement_id'), 'either active member can complete');
select is((select execution_status from public.agreements where id = :'agreement_id'), 'completed', 'completion sets completed state');
select is((select completed_by_user_id from public.agreements where id = :'agreement_id'), auth.uid(), 'completion records actor');
select ok((select completed_at is not null from public.agreements where id = :'agreement_id'), 'completion records timestamp');
select is((select count(*) from public.audit_logs where entity_id = :'agreement_id' and action = 'agreement_completed'), 1::bigint, 'completion audit exists');
select throws_ok(format($$select public.complete_agreement(%L, 'pending')$$, :'agreement_id'), 'P0001', 'stale_agreement', 'agreement cannot complete twice');

select set_config('request.jwt.claims', '{"sub":"40000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select public.create_couple();
select is((select count(*) from public.agreements where id = :'agreement_id'), 0::bigint, 'other couple cannot read agreement');
select throws_ok(format($$select public.complete_agreement(%L, 'pending')$$, :'agreement_id'), 'P0001', 'agreement_not_found', 'other couple cannot complete agreement');

reset role;
select ok(exists(select 1 from pg_constraint where conname = 'agreements_source_request_unique'), 'request agreement uniqueness exists');
select ok((select relrowsecurity from pg_class where oid = 'public.agreements'::regclass), 'agreements RLS is enabled');
select ok(pg_get_functiondef('public.complete_agreement(uuid,text)'::regprocedure) ilike '%for update%', 'complete locks agreement row');
select * from finish();
rollback;
