begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

insert into auth.users (id, email) values
  ('70000000-0000-0000-0000-0000000000a1', 'calendar-a@example.test'),
  ('70000000-0000-0000-0000-0000000000b1', 'calendar-b@example.test'),
  ('70000000-0000-0000-0000-0000000000c1', 'calendar-c@example.test');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"70000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.create_couple() as couple_a \gset
select invite_code as code_a from public.create_couple_invitation(:'couple_a') \gset

select set_config('request.jwt.claims', '{"sub":"70000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select public.join_couple(:'code_a');

select set_config('request.jwt.claims', '{"sub":"70000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.create_personal_event(
  'Aだけの予定', '秘密の予定', null, null, '2026-09-02', null
) as personal_id \gset
select is(
  (select count(*) from public.calendar_events where id = :'personal_id'),
  1::bigint,
  'personal event is visible to owner'
);
select is(
  (select start_date from public.calendar_events where id = :'personal_id'),
  '2026-09-02'::date,
  'all-day event stores a date'
);
select ok(
  (select starts_at is null from public.calendar_events where id = :'personal_id'),
  'all-day event does not fake midnight timestamptz'
);
select is(
  (select count(*) from public.calendar_event_audit_logs where event_id = :'personal_id'),
  1::bigint,
  'personal event has private audit'
);

select set_config('request.jwt.claims', '{"sub":"70000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select is(
  (select count(*) from public.calendar_events where id = :'personal_id'),
  0::bigint,
  'partner cannot read personal event'
);
select is(
  (select count(*) from public.calendar_event_audit_logs where event_id = :'personal_id'),
  0::bigint,
  'partner cannot infer personal event through audit'
);

select set_config('request.jwt.claims', '{"sub":"70000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.create_shared_event(
  '家族の予定', null, '2026-09-03T18:00:00+09:00', null, null, null
) as shared_id \gset
select is(
  (select approval_status from public.calendar_events where id = :'shared_id'),
  'pending',
  'shared event starts pending'
);
select is(
  (select current_actor_user_id from public.calendar_events where id = :'shared_id'),
  '70000000-0000-0000-0000-0000000000b1'::uuid,
  'shared event assigns partner as approver'
);
select throws_ok(
  format('select public.approve_shared_event(%L)', :'shared_id'),
  'P0001',
  'not_current_actor',
  'creator cannot approve own shared event'
);

select set_config('request.jwt.claims', '{"sub":"70000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select lives_ok(
  format('select public.approve_shared_event(%L)', :'shared_id'),
  'partner can approve shared event'
);
select is(
  (select status from public.calendar_events where id = :'shared_id'),
  'confirmed',
  'approved shared event is confirmed'
);
select is(
  (select approved_by_user_id from public.calendar_events where id = :'shared_id'),
  auth.uid(),
  'approved shared event records actor'
);

select set_config('request.jwt.claims', '{"sub":"70000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.create_request(
  '旅行の予定', 'schedule', null, null, '時間を決める',
  '2026-09-04T10:00:00+09:00', '2026-09-04T09:00:00+09:00'
) as request_id \gset
select id as pending_id from public.calendar_events
where source_request_id = :'request_id' and event_type = 'pending_proposal' \gset
select is(
  (select count(*) from public.calendar_events where id = :'pending_id' and status = 'pending'),
  1::bigint,
  'dated request creates pending projection'
);

select set_config('request.jwt.claims', '{"sub":"70000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select public.counter_proposal(
  :'request_id', 1, '旅行の予定', 'schedule', null, null, '午後に変更',
  '2026-09-04T13:00:00+09:00', '2026-09-04T12:00:00+09:00', '午後がよい'
) as proposal_v2 \gset
select is(
  (select id from public.calendar_events where source_request_id = :'request_id' and event_type = 'pending_proposal'),
  :'pending_id'::uuid,
  'counter updates the same pending projection'
);
select is(
  (select source_proposal_version_id from public.calendar_events where id = :'pending_id'),
  :'proposal_v2'::uuid,
  'pending projection follows latest proposal'
);
select is(
  (select starts_at from public.calendar_events where id = :'pending_id'),
  '2026-09-04T04:00:00+00:00'::timestamptz,
  'pending projection follows counter time'
);

select set_config('request.jwt.claims', '{"sub":"70000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok(
  format('select public.approve_request(%L, 2)', :'request_id'),
  'latest proposal can be approved'
);
select is(
  (select status from public.calendar_events where id = :'pending_id'),
  'cancelled',
  'approval retires pending projection'
);
select id as agreement_id from public.agreements where source_request_id = :'request_id' \gset
select is(
  (select count(*) from public.calendar_events where source_agreement_id = :'agreement_id' and event_type = 'agreement' and status = 'confirmed'),
  1::bigint,
  'approval creates agreement projection'
);
select is(
  (select count(*) from public.calendar_events where source_agreement_id = :'agreement_id' and event_type = 'deadline' and status = 'confirmed'),
  1::bigint,
  'approval creates deadline projection'
);

select lives_ok(
  format($$select public.complete_agreement(%L, 'pending')$$, :'agreement_id'),
  'agreement completion succeeds'
);
select is(
  (select count(*) from public.calendar_events where source_agreement_id = :'agreement_id' and status = 'completed'),
  2::bigint,
  'agreement completion updates all agreement projections'
);

select public.create_request(
  '夕食相談', 'schedule', null, null, null,
  '2026-09-05T19:00:00+09:00', null
) as discussion_request \gset
select set_config('request.jwt.claims', '{"sub":"70000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select public.schedule_discussion(
  :'discussion_request', 1, '2026-09-03T20:00:00+09:00'
);
select id as discussion_id from public.calendar_events
where source_request_id = :'discussion_request' and event_type = 'discussion' \gset
select is(
  (select status from public.calendar_events where id = :'discussion_id'),
  'discussion',
  'schedule discussion creates discussion projection'
);
select public.record_discussion_result(
  :'discussion_request', 1, '夕食相談', 'schedule', null, null, null,
  '2026-09-05T20:00:00+09:00', null, '20時にする'
) as discussion_v2 \gset
select is(
  (select status from public.calendar_events where id = :'discussion_id'),
  'completed',
  'discussion result keeps discussion history as completed'
);
select is(
  (select source_proposal_version_id from public.calendar_events
   where source_request_id = :'discussion_request' and event_type = 'pending_proposal' and status = 'pending'),
  :'discussion_v2'::uuid,
  'discussion result creates latest pending projection'
);

select is(
  (with changed as (
    update public.calendar_events set title = '改ざん' where id = :'shared_id' returning 1
  ) select count(*) from changed),
  0::bigint,
  'client cannot directly mutate calendar projection or shared event'
);

select set_config('request.jwt.claims', '{"sub":"70000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select public.create_couple();
select is(
  (select count(*) from public.calendar_events where id = :'shared_id'),
  0::bigint,
  'other couple cannot read shared event'
);
select is(
  (select count(*) from public.calendar_events where source_request_id = :'request_id'),
  0::bigint,
  'other couple cannot read source projections'
);

reset role;
select ok(
  (select relrowsecurity from pg_class where oid = 'public.calendar_events'::regclass),
  'calendar events RLS is enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.calendar_event_audit_logs'::regclass),
  'calendar audit RLS is enabled'
);
select ok(
  pg_get_functiondef('public.create_shared_event(text,text,timestamptz,timestamptz,date,date)'::regprocedure)
    ilike '%auth.uid()%',
  'shared event actor comes from auth.uid'
);
select ok(
  pg_get_functiondef('public.sync_request_calendar_projection(uuid)'::regprocedure)
    ilike '%on conflict (projection_key)%',
  'request projection is idempotent'
);
select ok(
  exists(
    select 1 from pg_constraint
    where conname = 'calendar_event_time_mode'
  ),
  'calendar time-mode constraint exists'
);
select * from finish();
rollback;
