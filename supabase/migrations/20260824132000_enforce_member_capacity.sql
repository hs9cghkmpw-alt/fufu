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
