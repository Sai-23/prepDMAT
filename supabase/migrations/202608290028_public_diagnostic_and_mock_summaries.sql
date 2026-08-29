-- Public acquisition diagnostic: opaque, expiring sessions isolated from
-- authenticated practice attempts. Also provides one batched mock-summary RPC.

create table if not exists public.public_diagnostic_sessions (
  id uuid primary key,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  master_seed text not null,
  current_position integer not null default 1 check (current_position between 1 and 15),
  question_count integer not null default 15 check (question_count = 15),
  correct_count integer not null default 0 check (correct_count between 0 and 15),
  incorrect_count integer not null default 0 check (incorrect_count between 0 and 15),
  total_time_seconds integer not null default 0 check (total_time_seconds between 0 and 1296000),
  started_at timestamptz not null,
  completed_at timestamptz,
  expires_at timestamptz not null,
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((claimed_by is null and claimed_at is null) or (claimed_by is not null and claimed_at is not null))
);

create index if not exists idx_public_diagnostic_expiry
  on public.public_diagnostic_sessions(expires_at);
create index if not exists idx_public_diagnostic_claim
  on public.public_diagnostic_sessions(claimed_by, claimed_at);

create table if not exists public.public_diagnostic_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.public_diagnostic_sessions(id) on delete cascade,
  source_question_id uuid references public.questions(id) on delete restrict,
  question_key uuid not null,
  position integer not null check (position between 1 and 15),
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
  time_spent_seconds integer not null default 0 check (time_spent_seconds between 0 and 86400),
  shown_at timestamptz,
  answered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (session_id, question_key),
  unique (session_id, position),
  unique (session_id, fingerprint)
);

create index if not exists idx_public_diagnostic_items_session
  on public.public_diagnostic_items(session_id, position);

alter table public.public_diagnostic_sessions enable row level security;
alter table public.public_diagnostic_items enable row level security;
revoke all on public.public_diagnostic_sessions from public, anon, authenticated;
revoke all on public.public_diagnostic_items from public, anon, authenticated;

drop trigger if exists set_public_diagnostic_sessions_updated_at on public.public_diagnostic_sessions;
create trigger set_public_diagnostic_sessions_updated_at
  before update on public.public_diagnostic_sessions
  for each row execute procedure public.set_updated_at();
drop trigger if exists set_public_diagnostic_items_updated_at on public.public_diagnostic_items;
create trigger set_public_diagnostic_items_updated_at
  before update on public.public_diagnostic_items
  for each row execute procedure public.set_updated_at();

create or replace function public.create_public_core_diagnostic(
  p_session_id uuid,
  p_token_hash text,
  p_master_seed text,
  p_started_at timestamptz,
  p_expires_at timestamptz,
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
  if p_token_hash !~ '^[0-9a-f]{64}$' or p_master_seed is null or btrim(p_master_seed) = '' then
    raise exception 'invalid_public_diagnostic_identity';
  end if;
  if p_expires_at <= p_started_at or p_expires_at > p_started_at + interval '24 hours' then
    raise exception 'invalid_public_diagnostic_expiry';
  end if;

  select count(*), count(distinct item.question_key), count(distinct item.position)
  into item_count, distinct_questions, distinct_positions
  from jsonb_to_recordset(p_items) as item(question_key uuid, position integer);
  if item_count <> 15 or distinct_questions <> 15 or distinct_positions <> 15
     or (select min(item.position) from jsonb_to_recordset(p_items) as item(position integer)) <> 1
     or (select max(item.position) from jsonb_to_recordset(p_items) as item(position integer)) <> 15
     or exists (
       select 1 from (values ('figure_sequence'), ('mathematical_equation'), ('latin_square')) expected(question_type)
       where (select count(*) from jsonb_to_recordset(p_items) as item(question_type text)
              where item.question_type = expected.question_type) <> 5
     )
     or exists (
       select 1 from (values ('figure_sequence'), ('mathematical_equation'), ('latin_square')) expected(question_type)
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
    raise exception 'invalid_public_diagnostic_manifest';
  end if;

  delete from public.public_diagnostic_sessions
  where expires_at < timezone('utc', now()) - interval '7 days' and claimed_by is null;

  insert into public.public_diagnostic_sessions(
    id, token_hash, master_seed, started_at, expires_at
  ) values (p_session_id, p_token_hash, p_master_seed, p_started_at, p_expires_at);

  insert into public.public_diagnostic_items(
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
  return p_session_id;
end;
$$;

create or replace function public.record_public_diagnostic_answer(
  p_token_hash text,
  p_question_key uuid,
  p_response_payload jsonb,
  p_is_correct boolean,
  p_time_spent_seconds integer
)
returns table(result_status text, result_position integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row public.public_diagnostic_sessions%rowtype;
  affected integer;
begin
  select * into session_row from public.public_diagnostic_sessions
  where token_hash = p_token_hash for update;
  if not found or session_row.expires_at <= timezone('utc', now()) then
    raise exception 'public_diagnostic_unavailable';
  end if;
  if session_row.status = 'completed' then
    return query select 'completed'::text, session_row.current_position;
    return;
  end if;

  update public.public_diagnostic_items set
    response_status = 'answered', response_payload = p_response_payload,
    is_correct = p_is_correct,
    time_spent_seconds = greatest(0, least(86400, p_time_spent_seconds)),
    answered_at = timezone('utc', now())
  where session_id = session_row.id
    and position = session_row.current_position
    and question_key = p_question_key
    and response_status = 'unanswered';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'public_diagnostic_answer_locked'; end if;

  if session_row.current_position = 15 then
    update public.public_diagnostic_sessions set
      status = 'completed', completed_at = timezone('utc', now()),
      correct_count = correct_count + case when p_is_correct then 1 else 0 end,
      incorrect_count = incorrect_count + case when p_is_correct then 0 else 1 end,
      total_time_seconds = total_time_seconds + greatest(0, least(86400, p_time_spent_seconds))
    where id = session_row.id;
    return query select 'completed'::text, 15;
  else
    update public.public_diagnostic_sessions set
      current_position = current_position + 1,
      correct_count = correct_count + case when p_is_correct then 1 else 0 end,
      incorrect_count = incorrect_count + case when p_is_correct then 0 else 1 end,
      total_time_seconds = total_time_seconds + greatest(0, least(86400, p_time_spent_seconds))
    where id = session_row.id;
    update public.public_diagnostic_items set shown_at = timezone('utc', now())
    where session_id = session_row.id and position = session_row.current_position + 1;
    return query select 'advanced'::text, session_row.current_position + 1;
  end if;
end;
$$;

create or replace function public.claim_public_core_diagnostic(
  p_token_hash text,
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  public_session public.public_diagnostic_sessions%rowtype;
  profile_row public.profiles%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 53));
  select * into public_session from public.public_diagnostic_sessions
  where token_hash = p_token_hash for update;
  if not found or public_session.status <> 'completed'
     or public_session.expires_at <= timezone('utc', now()) then
    raise exception 'public_diagnostic_unavailable';
  end if;
  if public_session.claimed_by is not null and public_session.claimed_by <> p_user_id then
    raise exception 'public_diagnostic_already_claimed';
  end if;
  select * into profile_row from public.profiles where id = p_user_id for update;
  if not found then raise exception 'profile_unavailable'; end if;
  if public_session.claimed_by = p_user_id then
    return coalesce(profile_row.diagnostic_session_id, public_session.id);
  end if;

  if profile_row.diagnostic_status in ('in_progress', 'completed') then
    update public.public_diagnostic_sessions set claimed_by = p_user_id,
      claimed_at = timezone('utc', now()) where id = public_session.id;
    return coalesce(profile_row.diagnostic_session_id, public_session.id);
  end if;

  insert into public.practice_sessions(
    id, user_id, module, difficulty_mode, question_count, timing_mode,
    source_mode, session_type, status, master_seed, current_position,
    correct_count, incorrect_count, total_time_seconds, focus_families,
    started_at, completed_at
  ) values (
    public_session.id, p_user_id, null, 'mixed', 15, 'untimed',
    'generated', 'diagnostic', 'completed', public_session.master_seed, 15,
    public_session.correct_count, public_session.incorrect_count,
    public_session.total_time_seconds, '[]'::jsonb,
    public_session.started_at, public_session.completed_at
  );

  insert into public.practice_session_items(
    session_id, source_question_id, question_key, position, question_type,
    difficulty, public_snapshot, private_snapshot, generator_version,
    validator_version, seed, fingerprint, structural_profile,
    reasoning_family, reasoning_classification, response_status,
    response_payload, is_correct, time_spent_seconds, shown_at, answered_at
  ) select public_session.id, source_question_id, question_key, position,
    question_type, difficulty, public_snapshot, private_snapshot,
    generator_version, validator_version, seed, fingerprint,
    structural_profile, reasoning_family, reasoning_classification,
    response_status, response_payload, is_correct, time_spent_seconds,
    shown_at, answered_at
  from public.public_diagnostic_items where session_id = public_session.id;

  update public.profiles set diagnostic_status = 'completed',
    diagnostic_session_id = public_session.id,
    onboarding_preference = 'diagnostic',
    onboarding_completed_at = coalesce(onboarding_completed_at, timezone('utc', now()))
  where id = p_user_id;
  update public.public_diagnostic_sessions set claimed_by = p_user_id,
    claimed_at = timezone('utc', now()) where id = public_session.id;
  insert into public.practice_events(user_id, session_id, event_type, metadata)
  values (p_user_id, public_session.id, 'diagnostic_completed', jsonb_build_object(
    'correct', public_session.correct_count, 'questionCount', 15,
    'totalTimeSeconds', public_session.total_time_seconds, 'source', 'public_claim'
  ));
  return public_session.id;
end;
$$;

create or replace function public.get_curated_test_attempt_summaries(
  p_user_id uuid,
  p_test_ids uuid[]
)
returns table(
  test_id uuid,
  attempt_count bigint,
  best_score numeric,
  latest_score numeric,
  latest_completed_at timestamptz,
  has_in_progress boolean
)
language sql
security definer
set search_path = public
as $$
  select requested.test_id,
    count(attempts.id) filter (where attempts.status in ('submitted', 'auto_submitted')),
    max(attempts.score) filter (where attempts.status in ('submitted', 'auto_submitted')),
    (array_agg(attempts.score order by attempts.submitted_at desc nulls last)
      filter (where attempts.status in ('submitted', 'auto_submitted')))[1],
    max(attempts.submitted_at) filter (where attempts.status in ('submitted', 'auto_submitted')),
    coalesce(bool_or(attempts.status = 'in_progress'), false)
  from unnest(p_test_ids) requested(test_id)
  left join public.test_attempts attempts
    on attempts.test_id = requested.test_id
    and attempts.user_id = p_user_id
    and attempts.mock_origin = 'curated'
  group by requested.test_id;
$$;

revoke all on function public.create_public_core_diagnostic(uuid, text, text, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function public.record_public_diagnostic_answer(text, uuid, jsonb, boolean, integer) from public, anon, authenticated;
revoke all on function public.claim_public_core_diagnostic(text, uuid) from public, anon, authenticated;
revoke all on function public.get_curated_test_attempt_summaries(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.create_public_core_diagnostic(uuid, text, text, timestamptz, timestamptz, jsonb) to service_role;
grant execute on function public.record_public_diagnostic_answer(text, uuid, jsonb, boolean, integer) to service_role;
grant execute on function public.claim_public_core_diagnostic(text, uuid) to service_role;
grant execute on function public.get_curated_test_attempt_summaries(uuid, uuid[]) to service_role;
