-- Final adversarial gate: serialize curated Mock creation and make response
-- persistence/final grading atomic without changing the grading rules.

create or replace function public.enforce_one_active_curated_mock()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.mock_origin = 'curated' and new.status = 'in_progress' then
    perform pg_advisory_xact_lock(
      hashtextextended(new.user_id::text || ':' || new.test_id::text, 41)
    );

    if exists (
      select 1
      from public.test_attempts as existing
      where existing.user_id = new.user_id
        and existing.test_id = new.test_id
        and existing.mock_origin = 'curated'
        and existing.status = 'in_progress'
    ) then
      raise exception 'active_curated_mock_exists';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_one_active_curated_mock on public.test_attempts;
create trigger enforce_one_active_curated_mock
  before insert on public.test_attempts
  for each row execute procedure public.enforce_one_active_curated_mock();

create or replace function public.save_test_response_secure(
  p_user_id uuid,
  p_attempt_id uuid,
  p_question_key uuid,
  p_selected_option_id uuid,
  p_response_payload jsonb,
  p_response_status public.response_status,
  p_is_marked_for_review boolean,
  p_time_spent_seconds integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  attempt_row public.test_attempts%rowtype;
  changed integer;
begin
  select * into attempt_row
  from public.test_attempts
  where id = p_attempt_id and user_id = p_user_id
  for update;

  if not found or attempt_row.status <> 'in_progress' then
    raise exception 'test_attempt_unavailable';
  end if;
  if attempt_row.section_expires_at is null
     or attempt_row.section_expires_at <= now() then
    raise exception 'test_section_expired';
  end if;
  if p_response_status not in ('answered', 'unanswered')
     or p_time_spent_seconds < 0
     or p_time_spent_seconds > 86400 then
    raise exception 'test_response_invalid';
  end if;
  if not exists (
    select 1
    from public.practice_attempt_items as item
    where item.attempt_id = p_attempt_id
      and item.question_key = p_question_key
      and item.section_key = attempt_row.current_section_key
  ) then
    raise exception 'test_question_not_active';
  end if;

  update public.user_responses
  set selected_option_id = p_selected_option_id,
      response_payload = p_response_payload,
      response_status = p_response_status,
      is_marked_for_review = p_is_marked_for_review,
      time_spent_seconds = p_time_spent_seconds,
      answered_at = case
        when p_response_status = 'answered' then now()
        else null
      end,
      is_correct = null
  where attempt_id = p_attempt_id and question_key = p_question_key;

  get diagnostics changed = row_count;
  if changed <> 1 then
    raise exception 'test_response_unavailable';
  end if;

  update public.test_attempts
  set current_question_key = p_question_key,
      last_activity_at = now()
  where id = p_attempt_id;
end;
$$;

create or replace function public.finalize_test_attempt_secure(
  p_user_id uuid,
  p_attempt_id uuid,
  p_auto_submitted boolean,
  p_grades jsonb
)
returns table (
  correct integer,
  total integer,
  accuracy numeric,
  total_time_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  attempt_row public.test_attempts%rowtype;
  response_count integer;
  grade_count integer;
  distinct_grade_count integer;
  correct_count integer;
  duration_limit integer;
  elapsed_seconds integer;
begin
  if p_grades is null or jsonb_typeof(p_grades) <> 'array' then
    raise exception 'test_grades_invalid';
  end if;

  select * into attempt_row
  from public.test_attempts
  where id = p_attempt_id and user_id = p_user_id
  for update;

  if not found then
    raise exception 'test_attempt_unavailable';
  end if;

  select count(*)::integer into response_count
  from public.user_responses
  where attempt_id = p_attempt_id;

  if attempt_row.status in ('submitted', 'auto_submitted') then
    return query select
      coalesce(attempt_row.score, 0)::integer,
      response_count,
      coalesce(attempt_row.accuracy, 0),
      greatest(0, attempt_row.total_time_seconds);
    return;
  end if;

  if attempt_row.status <> 'in_progress' then
    raise exception 'test_attempt_unavailable';
  end if;

  select count(*)::integer, count(distinct grade.response_id)::integer
    into grade_count, distinct_grade_count
  from jsonb_to_recordset(p_grades) as grade(
    response_id uuid,
    response_payload jsonb,
    is_correct boolean
  );

  if response_count = 0
     or grade_count <> response_count
     or distinct_grade_count <> response_count
     or exists (
       select 1
       from jsonb_to_recordset(p_grades) as grade(
         response_id uuid,
         response_payload jsonb,
         is_correct boolean
       )
       where grade.response_id is null or grade.is_correct is null
     )
     or exists (
       select 1
       from jsonb_to_recordset(p_grades) as grade(
         response_id uuid,
         response_payload jsonb,
         is_correct boolean
       )
       left join public.user_responses as response
         on response.id = grade.response_id
        and response.attempt_id = p_attempt_id
       where response.id is null
          or response.response_payload is distinct from grade.response_payload
     ) then
    raise exception 'test_submission_response_changed';
  end if;

  update public.user_responses as response
  set is_correct = grade.is_correct
  from jsonb_to_recordset(p_grades) as grade(
    response_id uuid,
    response_payload jsonb,
    is_correct boolean
  )
  where response.id = grade.response_id
    and response.attempt_id = p_attempt_id;

  select count(*) filter (where is_correct)::integer
    into correct_count
  from public.user_responses
  where attempt_id = p_attempt_id;

  select coalesce(sum(
    case
      when (section ->> 'durationSeconds') ~ '^[0-9]{1,6}$'
        then (section ->> 'durationSeconds')::integer
      else 0
    end
  ), 0)::integer
    into duration_limit
  from jsonb_array_elements(
    case
      when jsonb_typeof(attempt_row.test_snapshot -> 'sections') = 'array'
        then attempt_row.test_snapshot -> 'sections'
      else '[]'::jsonb
    end
  ) as section;

  elapsed_seconds := greatest(
    0,
    least(
      greatest(0, duration_limit),
      round(extract(epoch from (now() - attempt_row.started_at)))::integer
    )
  );

  update public.test_attempts
  set status = case
        when p_auto_submitted then 'auto_submitted'::public.test_attempt_status
        else 'submitted'::public.test_attempt_status
      end,
      submitted_at = now(),
      score = correct_count,
      accuracy = case
        when response_count = 0 then 0
        else (correct_count::numeric / response_count::numeric) * 100
      end,
      total_time_seconds = elapsed_seconds,
      last_activity_at = now()
  where id = p_attempt_id;

  return query select
    correct_count,
    response_count,
    case
      when response_count = 0 then 0::numeric
      else (correct_count::numeric / response_count::numeric) * 100
    end,
    elapsed_seconds;
end;
$$;

revoke all on function public.enforce_one_active_curated_mock()
  from public, anon, authenticated;
revoke all on function public.save_test_response_secure(
  uuid, uuid, uuid, uuid, jsonb, public.response_status, boolean, integer
) from public, anon, authenticated;
revoke all on function public.finalize_test_attempt_secure(
  uuid, uuid, boolean, jsonb
) from public, anon, authenticated;

grant execute on function public.save_test_response_secure(
  uuid, uuid, uuid, uuid, jsonb, public.response_status, boolean, integer
) to service_role;
grant execute on function public.finalize_test_attempt_secure(
  uuid, uuid, boolean, jsonb
) to service_role;
