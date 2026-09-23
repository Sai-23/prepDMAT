begin;

create type public.general_academic_mock_status as enum ('in_progress', 'submitted');
create type public.general_academic_mock_submission_reason as enum ('manual', 'expired');

create table public.general_academic_mock_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.general_academic_mock_status not null default 'in_progress',
  submission_reason public.general_academic_mock_submission_reason,
  composition_version text not null check (char_length(composition_version) between 1 and 100),
  seed text not null check (char_length(seed) between 1 and 128),
  duration_seconds integer not null default 5400 check (duration_seconds = 5400),
  pack_ids uuid[] not null check (cardinality(pack_ids) >= 3),
  question_count integer not null check (question_count >= 18 and question_count <= 100),
  current_pack_index integer not null default 0 check (current_pack_index >= 0),
  current_question_id text not null check (char_length(current_question_id) between 1 and 64),
  public_snapshot jsonb not null check (pg_column_size(public_snapshot) <= 8388608),
  private_snapshot jsonb not null check (pg_column_size(private_snapshot) <= 8388608),
  correct_count integer check (correct_count is null or correct_count >= 0),
  incorrect_count integer check (incorrect_count is null or incorrect_count >= 0),
  unanswered_count integer check (unanswered_count is null or unanswered_count >= 0),
  elapsed_seconds integer not null default 0 check (elapsed_seconds between 0 and 5400),
  started_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  last_activity_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((status = 'submitted' and submitted_at is not null and submission_reason is not null) or status = 'in_progress'),
  check (expires_at = started_at + interval '90 minutes')
);

create unique index idx_general_academic_mock_one_active_user
  on public.general_academic_mock_attempts(user_id) where status = 'in_progress';
create index idx_general_academic_mock_user_history
  on public.general_academic_mock_attempts(user_id, created_at desc);
create index idx_general_academic_mock_pack_history
  on public.general_academic_mock_attempts using gin(pack_ids);

create table public.general_academic_mock_answers (
  id uuid primary key default gen_random_uuid(),
  mock_attempt_id uuid not null references public.general_academic_mock_attempts(id) on delete cascade,
  source_pack_id uuid not null references public.general_academic_source_packs(id) on delete restrict,
  question_id text not null check (char_length(question_id) between 1 and 64),
  selected_option text check (selected_option is null or selected_option in ('A', 'B', 'C', 'D')),
  is_flagged boolean not null default false,
  response_seconds integer not null default 0 check (response_seconds between 0 and 5400),
  answered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (mock_attempt_id, source_pack_id, question_id)
);

create index idx_general_academic_mock_answers_attempt
  on public.general_academic_mock_answers(mock_attempt_id);

create trigger set_general_academic_mock_attempts_updated_at
  before update on public.general_academic_mock_attempts
  for each row execute procedure public.set_updated_at();
create trigger set_general_academic_mock_answers_updated_at
  before update on public.general_academic_mock_answers
  for each row execute procedure public.set_updated_at();

alter table public.general_academic_mock_attempts enable row level security;
alter table public.general_academic_mock_answers enable row level security;
revoke all on public.general_academic_mock_attempts from public, anon, authenticated;
revoke all on public.general_academic_mock_answers from public, anon, authenticated;

create or replace function public.finalize_general_academic_mock_attempt(
  p_attempt_id uuid,
  p_now timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.general_academic_mock_attempts%rowtype;
  v_correct integer;
  v_incorrect integer;
  v_unanswered integer;
begin
  select * into v_attempt from public.general_academic_mock_attempts
  where id = p_attempt_id for update;
  if not found or v_attempt.status = 'submitted' then return; end if;

  with expected as (
    select private_pack ->> 'id' as source_pack_id,
      question ->> 'id' as question_id,
      question ->> 'correctOption' as correct_option
    from jsonb_array_elements(v_attempt.private_snapshot -> 'packs') private_pack
    cross join lateral jsonb_array_elements(private_pack -> 'snapshot' -> 'questions') question
  ), scored as (
    select expected.question_id, answer.selected_option,
      answer.selected_option is not null and answer.selected_option = expected.correct_option as is_correct
    from expected left join public.general_academic_mock_answers answer
      on answer.mock_attempt_id = v_attempt.id
      and answer.source_pack_id = expected.source_pack_id::uuid
      and answer.question_id = expected.question_id
  ) select
    count(*) filter (where is_correct),
    count(*) filter (where selected_option is not null and not is_correct),
    count(*) filter (where selected_option is null)
  into v_correct, v_incorrect, v_unanswered from scored;

  update public.general_academic_mock_attempts set
    status = 'submitted',
    submission_reason = case when p_now >= expires_at then 'expired' else 'manual' end,
    correct_count = v_correct,
    incorrect_count = v_incorrect,
    unanswered_count = v_unanswered,
    elapsed_seconds = least(duration_seconds, greatest(0, floor(extract(epoch from (p_now - started_at)))::integer)),
    submitted_at = p_now,
    last_activity_at = p_now
  where id = v_attempt.id;
end;
$$;

create or replace function public.create_general_academic_mock_attempt(
  p_attempt_id uuid,
  p_user_id uuid,
  p_composition_version text,
  p_seed text,
  p_pack_ids uuid[],
  p_question_count integer,
  p_current_question_id text,
  p_public_snapshot jsonb,
  p_private_snapshot jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing uuid;
  v_now timestamptz := timezone('utc', clock_timestamp());
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 71));
  select id into v_existing from public.general_academic_mock_attempts
    where user_id = p_user_id and status = 'in_progress' order by started_at desc limit 1 for update;
  if found then
    if (select expires_at <= v_now from public.general_academic_mock_attempts where id = v_existing) then
      perform public.finalize_general_academic_mock_attempt(v_existing, v_now);
    else
      return v_existing;
    end if;
  end if;
  if cardinality(p_pack_ids) < 3 or p_question_count < 18 then
    raise exception 'general_academic_mock_inventory_insufficient' using errcode = 'P0002';
  end if;
  if (select count(*) from public.general_academic_source_packs
      where id = any(p_pack_ids) and review_status = 'published' and deleted_at is null) <> cardinality(p_pack_ids) then
    raise exception 'general_academic_mock_pack_unavailable' using errcode = 'P0002';
  end if;
  insert into public.general_academic_mock_attempts (
    id, user_id, composition_version, seed, pack_ids, question_count,
    current_question_id, public_snapshot, private_snapshot, started_at, expires_at
  ) values (
    p_attempt_id, p_user_id, p_composition_version, p_seed, p_pack_ids, p_question_count,
    p_current_question_id, p_public_snapshot, p_private_snapshot, v_now, v_now + interval '90 minutes'
  );
  return p_attempt_id;
end;
$$;

create or replace function public.save_general_academic_mock_state(
  p_user_id uuid,
  p_attempt_id uuid,
  p_source_pack_id uuid,
  p_question_id text,
  p_selected_option text,
  p_is_flagged boolean,
  p_current_pack_index integer,
  p_current_question_id text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.general_academic_mock_attempts%rowtype;
  v_now timestamptz := timezone('utc', clock_timestamp());
begin
  select * into v_attempt from public.general_academic_mock_attempts
    where id = p_attempt_id and user_id = p_user_id for update;
  if not found then raise exception 'general_academic_mock_unavailable' using errcode = 'P0002'; end if;
  if v_attempt.status = 'submitted' then return 'submitted'; end if;
  if v_attempt.expires_at <= v_now then
    perform public.finalize_general_academic_mock_attempt(v_attempt.id, v_now);
    return 'submitted';
  end if;
  if p_current_pack_index < 0 or p_current_pack_index >= jsonb_array_length(v_attempt.public_snapshot -> 'packs') then
    raise exception 'general_academic_mock_navigation_invalid' using errcode = '22023';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(v_attempt.public_snapshot -> 'packs') pack
    cross join lateral jsonb_array_elements(pack -> 'questions') question
    where pack ->> 'id' = p_source_pack_id::text
      and question ->> 'id' = p_question_id
      and (p_selected_option is null or exists (
        select 1 from jsonb_array_elements(question -> 'options') option
        where option ->> 'id' = p_selected_option
      ))
  ) then raise exception 'general_academic_mock_answer_invalid' using errcode = '22023'; end if;
  if not exists (
    select 1 from jsonb_array_elements(v_attempt.public_snapshot -> 'packs') with ordinality pack(value, position)
    cross join lateral jsonb_array_elements(pack.value -> 'questions') question
    where pack.position - 1 = p_current_pack_index and question ->> 'id' = p_current_question_id
  ) then raise exception 'general_academic_mock_navigation_invalid' using errcode = '22023'; end if;

  insert into public.general_academic_mock_answers (
    mock_attempt_id, source_pack_id, question_id, selected_option, is_flagged, response_seconds, answered_at
  ) values (
    v_attempt.id, p_source_pack_id, p_question_id, p_selected_option, p_is_flagged,
    least(5400, greatest(0, floor(extract(epoch from (v_now - v_attempt.started_at)))::integer)),
    case when p_selected_option is null then null else v_now end
  ) on conflict (mock_attempt_id, source_pack_id, question_id) do update set
    selected_option = excluded.selected_option,
    is_flagged = excluded.is_flagged,
    response_seconds = excluded.response_seconds,
    answered_at = excluded.answered_at;
  update public.general_academic_mock_attempts set
    current_pack_index = p_current_pack_index,
    current_question_id = p_current_question_id,
    elapsed_seconds = least(5400, greatest(0, floor(extract(epoch from (v_now - started_at)))::integer)),
    last_activity_at = v_now
  where id = v_attempt.id;
  return 'saved';
end;
$$;

create or replace function public.submit_general_academic_mock_attempt(p_user_id uuid, p_attempt_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.general_academic_mock_attempts%rowtype;
  v_now timestamptz := timezone('utc', clock_timestamp());
begin
  select * into v_attempt from public.general_academic_mock_attempts
    where id = p_attempt_id and user_id = p_user_id for update;
  if not found then raise exception 'general_academic_mock_unavailable' using errcode = 'P0002'; end if;
  if v_attempt.status = 'submitted' then return; end if;
  perform public.finalize_general_academic_mock_attempt(v_attempt.id, v_now);
end;
$$;

-- Phase 6 learning records now accept either a practice or mock snapshot origin.
alter table public.general_academic_bookmarks alter column source_attempt_id drop not null;
alter table public.general_academic_bookmarks
  add column source_mock_attempt_id uuid references public.general_academic_mock_attempts(id) on delete cascade,
  add constraint general_academic_bookmark_one_origin check (num_nonnulls(source_attempt_id, source_mock_attempt_id) = 1);

alter table public.general_academic_mistakes alter column latest_attempt_id drop not null;
alter table public.general_academic_mistakes alter column latest_missed_attempt_id drop not null;
alter table public.general_academic_mistakes
  add column latest_mock_attempt_id uuid references public.general_academic_mock_attempts(id) on delete cascade,
  add column latest_missed_mock_attempt_id uuid references public.general_academic_mock_attempts(id) on delete cascade,
  add constraint general_academic_mistake_one_latest_origin check (num_nonnulls(latest_attempt_id, latest_mock_attempt_id) = 1),
  add constraint general_academic_mistake_one_missed_origin check (num_nonnulls(latest_missed_attempt_id, latest_missed_mock_attempt_id) = 1);

create index idx_general_academic_bookmarks_mock_attempt on public.general_academic_bookmarks(source_mock_attempt_id);
create index idx_general_academic_mistakes_latest_mock on public.general_academic_mistakes(latest_mock_attempt_id);

create or replace function public.toggle_general_academic_bookmark(
  p_user_id uuid, p_attempt_id uuid, p_question_id text, p_bookmarked boolean
)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_attempt public.general_academic_practice_attempts%rowtype;
begin
  select * into v_attempt from public.general_academic_practice_attempts
  where id = p_attempt_id and user_id = p_user_id and status = 'submitted';
  if not found then raise exception 'general_academic_attempt_unavailable' using errcode = 'P0002'; end if;
  if not exists (select 1 from jsonb_array_elements(v_attempt.public_snapshot -> 'questions') q where q ->> 'id' = p_question_id)
    or not exists (select 1 from jsonb_array_elements(v_attempt.private_snapshot -> 'questions') q where q ->> 'id' = p_question_id)
  then raise exception 'general_academic_question_unavailable' using errcode = 'P0002'; end if;
  if p_bookmarked then
    insert into public.general_academic_bookmarks(user_id, source_pack_id, question_id, source_attempt_id, source_mock_attempt_id)
    values (p_user_id, v_attempt.source_pack_id, p_question_id, p_attempt_id, null)
    on conflict (user_id, source_pack_id, question_id) do update set
      source_attempt_id = excluded.source_attempt_id, source_mock_attempt_id = null;
  else
    delete from public.general_academic_bookmarks where user_id = p_user_id
      and source_pack_id = v_attempt.source_pack_id and question_id = p_question_id;
  end if;
  return p_bookmarked;
end;
$$;

create or replace function public.toggle_general_academic_mock_bookmark(
  p_user_id uuid, p_attempt_id uuid, p_source_pack_id uuid, p_question_id text, p_bookmarked boolean
)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_attempt public.general_academic_mock_attempts%rowtype;
begin
  select * into v_attempt from public.general_academic_mock_attempts
    where id = p_attempt_id and user_id = p_user_id and status = 'submitted';
  if not found then raise exception 'general_academic_mock_unavailable' using errcode = 'P0002'; end if;
  if not exists (
    select 1 from jsonb_array_elements(v_attempt.public_snapshot -> 'packs') pack
    cross join lateral jsonb_array_elements(pack -> 'questions') question
    where pack ->> 'id' = p_source_pack_id::text and question ->> 'id' = p_question_id
  ) or not exists (
    select 1 from jsonb_array_elements(v_attempt.private_snapshot -> 'packs') pack
    cross join lateral jsonb_array_elements(pack -> 'snapshot' -> 'questions') question
    where pack ->> 'id' = p_source_pack_id::text and question ->> 'id' = p_question_id
  ) then raise exception 'general_academic_question_unavailable' using errcode = 'P0002'; end if;
  if p_bookmarked then
    insert into public.general_academic_bookmarks(user_id, source_pack_id, question_id, source_attempt_id, source_mock_attempt_id)
    values (p_user_id, p_source_pack_id, p_question_id, null, p_attempt_id)
    on conflict (user_id, source_pack_id, question_id) do update set
      source_attempt_id = null, source_mock_attempt_id = excluded.source_mock_attempt_id;
  else
    delete from public.general_academic_bookmarks where user_id = p_user_id
      and source_pack_id = p_source_pack_id and question_id = p_question_id;
  end if;
  return p_bookmarked;
end;
$$;

-- Keep the Phase 6 practice trigger compatible with the new one-origin constraints.
create or replace function public.sync_general_academic_mistakes_from_submission()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_question record;
begin
  for v_question in select private_question ->> 'id' as question_id,
      (private_question ->> 'skill')::public.general_academic_skill as skill,
      (private_question ->> 'difficulty')::public.question_difficulty as difficulty,
      private_question ->> 'correctOption' as correct_option, answer.selected_option
    from jsonb_array_elements(new.private_snapshot -> 'questions') private_question
    left join public.general_academic_practice_answers answer
      on answer.attempt_id = new.id and answer.question_id = private_question ->> 'id'
  loop
    if v_question.selected_option is null then continue;
    elsif v_question.selected_option = v_question.correct_option then
      update public.general_academic_mistakes set latest_attempt_id = new.id, latest_mock_attempt_id = null,
        times_correct_after_mistake = times_correct_after_mistake + 1,
        status = 'resolved', last_resolved_at = new.submitted_at
      where user_id = new.user_id and source_pack_id = new.source_pack_id and question_id = v_question.question_id;
    else
      insert into public.general_academic_mistakes(user_id, source_pack_id, question_id, skill, difficulty,
        latest_attempt_id, latest_missed_attempt_id, times_incorrect, first_missed_at, last_missed_at, status)
      values (new.user_id, new.source_pack_id, v_question.question_id, v_question.skill, v_question.difficulty,
        new.id, new.id, 1, new.submitted_at, new.submitted_at, 'active')
      on conflict (user_id, source_pack_id, question_id) do update set skill = excluded.skill,
        difficulty = excluded.difficulty, latest_attempt_id = excluded.latest_attempt_id, latest_mock_attempt_id = null,
        latest_missed_attempt_id = excluded.latest_missed_attempt_id, latest_missed_mock_attempt_id = null,
        times_incorrect = public.general_academic_mistakes.times_incorrect + 1,
        last_missed_at = excluded.last_missed_at, status = 'active';
    end if;
  end loop;
  return new;
end;
$$;

create or replace function public.sync_general_academic_mistakes_from_mock_submission()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_question record;
begin
  for v_question in select (private_pack ->> 'id')::uuid as source_pack_id,
      private_question ->> 'id' as question_id,
      (private_question ->> 'skill')::public.general_academic_skill as skill,
      (private_question ->> 'difficulty')::public.question_difficulty as difficulty,
      private_question ->> 'correctOption' as correct_option, answer.selected_option
    from jsonb_array_elements(new.private_snapshot -> 'packs') private_pack
    cross join lateral jsonb_array_elements(private_pack -> 'snapshot' -> 'questions') private_question
    left join public.general_academic_mock_answers answer on answer.mock_attempt_id = new.id
      and answer.source_pack_id = (private_pack ->> 'id')::uuid
      and answer.question_id = private_question ->> 'id'
  loop
    if v_question.selected_option is null then continue;
    elsif v_question.selected_option = v_question.correct_option then
      update public.general_academic_mistakes set latest_attempt_id = null, latest_mock_attempt_id = new.id,
        times_correct_after_mistake = times_correct_after_mistake + 1,
        status = 'resolved', last_resolved_at = new.submitted_at
      where user_id = new.user_id and source_pack_id = v_question.source_pack_id and question_id = v_question.question_id;
    else
      insert into public.general_academic_mistakes(user_id, source_pack_id, question_id, skill, difficulty,
        latest_mock_attempt_id, latest_missed_mock_attempt_id, times_incorrect, first_missed_at, last_missed_at, status)
      values (new.user_id, v_question.source_pack_id, v_question.question_id, v_question.skill, v_question.difficulty,
        new.id, new.id, 1, new.submitted_at, new.submitted_at, 'active')
      on conflict (user_id, source_pack_id, question_id) do update set skill = excluded.skill,
        difficulty = excluded.difficulty, latest_attempt_id = null, latest_mock_attempt_id = excluded.latest_mock_attempt_id,
        latest_missed_attempt_id = null, latest_missed_mock_attempt_id = excluded.latest_missed_mock_attempt_id,
        times_incorrect = public.general_academic_mistakes.times_incorrect + 1,
        last_missed_at = excluded.last_missed_at, status = 'active';
    end if;
  end loop;
  return new;
end;
$$;

create trigger sync_general_academic_mistakes_after_mock_submission
  after update of status on public.general_academic_mock_attempts
  for each row when (old.status is distinct from new.status and new.status = 'submitted')
  execute procedure public.sync_general_academic_mistakes_from_mock_submission();

create or replace function public.get_general_academic_learning_analytics(p_user_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with practice_scored as (
    select 'practice:' || attempt.id::text as attempt_key, attempt.submitted_at,
      attempt.source_pack_id, attempt.public_snapshot ->> 'domain' as domain,
      question ->> 'skill' as skill, answer.selected_option,
      answer.selected_option is not null and answer.selected_option = question ->> 'correctOption' as is_correct
    from public.general_academic_practice_attempts attempt
    cross join lateral jsonb_array_elements(attempt.private_snapshot -> 'questions') question
    left join public.general_academic_practice_answers answer on answer.attempt_id = attempt.id
      and answer.question_id = question ->> 'id'
    where attempt.user_id = p_user_id and attempt.status = 'submitted'
  ), mock_scored as (
    select 'mock:' || attempt.id::text as attempt_key, attempt.submitted_at,
      (pack ->> 'id')::uuid as source_pack_id, public_pack ->> 'domain' as domain,
      question ->> 'skill' as skill, answer.selected_option,
      answer.selected_option is not null and answer.selected_option = question ->> 'correctOption' as is_correct
    from public.general_academic_mock_attempts attempt
    cross join lateral jsonb_array_elements(attempt.private_snapshot -> 'packs') pack
    cross join lateral jsonb_array_elements(pack -> 'snapshot' -> 'questions') question
    join lateral jsonb_array_elements(attempt.public_snapshot -> 'packs') public_pack
      on public_pack ->> 'id' = pack ->> 'id'
    left join public.general_academic_mock_answers answer on answer.mock_attempt_id = attempt.id
      and answer.source_pack_id = (pack ->> 'id')::uuid and answer.question_id = question ->> 'id'
    where attempt.user_id = p_user_id and attempt.status = 'submitted'
  ), scored as (
    select * from practice_scored union all select * from mock_scored
  ), attempts as (
    select attempt_key, max(submitted_at) as submitted_at from scored group by attempt_key
  ), recent_attempts as (
    select attempt_key from attempts order by submitted_at desc, attempt_key desc limit 5
  ), pack_events as (
    select distinct attempt_key, source_pack_id from scored
  ), skill_stats as (
    select skill, count(*)::integer attempted,
      count(*) filter (where selected_option is not null)::integer answered,
      count(*) filter (where is_correct)::integer correct,
      count(*) filter (where selected_option is not null and not is_correct)::integer incorrect,
      count(*) filter (where selected_option is null)::integer unanswered from scored group by skill
  ), domain_stats as (
    select domain, count(*)::integer attempted,
      count(*) filter (where selected_option is not null)::integer answered,
      count(*) filter (where is_correct)::integer correct,
      count(*) filter (where selected_option is not null and not is_correct)::integer incorrect,
      count(*) filter (where selected_option is null)::integer unanswered from scored group by domain
  ) select jsonb_build_object(
    'completedPacks', (select count(*)::integer from pack_events),
    'attempted', (select count(*)::integer from scored),
    'answered', (select count(*)::integer from scored where selected_option is not null),
    'correct', (select count(*)::integer from scored where is_correct),
    'incorrect', (select count(*)::integer from scored where selected_option is not null and not is_correct),
    'unanswered', (select count(*)::integer from scored where selected_option is null),
    'accuracy', coalesce((select round(100.0 * count(*) filter (where is_correct) / nullif(count(*), 0), 2) from scored), 0),
    'recentAccuracy', coalesce((select round(100.0 * count(*) filter (where scored.is_correct) / nullif(count(*), 0), 2)
      from scored join recent_attempts using (attempt_key)), 0),
    'skills', coalesce((select jsonb_agg(jsonb_build_object('skill', skill, 'attempted', attempted,
      'answered', answered, 'correct', correct, 'incorrect', incorrect, 'unanswered', unanswered,
      'accuracy', round(100.0 * correct / nullif(attempted, 0), 2)) order by skill) from skill_stats), '[]'::jsonb),
    'domains', coalesce((select jsonb_agg(jsonb_build_object('domain', domain, 'attempted', attempted,
      'answered', answered, 'correct', correct, 'incorrect', incorrect, 'unanswered', unanswered,
      'accuracy', round(100.0 * correct / nullif(attempted, 0), 2)) order by domain) from domain_stats), '[]'::jsonb)
  );
$$;

revoke all on function public.finalize_general_academic_mock_attempt(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.create_general_academic_mock_attempt(uuid, uuid, text, text, uuid[], integer, text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.save_general_academic_mock_state(uuid, uuid, uuid, text, text, boolean, integer, text) from public, anon, authenticated;
revoke all on function public.submit_general_academic_mock_attempt(uuid, uuid) from public, anon, authenticated;
revoke all on function public.toggle_general_academic_mock_bookmark(uuid, uuid, uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.sync_general_academic_mistakes_from_mock_submission() from public, anon, authenticated;
grant execute on function public.create_general_academic_mock_attempt(uuid, uuid, text, text, uuid[], integer, text, jsonb, jsonb) to service_role;
grant execute on function public.save_general_academic_mock_state(uuid, uuid, uuid, text, text, boolean, integer, text) to service_role;
grant execute on function public.submit_general_academic_mock_attempt(uuid, uuid) to service_role;
grant execute on function public.toggle_general_academic_mock_bookmark(uuid, uuid, uuid, text, boolean) to service_role;

comment on table public.general_academic_mock_attempts is
  'Immutable-snapshot 90-minute PrepDMAT GAM simulations composed from complete published source packs.';
comment on column public.general_academic_mock_attempts.duration_seconds is
  'Official GAM duration; composition counts remain PrepDMAT-defined rather than official claims.';

commit;
