create extension if not exists pgcrypto with schema extensions;

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.couple_members (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id),
  user_id uuid not null references auth.users(id),
  role_label text,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  constraint couple_members_role_label_length check (
    role_label is null or char_length(role_label) between 1 and 40
  ),
  constraint couple_members_join_leave_order check (left_at is null or left_at >= joined_at),
  constraint couple_members_unique_history unique (couple_id, user_id)
);

create unique index couple_members_one_active_per_user
  on public.couple_members(user_id)
  where left_at is null;
create index couple_members_active_couple
  on public.couple_members(couple_id)
  where left_at is null;

create or replace function public.enforce_couple_member_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.left_at is null then
    perform pg_advisory_xact_lock(hashtextextended(new.couple_id::text, 1));
    if (select count(*) from public.couple_members where couple_id = new.couple_id and left_at is null) >= 2 then
      raise exception using errcode = 'P0001', message = 'couple_full';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_couple_member_capacity_before_insert
before insert on public.couple_members
for each row execute function public.enforce_couple_member_capacity();

revoke all on function public.enforce_couple_member_capacity() from public, anon, authenticated;

create table public.couple_invitations (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id),
  code_hash bytea not null unique,
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  used_at timestamptz,
  used_by uuid references auth.users(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint couple_invitations_expiry_after_creation check (expires_at > created_at),
  constraint couple_invitations_use_pair check (
    (used_at is null and used_by is null) or (used_at is not null and used_by is not null)
  ),
  constraint couple_invitations_not_used_and_revoked check (
    not (used_at is not null and revoked_at is not null)
  )
);

create index couple_invitations_active_couple
  on public.couple_invitations(couple_id, expires_at)
  where used_at is null and revoked_at is null;

create table public.pairing_audit_logs (
  id bigint generated always as identity primary key,
  couple_id uuid not null references public.couples(id),
  actor_user_id uuid not null references auth.users(id),
  action text not null check (
    action in ('couple_created', 'invitation_created', 'invitation_revoked', 'member_joined')
  ),
  invitation_id uuid references public.couple_invitations(id),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index pairing_audit_logs_couple_time
  on public.pairing_audit_logs(couple_id, occurred_at desc);

alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.couple_invitations enable row level security;
alter table public.pairing_audit_logs enable row level security;

create or replace function public.is_active_couple_member(target_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.couple_members
    where couple_id = target_couple_id
      and user_id = (select auth.uid())
      and left_at is null
  );
$$;

revoke all on function public.is_active_couple_member(uuid) from public, anon;
grant execute on function public.is_active_couple_member(uuid) to authenticated;

create policy "couples_select_members" on public.couples
for select to authenticated
using (public.is_active_couple_member(id));

create policy "couple_members_select_members" on public.couple_members
for select to authenticated
using (public.is_active_couple_member(couple_id));

create policy "invitations_select_members" on public.couple_invitations
for select to authenticated
using (public.is_active_couple_member(couple_id));

create policy "pairing_audit_select_members" on public.pairing_audit_logs
for select to authenticated
using (public.is_active_couple_member(couple_id));

create or replace function public.create_couple()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  new_couple_id uuid;
begin
  if actor_id is null then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(actor_id::text, 0));
  if exists (
    select 1 from public.couple_members where user_id = actor_id and left_at is null
  ) then
    raise exception using errcode = 'P0001', message = 'already_paired';
  end if;

  insert into public.couples (created_by) values (actor_id) returning id into new_couple_id;
  insert into public.couple_members (couple_id, user_id) values (new_couple_id, actor_id);
  insert into public.pairing_audit_logs (couple_id, actor_user_id, action)
  values (new_couple_id, actor_id, 'couple_created');
  return new_couple_id;
end;
$$;

create or replace function public.create_couple_invitation(
  target_couple_id uuid,
  valid_for interval default interval '24 hours'
)
returns table (invitation_id uuid, invite_code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  generated_code text;
  new_invitation_id uuid;
  invitation_expiry timestamptz;
  revoked_count integer;
begin
  if actor_id is null then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;
  if valid_for < interval '1 minute' or valid_for > interval '7 days' then
    raise exception using errcode = 'P0001', message = 'invalid_invitation_expiry';
  end if;

  perform 1 from public.couples where id = target_couple_id and archived_at is null for update;
  if not found or not public.is_active_couple_member(target_couple_id) then
    raise exception using errcode = 'P0001', message = 'couple_not_found';
  end if;
  if (select count(*) from public.couple_members where couple_id = target_couple_id and left_at is null) >= 2 then
    raise exception using errcode = 'P0001', message = 'couple_full';
  end if;

  update public.couple_invitations as ci
  set revoked_at = now()
  where ci.couple_id = target_couple_id
    and ci.used_at is null and ci.revoked_at is null and ci.expires_at > now();
  get diagnostics revoked_count = row_count;
  if revoked_count > 0 then
    insert into public.pairing_audit_logs (couple_id, actor_user_id, action, metadata)
    values (target_couple_id, actor_id, 'invitation_revoked', jsonb_build_object('reason', 'replaced', 'count', revoked_count));
  end if;

  generated_code := encode(extensions.gen_random_bytes(18), 'hex');
  invitation_expiry := now() + valid_for;
  insert into public.couple_invitations (couple_id, code_hash, created_by, expires_at)
  values (target_couple_id, extensions.digest(generated_code, 'sha256'), actor_id, invitation_expiry)
  returning id into new_invitation_id;
  insert into public.pairing_audit_logs (couple_id, actor_user_id, action, invitation_id)
  values (target_couple_id, actor_id, 'invitation_created', new_invitation_id);

  return query select new_invitation_id, generated_code, invitation_expiry;
end;
$$;

create or replace function public.revoke_couple_invitation(target_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_couple_id uuid;
begin
  if actor_id is null then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;
  select couple_id into target_couple_id
  from public.couple_invitations
  where id = target_invitation_id and used_at is null and revoked_at is null
  for update;
  if target_couple_id is null or not public.is_active_couple_member(target_couple_id) then
    raise exception using errcode = 'P0001', message = 'invitation_not_found';
  end if;
  update public.couple_invitations set revoked_at = now() where id = target_invitation_id;
  insert into public.pairing_audit_logs (couple_id, actor_user_id, action, invitation_id)
  values (target_couple_id, actor_id, 'invitation_revoked', target_invitation_id);
end;
$$;

create or replace function public.join_couple(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_invitation public.couple_invitations%rowtype;
  active_member_count integer;
begin
  if actor_id is null then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;
  if invite_code is null or invite_code !~ '^[0-9a-fA-F]{36}$' then
    raise exception using errcode = 'P0001', message = 'invalid_invitation';
  end if;

  select * into target_invitation
  from public.couple_invitations
  where code_hash = extensions.digest(lower(trim(invite_code)), 'sha256')
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'invalid_invitation';
  end if;
  if target_invitation.created_by = actor_id then
    raise exception using errcode = 'P0001', message = 'self_invitation';
  end if;
  if target_invitation.used_at is not null then
    raise exception using errcode = 'P0001', message = 'invitation_used';
  end if;
  if target_invitation.revoked_at is not null then
    raise exception using errcode = 'P0001', message = 'invitation_revoked';
  end if;
  if target_invitation.expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'invitation_expired';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(actor_id::text, 0));
  if exists (select 1 from public.couple_members where user_id = actor_id and left_at is null) then
    raise exception using errcode = 'P0001', message = 'already_paired';
  end if;
  perform 1 from public.couples
  where id = target_invitation.couple_id and archived_at is null
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'couple_not_found';
  end if;
  select count(*) into active_member_count
  from public.couple_members
  where couple_id = target_invitation.couple_id and left_at is null;
  if active_member_count >= 2 then
    raise exception using errcode = 'P0001', message = 'couple_full';
  end if;

  insert into public.couple_members (couple_id, user_id)
  values (target_invitation.couple_id, actor_id);
  update public.couple_invitations
  set used_at = now(), used_by = actor_id
  where id = target_invitation.id;
  insert into public.pairing_audit_logs (couple_id, actor_user_id, action, invitation_id)
  values (target_invitation.couple_id, actor_id, 'member_joined', target_invitation.id);
  return target_invitation.couple_id;
end;
$$;

revoke all on function public.create_couple() from public, anon;
revoke all on function public.create_couple_invitation(uuid, interval) from public, anon;
revoke all on function public.revoke_couple_invitation(uuid) from public, anon;
revoke all on function public.join_couple(text) from public, anon;
grant execute on function public.create_couple() to authenticated;
grant execute on function public.create_couple_invitation(uuid, interval) to authenticated;
grant execute on function public.revoke_couple_invitation(uuid) to authenticated;
grant execute on function public.join_couple(text) to authenticated;
