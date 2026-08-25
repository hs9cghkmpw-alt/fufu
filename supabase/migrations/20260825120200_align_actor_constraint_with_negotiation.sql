alter table public.requests drop constraint requests_distinct_actors;

create or replace function public.validate_request_actor_against_latest_proposal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  latest_author_id uuid;
begin
  if new.current_actor_user_id is null then
    return new;
  end if;
  select pv.author_user_id into latest_author_id
  from public.proposal_versions pv
  where pv.request_id = new.id
    and pv.couple_id = new.couple_id
    and pv.version_no = new.current_proposal_version;
  if not found then
    raise exception using errcode = 'P0001', message = 'latest_proposal_not_found';
  end if;
  if latest_author_id = new.current_actor_user_id then
    raise exception using errcode = 'P0001', message = 'latest_proposal_author_cannot_be_actor';
  end if;
  return new;
end;
$$;

create constraint trigger validate_request_actor_after_write
after insert or update of current_actor_user_id, current_proposal_version on public.requests
deferrable initially deferred
for each row execute function public.validate_request_actor_against_latest_proposal();

revoke all on function public.validate_request_actor_against_latest_proposal()
  from public, anon, authenticated;
