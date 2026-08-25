alter table public.responses
  add constraint responses_id_request_couple_unique unique (id, request_id, couple_id);

create table public.agreements (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete restrict,
  source_request_id uuid not null,
  source_proposal_version_id uuid not null,
  approved_response_id uuid not null,
  lifecycle_status text not null default 'active' check (
    lifecycle_status in ('active', 'superseded', 'cancelled')
  ),
  execution_status text not null check (
    execution_status in ('not_required', 'pending', 'completed', 'cancelled')
  ),
  scheduled_at timestamptz,
  due_at timestamptz,
  completed_at timestamptz,
  completed_by_user_id uuid references auth.users(id),
  superseded_by uuid,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  constraint agreements_source_request_unique unique (source_request_id),
  constraint agreements_approved_response_unique unique (approved_response_id),
  constraint agreements_id_couple_unique unique (id, couple_id),
  constraint agreements_source_request_couple foreign key (source_request_id, couple_id)
    references public.requests(id, couple_id) on delete restrict,
  constraint agreements_source_proposal_request_couple foreign key (
    source_proposal_version_id, source_request_id, couple_id
  ) references public.proposal_versions(id, request_id, couple_id) on delete restrict,
  constraint agreements_response_request_couple foreign key (
    approved_response_id, source_request_id, couple_id
  ) references public.responses(id, request_id, couple_id) on delete restrict,
  constraint agreements_completed_by_membership foreign key (couple_id, completed_by_user_id)
    references public.couple_members(couple_id, user_id) on delete restrict,
  constraint agreements_superseded_by_fk foreign key (superseded_by)
    references public.agreements(id) on delete restrict,
  constraint agreements_execution_payload check (
    (execution_status = 'completed' and completed_at is not null and completed_by_user_id is not null)
    or (execution_status <> 'completed' and completed_at is null and completed_by_user_id is null)
  ),
  constraint agreements_lifecycle_payload check (
    (lifecycle_status = 'cancelled' and cancelled_at is not null)
    or (lifecycle_status <> 'cancelled' and cancelled_at is null)
  )
);

create index agreements_couple_created on public.agreements(couple_id, created_at desc);
create index agreements_pending_due on public.agreements(couple_id, due_at)
  where execution_status = 'pending';

alter table public.agreements enable row level security;
create policy "agreements_select_members" on public.agreements
for select to authenticated
using (public.is_active_couple_member(couple_id));

insert into public.agreements (
  couple_id, source_request_id, source_proposal_version_id, approved_response_id,
  execution_status, scheduled_at, due_at, created_at
)
select
  r.couple_id, r.id, pv.id, response.id,
  case when pv.scheduled_at is not null or pv.due_at is not null then 'pending' else 'not_required' end,
  pv.scheduled_at, pv.due_at, response.created_at
from public.requests r
join public.proposal_versions pv
  on pv.request_id = r.id
  and pv.couple_id = r.couple_id
  and pv.version_no = r.current_proposal_version
join public.responses response
  on response.request_id = r.id
  and response.couple_id = r.couple_id
  and response.proposal_version_id = pv.id
  and response.response_type = 'approved'
where r.status = 'approved'
on conflict (source_request_id) do nothing;

insert into public.audit_logs (
  couple_id, actor_user_id, action, entity_type, entity_id,
  request_id, proposal_version_id, metadata, occurred_at
)
select
  agreement.couple_id, response.responder_user_id, 'agreement_created', 'agreement', agreement.id,
  agreement.source_request_id, agreement.source_proposal_version_id,
  jsonb_build_object('approved_response_id', agreement.approved_response_id, 'backfilled', true),
  agreement.created_at
from public.agreements agreement
join public.responses response on response.id = agreement.approved_response_id
where not exists (
  select 1 from public.audit_logs audit
  where audit.entity_type = 'agreement'
    and audit.entity_id = agreement.id
    and audit.action = 'agreement_created'
);

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
  new_agreement_id uuid := gen_random_uuid();
  initial_execution_status text;
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
  if exists (
    select 1 from public.agreements agreement
    where agreement.source_request_id = target_request.id
  ) then
    raise exception using errcode = 'P0001', message = 'agreement_already_exists';
  end if;

  insert into public.responses (
    request_id, couple_id, proposal_version_id, responder_user_id, response_type
  ) values (
    target_request.id, target_request.couple_id, target_proposal.id, actor_id, 'approved'
  ) returning id into new_response_id;

  initial_execution_status := case
    when target_proposal.scheduled_at is not null or target_proposal.due_at is not null then 'pending'
    else 'not_required'
  end;
  insert into public.agreements (
    id, couple_id, source_request_id, source_proposal_version_id, approved_response_id,
    execution_status, scheduled_at, due_at
  ) values (
    new_agreement_id, target_request.couple_id, target_request.id, target_proposal.id,
    new_response_id, initial_execution_status, target_proposal.scheduled_at, target_proposal.due_at
  );

  update public.requests
  set status = 'approved', current_actor_user_id = null, discussion_at = null, updated_at = now()
  where id = target_request.id;
  insert into public.audit_logs (
    couple_id, actor_user_id, action, entity_type, entity_id,
    request_id, proposal_version_id, metadata
  ) values (
    target_request.couple_id, actor_id, 'request_approved', 'response', new_response_id,
    target_request.id, target_proposal.id,
    jsonb_build_object('expected_version', expected_version, 'agreement_id', new_agreement_id)
  );
  insert into public.audit_logs (
    couple_id, actor_user_id, action, entity_type, entity_id,
    request_id, proposal_version_id, metadata
  ) values (
    target_request.couple_id, actor_id, 'agreement_created', 'agreement', new_agreement_id,
    target_request.id, target_proposal.id,
    jsonb_build_object(
      'approved_response_id', new_response_id,
      'execution_status', initial_execution_status
    )
  );
  return new_response_id;
end;
$$;

create or replace function public.complete_agreement(
  target_agreement_id uuid,
  expected_execution_status text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_agreement public.agreements%rowtype;
begin
  if actor_id is null then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;
  if expected_execution_status is distinct from 'pending' then
    raise exception using errcode = 'P0001', message = 'invalid_expected_execution_status';
  end if;
  select agreement.* into target_agreement
  from public.agreements agreement
  where agreement.id = target_agreement_id
  for update;
  if not found
    or not public.is_active_couple_member(target_agreement.couple_id)
    or not exists (
      select 1 from public.couples c
      where c.id = target_agreement.couple_id and c.archived_at is null
    )
  then
    raise exception using errcode = 'P0001', message = 'agreement_not_found';
  end if;
  if target_agreement.execution_status <> expected_execution_status then
    raise exception using errcode = 'P0001', message = 'stale_agreement';
  end if;
  if target_agreement.lifecycle_status <> 'active' then
    raise exception using errcode = 'P0001', message = 'agreement_not_active';
  end if;

  update public.agreements
  set execution_status = 'completed', completed_at = now(), completed_by_user_id = actor_id
  where id = target_agreement.id;
  insert into public.audit_logs (
    couple_id, actor_user_id, action, entity_type, entity_id,
    request_id, proposal_version_id, metadata
  ) values (
    target_agreement.couple_id, actor_id, 'agreement_completed', 'agreement', target_agreement.id,
    target_agreement.source_request_id, target_agreement.source_proposal_version_id,
    jsonb_build_object('previous_execution_status', expected_execution_status)
  );
  return target_agreement.id;
end;
$$;

revoke all on function public.complete_agreement(uuid, text) from public, anon;
grant execute on function public.complete_agreement(uuid, text) to authenticated;
