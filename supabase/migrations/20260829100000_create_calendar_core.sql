-- Sprint 7 Calendar Core
-- calendar_events is a rebuildable projection for canonical request/proposal/agreement state.
-- Direct personal/shared events are first-class calendar records with their own audit trail.

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references public.couples(id) on delete restrict,
  owner_user_id uuid references auth.users(id) on delete restrict,
  visibility text not null check (visibility in ('couple', 'personal')),
  event_type text not null check (
    event_type in ('agreement', 'deadline', 'discussion', 'pending_proposal', 'shared', 'personal')
  ),
  status text not null check (
    status in ('pending', 'confirmed', 'discussion', 'completed', 'cancelled')
  ),
  approval_status text not null default 'not_required' check (
    approval_status in ('not_required', 'pending', 'approved', 'rejected', 'withdrawn')
  ),
  current_actor_user_id uuid references auth.users(id) on delete restrict,
  source_request_id uuid,
  source_proposal_version_id uuid,
  source_agreement_id uuid,
  source_response_id uuid,
  projection_key text unique,
  title text not null check (char_length(title) between 1 and 120 and title = btrim(title)),
  details text check (details is null or char_length(details) between 1 and 5000),
  starts_at timestamptz,
  ends_at timestamptz,
  start_date date,
  end_date date,
  due_at timestamptz,
  completed_at timestamptz,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  approved_by_user_id uuid references auth.users(id) on delete restrict,
  approved_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_event_request_couple foreign key (source_request_id, couple_id)
    references public.requests(id, couple_id) on delete restrict,
  constraint calendar_event_proposal_request_couple foreign key (
    source_proposal_version_id, source_request_id, couple_id
  ) references public.proposal_versions(id, request_id, couple_id) on delete restrict,
  constraint calendar_event_agreement_couple foreign key (source_agreement_id, couple_id)
    references public.agreements(id, couple_id) on delete restrict,
  constraint calendar_event_response_request_couple foreign key (
    source_response_id, source_request_id, couple_id
  ) references public.responses(id, request_id, couple_id) on delete restrict,
  constraint calendar_event_creator_membership foreign key (couple_id, created_by_user_id)
    references public.couple_members(couple_id, user_id) on delete restrict,
  constraint calendar_event_actor_membership foreign key (couple_id, current_actor_user_id)
    references public.couple_members(couple_id, user_id) on delete restrict,
  constraint calendar_event_approver_membership foreign key (couple_id, approved_by_user_id)
    references public.couple_members(couple_id, user_id) on delete restrict,
  constraint calendar_event_time_mode check (
    (
      starts_at is not null
      and start_date is null
      and end_date is null
      and (ends_at is null or ends_at >= starts_at)
    )
    or
    (
      starts_at is null
      and ends_at is null
      and start_date is not null
      and (end_date is null or end_date >= start_date)
    )
  ),
  constraint calendar_event_visibility_scope check (
    (
      visibility = 'personal'
      and couple_id is null
      and owner_user_id is not null
      and event_type = 'personal'
    )
    or
    (
      visibility = 'couple'
      and couple_id is not null
      and owner_user_id is null
      and event_type <> 'personal'
    )
  ),
  constraint calendar_event_direct_or_projection check (
    (
      event_type in ('personal', 'shared')
      and projection_key is null
      and source_request_id is null
      and source_proposal_version_id is null
      and source_agreement_id is null
      and source_response_id is null
    )
    or
    (
      event_type in ('agreement', 'deadline', 'discussion', 'pending_proposal')
      and visibility = 'couple'
      and projection_key is not null
    )
  ),
  constraint calendar_event_shared_approval check (
    event_type <> 'shared'
    or (
      approval_status = 'pending'
      and status = 'pending'
      and current_actor_user_id is not null
      and approved_by_user_id is null
      and approved_at is null
      and cancelled_at is null
    )
    or (
      approval_status = 'approved'
      and status = 'confirmed'
      and current_actor_user_id is null
      and approved_by_user_id is not null
      and approved_at is not null
      and cancelled_at is null
    )
    or (
      approval_status in ('rejected', 'withdrawn')
      and status = 'cancelled'
      and current_actor_user_id is null
      and approved_by_user_id is null
      and approved_at is null
      and cancelled_at is not null
    )
  ),
  constraint calendar_event_non_shared_approval check (
    event_type = 'shared' or (
      approval_status = 'not_required'
      and current_actor_user_id is null
      and approved_by_user_id is null
      and approved_at is null
    )
  ),
  constraint calendar_event_cancel_payload check (
    (status = 'cancelled' and cancelled_at is not null)
    or (status <> 'cancelled' and cancelled_at is null)
  ),
  constraint calendar_event_completion_payload check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);

create index calendar_events_couple_timed
  on public.calendar_events(couple_id, starts_at)
  where visibility = 'couple' and starts_at is not null and status <> 'cancelled';
create index calendar_events_couple_all_day
  on public.calendar_events(couple_id, start_date)
  where visibility = 'couple' and start_date is not null and status <> 'cancelled';
create index calendar_events_owner_timed
  on public.calendar_events(owner_user_id, starts_at)
  where visibility = 'personal' and starts_at is not null and status <> 'cancelled';
create index calendar_events_owner_all_day
  on public.calendar_events(owner_user_id, start_date)
  where visibility = 'personal' and start_date is not null and status <> 'cancelled';
create index calendar_events_request
  on public.calendar_events(source_request_id)
  where source_request_id is not null;
create index calendar_events_agreement
  on public.calendar_events(source_agreement_id)
  where source_agreement_id is not null;

create table public.calendar_event_audit_logs (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.calendar_events(id) on delete restrict,
  couple_id uuid references public.couples(id) on delete restrict,
  owner_user_id uuid references auth.users(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  visibility text not null check (visibility in ('couple', 'personal')),
  action text not null check (char_length(action) between 1 and 80),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now(),
  constraint calendar_audit_visibility_scope check (
    (visibility = 'personal' and couple_id is null and owner_user_id is not null)
    or (visibility = 'couple' and couple_id is not null and owner_user_id is null)
  )
);

create index calendar_event_audit_event_time
  on public.calendar_event_audit_logs(event_id, occurred_at desc);
create index calendar_event_audit_couple_time
  on public.calendar_event_audit_logs(couple_id, occurred_at desc)
  where couple_id is not null;
create index calendar_event_audit_owner_time
  on public.calendar_event_audit_logs(owner_user_id, occurred_at desc)
  where owner_user_id is not null;

alter table public.calendar_events enable row level security;
alter table public.calendar_event_audit_logs enable row level security;

create policy "calendar_events_select_visible" on public.calendar_events
for select to authenticated
using (
  (visibility = 'personal' and owner_user_id = (select auth.uid()))
  or (visibility = 'couple' and public.is_active_couple_member(couple_id))
);

create policy "calendar_event_audit_select_visible" on public.calendar_event_audit_logs
for select to authenticated
using (
  (visibility = 'personal' and owner_user_id = (select auth.uid()))
  or (visibility = 'couple' and public.is_active_couple_member(couple_id))
);

grant select on public.calendar_events to authenticated;
grant select on public.calendar_event_audit_logs to authenticated;

create or replace function public.validate_calendar_event_input(
  p_title text,
  p_details text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_start_date date,
  p_end_date date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_title text := nullif(btrim(p_title), '');
  normalized_details text := nullif(btrim(p_details), '');
begin
  if normalized_title is null or char_length(normalized_title) > 120 then
    raise exception using errcode = 'P0001', message = 'invalid_calendar_title';
  end if;
  if normalized_details is not null and char_length(normalized_details) > 5000 then
    raise exception using errcode = 'P0001', message = 'invalid_calendar_details';
  end if;
  if (
    p_starts_at is not null
    and p_start_date is null
    and p_end_date is null
    and (p_ends_at is null or p_ends_at >= p_starts_at)
  ) then
    return;
  end if;
  if (
    p_starts_at is null
    and p_ends_at is null
    and p_start_date is not null
    and (p_end_date is null or p_end_date >= p_start_date)
  ) then
    return;
  end if;
  raise exception using errcode = 'P0001', message = 'invalid_calendar_time';
end;
$$;

create or replace function public.active_couple_for_calendar_actor()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  active_couple_id uuid;
begin
  if actor_id is null then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;
  select cm.couple_id into active_couple_id
  from public.couple_members cm
  join public.couples c on c.id = cm.couple_id
  where cm.user_id = actor_id
    and cm.left_at is null
    and c.archived_at is null;
  if active_couple_id is null then
    raise exception using errcode = 'P0001', message = 'active_couple_not_found';
  end if;
  return active_couple_id;
end;
$$;

create or replace function public.create_personal_event(
  p_title text,
  p_details text default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_start_date date default null,
  p_end_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  new_event_id uuid := gen_random_uuid();
begin
  if actor_id is null then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;
  perform public.validate_calendar_event_input(
    p_title, p_details, p_starts_at, p_ends_at, p_start_date, p_end_date
  );
  insert into public.calendar_events (
    id, owner_user_id, visibility, event_type, status, approval_status,
    title, details, starts_at, ends_at, start_date, end_date, created_by_user_id
  ) values (
    new_event_id, actor_id, 'personal', 'personal', 'confirmed', 'not_required',
    btrim(p_title), nullif(btrim(p_details), ''), p_starts_at, p_ends_at,
    p_start_date, p_end_date, actor_id
  );
  insert into public.calendar_event_audit_logs (
    event_id, owner_user_id, actor_user_id, visibility, action
  ) values (
    new_event_id, actor_id, actor_id, 'personal', 'personal_event_created'
  );
  return new_event_id;
end;
$$;

create or replace function public.update_personal_event(
  target_event_id uuid,
  p_title text,
  p_details text default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_start_date date default null,
  p_end_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_event public.calendar_events%rowtype;
begin
  if actor_id is null then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;
  perform public.validate_calendar_event_input(
    p_title, p_details, p_starts_at, p_ends_at, p_start_date, p_end_date
  );
  select ce.* into target_event
  from public.calendar_events ce
  where ce.id = target_event_id
  for update;
  if not found
    or target_event.event_type <> 'personal'
    or target_event.owner_user_id is distinct from actor_id
    or target_event.status = 'cancelled'
  then
    raise exception using errcode = 'P0001', message = 'personal_event_not_found';
  end if;
  update public.calendar_events
  set title = btrim(p_title),
      details = nullif(btrim(p_details), ''),
      starts_at = p_starts_at,
      ends_at = p_ends_at,
      start_date = p_start_date,
      end_date = p_end_date,
      updated_at = now()
  where id = target_event.id;
  insert into public.calendar_event_audit_logs (
    event_id, owner_user_id, actor_user_id, visibility, action
  ) values (
    target_event.id, actor_id, actor_id, 'personal', 'personal_event_updated'
  );
  return target_event.id;
end;
$$;

create or replace function public.cancel_personal_event(target_event_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_event public.calendar_events%rowtype;
begin
  if actor_id is null then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;
  select ce.* into target_event
  from public.calendar_events ce
  where ce.id = target_event_id
  for update;
  if not found
    or target_event.event_type <> 'personal'
    or target_event.owner_user_id is distinct from actor_id
    or target_event.status = 'cancelled'
  then
    raise exception using errcode = 'P0001', message = 'personal_event_not_found';
  end if;
  update public.calendar_events
  set status = 'cancelled', cancelled_at = now(), updated_at = now()
  where id = target_event.id;
  insert into public.calendar_event_audit_logs (
    event_id, owner_user_id, actor_user_id, visibility, action
  ) values (
    target_event.id, actor_id, actor_id, 'personal', 'personal_event_cancelled'
  );
  return target_event.id;
end;
$$;

create or replace function public.create_shared_event(
  p_title text,
  p_details text default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_start_date date default null,
  p_end_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  active_couple_id uuid;
  partner_id uuid;
  active_member_count integer;
  new_event_id uuid := gen_random_uuid();
begin
  if actor_id is null then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;
  perform public.validate_calendar_event_input(
    p_title, p_details, p_starts_at, p_ends_at, p_start_date, p_end_date
  );
  active_couple_id := public.active_couple_for_calendar_actor();
  perform pg_advisory_xact_lock(hashtextextended(active_couple_id::text, 7));
  perform 1 from public.couples c
  where c.id = active_couple_id and c.archived_at is null
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'active_couple_not_found';
  end if;
  select count(*), (max(cm.user_id::text) filter (where cm.user_id <> actor_id))::uuid
  into active_member_count, partner_id
  from public.couple_members cm
  where cm.couple_id = active_couple_id and cm.left_at is null;
  if active_member_count <> 2 or partner_id is null then
    raise exception using errcode = 'P0001', message = 'partner_required';
  end if;
  insert into public.calendar_events (
    id, couple_id, visibility, event_type, status, approval_status,
    current_actor_user_id, title, details, starts_at, ends_at, start_date, end_date,
    created_by_user_id
  ) values (
    new_event_id, active_couple_id, 'couple', 'shared', 'pending', 'pending',
    partner_id, btrim(p_title), nullif(btrim(p_details), ''),
    p_starts_at, p_ends_at, p_start_date, p_end_date, actor_id
  );
  insert into public.calendar_event_audit_logs (
    event_id, couple_id, actor_user_id, visibility, action,
    metadata
  ) values (
    new_event_id, active_couple_id, actor_id, 'couple', 'shared_event_created',
    jsonb_build_object('current_actor_user_id', partner_id)
  );
  return new_event_id;
end;
$$;

create or replace function public.approve_shared_event(target_event_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_event public.calendar_events%rowtype;
begin
  if actor_id is null then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;
  select ce.* into target_event
  from public.calendar_events ce
  where ce.id = target_event_id
  for update;
  if not found
    or target_event.event_type <> 'shared'
    or target_event.approval_status <> 'pending'
    or target_event.status <> 'pending'
    or not public.is_active_couple_member(target_event.couple_id)
  then
    raise exception using errcode = 'P0001', message = 'shared_event_not_found';
  end if;
  if target_event.current_actor_user_id is distinct from actor_id then
    raise exception using errcode = 'P0001', message = 'not_current_actor';
  end if;
  if target_event.created_by_user_id = actor_id then
    raise exception using errcode = 'P0001', message = 'self_approval_forbidden';
  end if;
  update public.calendar_events
  set status = 'confirmed',
      approval_status = 'approved',
      current_actor_user_id = null,
      approved_by_user_id = actor_id,
      approved_at = now(),
      updated_at = now()
  where id = target_event.id;
  insert into public.calendar_event_audit_logs (
    event_id, couple_id, actor_user_id, visibility, action
  ) values (
    target_event.id, target_event.couple_id, actor_id, 'couple', 'shared_event_approved'
  );
  return target_event.id;
end;
$$;

create or replace function public.reject_shared_event(target_event_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_event public.calendar_events%rowtype;
begin
  if actor_id is null then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;
  select ce.* into target_event
  from public.calendar_events ce
  where ce.id = target_event_id
  for update;
  if not found
    or target_event.event_type <> 'shared'
    or target_event.approval_status <> 'pending'
    or target_event.status <> 'pending'
    or not public.is_active_couple_member(target_event.couple_id)
  then
    raise exception using errcode = 'P0001', message = 'shared_event_not_found';
  end if;
  if target_event.current_actor_user_id is distinct from actor_id then
    raise exception using errcode = 'P0001', message = 'not_current_actor';
  end if;
  update public.calendar_events
  set status = 'cancelled',
      approval_status = 'rejected',
      current_actor_user_id = null,
      cancelled_at = now(),
      updated_at = now()
  where id = target_event.id;
  insert into public.calendar_event_audit_logs (
    event_id, couple_id, actor_user_id, visibility, action
  ) values (
    target_event.id, target_event.couple_id, actor_id, 'couple', 'shared_event_rejected'
  );
  return target_event.id;
end;
$$;

create or replace function public.withdraw_shared_event(target_event_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_event public.calendar_events%rowtype;
begin
  if actor_id is null then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;
  select ce.* into target_event
  from public.calendar_events ce
  where ce.id = target_event_id
  for update;
  if not found
    or target_event.event_type <> 'shared'
    or target_event.approval_status <> 'pending'
    or target_event.status <> 'pending'
    or target_event.created_by_user_id is distinct from actor_id
    or not public.is_active_couple_member(target_event.couple_id)
  then
    raise exception using errcode = 'P0001', message = 'shared_event_not_found';
  end if;
  update public.calendar_events
  set status = 'cancelled',
      approval_status = 'withdrawn',
      current_actor_user_id = null,
      cancelled_at = now(),
      updated_at = now()
  where id = target_event.id;
  insert into public.calendar_event_audit_logs (
    event_id, couple_id, actor_user_id, visibility, action
  ) values (
    target_event.id, target_event.couple_id, actor_id, 'couple', 'shared_event_withdrawn'
  );
  return target_event.id;
end;
$$;

create or replace function public.sync_request_calendar_projection(target_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_request public.requests%rowtype;
  latest_proposal public.proposal_versions%rowtype;
  latest_discussion_response public.responses%rowtype;
  pending_key text;
  discussion_key text;
  pending_start timestamptz;
  system_actor uuid;
begin
  select r.* into target_request
  from public.requests r
  where r.id = target_request_id;
  if not found then
    return;
  end if;
  select pv.* into latest_proposal
  from public.proposal_versions pv
  where pv.request_id = target_request.id
    and pv.couple_id = target_request.couple_id
    and pv.version_no = target_request.current_proposal_version;
  if not found then
    return;
  end if;
  pending_key := 'request:' || target_request.id::text || ':pending';
  discussion_key := 'request:' || target_request.id::text || ':discussion';
  system_actor := latest_proposal.author_user_id;

  if target_request.status in ('pending_response', 'negotiating')
    and (latest_proposal.scheduled_at is not null or latest_proposal.due_at is not null)
  then
    pending_start := coalesce(latest_proposal.scheduled_at, latest_proposal.due_at);
    insert into public.calendar_events (
      couple_id, visibility, event_type, status, approval_status,
      source_request_id, source_proposal_version_id, projection_key,
      title, details, starts_at, due_at, created_by_user_id
    ) values (
      target_request.couple_id, 'couple', 'pending_proposal', 'pending', 'not_required',
      target_request.id, latest_proposal.id, pending_key,
      latest_proposal.title, latest_proposal.details, pending_start, latest_proposal.due_at,
      latest_proposal.author_user_id
    )
    on conflict (projection_key) do update
    set status = 'pending',
        source_proposal_version_id = excluded.source_proposal_version_id,
        title = excluded.title,
        details = excluded.details,
        starts_at = excluded.starts_at,
        due_at = excluded.due_at,
        completed_at = null,
        cancelled_at = null,
        updated_at = now();
  else
    update public.calendar_events
    set status = 'cancelled',
        completed_at = null,
        cancelled_at = coalesce(cancelled_at, now()),
        updated_at = now()
    where projection_key = pending_key
      and status <> 'cancelled';
  end if;

  if target_request.status = 'discussion_scheduled' and target_request.discussion_at is not null then
    select response.* into latest_discussion_response
    from public.responses response
    where response.request_id = target_request.id
      and response.couple_id = target_request.couple_id
      and response.response_type = 'discussion_scheduled'
    order by response.created_at desc
    limit 1;
    insert into public.calendar_events (
      couple_id, visibility, event_type, status, approval_status,
      source_request_id, source_proposal_version_id, source_response_id, projection_key,
      title, starts_at, created_by_user_id
    ) values (
      target_request.couple_id, 'couple', 'discussion', 'discussion', 'not_required',
      target_request.id, latest_proposal.id, latest_discussion_response.id, discussion_key,
      '話し合い: ' || latest_proposal.title, target_request.discussion_at,
      coalesce(latest_discussion_response.responder_user_id, latest_proposal.author_user_id)
    )
    on conflict (projection_key) do update
    set status = 'discussion',
        source_proposal_version_id = excluded.source_proposal_version_id,
        source_response_id = excluded.source_response_id,
        title = excluded.title,
        starts_at = excluded.starts_at,
        completed_at = null,
        cancelled_at = null,
        updated_at = now();
  elsif target_request.status <> 'discussion_scheduled' then
    update public.calendar_events
    set status = 'completed',
        completed_at = coalesce(completed_at, now()),
        cancelled_at = null,
        updated_at = now()
    where projection_key = discussion_key
      and status = 'discussion';
  end if;
end;
$$;

create or replace function public.sync_agreement_calendar_projection(target_agreement_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_agreement public.agreements%rowtype;
  source_proposal public.proposal_versions%rowtype;
  schedule_key text;
  deadline_key text;
  projection_status text;
  projection_completed_at timestamptz;
begin
  select a.* into target_agreement
  from public.agreements a
  where a.id = target_agreement_id;
  if not found then
    return;
  end if;
  select pv.* into source_proposal
  from public.proposal_versions pv
  where pv.id = target_agreement.source_proposal_version_id
    and pv.request_id = target_agreement.source_request_id
    and pv.couple_id = target_agreement.couple_id;
  if not found then
    return;
  end if;
  schedule_key := 'agreement:' || target_agreement.id::text || ':scheduled';
  deadline_key := 'agreement:' || target_agreement.id::text || ':deadline';

  if target_agreement.lifecycle_status <> 'active'
    or target_agreement.execution_status = 'cancelled'
  then
    update public.calendar_events
    set status = 'cancelled',
        completed_at = null,
        cancelled_at = coalesce(cancelled_at, now()),
        updated_at = now()
    where source_agreement_id = target_agreement.id
      and status <> 'cancelled';
    return;
  end if;

  projection_status := case
    when target_agreement.execution_status = 'completed' then 'completed'
    else 'confirmed'
  end;
  projection_completed_at := case
    when target_agreement.execution_status = 'completed' then target_agreement.completed_at
    else null
  end;

  if target_agreement.scheduled_at is not null then
    insert into public.calendar_events (
      couple_id, visibility, event_type, status, approval_status,
      source_request_id, source_proposal_version_id, source_agreement_id, projection_key,
      title, details, starts_at, due_at, completed_at, created_by_user_id
    ) values (
      target_agreement.couple_id, 'couple', 'agreement', projection_status, 'not_required',
      target_agreement.source_request_id, target_agreement.source_proposal_version_id,
      target_agreement.id, schedule_key, source_proposal.title, source_proposal.details,
      target_agreement.scheduled_at, target_agreement.due_at, projection_completed_at,
      source_proposal.author_user_id
    )
    on conflict (projection_key) do update
    set status = excluded.status,
        title = excluded.title,
        details = excluded.details,
        starts_at = excluded.starts_at,
        due_at = excluded.due_at,
        completed_at = excluded.completed_at,
        cancelled_at = null,
        updated_at = now();
  else
    update public.calendar_events
    set status = 'cancelled',
        completed_at = null,
        cancelled_at = coalesce(cancelled_at, now()),
        updated_at = now()
    where projection_key = schedule_key
      and status <> 'cancelled';
  end if;

  if target_agreement.due_at is not null then
    insert into public.calendar_events (
      couple_id, visibility, event_type, status, approval_status,
      source_request_id, source_proposal_version_id, source_agreement_id, projection_key,
      title, starts_at, due_at, completed_at, created_by_user_id
    ) values (
      target_agreement.couple_id, 'couple', 'deadline', projection_status, 'not_required',
      target_agreement.source_request_id, target_agreement.source_proposal_version_id,
      target_agreement.id, deadline_key, '期限: ' || source_proposal.title,
      target_agreement.due_at, target_agreement.due_at, projection_completed_at,
      source_proposal.author_user_id
    )
    on conflict (projection_key) do update
    set status = excluded.status,
        title = excluded.title,
        starts_at = excluded.starts_at,
        due_at = excluded.due_at,
        completed_at = excluded.completed_at,
        cancelled_at = null,
        updated_at = now();
  else
    update public.calendar_events
    set status = 'cancelled',
        completed_at = null,
        cancelled_at = coalesce(cancelled_at, now()),
        updated_at = now()
    where projection_key = deadline_key
      and status <> 'cancelled';
  end if;
end;
$$;

create or replace function public.calendar_sync_request_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.sync_request_calendar_projection(new.id);
  return new;
end;
$$;

create or replace function public.calendar_sync_proposal_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.sync_request_calendar_projection(new.request_id);
  return new;
end;
$$;

create or replace function public.calendar_sync_agreement_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.sync_agreement_calendar_projection(new.id);
  return new;
end;
$$;

create trigger sync_calendar_after_request_change
after insert or update of status, current_actor_user_id, current_proposal_version, discussion_at
on public.requests
for each row execute function public.calendar_sync_request_trigger();

create trigger sync_calendar_after_proposal_insert
after insert on public.proposal_versions
for each row execute function public.calendar_sync_proposal_trigger();

create trigger sync_calendar_after_agreement_change
after insert or update of lifecycle_status, execution_status, scheduled_at, due_at, completed_at
on public.agreements
for each row execute function public.calendar_sync_agreement_trigger();

do $$
declare
  request_row record;
  agreement_row record;
begin
  for request_row in select id from public.requests loop
    perform public.sync_request_calendar_projection(request_row.id);
  end loop;
  for agreement_row in select id from public.agreements loop
    perform public.sync_agreement_calendar_projection(agreement_row.id);
  end loop;
end;
$$;

create or replace function public.get_calendar_range(
  range_start timestamptz,
  range_end timestamptz,
  date_start date,
  date_end date
)
returns setof public.calendar_events
language sql
stable
security invoker
set search_path = ''
as $$
  select ce.*
  from public.calendar_events ce
  where ce.status <> 'cancelled'
    and (
      (
        ce.starts_at is not null
        and ce.starts_at < range_end
        and coalesce(ce.ends_at, ce.starts_at) >= range_start
      )
      or
      (
        ce.start_date is not null
        and ce.start_date <= date_end
        and coalesce(ce.end_date, ce.start_date) >= date_start
      )
    )
  order by
    coalesce(ce.start_date, (ce.starts_at at time zone 'Asia/Tokyo')::date),
    (ce.start_date is null),
    ce.starts_at nulls first,
    ce.created_at;
$$;

create or replace function public.get_calendar_event(target_event_id uuid)
returns setof public.calendar_events
language sql
stable
security invoker
set search_path = ''
as $$
  select ce.*
  from public.calendar_events ce
  where ce.id = target_event_id;
$$;

revoke all on function public.validate_calendar_event_input(
  text, text, timestamptz, timestamptz, date, date
) from public, anon, authenticated;
revoke all on function public.active_couple_for_calendar_actor() from public, anon, authenticated;
revoke all on function public.sync_request_calendar_projection(uuid) from public, anon, authenticated;
revoke all on function public.sync_agreement_calendar_projection(uuid) from public, anon, authenticated;
revoke all on function public.calendar_sync_request_trigger() from public, anon, authenticated;
revoke all on function public.calendar_sync_proposal_trigger() from public, anon, authenticated;
revoke all on function public.calendar_sync_agreement_trigger() from public, anon, authenticated;

revoke all on function public.create_personal_event(
  text, text, timestamptz, timestamptz, date, date
) from public, anon;
revoke all on function public.update_personal_event(
  uuid, text, text, timestamptz, timestamptz, date, date
) from public, anon;
revoke all on function public.cancel_personal_event(uuid) from public, anon;
revoke all on function public.create_shared_event(
  text, text, timestamptz, timestamptz, date, date
) from public, anon;
revoke all on function public.approve_shared_event(uuid) from public, anon;
revoke all on function public.reject_shared_event(uuid) from public, anon;
revoke all on function public.withdraw_shared_event(uuid) from public, anon;
revoke all on function public.get_calendar_range(timestamptz, timestamptz, date, date) from public, anon;
revoke all on function public.get_calendar_event(uuid) from public, anon;

grant execute on function public.create_personal_event(
  text, text, timestamptz, timestamptz, date, date
) to authenticated;
grant execute on function public.update_personal_event(
  uuid, text, text, timestamptz, timestamptz, date, date
) to authenticated;
grant execute on function public.cancel_personal_event(uuid) to authenticated;
grant execute on function public.create_shared_event(
  text, text, timestamptz, timestamptz, date, date
) to authenticated;
grant execute on function public.approve_shared_event(uuid) to authenticated;
grant execute on function public.reject_shared_event(uuid) to authenticated;
grant execute on function public.withdraw_shared_event(uuid) to authenticated;
grant execute on function public.get_calendar_range(timestamptz, timestamptz, date, date)
  to authenticated;
grant execute on function public.get_calendar_event(uuid) to authenticated;
