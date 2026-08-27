-- Phase 11: minimal onboarding state and a mixed-module initial diagnostic
-- persisted in the existing immutable practice-session infrastructure.
alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists onboarding_preference text,
  add column if not exists diagnostic_status text not null default 'not_started',
  add column if not exists diagnostic_session_id uuid references public.practice_sessions(id) on delete set null;

alter table public.profiles drop constraint if exists profiles_onboarding_preference_check;
alter table public.profiles add constraint profiles_onboarding_preference_check check (
  onboarding_preference is null or onboarding_preference in ('diagnostic', 'practice_first', 'explore')
);
alter table public.profiles drop constraint if exists profiles_diagnostic_status_check;
alter table public.profiles add constraint profiles_diagnostic_status_check check (
  diagnostic_status in ('not_started', 'in_progress', 'completed', 'skipped')
);

-- Existing students have already used the product and must not be forced through
-- a new first-use flow. Profiles created after this migration retain NULL.
update public.profiles
set onboarding_completed_at = coalesce(onboarding_completed_at, created_at),
    onboarding_preference = coalesce(onboarding_preference, 'explore'),
    diagnostic_status = case
      when diagnostic_status = 'not_started' then 'skipped'
      else diagnostic_status
    end;

alter table public.practice_sessions
  add column if not exists session_type text not null default 'standard_practice';

update public.practice_sessions
set session_type = case
  when source_mode = 'exact_review' then 'exact_review'
  when jsonb_array_length(focus_families) > 0 then 'targeted_practice'
  else 'standard_practice'
end;

alter table public.practice_sessions drop constraint if exists practice_sessions_session_type_check;
alter table public.practice_sessions add constraint practice_sessions_session_type_check check (
  session_type in ('standard_practice', 'targeted_practice', 'exact_review', 'diagnostic')
);
alter table public.practice_sessions alter column module drop not null;
alter table public.practice_sessions drop constraint if exists practice_sessions_question_count_check;
alter table public.practice_sessions add constraint practice_sessions_question_count_check check (
  question_count in (1, 5, 10, 15, 20)
);
alter table public.practice_sessions drop constraint if exists practice_sessions_check;
alter table public.practice_sessions add constraint practice_sessions_source_count_check check (
  (session_type = 'diagnostic' and source_mode = 'generated' and module is null and question_count = 15 and timing_mode = 'untimed')
  or (session_type = 'exact_review' and source_mode = 'exact_review' and module is not null and question_count = 1)
  or (session_type in ('standard_practice', 'targeted_practice') and source_mode = 'generated' and module is not null and question_count in (5, 10, 20))
);

alter table public.practice_events drop constraint if exists practice_events_event_type_check;
alter table public.practice_events add constraint practice_events_event_type_check check (event_type in (
  'practice_started', 'question_answered', 'practice_completed',
  'practice_abandoned', 'explanation_opened', 'generation_failed',
  'diagnostic_started', 'diagnostic_completed', 'diagnostic_skipped'
));

create or replace function public.create_initial_core_diagnostic(
  p_session_id uuid,
  p_user_id uuid,
  p_master_seed text,
  p_started_at timestamptz,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  item_count integer;
  distinct_questions integer;
  distinct_positions integer;
begin
  if p_master_seed is null or btrim(p_master_seed) = '' then
    raise exception 'diagnostic_seed_required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 11));
  if exists (select 1 from public.profiles where id = p_user_id and diagnostic_status in ('completed', 'skipped')) then
    raise exception 'initial_diagnostic_closed';
  end if;
  if exists (select 1 from public.practice_sessions where user_id = p_user_id and status = 'in_progress') then
    raise exception 'active_practice_session_exists';
  end if;

  select count(*), count(distinct item.question_key), count(distinct item.position)
  into item_count, distinct_questions, distinct_positions
  from jsonb_to_recordset(p_items) as item(question_key uuid, position integer);

  if item_count <> 15 or distinct_questions <> 15 or distinct_positions <> 15
     or (select min(item.position) from jsonb_to_recordset(p_items) as item(position integer)) <> 1
     or (select max(item.position) from jsonb_to_recordset(p_items) as item(position integer)) <> 15
     or exists (
       select 1 from (values
         ('figure_sequence'), ('mathematical_equation'), ('latin_square')
       ) expected(question_type)
       where (select count(*) from jsonb_to_recordset(p_items) as item(question_type text)
              where item.question_type = expected.question_type) <> 5
     )
     or exists (
       select 1 from (values
         ('figure_sequence'), ('mathematical_equation'), ('latin_square')
       ) expected(question_type)
       where not exists (
         select 1 from jsonb_to_recordset(p_items) as item(question_type text, difficulty text)
         where item.question_type = expected.question_type and item.difficulty = 'easy'
       ) or not exists (
         select 1 from jsonb_to_recordset(p_items) as item(question_type text, difficulty text)
         where item.question_type = expected.question_type and item.difficulty = 'medium'
       ) or not exists (
         select 1 from jsonb_to_recordset(p_items) as item(question_type text, difficulty text)
         where item.question_type = expected.question_type and item.difficulty = 'hard'
       )
     ) then
    raise exception 'invalid_diagnostic_manifest';
  end if;

  insert into public.practice_sessions(
    id, user_id, module, difficulty_mode, question_count, timing_mode,
    source_mode, session_type, master_seed, focus_families, started_at
  ) values (
    p_session_id, p_user_id, null, 'mixed', 15, 'untimed',
    'generated', 'diagnostic', p_master_seed, '[]'::jsonb, p_started_at
  );

  insert into public.practice_session_items(
    session_id, source_question_id, question_key, position, question_type,
    difficulty, public_snapshot, private_snapshot, generator_version,
    validator_version, seed, fingerprint, structural_profile,
    reasoning_family, reasoning_classification, shown_at
  )
  select p_session_id, item.source_question_id, item.question_key, item.position,
    item.question_type::public.question_type, item.difficulty::public.question_difficulty,
    item.public_snapshot, item.private_snapshot, item.generator_version,
    item.validator_version, item.seed, item.fingerprint, item.structural_profile,
    item.reasoning_family, item.reasoning_classification,
    case when item.position = 1 then p_started_at else null end
  from jsonb_to_recordset(p_items) as item(
    source_question_id uuid, question_key uuid, position integer,
    question_type text, difficulty text, public_snapshot jsonb,
    private_snapshot jsonb, generator_version text, validator_version text,
    seed text, fingerprint text, structural_profile jsonb,
    reasoning_family text, reasoning_classification text
  );

  update public.profiles set
    onboarding_preference = 'diagnostic', diagnostic_status = 'in_progress',
    diagnostic_session_id = p_session_id
  where id = p_user_id;

  insert into public.practice_events(user_id, session_id, event_type, metadata)
  values (p_user_id, p_session_id, 'diagnostic_started', jsonb_build_object(
    'questionCount', 15, 'timingMode', 'untimed', 'profileVersion', 'initial-core-profile@1'
  ));
  return p_session_id;
end;
$$;

create or replace function public.complete_initial_core_diagnostic(
  p_user_id uuid,
  p_session_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare session_row public.practice_sessions%rowtype;
begin
  select * into session_row from public.practice_sessions
  where id = p_session_id and user_id = p_user_id and session_type = 'diagnostic'
  for update;
  if not found then raise exception 'diagnostic_unavailable'; end if;
  if session_row.status = 'completed' then return; end if;
  if session_row.status <> 'in_progress' then raise exception 'diagnostic_unavailable'; end if;
  if (select count(*) from public.practice_session_items where session_id = p_session_id and response_status = 'answered') <> 15 then
    raise exception 'diagnostic_incomplete';
  end if;

  update public.practice_sessions set status = 'completed', completed_at = timezone('utc', now())
  where id = p_session_id;
  update public.profiles set diagnostic_status = 'completed',
    onboarding_completed_at = coalesce(onboarding_completed_at, timezone('utc', now())),
    onboarding_preference = 'diagnostic', diagnostic_session_id = p_session_id
  where id = p_user_id;
  insert into public.practice_events(user_id, session_id, event_type, metadata)
  values (p_user_id, p_session_id, 'diagnostic_completed', jsonb_build_object(
    'correct', session_row.correct_count, 'questionCount', 15,
    'totalTimeSeconds', session_row.total_time_seconds
  ));
end;
$$;

revoke all on function public.create_initial_core_diagnostic(uuid, uuid, text, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function public.complete_initial_core_diagnostic(uuid, uuid) from public, anon, authenticated;
grant execute on function public.create_initial_core_diagnostic(uuid, uuid, text, timestamptz, jsonb) to service_role;
grant execute on function public.complete_initial_core_diagnostic(uuid, uuid) to service_role;
