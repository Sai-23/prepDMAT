begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'general_academic_practice_status') then
    create type public.general_academic_practice_status as enum ('in_progress', 'submitted', 'abandoned');
  end if;
end $$;

create table public.general_academic_practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_pack_id uuid not null references public.general_academic_source_packs(id) on delete restrict,
  status public.general_academic_practice_status not null default 'in_progress',
  selection_mode text not null check (selection_mode in ('domain', 'skill', 'mixed')),
  timing_mode text not null check (timing_mode in ('untimed', 'timed')),
  selected_domain public.general_academic_domain,
  selected_skill public.general_academic_skill,
  selected_difficulty text not null check (selected_difficulty in ('easy', 'medium', 'hard', 'mixed')),
  question_count integer not null check (question_count > 0 and question_count <= 100),
  current_question_index integer not null default 0 check (current_question_index >= 0),
  public_snapshot jsonb not null check (pg_column_size(public_snapshot) <= 2097152),
  private_snapshot jsonb not null check (pg_column_size(private_snapshot) <= 2097152),
  correct_count integer check (correct_count is null or correct_count >= 0),
  incorrect_count integer check (incorrect_count is null or incorrect_count >= 0),
  unanswered_count integer check (unanswered_count is null or unanswered_count >= 0),
  elapsed_seconds integer not null default 0 check (elapsed_seconds >= 0 and elapsed_seconds <= 86400),
  started_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  last_activity_at timestamptz not null default timezone('utc', now()),
  submitted_at timestamptz,
  abandoned_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (selection_mode = 'domain' and selected_domain is not null and selected_skill is null)
    or (selection_mode = 'skill' and selected_skill is not null and selected_domain is null)
    or (selection_mode = 'mixed' and selected_domain is null and selected_skill is null)
  ),
  check ((timing_mode = 'timed' and expires_at is not null) or (timing_mode = 'untimed' and expires_at is null)),
  check (current_question_index < question_count),
  check ((status = 'submitted' and submitted_at is not null) or status <> 'submitted')
);

create unique index idx_general_academic_practice_one_active_user
  on public.general_academic_practice_attempts(user_id) where status = 'in_progress';
create index idx_general_academic_practice_user_history
  on public.general_academic_practice_attempts(user_id, created_at desc);
create index idx_general_academic_practice_pack_history
  on public.general_academic_practice_attempts(source_pack_id, submitted_at desc);

create table public.general_academic_practice_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.general_academic_practice_attempts(id) on delete cascade,
  question_id text not null check (char_length(question_id) between 1 and 64),
  selected_option text check (selected_option is null or selected_option in ('A', 'B', 'C', 'D')),
  is_flagged boolean not null default false,
  response_seconds integer not null default 0 check (response_seconds >= 0 and response_seconds <= 86400),
  answered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (attempt_id, question_id)
);

create index idx_general_academic_practice_answers_attempt
  on public.general_academic_practice_answers(attempt_id);

alter table public.general_academic_practice_attempts enable row level security;
alter table public.general_academic_practice_answers enable row level security;
revoke all on public.general_academic_practice_attempts from public, anon, authenticated;
revoke all on public.general_academic_practice_answers from public, anon, authenticated;

create trigger set_general_academic_practice_attempts_updated_at
  before update on public.general_academic_practice_attempts
  for each row execute procedure public.set_updated_at();
create trigger set_general_academic_practice_answers_updated_at
  before update on public.general_academic_practice_answers
  for each row execute procedure public.set_updated_at();

create or replace function public.create_general_academic_practice_attempt(
  p_attempt_id uuid,
  p_user_id uuid,
  p_pack_id uuid,
  p_selection_mode text,
  p_timing_mode text,
  p_selected_domain public.general_academic_domain,
  p_selected_skill public.general_academic_skill,
  p_selected_difficulty text,
  p_public_snapshot jsonb,
  p_private_snapshot jsonb,
  p_question_count integer,
  p_started_at timestamptz,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 5));
  select id into v_existing from public.general_academic_practice_attempts
    where user_id = p_user_id and status = 'in_progress'
    order by started_at desc limit 1;
  if v_existing is not null then return v_existing; end if;

  if not exists (
    select 1 from public.general_academic_source_packs
    where id = p_pack_id and review_status = 'published' and deleted_at is null
  ) then raise exception 'general_academic_pack_unavailable' using errcode = 'P0002'; end if;
  if jsonb_array_length(p_public_snapshot -> 'questions') <> p_question_count
     or jsonb_array_length(p_private_snapshot -> 'questions') <> p_question_count then
    raise exception 'general_academic_invalid_snapshot' using errcode = '22023';
  end if;

  insert into public.general_academic_practice_attempts (
    id, user_id, source_pack_id, selection_mode, timing_mode, selected_domain,
    selected_skill, selected_difficulty, question_count, public_snapshot,
    private_snapshot, started_at, expires_at, last_activity_at
  ) values (
    p_attempt_id, p_user_id, p_pack_id, p_selection_mode, p_timing_mode,
    p_selected_domain, p_selected_skill, p_selected_difficulty, p_question_count,
    p_public_snapshot, p_private_snapshot, p_started_at, p_expires_at, p_started_at
  );
  return p_attempt_id;
end;
$$;

create or replace function public.save_general_academic_practice_state(
  p_user_id uuid,
  p_attempt_id uuid,
  p_question_id text,
  p_selected_option text,
  p_is_flagged boolean,
  p_current_question_index integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.general_academic_practice_attempts%rowtype;
  v_question jsonb;
  v_now timestamptz := timezone('utc', now());
  v_elapsed integer;
begin
  select * into v_attempt from public.general_academic_practice_attempts
    where id = p_attempt_id and user_id = p_user_id and status = 'in_progress' for update;
  if not found then raise exception 'general_academic_attempt_unavailable' using errcode = 'P0002'; end if;
  if v_attempt.expires_at is not null and v_attempt.expires_at <= v_now then
    raise exception 'general_academic_attempt_expired' using errcode = '22023';
  end if;
  if p_current_question_index < 0 or p_current_question_index >= v_attempt.question_count then
    raise exception 'general_academic_invalid_position' using errcode = '22023';
  end if;
  select question into v_question
    from jsonb_array_elements(v_attempt.public_snapshot -> 'questions') question
    where question ->> 'id' = p_question_id;
  if v_question is null then raise exception 'general_academic_question_unavailable' using errcode = 'P0002'; end if;
  if p_selected_option is not null and not exists (
    select 1 from jsonb_array_elements(v_question -> 'options') option
    where option ->> 'id' = p_selected_option
  ) then raise exception 'general_academic_invalid_option' using errcode = '22023'; end if;

  v_elapsed := least(86400, greatest(0, floor(extract(epoch from (v_now - v_attempt.started_at)))::integer));
  insert into public.general_academic_practice_answers (
    attempt_id, question_id, selected_option, is_flagged, response_seconds, answered_at
  ) values (
    p_attempt_id, p_question_id, p_selected_option, p_is_flagged, v_elapsed,
    case when p_selected_option is null then null else v_now end
  ) on conflict (attempt_id, question_id) do update set
    selected_option = excluded.selected_option,
    is_flagged = excluded.is_flagged,
    response_seconds = excluded.response_seconds,
    answered_at = excluded.answered_at;
  update public.general_academic_practice_attempts set
    current_question_index = p_current_question_index,
    elapsed_seconds = v_elapsed,
    last_activity_at = v_now
  where id = p_attempt_id;
end;
$$;

create or replace function public.submit_general_academic_practice_attempt(
  p_user_id uuid,
  p_attempt_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.general_academic_practice_attempts%rowtype;
  v_now timestamptz := timezone('utc', now());
  v_correct integer;
  v_incorrect integer;
  v_unanswered integer;
  v_elapsed integer;
begin
  select * into v_attempt from public.general_academic_practice_attempts
    where id = p_attempt_id and user_id = p_user_id for update;
  if not found then raise exception 'general_academic_attempt_unavailable' using errcode = 'P0002'; end if;
  if v_attempt.status = 'submitted' then return; end if;
  if v_attempt.status <> 'in_progress' then raise exception 'general_academic_attempt_unavailable' using errcode = 'P0002'; end if;

  with expected as (
    select question ->> 'id' as question_id, question ->> 'correctOption' as correct_option
    from jsonb_array_elements(v_attempt.private_snapshot -> 'questions') question
  ), scored as (
    select expected.question_id, answer.selected_option,
      answer.selected_option is not null and answer.selected_option = expected.correct_option as is_correct
    from expected left join public.general_academic_practice_answers answer
      on answer.attempt_id = p_attempt_id and answer.question_id = expected.question_id
  ) select
    count(*) filter (where is_correct),
    count(*) filter (where selected_option is not null and not is_correct),
    count(*) filter (where selected_option is null)
  into v_correct, v_incorrect, v_unanswered from scored;

  v_elapsed := least(86400, greatest(0, floor(extract(epoch from (v_now - v_attempt.started_at)))::integer));
  update public.general_academic_practice_attempts set
    status = 'submitted', correct_count = v_correct, incorrect_count = v_incorrect,
    unanswered_count = v_unanswered, elapsed_seconds = v_elapsed,
    submitted_at = v_now, last_activity_at = v_now
  where id = p_attempt_id;
end;
$$;

create or replace function public.abandon_general_academic_practice_attempt(
  p_user_id uuid,
  p_attempt_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.general_academic_practice_attempts set
    status = 'abandoned', abandoned_at = timezone('utc', now()),
    last_activity_at = timezone('utc', now())
  where id = p_attempt_id and user_id = p_user_id and status = 'in_progress';
  if not found then raise exception 'general_academic_attempt_unavailable' using errcode = 'P0002'; end if;
end;
$$;

revoke all on function public.create_general_academic_practice_attempt(uuid, uuid, uuid, text, text, public.general_academic_domain, public.general_academic_skill, text, jsonb, jsonb, integer, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.save_general_academic_practice_state(uuid, uuid, text, text, boolean, integer) from public, anon, authenticated;
revoke all on function public.submit_general_academic_practice_attempt(uuid, uuid) from public, anon, authenticated;
revoke all on function public.abandon_general_academic_practice_attempt(uuid, uuid) from public, anon, authenticated;
grant execute on function public.create_general_academic_practice_attempt(uuid, uuid, uuid, text, text, public.general_academic_domain, public.general_academic_skill, text, jsonb, jsonb, integer, timestamptz, timestamptz) to service_role;
grant execute on function public.save_general_academic_practice_state(uuid, uuid, text, text, boolean, integer) to service_role;
grant execute on function public.submit_general_academic_practice_attempt(uuid, uuid) to service_role;
grant execute on function public.abandon_general_academic_practice_attempt(uuid, uuid) to service_role;

comment on table public.general_academic_practice_attempts is
  'Student-owned immutable GAM source-pack snapshots. Private snapshots are service-only and never sent before submission.';

commit;
