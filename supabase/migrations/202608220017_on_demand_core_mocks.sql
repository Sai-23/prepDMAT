-- Phase 6: private, student-owned on-demand Core mocks.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'mock_origin') then
    create type public.mock_origin as enum ('curated', 'generated');
  end if;
  if not exists (select 1 from pg_type where typname = 'generated_mock_status') then
    create type public.generated_mock_status as enum ('generating', 'ready', 'failed');
  end if;
end $$;

create table if not exists public.generated_core_mocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  generation_request_id uuid not null,
  status public.generated_mock_status not null default 'generating',
  attempt_id uuid,
  mock_seed text not null,
  protocol_version text,
  assembler_version text,
  generator_versions jsonb not null default '{}'::jsonb,
  fingerprints jsonb not null default '{}'::jsonb,
  structural_profiles jsonb not null default '{}'::jsonb,
  family_sequences jsonb not null default '{}'::jsonb,
  difficulty_sequences jsonb not null default '{}'::jsonb,
  quality_score numeric(6,2),
  critical_gate_passed boolean,
  failure_reason_code text,
  started_at timestamptz not null default timezone('utc', now()),
  ready_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, generation_request_id)
);

create unique index if not exists idx_generated_core_mocks_one_active_per_user
  on public.generated_core_mocks(user_id)
  where status = 'generating';

create index if not exists idx_generated_core_mocks_user_history
  on public.generated_core_mocks(user_id, created_at desc)
  where status = 'ready';

create table if not exists public.core_mock_generation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mock_id uuid references public.generated_core_mocks(id) on delete set null,
  event_type text not null check (event_type in ('started', 'module_success', 'success', 'failure')),
  module public.question_type,
  duration_ms numeric(12,3),
  retry_count integer check (retry_count is null or retry_count >= 0),
  novelty_rejection_count integer check (novelty_rejection_count is null or novelty_rejection_count >= 0),
  validation_rejection_count integer check (validation_rejection_count is null or validation_rejection_count >= 0),
  spacing_relaxation_count integer check (spacing_relaxation_count is null or spacing_relaxation_count >= 0),
  reason_code text,
  protocol_version text,
  assembler_version text,
  generator_version text,
  quality_score numeric(6,2),
  critical_gate_passed boolean,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_core_mock_generation_events_created
  on public.core_mock_generation_events(created_at desc);
create index if not exists idx_core_mock_generation_events_mock
  on public.core_mock_generation_events(mock_id, created_at);

alter table public.test_attempts
  alter column test_id drop not null,
  add column if not exists generated_mock_id uuid references public.generated_core_mocks(id) on delete restrict,
  add column if not exists mock_origin public.mock_origin not null default 'curated',
  add column if not exists display_title text,
  add column if not exists current_section_key uuid,
  add column if not exists current_question_key uuid;

update public.test_attempts
set current_section_key = current_section_id,
    current_question_key = current_question_id
where current_section_key is null or current_question_key is null;

update public.test_attempts attempts
set display_title = coalesce(
  nullif(attempts.test_snapshot ->> 'title', ''),
  (select tests.title from public.tests where tests.id = attempts.test_id),
  'Assessment'
)
where attempts.display_title is null;

alter table public.test_attempts drop constraint if exists test_attempts_origin_reference_check;
alter table public.test_attempts add constraint test_attempts_origin_reference_check check (
  (mock_origin = 'curated' and test_id is not null and generated_mock_id is null)
  or
  (mock_origin = 'generated' and test_id is null and generated_mock_id is not null)
);

alter table public.generated_core_mocks drop constraint if exists generated_core_mocks_attempt_id_fkey;
alter table public.generated_core_mocks
  add constraint generated_core_mocks_attempt_id_fkey
  foreign key (attempt_id) references public.test_attempts(id) on delete set null;

alter table public.practice_attempt_items
  add column if not exists question_key uuid,
  add column if not exists section_key uuid;

update public.practice_attempt_items
set question_key = source_question_id,
    section_key = test_section_id
where question_key is null or section_key is null;

alter table public.practice_attempt_items
  alter column source_question_id drop not null,
  alter column question_key set not null;

create unique index if not exists idx_practice_attempt_items_question_key
  on public.practice_attempt_items(attempt_id, question_key);
create index if not exists idx_practice_attempt_items_section_key
  on public.practice_attempt_items(attempt_id, section_key, section_position);

alter table public.user_responses add column if not exists question_key uuid;
update public.user_responses set question_key = question_id where question_key is null;
alter table public.user_responses
  alter column question_id drop not null,
  alter column question_key set not null;
create unique index if not exists idx_user_responses_question_key
  on public.user_responses(attempt_id, question_key);

create or replace function public.fill_attempt_item_keys()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.question_key := coalesce(new.question_key, new.source_question_id);
  new.section_key := coalesce(new.section_key, new.test_section_id);
  return new;
end;
$$;

create or replace function public.fill_response_question_key()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.question_key := coalesce(new.question_key, new.question_id);
  return new;
end;
$$;

drop trigger if exists fill_practice_attempt_item_keys on public.practice_attempt_items;
create trigger fill_practice_attempt_item_keys
  before insert or update of source_question_id, question_key, test_section_id, section_key
  on public.practice_attempt_items
  for each row execute procedure public.fill_attempt_item_keys();

drop trigger if exists fill_user_response_question_key on public.user_responses;
create trigger fill_user_response_question_key
  before insert or update of question_id, question_key
  on public.user_responses
  for each row execute procedure public.fill_response_question_key();

alter table public.generated_core_mocks enable row level security;
alter table public.core_mock_generation_events enable row level security;
revoke all on public.generated_core_mocks from anon, authenticated;
revoke all on public.core_mock_generation_events from anon, authenticated;
revoke all on public.test_attempts from anon, authenticated;
revoke all on public.user_responses from anon, authenticated;
grant select (
  id, test_id, generated_mock_id, mock_origin, display_title, user_id,
  status, started_at, submitted_at, expires_at, total_time_seconds,
  score, accuracy, last_activity_at, created_at, updated_at
) on public.test_attempts to authenticated;

drop trigger if exists set_generated_core_mocks_updated_at on public.generated_core_mocks;
create trigger set_generated_core_mocks_updated_at
  before update on public.generated_core_mocks
  for each row execute procedure public.set_updated_at();

create or replace function public.reserve_generated_core_mock(
  p_user_id uuid,
  p_generation_request_id uuid,
  p_mock_seed text,
  p_cooldown_seconds integer,
  p_protocol_version text,
  p_assembler_version text
)
returns table (
  mock_id uuid,
  generation_status text,
  attempt_id uuid,
  was_reserved boolean,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.generated_core_mocks%rowtype;
  recent_ready_at timestamptz;
  created_mock_id uuid;
  remaining integer;
begin
  if p_mock_seed is null or btrim(p_mock_seed) = '' then
    raise exception 'mock_seed_required';
  end if;
  if p_cooldown_seconds < 0 or p_cooldown_seconds > 300 then
    raise exception 'invalid_cooldown';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select * into existing
  from public.generated_core_mocks
  where user_id = p_user_id and generation_request_id = p_generation_request_id;
  if found then
    return query select existing.id, existing.status::text, existing.attempt_id, false, 0;
    return;
  end if;

  with stale as (
    update public.generated_core_mocks
    set status = 'failed', failed_at = timezone('utc', now()), failure_reason_code = 'stale_generation'
    where user_id = p_user_id
      and status = 'generating'
      and started_at < timezone('utc', now()) - interval '10 minutes'
    returning id, user_id, protocol_version, assembler_version
  )
  insert into public.core_mock_generation_events(
    user_id, mock_id, event_type, reason_code, protocol_version,
    assembler_version, critical_gate_passed
  )
  select user_id, id, 'failure', 'stale_generation', protocol_version,
    assembler_version, false
  from stale;

  if exists (
    select 1 from public.generated_core_mocks
    where user_id = p_user_id and status = 'generating'
  ) then
    raise exception 'generation_in_progress';
  end if;

  select ready_at into recent_ready_at
  from public.generated_core_mocks
  where user_id = p_user_id and status = 'ready'
  order by ready_at desc
  limit 1;
  if recent_ready_at is not null
     and recent_ready_at > timezone('utc', now()) - make_interval(secs => p_cooldown_seconds) then
    remaining := greatest(1, ceil(extract(epoch from (
      recent_ready_at + make_interval(secs => p_cooldown_seconds) - timezone('utc', now())
    )))::integer);
    raise exception 'generation_cooldown:%', remaining;
  end if;

  insert into public.generated_core_mocks(
    user_id, generation_request_id, mock_seed, protocol_version, assembler_version
  )
  values (
    p_user_id, p_generation_request_id, p_mock_seed, p_protocol_version, p_assembler_version
  )
  returning id into created_mock_id;

  insert into public.core_mock_generation_events(
    user_id, mock_id, event_type, protocol_version, assembler_version
  ) values (
    p_user_id, created_mock_id, 'started', p_protocol_version, p_assembler_version
  );

  return query select created_mock_id, 'generating'::text, null::uuid, true, 0;
end;
$$;

create or replace function public.persist_generated_core_mock_attempt(
  p_mock_id uuid,
  p_user_id uuid,
  p_attempt_id uuid,
  p_mock_seed text,
  p_protocol_version text,
  p_assembler_version text,
  p_generator_versions jsonb,
  p_fingerprints jsonb,
  p_structural_profiles jsonb,
  p_family_sequences jsonb,
  p_difficulty_sequences jsonb,
  p_quality_score numeric,
  p_critical_gate_passed boolean,
  p_test_snapshot jsonb,
  p_items jsonb,
  p_started_at timestamptz,
  p_expires_at timestamptz,
  p_current_section_key uuid,
  p_section_expires_at timestamptz,
  p_current_question_key uuid,
  p_duration_ms numeric,
  p_retry_count integer,
  p_novelty_rejection_count integer,
  p_validation_rejection_count integer,
  p_spacing_relaxation_count integer,
  p_module_telemetry jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  item_count integer;
  distinct_question_count integer;
  distinct_position_count integer;
  distinct_section_count integer;
  minimum_position integer;
  maximum_position integer;
  invalid_module_counts integer;
  invalid_section_counts integer;
  affected integer;
begin
  select count(*), count(distinct item.question_key),
    count(distinct item.position), count(distinct item.section_key),
    min(item.position), max(item.position)
  into item_count, distinct_question_count, distinct_position_count,
    distinct_section_count, minimum_position, maximum_position
  from jsonb_to_recordset(p_items) as item(
    question_key uuid, position integer, section_key uuid
  );

  select count(*) into invalid_module_counts
  from (
    select item.question_type, count(*) as module_count
    from jsonb_to_recordset(p_items) as item(question_type text)
    group by item.question_type
  ) module_counts
  where module_counts.question_type is null
    or module_counts.question_type not in (
    'figure_sequence', 'mathematical_equation', 'latin_square'
  ) or module_counts.module_count <> 20;

  select count(*) into invalid_section_counts
  from (
    select item.section_key, count(*) as section_count,
      count(distinct item.question_type) as type_count,
      count(distinct item.section_position) as position_count,
      min(item.section_position) as minimum_position,
      max(item.section_position) as maximum_position
    from jsonb_to_recordset(p_items) as item(
      section_key uuid, section_position integer, question_type text
    )
    group by item.section_key
  ) section_counts
  where section_counts.section_count <> 20
    or section_counts.type_count <> 1
    or section_counts.position_count <> 20
    or section_counts.minimum_position <> 1
    or section_counts.maximum_position <> 20;

  if item_count <> 60
     or distinct_question_count <> 60
     or distinct_position_count <> 60
     or distinct_section_count <> 3
     or minimum_position <> 1
     or maximum_position <> 60
     or invalid_module_counts <> 0
     or invalid_section_counts <> 0
     or p_critical_gate_passed is not true then
    raise exception 'generated_mock_quality_gate_failed';
  end if;

  update public.generated_core_mocks
  set status = 'ready', mock_seed = p_mock_seed,
      protocol_version = p_protocol_version, assembler_version = p_assembler_version,
      generator_versions = p_generator_versions, fingerprints = p_fingerprints,
      structural_profiles = p_structural_profiles, family_sequences = p_family_sequences,
      difficulty_sequences = p_difficulty_sequences, quality_score = p_quality_score,
      critical_gate_passed = p_critical_gate_passed, ready_at = timezone('utc', now()),
      failure_reason_code = null
  where id = p_mock_id and user_id = p_user_id and status = 'generating';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'generation_reservation_unavailable'; end if;

  insert into public.test_attempts (
    id, test_id, generated_mock_id, mock_origin, display_title, user_id, status,
    started_at, expires_at, current_section_key, section_started_at,
    section_expires_at, current_question_key, randomization_seed, mock_seed,
    protocol_version, generator_versions, question_fingerprints, test_snapshot
  ) values (
    p_attempt_id, null, p_mock_id, 'generated', 'Generated Core Mock', p_user_id, 'in_progress',
    p_started_at, p_expires_at, p_current_section_key, p_started_at,
    p_section_expires_at, p_current_question_key, p_mock_seed, p_mock_seed,
    p_protocol_version, p_generator_versions, p_fingerprints, p_test_snapshot
  );

  update public.generated_core_mocks
  set attempt_id = p_attempt_id
  where id = p_mock_id and user_id = p_user_id;

  insert into public.practice_attempt_items (
    attempt_id, source_question_id, question_key, position,
    test_section_id, section_key, section_position, question_type,
    public_snapshot, private_snapshot, generator_version,
    validator_version, seed, fingerprint
  )
  select p_attempt_id, null, item.question_key, item.position,
    null, item.section_key, item.section_position,
    item.question_type::public.question_type, item.public_snapshot,
    item.private_snapshot, item.generator_version,
    item.validator_version, item.seed, item.fingerprint
  from jsonb_to_recordset(p_items) as item(
    question_key uuid, position integer, section_key uuid,
    section_position integer, question_type text,
    public_snapshot jsonb, private_snapshot jsonb,
    generator_version text, validator_version text,
    seed text, fingerprint text
  );

  insert into public.user_responses(attempt_id, question_id, question_key, response_status)
  select p_attempt_id, null, item.question_key, 'unanswered'
  from jsonb_to_recordset(p_items) as item(question_key uuid);

  insert into public.core_mock_generation_events(
    user_id, mock_id, event_type, duration_ms, retry_count,
    novelty_rejection_count, validation_rejection_count,
    spacing_relaxation_count, protocol_version, assembler_version,
    quality_score, critical_gate_passed, metadata
  ) values (
    p_user_id, p_mock_id, 'success', p_duration_ms, p_retry_count,
    p_novelty_rejection_count, p_validation_rejection_count,
    p_spacing_relaxation_count, p_protocol_version, p_assembler_version,
    p_quality_score, p_critical_gate_passed,
    jsonb_build_object('moduleTelemetry', p_module_telemetry, 'generatorVersions', p_generator_versions)
  );

  insert into public.core_mock_generation_events(
    user_id, mock_id, event_type, module, duration_ms,
    retry_count, novelty_rejection_count, validation_rejection_count,
    spacing_relaxation_count, reason_code, protocol_version,
    assembler_version, generator_version, quality_score,
    critical_gate_passed, metadata
  )
  select p_user_id, p_mock_id, 'module_success', module_data.key::public.question_type,
    (module_data.value ->> 'durationMs')::numeric,
    (module_data.value ->> 'retryCount')::integer,
    (module_data.value ->> 'noveltyRejectionCount')::integer,
    (module_data.value ->> 'validationRejectionCount')::integer,
    (module_data.value ->> 'spacingRelaxationCount')::integer,
    null, p_protocol_version, p_assembler_version,
    module_data.value ->> 'generatorVersion', p_quality_score,
    p_critical_gate_passed, '{}'::jsonb
  from jsonb_each(p_module_telemetry) module_data;

  return p_attempt_id;
end;
$$;

create or replace function public.fail_generated_core_mock(
  p_mock_id uuid,
  p_user_id uuid,
  p_reason_code text,
  p_duration_ms numeric,
  p_protocol_version text,
  p_assembler_version text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.generated_core_mocks
  set status = 'failed', failure_reason_code = left(p_reason_code, 100),
      failed_at = timezone('utc', now())
  where id = p_mock_id and user_id = p_user_id and status = 'generating';

  if found then
    insert into public.core_mock_generation_events(
      user_id, mock_id, event_type, duration_ms, reason_code,
      protocol_version, assembler_version, critical_gate_passed
    ) values (
      p_user_id, p_mock_id, 'failure', p_duration_ms, left(p_reason_code, 100),
      p_protocol_version, p_assembler_version, false
    );
  end if;
end;
$$;

-- Preserve the curated Phase 5 RPC while populating the new stable keys.
create or replace function public.create_core_mock_attempt(
  p_attempt_id uuid,
  p_test_id uuid,
  p_user_id uuid,
  p_mock_seed text,
  p_protocol_version text,
  p_generator_versions jsonb,
  p_question_fingerprints jsonb,
  p_test_snapshot jsonb,
  p_items jsonb,
  p_response_question_ids jsonb,
  p_started_at timestamptz,
  p_expires_at timestamptz,
  p_current_section_id uuid,
  p_section_expires_at timestamptz,
  p_current_question_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  item_count integer;
  response_count integer;
begin
  if p_mock_seed is null or btrim(p_mock_seed) = '' then raise exception 'A mock seed is required.'; end if;
  if p_protocol_version is null or btrim(p_protocol_version) = '' then raise exception 'A protocol version is required.'; end if;
  item_count := jsonb_array_length(p_items);
  response_count := jsonb_array_length(p_response_question_ids);
  if item_count = 0 or item_count <> response_count then
    raise exception 'The immutable item and response manifests must be complete.';
  end if;

  insert into public.test_attempts (
    id, test_id, generated_mock_id, mock_origin, display_title, user_id, status,
    started_at, expires_at, current_section_id, current_section_key,
    section_started_at, section_expires_at, current_question_id,
    current_question_key, randomization_seed, mock_seed, protocol_version,
    generator_versions, question_fingerprints, test_snapshot
  ) values (
    p_attempt_id, p_test_id, null, 'curated', coalesce(p_test_snapshot ->> 'title', 'Assessment'), p_user_id, 'in_progress',
    p_started_at, p_expires_at, p_current_section_id, p_current_section_id,
    p_started_at, p_section_expires_at, p_current_question_id,
    p_current_question_id, p_mock_seed, p_mock_seed, p_protocol_version,
    p_generator_versions, p_question_fingerprints, p_test_snapshot
  );

  insert into public.practice_attempt_items (
    attempt_id, source_question_id, question_key, position,
    test_section_id, section_key, section_position, question_type,
    public_snapshot, private_snapshot, generator_version,
    validator_version, seed, fingerprint
  )
  select p_attempt_id, item.source_question_id, item.source_question_id,
    item.position, item.test_section_id, item.test_section_id,
    item.section_position, item.question_type::public.question_type,
    item.public_snapshot, item.private_snapshot, item.generator_version,
    item.validator_version, item.seed, item.fingerprint
  from jsonb_to_recordset(p_items) as item(
    source_question_id uuid, position integer, test_section_id uuid,
    section_position integer, question_type text, public_snapshot jsonb,
    private_snapshot jsonb, generator_version text,
    validator_version text, seed text, fingerprint text
  );

  insert into public.user_responses(attempt_id, question_id, question_key, response_status)
  select p_attempt_id, value::uuid, value::uuid, 'unanswered'
  from jsonb_array_elements_text(p_response_question_ids);
  return p_attempt_id;
end;
$$;

revoke all on function public.reserve_generated_core_mock(uuid, uuid, text, integer, text, text) from public, anon, authenticated;
revoke all on function public.persist_generated_core_mock_attempt(uuid, uuid, uuid, text, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, numeric, boolean, jsonb, jsonb, timestamptz, timestamptz, uuid, timestamptz, uuid, numeric, integer, integer, integer, integer, jsonb) from public, anon, authenticated;
revoke all on function public.fail_generated_core_mock(uuid, uuid, text, numeric, text, text) from public, anon, authenticated;
grant execute on function public.reserve_generated_core_mock(uuid, uuid, text, integer, text, text) to service_role;
grant execute on function public.persist_generated_core_mock_attempt(uuid, uuid, uuid, text, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, numeric, boolean, jsonb, jsonb, timestamptz, timestamptz, uuid, timestamptz, uuid, numeric, integer, integer, integer, integer, jsonb) to service_role;
grant execute on function public.fail_generated_core_mock(uuid, uuid, text, numeric, text, text) to service_role;
