-- Fix the shared limiter's timestamp comparison without weakening fail-closed
-- behavior. `current_time` is a PostgreSQL SQL keyword (time with time zone),
-- so using it as a PL/pgSQL variable made valid limiter calls compare a
-- timestamptz with a timetz and fail with SQLSTATE 42883.

create or replace function public.consume_security_rate_limit(
  p_scope text,
  p_subject_hash text,
  p_max_attempts integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.security_rate_limits%rowtype;
  v_now timestamptz := now();
  elapsed_seconds integer;
begin
  if p_scope is null or p_scope !~ '^[a-z0-9:_-]{1,80}$' then
    raise exception 'rate_limit_scope_invalid';
  end if;
  if p_subject_hash is null or p_subject_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'rate_limit_subject_invalid';
  end if;
  if p_max_attempts < 1 or p_max_attempts > 10000 then
    raise exception 'rate_limit_max_invalid';
  end if;
  if p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'rate_limit_window_invalid';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_scope || ':' || p_subject_hash, 31)
  );

  select * into current_row
  from public.security_rate_limits
  where scope = p_scope and subject_hash = p_subject_hash
  for update;

  if not found
    or current_row.window_started_at + make_interval(secs => p_window_seconds) <= v_now
  then
    insert into public.security_rate_limits (
      scope, subject_hash, window_started_at, attempt_count, updated_at
    ) values (
      p_scope, p_subject_hash, v_now, 1, v_now
    )
    on conflict (scope, subject_hash) do update
      set window_started_at = excluded.window_started_at,
          attempt_count = 1,
          updated_at = excluded.updated_at;

    return query select true, greatest(0, p_max_attempts - 1), 0;
    return;
  end if;

  elapsed_seconds := greatest(
    0,
    floor(extract(epoch from (v_now - current_row.window_started_at)))::integer
  );

  if current_row.attempt_count >= p_max_attempts then
    return query select false, 0, greatest(1, p_window_seconds - elapsed_seconds);
    return;
  end if;

  update public.security_rate_limits
  set attempt_count = attempt_count + 1,
      updated_at = v_now
  where scope = p_scope and subject_hash = p_subject_hash;

  return query
    select true, greatest(0, p_max_attempts - current_row.attempt_count - 1), 0;
end;
$$;

revoke all on function public.consume_security_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_security_rate_limit(text, text, integer, integer)
  to service_role;

