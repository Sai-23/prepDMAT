-- Practice UX: dedicated, resumable learning sessions backed by immutable snapshots.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'practice_session_status') then
    create type public.practice_session_status as enum (
      'in_progress', 'completed', 'abandoned', 'failed'
    );
  end if;
end $$;

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module public.question_type not null check (
    module in ('figure_sequence', 'mathematical_equation', 'latin_square')
  ),
  difficulty_mode text not null check (
    difficulty_mode in ('easy', 'medium', 'hard', 'mixed')
  ),
  question_count integer not null check (question_count in (1, 5, 10, 20)),
  timing_mode text not null check (timing_mode in ('untimed', 'timed')),
  source_mode text not null default 'generated' check (
    source_mode in ('generated', 'exact_review')
  ),
  status public.practice_session_status not null default 'in_progress',
  master_seed text not null,
  current_position integer not null default 1 check (current_position >= 1),
  correct_count integer not null default 0 check (correct_count >= 0),
  incorrect_count integer not null default 0 check (incorrect_count >= 0),
  total_time_seconds integer not null default 0 check (total_time_seconds >= 0),
  retry_of_session_id uuid references public.practice_sessions(id) on delete set null,
  focus_families jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  completed_at timestamptz,
  abandoned_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (source_mode = 'exact_review' and question_count = 1)
    or (source_mode = 'generated' and question_count in (5, 10, 20))
  )
);

create unique index if not exists idx_practice_sessions_one_active_user
  on public.practice_sessions(user_id)
  where status = 'in_progress';
create index if not exists idx_practice_sessions_user_history
  on public.practice_sessions(user_id, created_at desc);

create table if not exists public.practice_session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.practice_sessions(id) on delete cascade,
  source_question_id uuid references public.questions(id) on delete restrict,
  question_key uuid not null,
  position integer not null check (position >= 1),
  question_type public.question_type not null check (
    question_type in ('figure_sequence', 'mathematical_equation', 'latin_square')
  ),
  difficulty public.question_difficulty not null,
  public_snapshot jsonb not null,
  private_snapshot jsonb not null,
  generator_version text,
  validator_version text,
  seed text,
  fingerprint text not null,
  structural_profile jsonb not null default '{}'::jsonb,
  reasoning_family text not null,
  reasoning_classification text not null,
  response_status public.response_status not null default 'unanswered',
  response_payload jsonb,
  is_correct boolean,
  time_spent_seconds integer not null default 0 check (time_spent_seconds >= 0),
  shown_at timestamptz,
  answered_at timestamptz,
  explanation_opened_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (session_id, question_key),
  unique (session_id, position),
  unique (session_id, fingerprint)
);

create index if not exists idx_practice_session_items_session
  on public.practice_session_items(session_id, position);
create index if not exists idx_practice_session_items_analytics
  on public.practice_session_items(question_type, difficulty, reasoning_family, answered_at);

create table if not exists public.practice_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.practice_sessions(id) on delete set null,
  question_key uuid,
  event_type text not null check (event_type in (
    'practice_started', 'question_answered', 'practice_completed',
    'practice_abandoned', 'explanation_opened', 'generation_failed'
  )),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_practice_events_session
  on public.practice_events(session_id, created_at);
create index if not exists idx_practice_events_created
  on public.practice_events(created_at desc);

alter table public.question_reports
  alter column question_id drop not null,
  add column if not exists practice_session_item_id uuid
    references public.practice_session_items(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'question_reports_has_source'
  ) then
    alter table public.question_reports add constraint question_reports_has_source
      check (question_id is not null or practice_session_item_id is not null);
  end if;
end $$;

create index if not exists idx_question_reports_practice_item
  on public.question_reports(practice_session_item_id);

drop policy if exists question_reports_insert on public.question_reports;
create policy question_reports_insert on public.question_reports for insert
with check (
  auth.uid() = reporter_id
  and (
    question_id is not null
    or exists (
      select 1 from public.practice_session_items item
      join public.practice_sessions session on session.id = item.session_id
      where item.id = practice_session_item_id and session.user_id = auth.uid()
    )
  )
);

alter table public.practice_sessions enable row level security;
alter table public.practice_session_items enable row level security;
alter table public.practice_events enable row level security;
revoke all on public.practice_sessions from anon, authenticated;
revoke all on public.practice_session_items from anon, authenticated;
revoke all on public.practice_events from anon, authenticated;

drop trigger if exists set_practice_sessions_updated_at on public.practice_sessions;
create trigger set_practice_sessions_updated_at
  before update on public.practice_sessions
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_practice_session_items_updated_at on public.practice_session_items;
create trigger set_practice_session_items_updated_at
  before update on public.practice_session_items
  for each row execute procedure public.set_updated_at();

create or replace function public.create_practice_session(
  p_session_id uuid,
  p_user_id uuid,
  p_module public.question_type,
  p_difficulty_mode text,
  p_question_count integer,
  p_timing_mode text,
  p_source_mode text,
  p_master_seed text,
  p_started_at timestamptz,
  p_expires_at timestamptz,
  p_retry_of_session_id uuid,
  p_focus_families jsonb,
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
  minimum_position integer;
  maximum_position integer;
begin
  if p_module not in ('figure_sequence', 'mathematical_equation', 'latin_square') then
    raise exception 'invalid_practice_module';
  end if;
  if p_difficulty_mode not in ('easy', 'medium', 'hard', 'mixed') then
    raise exception 'invalid_practice_difficulty';
  end if;
  if p_timing_mode not in ('untimed', 'timed') then
    raise exception 'invalid_practice_timing';
  end if;
  if p_source_mode not in ('generated', 'exact_review') then
    raise exception 'invalid_practice_source';
  end if;
  if (p_source_mode = 'generated' and p_question_count not in (5, 10, 20))
     or (p_source_mode = 'exact_review' and p_question_count <> 1) then
    raise exception 'invalid_practice_count';
  end if;
  if p_master_seed is null or btrim(p_master_seed) = '' then
    raise exception 'practice_seed_required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 1));
  if exists (
    select 1 from public.practice_sessions
    where user_id = p_user_id and status = 'in_progress'
  ) then
    raise exception 'active_practice_session_exists';
  end if;

  select count(*), count(distinct item.question_key),
    count(distinct item.position), min(item.position), max(item.position)
  into item_count, distinct_questions, distinct_positions,
    minimum_position, maximum_position
  from jsonb_to_recordset(p_items) as item(
    question_key uuid, position integer, question_type text
  );

  if item_count <> p_question_count
     or distinct_questions <> p_question_count
     or distinct_positions <> p_question_count
     or minimum_position <> 1
     or maximum_position <> p_question_count
     or exists (
       select 1
       from jsonb_to_recordset(p_items) as item(question_type text)
       where item.question_type <> p_module::text
     ) then
    raise exception 'invalid_practice_manifest';
  end if;

  insert into public.practice_sessions(
    id, user_id, module, difficulty_mode, question_count, timing_mode,
    source_mode, master_seed, retry_of_session_id, focus_families,
    started_at, expires_at
  ) values (
    p_session_id, p_user_id, p_module, p_difficulty_mode, p_question_count,
    p_timing_mode, p_source_mode, p_master_seed, p_retry_of_session_id,
    coalesce(p_focus_families, '[]'::jsonb), p_started_at, p_expires_at
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
    item.validator_version, item.seed, item.fingerprint,
    item.structural_profile, item.reasoning_family,
    item.reasoning_classification,
    case when item.position = 1 then p_started_at else null end
  from jsonb_to_recordset(p_items) as item(
    source_question_id uuid, question_key uuid, position integer,
    question_type text, difficulty text, public_snapshot jsonb,
    private_snapshot jsonb, generator_version text, validator_version text,
    seed text, fingerprint text, structural_profile jsonb,
    reasoning_family text, reasoning_classification text
  );

  insert into public.practice_events(user_id, session_id, event_type, metadata)
  values (
    p_user_id, p_session_id, 'practice_started',
    jsonb_build_object(
      'module', p_module, 'difficulty', p_difficulty_mode,
      'questionCount', p_question_count, 'timingMode', p_timing_mode,
      'sourceMode', p_source_mode
    )
  );

  return p_session_id;
end;
$$;

revoke all on function public.create_practice_session(
  uuid, uuid, public.question_type, text, integer, text, text, text,
  timestamptz, timestamptz, uuid, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.create_practice_session(
  uuid, uuid, public.question_type, text, integer, text, text, text,
  timestamptz, timestamptz, uuid, jsonb, jsonb
) to service_role;

create or replace function public.record_practice_answer(
  p_user_id uuid,
  p_session_id uuid,
  p_question_key uuid,
  p_response_payload jsonb,
  p_is_correct boolean,
  p_time_spent_seconds integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.practice_session_items%rowtype;
  session_row public.practice_sessions%rowtype;
begin
  select * into session_row from public.practice_sessions
  where id = p_session_id and user_id = p_user_id and status = 'in_progress'
  for update;
  if not found then raise exception 'practice_session_unavailable'; end if;
  if session_row.expires_at is not null and session_row.expires_at < timezone('utc', now()) then
    raise exception 'practice_session_expired';
  end if;

  select * into target from public.practice_session_items
  where session_id = p_session_id and question_key = p_question_key
    and position = session_row.current_position
  for update;
  if not found then raise exception 'practice_question_unavailable'; end if;
  if target.response_status = 'answered' then raise exception 'practice_answer_locked'; end if;
  if target.shown_at is null then raise exception 'practice_question_not_shown'; end if;
  if p_response_payload is null or p_time_spent_seconds < 0 or p_time_spent_seconds > 86400 then
    raise exception 'invalid_practice_response';
  end if;

  update public.practice_session_items set
    response_status = 'answered', response_payload = p_response_payload,
    is_correct = p_is_correct, time_spent_seconds = p_time_spent_seconds,
    answered_at = timezone('utc', now())
  where id = target.id;

  update public.practice_sessions set
    correct_count = correct_count + case when p_is_correct then 1 else 0 end,
    incorrect_count = incorrect_count + case when p_is_correct then 0 else 1 end,
    total_time_seconds = total_time_seconds + p_time_spent_seconds
  where id = p_session_id;

  insert into public.practice_events(user_id, session_id, question_key, event_type, metadata)
  values (p_user_id, p_session_id, p_question_key, 'question_answered',
    jsonb_build_object('correct', p_is_correct, 'position', target.position,
      'difficulty', target.difficulty, 'reasoningFamily', target.reasoning_family,
      'timeSpentSeconds', p_time_spent_seconds));
end;
$$;

create or replace function public.advance_practice_question(
  p_user_id uuid, p_session_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare session_row public.practice_sessions%rowtype;
begin
  select * into session_row from public.practice_sessions
  where id = p_session_id and user_id = p_user_id and status = 'in_progress'
  for update;
  if not found then raise exception 'practice_session_unavailable'; end if;
  if session_row.current_position >= session_row.question_count then
    raise exception 'practice_last_question';
  end if;
  if not exists (
    select 1 from public.practice_session_items
    where session_id = p_session_id and position = session_row.current_position
      and response_status = 'answered'
  ) then raise exception 'practice_feedback_required'; end if;
  update public.practice_sessions set current_position = current_position + 1
  where id = p_session_id;
  update public.practice_session_items set shown_at = timezone('utc', now())
  where session_id = p_session_id and position = session_row.current_position + 1
    and shown_at is null;
end;
$$;

create or replace function public.open_practice_explanation(
  p_user_id uuid, p_session_id uuid, p_question_key uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare changed integer;
begin
  if not exists (select 1 from public.practice_sessions where id = p_session_id and user_id = p_user_id) then
    raise exception 'practice_session_unavailable';
  end if;
  update public.practice_session_items set explanation_opened_at = timezone('utc', now())
  where session_id = p_session_id and question_key = p_question_key
    and response_status = 'answered' and explanation_opened_at is null;
  get diagnostics changed = row_count;
  if changed = 1 then
    insert into public.practice_events(user_id, session_id, question_key, event_type)
    values (p_user_id, p_session_id, p_question_key, 'explanation_opened');
  end if;
end;
$$;

create or replace function public.complete_practice_session(
  p_user_id uuid, p_session_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare session_row public.practice_sessions%rowtype;
begin
  select * into session_row from public.practice_sessions
  where id = p_session_id and user_id = p_user_id for update;
  if not found then raise exception 'practice_session_unavailable'; end if;
  if session_row.status = 'completed' then return; end if;
  if session_row.status <> 'in_progress' then raise exception 'practice_session_unavailable'; end if;
  if (select count(*) from public.practice_session_items
      where session_id = p_session_id and response_status = 'answered') <> session_row.question_count then
    raise exception 'practice_session_incomplete';
  end if;
  update public.practice_sessions set status = 'completed', completed_at = timezone('utc', now())
  where id = p_session_id;
  insert into public.practice_events(user_id, session_id, event_type, metadata)
  values (p_user_id, p_session_id, 'practice_completed',
    jsonb_build_object('correct', session_row.correct_count,
      'incorrect', session_row.incorrect_count, 'totalTimeSeconds', session_row.total_time_seconds));
end;
$$;

create or replace function public.abandon_practice_session(
  p_user_id uuid, p_session_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare session_row public.practice_sessions%rowtype;
begin
  select * into session_row from public.practice_sessions
  where id = p_session_id and user_id = p_user_id and status = 'in_progress' for update;
  if not found then raise exception 'practice_session_unavailable'; end if;
  update public.practice_sessions set status = 'abandoned', abandoned_at = timezone('utc', now())
  where id = p_session_id;
  insert into public.practice_events(user_id, session_id, event_type, metadata)
  values (p_user_id, p_session_id, 'practice_abandoned',
    jsonb_build_object('answered', session_row.correct_count + session_row.incorrect_count));
end;
$$;

revoke all on function public.record_practice_answer(uuid, uuid, uuid, jsonb, boolean, integer) from public, anon, authenticated;
revoke all on function public.advance_practice_question(uuid, uuid) from public, anon, authenticated;
revoke all on function public.open_practice_explanation(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.complete_practice_session(uuid, uuid) from public, anon, authenticated;
revoke all on function public.abandon_practice_session(uuid, uuid) from public, anon, authenticated;
grant execute on function public.record_practice_answer(uuid, uuid, uuid, jsonb, boolean, integer) to service_role;
grant execute on function public.advance_practice_question(uuid, uuid) to service_role;
grant execute on function public.open_practice_explanation(uuid, uuid, uuid) to service_role;
grant execute on function public.complete_practice_session(uuid, uuid) to service_role;
grant execute on function public.abandon_practice_session(uuid, uuid) to service_role;
