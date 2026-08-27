-- Consume every required rate-limit bucket in one service-role-only database
-- transaction. The ordered loop preserves the existing global -> identity ->
-- IP semantics and commits earlier allowed buckets when a later bucket rejects.

create or replace function public.consume_security_rate_limits(p_checks jsonb)
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
  check_row record;
  result_row record;
  check_count integer;
begin
  if p_checks is null or jsonb_typeof(p_checks) <> 'array' then
    raise exception 'rate_limit_checks_invalid';
  end if;

  check_count := jsonb_array_length(p_checks);
  if check_count < 1 or check_count > 4 then
    raise exception 'rate_limit_check_count_invalid';
  end if;

  for check_row in
    select item.scope, item.subject_hash, item.max_attempts, item.window_seconds
    from jsonb_to_recordset(p_checks) as item(
      scope text,
      subject_hash text,
      max_attempts integer,
      window_seconds integer
    )
  loop
    select * into result_row
    from public.consume_security_rate_limit(
      check_row.scope,
      check_row.subject_hash,
      check_row.max_attempts,
      check_row.window_seconds
    );

    if result_row.allowed is not true then
      return query
        select false, 0, greatest(1, result_row.retry_after_seconds);
      return;
    end if;
  end loop;

  return query
    select true, greatest(0, result_row.remaining), 0;
end;
$$;

revoke all on function public.consume_security_rate_limits(jsonb)
  from public, anon, authenticated;
grant execute on function public.consume_security_rate_limits(jsonb)
  to service_role;
