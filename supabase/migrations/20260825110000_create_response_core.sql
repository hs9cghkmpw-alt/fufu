alter table public.requests
  add column discussion_at timestamptz;

alter table public.proposal_versions
  add constraint proposal_id_request_couple_unique unique (id, request_id, couple_id);

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  couple_id uuid not null,
  proposal_version_id uuid not null,
  responder_user_id uuid not null references auth.users(id),
  response_type text not null check (
    response_type in ('approved', 'rejected', 'discussion_scheduled')
  ),
  reason text,
  discussion_at timestamptz,
  created_at timestamptz not null default now(),
  constraint responses_request_couple foreign key (request_id, couple_id)
    references public.requests(id, couple_id) on delete restrict,
  constraint responses_proposal_request_couple foreign key (
    proposal_version_id, request_id, couple_id
  ) references public.proposal_versions(id, request_id, couple_id) on delete restrict,
  constraint responses_responder_membership foreign key (couple_id, responder_user_id)
    references public.couple_members(couple_id, user_id) on delete restrict,
  constraint responses_one_per_proposal unique (proposal_version_id),
  constraint responses_payload_by_type check (
    (response_type = 'approved' and reason is null and discussion_at is null)
    or (
      response_type = 'rejected'
      and reason is not null
      and char_length(reason) between 1 and 2000
      and reason = btrim(reason)
      and discussion_at is null
    )
    or (
      response_type = 'discussion_scheduled'
      and reason is null
      and discussion_at is not null
    )
  )
);

create index responses_request_created on public.responses(request_id, created_at desc);
create index responses_couple_created on public.responses(couple_id, created_at desc);

alter table public.responses enable row level security;

create policy "responses_select_members" on public.responses
for select to authenticated
using (public.is_active_couple_member(couple_id));

create or replace function public.prevent_response_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception using errcode = 'P0001', message = 'responses_are_immutable';
end;
$$;

create trigger prevent_response_update_or_delete
before update or delete on public.responses
for each row execute function public.prevent_response_mutation();

create or replace function public.lock_request_for_response(
  target_request_id uuid,
  expected_version integer
)
returns public.requests
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
  if target_request.current_actor_user_id is distinct from actor_id then
    raise exception using errcode = 'P0001', message = 'not_current_actor';
  end if;
  if target_request.status not in ('pending_response', 'negotiating') then
    raise exception using errcode = 'P0001', message = 'request_not_respondable';
  end if;
  if target_request.current_proposal_version <> expected_version then
    raise exception using errcode = 'P0001', message = 'stale_request';
  end if;
  if not exists (
    select 1 from public.proposal_versions pv
    where pv.request_id = target_request.id
      and pv.couple_id = target_request.couple_id
      and pv.version_no = target_request.current_proposal_version
  ) then
    raise exception using errcode = 'P0001', message = 'latest_proposal_not_found';
  end if;
  if exists (
    select 1 from public.responses response
    join public.proposal_versions pv on pv.id = response.proposal_version_id
    where pv.request_id = target_request.id
      and pv.version_no = target_request.current_proposal_version
  ) then
    raise exception using errcode = 'P0001', message = 'response_already_recorded';
  end if;
  return target_request;
end;
$$;

create or replace function public.approve_request(
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
  target_proposal public.proposal_versions%rowtype;
  new_response_id uuid;
begin
  target_request := public.lock_request_for_response(target_request_id, expected_version);
  select pv.* into strict target_proposal
  from public.proposal_versions pv
  where pv.request_id = target_request.id
    and pv.couple_id = target_request.couple_id
    and pv.version_no = target_request.current_proposal_version;
  if target_proposal.author_user_id = actor_id then
    raise exception using errcode = 'P0001', message = 'self_approval_forbidden';
  end if;

  insert into public.responses (
    request_id, couple_id, proposal_version_id, responder_user_id, response_type
  ) values (
    target_request.id, target_request.couple_id, target_proposal.id, actor_id, 'approved'
  ) returning id into new_response_id;
  update public.requests
  set status = 'approved', current_actor_user_id = null, discussion_at = null, updated_at = now()
  where id = target_request.id;
  insert into public.audit_logs (
    couple_id, actor_user_id, action, entity_type, entity_id,
    request_id, proposal_version_id, metadata
  ) values (
    target_request.couple_id, actor_id, 'request_approved', 'response', new_response_id,
    target_request.id, target_proposal.id,
    jsonb_build_object('expected_version', expected_version)
  );
  return new_response_id;
end;
$$;

create or replace function public.reject_request(
  target_request_id uuid,
  expected_version integer,
  rejection_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_request public.requests%rowtype;
  target_proposal public.proposal_versions%rowtype;
  normalized_reason text := nullif(btrim(rejection_reason), '');
  new_response_id uuid;
begin
  if normalized_reason is null or char_length(normalized_reason) > 2000 then
    raise exception using errcode = 'P0001', message = 'invalid_rejection_reason';
  end if;
  target_request := public.lock_request_for_response(target_request_id, expected_version);
  select pv.* into strict target_proposal
  from public.proposal_versions pv
  where pv.request_id = target_request.id
    and pv.couple_id = target_request.couple_id
    and pv.version_no = target_request.current_proposal_version;

  insert into public.responses (
    request_id, couple_id, proposal_version_id, responder_user_id, response_type, reason
  ) values (
    target_request.id, target_request.couple_id, target_proposal.id, actor_id, 'rejected',
    normalized_reason
  ) returning id into new_response_id;
  update public.requests
  set status = 'rejected', current_actor_user_id = null, discussion_at = null, updated_at = now()
  where id = target_request.id;
  insert into public.audit_logs (
    couple_id, actor_user_id, action, entity_type, entity_id,
    request_id, proposal_version_id, metadata
  ) values (
    target_request.couple_id, actor_id, 'request_rejected', 'response', new_response_id,
    target_request.id, target_proposal.id,
    jsonb_build_object('expected_version', expected_version)
  );
  return new_response_id;
end;
$$;

create or replace function public.schedule_discussion(
  target_request_id uuid,
  expected_version integer,
  scheduled_for timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_request public.requests%rowtype;
  target_proposal public.proposal_versions%rowtype;
  new_response_id uuid;
begin
  if scheduled_for is null then
    raise exception using errcode = 'P0001', message = 'invalid_discussion_at';
  end if;
  target_request := public.lock_request_for_response(target_request_id, expected_version);
  select pv.* into strict target_proposal
  from public.proposal_versions pv
  where pv.request_id = target_request.id
    and pv.couple_id = target_request.couple_id
    and pv.version_no = target_request.current_proposal_version;

  insert into public.responses (
    request_id, couple_id, proposal_version_id, responder_user_id,
    response_type, discussion_at
  ) values (
    target_request.id, target_request.couple_id, target_proposal.id, actor_id,
    'discussion_scheduled', scheduled_for
  ) returning id into new_response_id;
  update public.requests
  set status = 'discussion_scheduled', current_actor_user_id = null,
      discussion_at = scheduled_for, updated_at = now()
  where id = target_request.id;
  insert into public.audit_logs (
    couple_id, actor_user_id, action, entity_type, entity_id,
    request_id, proposal_version_id, metadata
  ) values (
    target_request.couple_id, actor_id, 'discussion_scheduled', 'response', new_response_id,
    target_request.id, target_proposal.id,
    jsonb_build_object('expected_version', expected_version, 'discussion_at', scheduled_for)
  );
  return new_response_id;
end;
$$;

revoke all on function public.prevent_response_mutation() from public, anon, authenticated;
revoke all on function public.lock_request_for_response(uuid, integer) from public, anon, authenticated;
revoke all on function public.approve_request(uuid, integer) from public, anon;
revoke all on function public.reject_request(uuid, integer, text) from public, anon;
revoke all on function public.schedule_discussion(uuid, integer, timestamptz) from public, anon;
grant execute on function public.approve_request(uuid, integer) to authenticated;
grant execute on function public.reject_request(uuid, integer, text) to authenticated;
grant execute on function public.schedule_discussion(uuid, integer, timestamptz) to authenticated;
