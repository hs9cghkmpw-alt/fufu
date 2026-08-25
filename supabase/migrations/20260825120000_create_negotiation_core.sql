create or replace function public.validate_negotiation_proposal_input(
  p_title text,
  p_category text,
  p_amount numeric,
  p_amount_type text,
  p_details text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_title text := btrim(p_title);
  normalized_details text := nullif(btrim(p_details), '');
  normalized_reason text := nullif(btrim(p_reason), '');
begin
  if normalized_title is null or char_length(normalized_title) not between 1 and 120 then
    raise exception using errcode = 'P0001', message = 'invalid_title';
  end if;
  if normalized_details is not null and char_length(normalized_details) > 5000 then
    raise exception using errcode = 'P0001', message = 'invalid_details';
  end if;
  if normalized_reason is null or char_length(normalized_reason) > 2000 then
    raise exception using errcode = 'P0001', message = 'invalid_counter_reason';
  end if;
  if p_category is null or p_category not in (
    'purchase', 'money', 'monthly_cost', 'schedule', 'house', 'rule', 'promise', 'other'
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_category';
  end if;
  if p_amount is not null and (
    p_amount < 0 or p_amount > 999999999999 or trunc(p_amount) <> p_amount
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_amount';
  end if;
  if (p_amount is null) <> (p_amount_type is null)
    or (p_amount_type is not null and p_amount_type not in ('one_time', 'monthly'))
  then
    raise exception using errcode = 'P0001', message = 'invalid_amount_type';
  end if;
end;
$$;

create or replace function public.counter_proposal(
  target_request_id uuid,
  expected_version integer,
  p_title text,
  p_category text,
  p_amount numeric,
  p_amount_type text,
  p_details text,
  p_scheduled_at timestamptz,
  p_due_at timestamptz,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_request public.requests%rowtype;
  latest_proposal public.proposal_versions%rowtype;
  partner_id uuid;
  active_member_count integer;
  next_version integer;
  new_proposal_id uuid := gen_random_uuid();
  audit_action text;
begin
  perform public.validate_negotiation_proposal_input(
    p_title, p_category, p_amount, p_amount_type, p_details, p_reason
  );
  if actor_id is null then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;
  if expected_version is null or expected_version < 1 then
    raise exception using errcode = 'P0001', message = 'invalid_expected_version';
  end if;

  select r.* into target_request
  from public.requests r
  where r.id = target_request_id
  for update;
  if not found
    or not public.is_active_couple_member(target_request.couple_id)
    or not exists (
      select 1 from public.couples c
      where c.id = target_request.couple_id and c.archived_at is null
    )
  then
    raise exception using errcode = 'P0001', message = 'request_not_found';
  end if;
  if target_request.current_proposal_version <> expected_version then
    raise exception using errcode = 'P0001', message = 'stale_request';
  end if;
  if target_request.current_actor_user_id is distinct from actor_id then
    raise exception using errcode = 'P0001', message = 'not_current_actor';
  end if;
  if target_request.status not in ('pending_response', 'negotiating') then
    raise exception using errcode = 'P0001', message = 'request_not_negotiable';
  end if;

  select pv.* into latest_proposal
  from public.proposal_versions pv
  where pv.request_id = target_request.id
    and pv.couple_id = target_request.couple_id
    and pv.version_no = target_request.current_proposal_version;
  if not found then
    raise exception using errcode = 'P0001', message = 'latest_proposal_not_found';
  end if;
  if latest_proposal.author_user_id = actor_id then
    raise exception using errcode = 'P0001', message = 'proposal_author_cannot_counter';
  end if;
  if exists (
    select 1 from public.responses response
    where response.proposal_version_id = latest_proposal.id
  ) then
    raise exception using errcode = 'P0001', message = 'response_already_recorded';
  end if;

  select count(*), (max(cm.user_id::text) filter (where cm.user_id <> actor_id))::uuid
  into active_member_count, partner_id
  from public.couple_members cm
  where cm.couple_id = target_request.couple_id and cm.left_at is null;
  if active_member_count <> 2 or partner_id is null then
    raise exception using errcode = 'P0001', message = 'partner_required';
  end if;

  next_version := expected_version + 1;
  update public.requests
  set current_proposal_version = next_version,
      current_actor_user_id = partner_id,
      category = p_category,
      status = 'negotiating',
      discussion_at = null,
      updated_at = now()
  where id = target_request.id;
  insert into public.proposal_versions (
    id, request_id, couple_id, version_no, author_user_id, title, details,
    amount, amount_type, scheduled_at, due_at, counter_reason
  ) values (
    new_proposal_id, target_request.id, target_request.couple_id, next_version, actor_id,
    btrim(p_title), nullif(btrim(p_details), ''), p_amount, p_amount_type,
    p_scheduled_at, p_due_at, btrim(p_reason)
  );

  audit_action := case
    when actor_id = target_request.requester_user_id then 'proposal_reproposed'
    else 'proposal_countered'
  end;
  insert into public.audit_logs (
    couple_id, actor_user_id, action, entity_type, entity_id,
    request_id, proposal_version_id, metadata
  ) values (
    target_request.couple_id, actor_id, audit_action, 'proposal_version', new_proposal_id,
    target_request.id, new_proposal_id,
    jsonb_build_object('previous_version', expected_version, 'version_no', next_version)
  );
  return new_proposal_id;
end;
$$;

create or replace function public.withdraw_request(
  target_request_id uuid,
  expected_version integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_request public.requests%rowtype;
begin
  if actor_id is null then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;
  if expected_version is null or expected_version < 1 then
    raise exception using errcode = 'P0001', message = 'invalid_expected_version';
  end if;
  select r.* into target_request
  from public.requests r
  where r.id = target_request_id
  for update;
  if not found
    or not public.is_active_couple_member(target_request.couple_id)
    or not exists (
      select 1 from public.couples c
      where c.id = target_request.couple_id and c.archived_at is null
    )
  then
    raise exception using errcode = 'P0001', message = 'request_not_found';
  end if;
  if target_request.current_proposal_version <> expected_version then
    raise exception using errcode = 'P0001', message = 'stale_request';
  end if;
  if target_request.requester_user_id <> actor_id then
    raise exception using errcode = 'P0001', message = 'withdrawal_forbidden';
  end if;
  if target_request.status not in ('pending_response', 'negotiating') then
    raise exception using errcode = 'P0001', message = 'request_not_withdrawable';
  end if;

  update public.requests
  set status = 'withdrawn', current_actor_user_id = null,
      discussion_at = null, updated_at = now()
  where id = target_request.id;
  insert into public.audit_logs (
    couple_id, actor_user_id, action, entity_type, entity_id, request_id, metadata
  ) values (
    target_request.couple_id, actor_id, 'request_withdrawn', 'request', target_request.id,
    target_request.id, jsonb_build_object('expected_version', expected_version)
  );
  return target_request.id;
end;
$$;

create or replace function public.record_discussion_result(
  target_request_id uuid,
  expected_version integer,
  p_title text,
  p_category text,
  p_amount numeric,
  p_amount_type text,
  p_details text,
  p_scheduled_at timestamptz,
  p_due_at timestamptz,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_request public.requests%rowtype;
  partner_id uuid;
  active_member_count integer;
  next_version integer;
  new_proposal_id uuid := gen_random_uuid();
begin
  perform public.validate_negotiation_proposal_input(
    p_title, p_category, p_amount, p_amount_type, p_details, p_reason
  );
  if actor_id is null then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;
  if expected_version is null or expected_version < 1 then
    raise exception using errcode = 'P0001', message = 'invalid_expected_version';
  end if;

  select r.* into target_request
  from public.requests r
  where r.id = target_request_id
  for update;
  if not found
    or not public.is_active_couple_member(target_request.couple_id)
    or not exists (
      select 1 from public.couples c
      where c.id = target_request.couple_id and c.archived_at is null
    )
  then
    raise exception using errcode = 'P0001', message = 'request_not_found';
  end if;
  if target_request.current_proposal_version <> expected_version then
    raise exception using errcode = 'P0001', message = 'stale_request';
  end if;
  if target_request.status <> 'discussion_scheduled' then
    raise exception using errcode = 'P0001', message = 'discussion_not_scheduled';
  end if;

  select count(*), (max(cm.user_id::text) filter (where cm.user_id <> actor_id))::uuid
  into active_member_count, partner_id
  from public.couple_members cm
  where cm.couple_id = target_request.couple_id and cm.left_at is null;
  if active_member_count <> 2 or partner_id is null then
    raise exception using errcode = 'P0001', message = 'partner_required';
  end if;

  next_version := expected_version + 1;
  update public.requests
  set current_proposal_version = next_version,
      current_actor_user_id = partner_id,
      category = p_category,
      status = 'negotiating',
      updated_at = now()
  where id = target_request.id;
  insert into public.proposal_versions (
    id, request_id, couple_id, version_no, author_user_id, title, details,
    amount, amount_type, scheduled_at, due_at, counter_reason
  ) values (
    new_proposal_id, target_request.id, target_request.couple_id, next_version, actor_id,
    btrim(p_title), nullif(btrim(p_details), ''), p_amount, p_amount_type,
    p_scheduled_at, p_due_at, btrim(p_reason)
  );
  insert into public.audit_logs (
    couple_id, actor_user_id, action, entity_type, entity_id,
    request_id, proposal_version_id, metadata
  ) values (
    target_request.couple_id, actor_id, 'discussion_result_recorded',
    'proposal_version', new_proposal_id, target_request.id, new_proposal_id,
    jsonb_build_object('previous_version', expected_version, 'version_no', next_version)
  );
  return new_proposal_id;
end;
$$;

revoke all on function public.validate_negotiation_proposal_input(
  text, text, numeric, text, text, text
) from public, anon, authenticated;
revoke all on function public.counter_proposal(
  uuid, integer, text, text, numeric, text, text, timestamptz, timestamptz, text
) from public, anon;
revoke all on function public.withdraw_request(uuid, integer) from public, anon;
revoke all on function public.record_discussion_result(
  uuid, integer, text, text, numeric, text, text, timestamptz, timestamptz, text
) from public, anon;
grant execute on function public.counter_proposal(
  uuid, integer, text, text, numeric, text, text, timestamptz, timestamptz, text
) to authenticated;
grant execute on function public.withdraw_request(uuid, integer) to authenticated;
grant execute on function public.record_discussion_result(
  uuid, integer, text, text, numeric, text, text, timestamptz, timestamptz, text
) to authenticated;
