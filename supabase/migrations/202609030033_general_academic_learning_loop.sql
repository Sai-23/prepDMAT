begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'general_academic_mistake_status') then
    create type public.general_academic_mistake_status as enum ('active', 'resolved');
  end if;
end $$;

create table public.general_academic_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_pack_id uuid not null references public.general_academic_source_packs(id) on delete restrict,
  question_id text not null check (char_length(question_id) between 1 and 64),
  source_attempt_id uuid not null references public.general_academic_practice_attempts(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, source_pack_id, question_id)
);

create table public.general_academic_mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_pack_id uuid not null references public.general_academic_source_packs(id) on delete restrict,
  question_id text not null check (char_length(question_id) between 1 and 64),
  skill public.general_academic_skill not null,
  difficulty public.question_difficulty not null,
  latest_attempt_id uuid not null references public.general_academic_practice_attempts(id) on delete cascade,
  latest_missed_attempt_id uuid not null references public.general_academic_practice_attempts(id) on delete cascade,
  times_incorrect integer not null default 1 check (times_incorrect > 0),
  times_correct_after_mistake integer not null default 0 check (times_correct_after_mistake >= 0),
  first_missed_at timestamptz not null,
  last_missed_at timestamptz not null,
  last_resolved_at timestamptz,
  status public.general_academic_mistake_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, source_pack_id, question_id)
);

create index idx_general_academic_bookmarks_user_created
  on public.general_academic_bookmarks(user_id, created_at desc);
create index idx_general_academic_bookmarks_pack_question
  on public.general_academic_bookmarks(source_pack_id, question_id);
create index idx_general_academic_mistakes_user_status
  on public.general_academic_mistakes(user_id, status, last_missed_at desc);
create index idx_general_academic_mistakes_pack_question
  on public.general_academic_mistakes(source_pack_id, question_id);
create index idx_general_academic_mistakes_user_skill
  on public.general_academic_mistakes(user_id, skill, status);

create trigger set_general_academic_bookmarks_updated_at
  before update on public.general_academic_bookmarks
  for each row execute procedure public.set_updated_at();
create trigger set_general_academic_mistakes_updated_at
  before update on public.general_academic_mistakes
  for each row execute procedure public.set_updated_at();

alter table public.general_academic_bookmarks enable row level security;
alter table public.general_academic_mistakes enable row level security;
revoke all on public.general_academic_bookmarks from public, anon, authenticated;
revoke all on public.general_academic_mistakes from public, anon, authenticated;

create or replace function public.toggle_general_academic_bookmark(
  p_user_id uuid,
  p_attempt_id uuid,
  p_question_id text,
  p_bookmarked boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.general_academic_practice_attempts%rowtype;
begin
  select * into v_attempt
  from public.general_academic_practice_attempts
  where id = p_attempt_id and user_id = p_user_id and status = 'submitted';
  if not found then
    raise exception 'general_academic_attempt_unavailable' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(v_attempt.public_snapshot -> 'questions') question
    where question ->> 'id' = p_question_id
  ) or not exists (
    select 1 from jsonb_array_elements(v_attempt.private_snapshot -> 'questions') question
    where question ->> 'id' = p_question_id
  ) then
    raise exception 'general_academic_question_unavailable' using errcode = 'P0002';
  end if;

  if p_bookmarked then
    insert into public.general_academic_bookmarks (
      user_id, source_pack_id, question_id, source_attempt_id
    ) values (
      p_user_id, v_attempt.source_pack_id, p_question_id, p_attempt_id
    ) on conflict (user_id, source_pack_id, question_id) do update set
      source_attempt_id = excluded.source_attempt_id;
  else
    delete from public.general_academic_bookmarks
    where user_id = p_user_id
      and source_pack_id = v_attempt.source_pack_id
      and question_id = p_question_id;
  end if;
  return p_bookmarked;
end;
$$;

create or replace function public.sync_general_academic_mistakes_from_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_question record;
begin
  for v_question in
    select
      private_question ->> 'id' as question_id,
      (private_question ->> 'skill')::public.general_academic_skill as skill,
      (private_question ->> 'difficulty')::public.question_difficulty as difficulty,
      private_question ->> 'correctOption' as correct_option,
      answer.selected_option
    from jsonb_array_elements(new.private_snapshot -> 'questions') private_question
    left join public.general_academic_practice_answers answer
      on answer.attempt_id = new.id
      and answer.question_id = private_question ->> 'id'
  loop
    if v_question.selected_option is null then
      continue;
    elsif v_question.selected_option = v_question.correct_option then
      update public.general_academic_mistakes set
        latest_attempt_id = new.id,
        times_correct_after_mistake = times_correct_after_mistake + 1,
        status = 'resolved',
        last_resolved_at = new.submitted_at
      where user_id = new.user_id
        and source_pack_id = new.source_pack_id
        and question_id = v_question.question_id;
    else
      insert into public.general_academic_mistakes (
        user_id, source_pack_id, question_id, skill, difficulty,
        latest_attempt_id, latest_missed_attempt_id, times_incorrect,
        first_missed_at, last_missed_at, status
      ) values (
        new.user_id, new.source_pack_id, v_question.question_id,
        v_question.skill, v_question.difficulty, new.id, new.id, 1,
        new.submitted_at, new.submitted_at, 'active'
      ) on conflict (user_id, source_pack_id, question_id) do update set
        skill = excluded.skill,
        difficulty = excluded.difficulty,
        latest_attempt_id = excluded.latest_attempt_id,
        latest_missed_attempt_id = excluded.latest_missed_attempt_id,
        times_incorrect = public.general_academic_mistakes.times_incorrect + 1,
        last_missed_at = excluded.last_missed_at,
        status = 'active';
    end if;
  end loop;
  return new;
end;
$$;

create trigger sync_general_academic_mistakes_after_submission
  after update of status on public.general_academic_practice_attempts
  for each row
  when (old.status is distinct from new.status and new.status = 'submitted')
  execute procedure public.sync_general_academic_mistakes_from_submission();

-- Backfill already-submitted Phase 5 attempts without changing their snapshots.
with observations as (
  select
    attempt.user_id,
    attempt.source_pack_id,
    attempt.id as attempt_id,
    attempt.submitted_at,
    private_question ->> 'id' as question_id,
    (private_question ->> 'skill')::public.general_academic_skill as skill,
    (private_question ->> 'difficulty')::public.question_difficulty as difficulty,
    answer.selected_option,
    answer.selected_option = private_question ->> 'correctOption' as is_correct
  from public.general_academic_practice_attempts attempt
  cross join lateral jsonb_array_elements(attempt.private_snapshot -> 'questions') private_question
  join public.general_academic_practice_answers answer
    on answer.attempt_id = attempt.id
    and answer.question_id = private_question ->> 'id'
  where attempt.status = 'submitted' and answer.selected_option is not null
), first_misses as (
  select user_id, source_pack_id, question_id, min(submitted_at) as first_missed_at
  from observations where not is_correct
  group by user_id, source_pack_id, question_id
), histories as (
  select
    observation.user_id,
    observation.source_pack_id,
    observation.question_id,
    (array_agg(observation.skill order by observation.submitted_at desc))[1] as skill,
    (array_agg(observation.difficulty order by observation.submitted_at desc))[1] as difficulty,
    (array_agg(observation.attempt_id order by observation.submitted_at desc))[1] as latest_attempt_id,
    (array_agg(observation.attempt_id order by observation.submitted_at desc)
      filter (where not observation.is_correct))[1] as latest_missed_attempt_id,
    count(*) filter (where not observation.is_correct)::integer as times_incorrect,
    count(*) filter (
      where observation.is_correct and observation.submitted_at > first_miss.first_missed_at
    )::integer as times_correct_after_mistake,
    first_miss.first_missed_at,
    max(observation.submitted_at) filter (where not observation.is_correct) as last_missed_at,
    max(observation.submitted_at) filter (
      where observation.is_correct and observation.submitted_at > first_miss.first_missed_at
    ) as last_resolved_at,
    (array_agg(observation.is_correct order by observation.submitted_at desc))[1] as latest_is_correct
  from observations observation
  join first_misses first_miss using (user_id, source_pack_id, question_id)
  where observation.submitted_at >= first_miss.first_missed_at
  group by observation.user_id, observation.source_pack_id, observation.question_id, first_miss.first_missed_at
)
insert into public.general_academic_mistakes (
  user_id, source_pack_id, question_id, skill, difficulty, latest_attempt_id,
  latest_missed_attempt_id, times_incorrect, times_correct_after_mistake,
  first_missed_at, last_missed_at, last_resolved_at, status
)
select
  user_id, source_pack_id, question_id, skill, difficulty, latest_attempt_id,
  latest_missed_attempt_id, times_incorrect, times_correct_after_mistake,
  first_missed_at, last_missed_at, last_resolved_at,
  case when latest_is_correct then 'resolved'::public.general_academic_mistake_status
    else 'active'::public.general_academic_mistake_status end
from histories
on conflict (user_id, source_pack_id, question_id) do nothing;

create or replace function public.get_general_academic_learning_analytics(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with attempts as (
    select id, source_pack_id, submitted_at, public_snapshot, private_snapshot
    from public.general_academic_practice_attempts
    where user_id = p_user_id and status = 'submitted'
  ), scored as (
    select
      attempt.id as attempt_id,
      attempt.submitted_at,
      attempt.public_snapshot ->> 'domain' as domain,
      private_question ->> 'skill' as skill,
      answer.selected_option,
      answer.selected_option is not null
        and answer.selected_option = private_question ->> 'correctOption' as is_correct
    from attempts attempt
    cross join lateral jsonb_array_elements(attempt.private_snapshot -> 'questions') private_question
    left join public.general_academic_practice_answers answer
      on answer.attempt_id = attempt.id
      and answer.question_id = private_question ->> 'id'
  ), recent_attempts as (
    select id from attempts order by submitted_at desc, id desc limit 5
  ), skill_stats as (
    select skill, count(*)::integer as attempted,
      count(*) filter (where selected_option is not null)::integer as answered,
      count(*) filter (where is_correct)::integer as correct,
      count(*) filter (where selected_option is not null and not is_correct)::integer as incorrect,
      count(*) filter (where selected_option is null)::integer as unanswered
    from scored group by skill
  ), domain_stats as (
    select domain, count(*)::integer as attempted,
      count(*) filter (where selected_option is not null)::integer as answered,
      count(*) filter (where is_correct)::integer as correct,
      count(*) filter (where selected_option is not null and not is_correct)::integer as incorrect,
      count(*) filter (where selected_option is null)::integer as unanswered
    from scored group by domain
  )
  select jsonb_build_object(
    'completedPacks', (select count(*)::integer from attempts),
    'attempted', (select count(*)::integer from scored),
    'answered', (select count(*)::integer from scored where selected_option is not null),
    'correct', (select count(*)::integer from scored where is_correct),
    'incorrect', (select count(*)::integer from scored where selected_option is not null and not is_correct),
    'unanswered', (select count(*)::integer from scored where selected_option is null),
    'accuracy', coalesce((select round(100.0 * count(*) filter (where is_correct) / nullif(count(*), 0), 2) from scored), 0),
    'recentAccuracy', coalesce((select round(100.0 * count(*) filter (where scored.is_correct) / nullif(count(*), 0), 2)
      from scored join recent_attempts on recent_attempts.id = scored.attempt_id), 0),
    'skills', coalesce((select jsonb_agg(jsonb_build_object(
      'skill', skill, 'attempted', attempted, 'answered', answered, 'correct', correct,
      'incorrect', incorrect, 'unanswered', unanswered,
      'accuracy', round(100.0 * correct / nullif(attempted, 0), 2)
    ) order by skill) from skill_stats), '[]'::jsonb),
    'domains', coalesce((select jsonb_agg(jsonb_build_object(
      'domain', domain, 'attempted', attempted, 'answered', answered, 'correct', correct,
      'incorrect', incorrect, 'unanswered', unanswered,
      'accuracy', round(100.0 * correct / nullif(attempted, 0), 2)
    ) order by domain) from domain_stats), '[]'::jsonb)
  );
$$;

revoke all on function public.toggle_general_academic_bookmark(uuid, uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.sync_general_academic_mistakes_from_submission() from public, anon, authenticated;
revoke all on function public.get_general_academic_learning_analytics(uuid) from public, anon, authenticated;
grant execute on function public.toggle_general_academic_bookmark(uuid, uuid, text, boolean) to service_role;
grant execute on function public.get_general_academic_learning_analytics(uuid) to service_role;

comment on table public.general_academic_bookmarks is
  'Source-aware GAM bookmarks backed by an owned immutable submitted attempt snapshot.';
comment on table public.general_academic_mistakes is
  'Server-derived GAM mistake history. Unanswered questions are intentionally excluded.';

commit;
