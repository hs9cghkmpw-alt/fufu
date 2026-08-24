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

revoke all on function public.create_couple_invitation(uuid, interval) from public, anon;
grant execute on function public.create_couple_invitation(uuid, interval) to authenticated;
