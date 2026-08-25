do $$
declare
  function_name text;
  function_definition text;
begin
  foreach function_name in array array['counter_proposal', 'record_discussion_result'] loop
    select pg_get_functiondef(p.oid) into function_definition
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = function_name
      and pg_get_function_identity_arguments(p.oid) =
        'target_request_id uuid, expected_version integer, p_title text, p_category text, p_amount numeric, p_amount_type text, p_details text, p_scheduled_at timestamp with time zone, p_due_at timestamp with time zone, p_reason text';
    if function_definition like '%max(cm.user_id) filter%' then
      execute replace(
        function_definition,
        'max(cm.user_id) filter (where cm.user_id <> actor_id)',
        '(max(cm.user_id::text) filter (where cm.user_id <> actor_id))::uuid'
      );
    end if;
  end loop;
end;
$$;
