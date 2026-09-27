begin;

-- Classification belongs in the same transaction as immutable session creation.
-- This removes the second application round trip and parent-row update while
-- preserving the existing create_practice_session RPC signature.
create or replace function private.classify_practice_session()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.session_type = 'diagnostic' then
    return new;
  end if;

  new.session_type := case
    when new.source_mode = 'exact_review' then 'exact_review'
    when jsonb_array_length(coalesce(new.focus_families, '[]'::jsonb)) > 0
      then 'targeted_practice'
    else 'standard_practice'
  end;
  return new;
end;
$function$;

drop trigger if exists classify_practice_session on public.practice_sessions;
create trigger classify_practice_session
  before insert on public.practice_sessions
  for each row execute procedure private.classify_practice_session();

revoke all on function private.classify_practice_session()
  from public, anon, authenticated;

-- Dashboard (limit 6) and Results (limit 30) share this growing-history shape.
-- The partial predicate removes in-progress rows and the key order avoids a
-- per-user submitted_at sort.
create index if not exists idx_test_attempts_completed_history
  on public.test_attempts(user_id, submitted_at desc)
  where status in ('submitted', 'auto_submitted');

commit;
