create table public.requests (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete restrict,
  request_kind text not null default 'new' check (request_kind in ('new', 'change', 'cancellation')),
  status text not null default 'pending_response' check (
    status in (
      'pending_response', 'negotiating', 'discussion_scheduled',
      'approved', 'rejected', 'withdrawn', 'cancelled'
    )
  ),
  requester_user_id uuid not null references auth.users(id),
  current_actor_user_id uuid references auth.users(id),
  category text not null check (
    category in ('purchase', 'money', 'monthly_cost', 'schedule', 'house', 'rule', 'promise', 'other')
  ),
  current_proposal_version integer not null default 1 check (current_proposal_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint requests_distinct_actors check (
    current_actor_user_id is null or requester_user_id <> current_actor_user_id
  ),
  constraint requests_pending_actor check (
    status <> 'pending_response' or current_actor_user_id is not null
  ),
  constraint requests_id_couple_unique unique (id, couple_id),
  constraint requests_requester_membership foreign key (couple_id, requester_user_id)
    references public.couple_members(couple_id, user_id) on delete restrict,
  constraint requests_actor_membership foreign key (couple_id, current_actor_user_id)
    references public.couple_members(couple_id, user_id) on delete restrict
);

create table public.proposal_versions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  couple_id uuid not null,
  version_no integer not null check (version_no >= 1),
  author_user_id uuid not null references auth.users(id),
  title text not null check (char_length(title) between 1 and 120 and title = btrim(title)),
  details text check (details is null or char_length(details) between 1 and 5000),
  amount numeric(12, 0) check (amount is null or amount between 0 and 999999999999),
  amount_type text check (amount_type is null or amount_type in ('one_time', 'monthly')),
  scheduled_at timestamptz,
  due_at timestamptz,
  counter_reason text check (counter_reason is null or char_length(counter_reason) between 1 and 2000),
  created_at timestamptz not null default now(),
  constraint proposal_amount_pair check (
    (amount is null and amount_type is null) or (amount is not null and amount_type is not null)
  ),
  constraint proposal_request_couple foreign key (request_id, couple_id)
    references public.requests(id, couple_id) on delete restrict,
  constraint proposal_author_membership foreign key (couple_id, author_user_id)
    references public.couple_members(couple_id, user_id) on delete restrict,
  constraint proposal_id_couple_unique unique (id, couple_id),
  constraint proposal_request_version_unique unique (request_id, version_no),
  constraint proposal_request_couple_version_unique unique (request_id, couple_id, version_no)
);

alter table public.requests
  add constraint requests_current_proposal_fk
  foreign key (id, couple_id, current_proposal_version)
  references public.proposal_versions(request_id, couple_id, version_no)
  deferrable initially deferred;

create table public.audit_logs (
  id bigint generated always as identity primary key,
  couple_id uuid not null references public.couples(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id),
  action text not null check (char_length(action) between 1 and 80),
  entity_type text not null check (char_length(entity_type) between 1 and 80),
  entity_id uuid not null,
  request_id uuid,
  proposal_version_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now(),
  constraint audit_request_couple foreign key (request_id, couple_id)
    references public.requests(id, couple_id) on delete restrict,
  constraint audit_proposal_couple foreign key (proposal_version_id, couple_id)
    references public.proposal_versions(id, couple_id) on delete restrict
);

create index requests_couple_created on public.requests(couple_id, created_at desc);
create index requests_current_actor on public.requests(current_actor_user_id, created_at desc);
create index proposal_versions_request_history on public.proposal_versions(request_id, version_no);
create index audit_logs_couple_time on public.audit_logs(couple_id, occurred_at desc);
create index audit_logs_request_time on public.audit_logs(request_id, occurred_at desc)
  where request_id is not null;

create or replace function public.validate_request_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.couples c
    where c.id = new.couple_id and c.archived_at is null
  ) then
    raise exception using errcode = 'P0001', message = 'couple_not_active';
  end if;
  if not exists (
    select 1 from public.couple_members cm
    where cm.couple_id = new.couple_id
      and cm.user_id = new.requester_user_id
      and cm.left_at is null
  ) then
    raise exception using errcode = 'P0001', message = 'requester_not_active_member';
  end if;
  if new.current_actor_user_id is not null and not exists (
    select 1 from public.couple_members cm
    where cm.couple_id = new.couple_id
      and cm.user_id = new.current_actor_user_id
      and cm.left_at is null
  ) then
    raise exception using errcode = 'P0001', message = 'actor_not_active_member';
  end if;
  return new;
end;
$$;

create trigger validate_request_membership_before_write
before insert or update on public.requests
for each row execute function public.validate_request_membership();

create or replace function public.validate_proposal_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_request public.requests%rowtype;
begin
  select * into parent_request
  from public.requests r
  where r.id = new.request_id and r.couple_id = new.couple_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'request_not_found';
  end if;
  if not exists (
    select 1 from public.couple_members cm
    where cm.couple_id = new.couple_id
      and cm.user_id = new.author_user_id
      and cm.left_at is null
  ) then
    raise exception using errcode = 'P0001', message = 'proposal_author_not_active_member';
  end if;
  if new.version_no = 1 and new.author_user_id <> parent_request.requester_user_id then
    raise exception using errcode = 'P0001', message = 'invalid_initial_proposal_author';
  end if;
  if new.version_no <> parent_request.current_proposal_version then
    raise exception using errcode = 'P0001', message = 'proposal_version_mismatch';
  end if;
  return new;
end;
$$;

create trigger validate_proposal_version_before_insert
before insert on public.proposal_versions
for each row execute function public.validate_proposal_version();

create or replace function public.prevent_proposal_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception using errcode = 'P0001', message = 'proposal_versions_are_immutable';
end;
$$;

create trigger prevent_proposal_update_or_delete
before update or delete on public.proposal_versions
for each row execute function public.prevent_proposal_mutation();

alter table public.requests enable row level security;
alter table public.proposal_versions enable row level security;
alter table public.audit_logs enable row level security;

create policy "requests_select_members" on public.requests
for select to authenticated
using (public.is_active_couple_member(couple_id));

create policy "proposal_versions_select_members" on public.proposal_versions
for select to authenticated
using (public.is_active_couple_member(couple_id));

create policy "audit_logs_select_members" on public.audit_logs
for select to authenticated
using (public.is_active_couple_member(couple_id));

create or replace function public.create_request(
  p_title text,
  p_category text,
  p_amount numeric default null,
  p_amount_type text default null,
  p_details text default null,
  p_scheduled_at timestamptz default null,
  p_due_at timestamptz default null
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
  new_request_id uuid := gen_random_uuid();
  new_proposal_id uuid := gen_random_uuid();
  normalized_title text := btrim(p_title);
  normalized_details text := nullif(btrim(p_details), '');
begin
  if actor_id is null then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;
  if normalized_title is null or char_length(normalized_title) not between 1 and 120 then
    raise exception using errcode = 'P0001', message = 'invalid_title';
  end if;
  if normalized_details is not null and char_length(normalized_details) > 5000 then
    raise exception using errcode = 'P0001', message = 'invalid_details';
  end if;
  if p_category is null or p_category not in (
    'purchase', 'money', 'monthly_cost', 'schedule', 'house', 'rule', 'promise', 'other'
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_category';
  end if;
  if p_amount is not null and (p_amount < 0 or p_amount > 999999999999 or trunc(p_amount) <> p_amount) then
    raise exception using errcode = 'P0001', message = 'invalid_amount';
  end if;
  if (p_amount is null) <> (p_amount_type is null) or
     (p_amount_type is not null and p_amount_type not in ('one_time', 'monthly')) then
    raise exception using errcode = 'P0001', message = 'invalid_amount_type';
  end if;

  select cm.couple_id into active_couple_id
  from public.couple_members cm
  join public.couples c on c.id = cm.couple_id
  where cm.user_id = actor_id and cm.left_at is null and c.archived_at is null;
  if active_couple_id is null then
    raise exception using errcode = 'P0001', message = 'active_couple_not_found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(active_couple_id::text, 2));
  perform 1 from public.couples c
  where c.id = active_couple_id and c.archived_at is null
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'active_couple_not_found';
  end if;

  select count(*) into active_member_count
  from public.couple_members cm
  where cm.couple_id = active_couple_id and cm.left_at is null;
  select cm.user_id into partner_id
  from public.couple_members cm
  where cm.couple_id = active_couple_id
    and cm.left_at is null
    and cm.user_id <> actor_id;
  if active_member_count <> 2 or partner_id is null then
    raise exception using errcode = 'P0001', message = 'partner_required';
  end if;

  insert into public.requests (
    id, couple_id, request_kind, status, requester_user_id,
    current_actor_user_id, category, current_proposal_version
  ) values (
    new_request_id, active_couple_id, 'new', 'pending_response', actor_id,
    partner_id, p_category, 1
  );

  insert into public.proposal_versions (
    id, request_id, couple_id, version_no, author_user_id, title, details,
    amount, amount_type, scheduled_at, due_at
  ) values (
    new_proposal_id, new_request_id, active_couple_id, 1, actor_id, normalized_title,
    normalized_details, p_amount, p_amount_type, p_scheduled_at, p_due_at
  );

  insert into public.audit_logs (
    couple_id, actor_user_id, action, entity_type, entity_id,
    request_id, metadata
  ) values (
    active_couple_id, actor_id, 'request_created', 'request', new_request_id,
    new_request_id, jsonb_build_object('request_kind', 'new', 'category', p_category)
  );
  insert into public.audit_logs (
    couple_id, actor_user_id, action, entity_type, entity_id,
    request_id, proposal_version_id, metadata
  ) values (
    active_couple_id, actor_id, 'proposal_created', 'proposal_version', new_proposal_id,
    new_request_id, new_proposal_id, jsonb_build_object('version_no', 1)
  );

  return new_request_id;
end;
$$;

revoke all on function public.validate_request_membership() from public, anon, authenticated;
revoke all on function public.validate_proposal_version() from public, anon, authenticated;
revoke all on function public.prevent_proposal_mutation() from public, anon, authenticated;
revoke all on function public.create_request(text, text, numeric, text, text, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.create_request(text, text, numeric, text, text, timestamptz, timestamptz)
  to authenticated;
