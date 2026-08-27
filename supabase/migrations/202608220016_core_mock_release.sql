-- Phase 5: persist complete immutable Core attempts in one database transaction.
alter table public.test_attempts
  add column if not exists mock_seed text,
  add column if not exists protocol_version text,
  add column if not exists generator_versions jsonb not null default '{}'::jsonb,
  add column if not exists question_fingerprints jsonb not null default '{}'::jsonb;

create index if not exists idx_test_attempts_mock_seed
  on public.test_attempts (user_id, mock_seed);

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
  if p_mock_seed is null or btrim(p_mock_seed) = '' then
    raise exception 'A mock seed is required.';
  end if;
  if p_protocol_version is null or btrim(p_protocol_version) = '' then
    raise exception 'A protocol version is required.';
  end if;
  item_count := jsonb_array_length(p_items);
  response_count := jsonb_array_length(p_response_question_ids);
  if item_count = 0 or item_count <> response_count then
    raise exception 'The immutable item and response manifests must be complete.';
  end if;

  insert into public.test_attempts (
    id, test_id, user_id, status, started_at, expires_at,
    current_section_id, section_started_at, section_expires_at,
    current_question_id, randomization_seed, mock_seed, protocol_version,
    generator_versions, question_fingerprints, test_snapshot
  ) values (
    p_attempt_id, p_test_id, p_user_id, 'in_progress', p_started_at, p_expires_at,
    p_current_section_id, p_started_at, p_section_expires_at,
    p_current_question_id, p_mock_seed, p_mock_seed, p_protocol_version,
    p_generator_versions, p_question_fingerprints, p_test_snapshot
  );

  insert into public.practice_attempt_items (
    attempt_id, source_question_id, position, test_section_id,
    section_position, question_type, public_snapshot, private_snapshot,
    generator_version, validator_version, seed, fingerprint
  )
  select
    p_attempt_id, item.source_question_id, item.position,
    item.test_section_id, item.section_position,
    item.question_type::public.question_type,
    item.public_snapshot, item.private_snapshot,
    item.generator_version, item.validator_version, item.seed, item.fingerprint
  from jsonb_to_recordset(p_items) as item(
    source_question_id uuid,
    position integer,
    test_section_id uuid,
    section_position integer,
    question_type text,
    public_snapshot jsonb,
    private_snapshot jsonb,
    generator_version text,
    validator_version text,
    seed text,
    fingerprint text
  );

  insert into public.user_responses (
    attempt_id, question_id, response_status
  )
  select p_attempt_id, value::uuid, 'unanswered'
  from jsonb_array_elements_text(p_response_question_ids);

  return p_attempt_id;
end;
$$;

revoke all on function public.create_core_mock_attempt(
  uuid, uuid, uuid, text, text, jsonb, jsonb, jsonb, jsonb, jsonb,
  timestamptz, timestamptz, uuid, timestamptz, uuid
) from public, anon, authenticated;

grant execute on function public.create_core_mock_attempt(
  uuid, uuid, uuid, text, text, jsonb, jsonb, jsonb, jsonb, jsonb,
  timestamptz, timestamptz, uuid, timestamptz, uuid
) to service_role;
