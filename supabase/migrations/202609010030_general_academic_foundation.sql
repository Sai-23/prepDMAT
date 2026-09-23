begin;

create type public.general_academic_domain as enum (
  'mathematics',
  'computational_sciences',
  'natural_sciences',
  'engineering',
  'business_administration',
  'economics',
  'social_sciences',
  'humanities'
);

create type public.general_academic_origin as enum (
  'manual',
  'json_import',
  'external_ai',
  'openai',
  'parameterized',
  'deterministic'
);

create type public.general_academic_skill as enum (
  'source_information',
  'concept_classification',
  'variable_identification',
  'formula_interpretation',
  'formula_substitution',
  'formula_rearrangement',
  'proportional_reasoning',
  'parameter_sensitivity',
  'graph_interpretation',
  'table_interpretation',
  'multi_representation',
  'causal_reasoning',
  'assumption_analysis',
  'research_design',
  'novel_scenario_transfer'
);

create type public.general_academic_review_status as enum (
  'draft',
  'needs_review',
  'approved',
  'published',
  'rejected',
  'archived'
);

create table public.general_academic_source_packs (
  id uuid primary key default gen_random_uuid(),
  schema_version text not null default 'general-academic-pack@1'
    check (schema_version = 'general-academic-pack@1'),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  domain public.general_academic_domain not null,
  topic text not null check (char_length(btrim(topic)) between 1 and 200),
  difficulty public.question_difficulty not null,
  origin public.general_academic_origin not null,
  source_meta jsonb not null default '{}'::jsonb
    check (jsonb_typeof(source_meta) = 'object'),
  stimulus_text text not null check (char_length(btrim(stimulus_text)) between 1 and 100000),
  stimulus_json jsonb not null default '{"formulas":[],"tables":[],"graphs":[],"figures":[]}'::jsonb
    check (jsonb_typeof(stimulus_json) = 'object'),
  tags text[] not null default '{}'::text[] check (cardinality(tags) <= 20),
  review_status public.general_academic_review_status not null default 'draft',
  review_notes text check (review_notes is null or char_length(review_notes) <= 5000),
  content_fingerprint text not null check (char_length(content_fingerprint) between 1 and 128),
  created_by uuid not null references auth.users (id) on delete restrict,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  published_at timestamptz,
  deleted_at timestamptz,
  check (review_status <> 'published' or published_at is not null)
);

create or replace function public.general_academic_valid_options(
  options_value jsonb,
  correct_value text
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select
    jsonb_typeof(options_value) = 'array'
    and jsonb_array_length(options_value) = 4
    and correct_value in ('A', 'B', 'C', 'D')
    and (
      select count(*) = 4
        and count(distinct option ->> 'id') = 4
        and array_agg(option ->> 'id' order by option ->> 'id') = array['A', 'B', 'C', 'D']::text[]
        and count(distinct lower(regexp_replace(btrim(option ->> 'text'), '\s+', ' ', 'g'))) = 4
        and bool_and(jsonb_typeof(option) = 'object' and char_length(btrim(option ->> 'text')) > 0)
      from jsonb_array_elements(options_value) option
    )
$$;

create or replace function public.general_academic_valid_explanation(explanation_value jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select
    jsonb_typeof(explanation_value) = 'object'
    and char_length(btrim(explanation_value ->> 'summary')) > 0
    and jsonb_typeof(explanation_value -> 'steps') = 'array'
    and jsonb_array_length(explanation_value -> 'steps') > 0
    and not exists (
      select 1 from jsonb_array_elements_text(explanation_value -> 'steps') step
      where char_length(btrim(step)) = 0
    )
    and char_length(btrim(explanation_value ->> 'takeaway')) > 0
$$;

create table public.general_academic_questions (
  id uuid primary key default gen_random_uuid(),
  source_pack_id uuid not null references public.general_academic_source_packs (id) on delete cascade,
  local_id text not null check (local_id ~ '^[A-Za-z][A-Za-z0-9_-]{0,63}$'),
  order_index integer not null check (order_index > 0),
  skill public.general_academic_skill not null,
  difficulty public.question_difficulty not null,
  prompt text not null check (char_length(btrim(prompt)) between 1 and 10000),
  options_json jsonb not null,
  correct_option text not null check (correct_option in ('A', 'B', 'C', 'D')),
  explanation_json jsonb not null,
  validation_json jsonb check (validation_json is null or jsonb_typeof(validation_json) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (source_pack_id, local_id),
  unique (source_pack_id, order_index),
  check (coalesce(public.general_academic_valid_options(options_json, correct_option), false)),
  check (coalesce(public.general_academic_valid_explanation(explanation_json), false))
);

create index idx_general_academic_packs_review
  on public.general_academic_source_packs (review_status, updated_at desc)
  where deleted_at is null;
create index idx_general_academic_packs_domain_topic
  on public.general_academic_source_packs (domain, topic)
  where deleted_at is null;
create index idx_general_academic_packs_fingerprint
  on public.general_academic_source_packs (content_fingerprint)
  where deleted_at is null;
create index idx_general_academic_questions_pack_order
  on public.general_academic_questions (source_pack_id, order_index);
create index idx_general_academic_questions_skill
  on public.general_academic_questions (skill, difficulty);

create trigger set_general_academic_source_packs_updated_at
  before update on public.general_academic_source_packs
  for each row execute procedure public.set_updated_at();
create trigger set_general_academic_questions_updated_at
  before update on public.general_academic_questions
  for each row execute procedure public.set_updated_at();

alter table public.general_academic_source_packs enable row level security;
alter table public.general_academic_questions enable row level security;

create policy general_academic_source_packs_select
  on public.general_academic_source_packs for select
  using (public.current_user_has_any_role(array['reviewer', 'admin']::public.app_role[]));
create policy general_academic_source_packs_insert
  on public.general_academic_source_packs for insert
  with check (public.current_user_has_role('admin') and created_by = auth.uid());
create policy general_academic_source_packs_update
  on public.general_academic_source_packs for update
  using (public.current_user_has_role('admin'))
  with check (public.current_user_has_role('admin'));
create policy general_academic_source_packs_delete
  on public.general_academic_source_packs for delete
  using (public.current_user_has_role('admin'));

create policy general_academic_questions_select
  on public.general_academic_questions for select
  using (public.current_user_has_any_role(array['reviewer', 'admin']::public.app_role[]));
create policy general_academic_questions_insert
  on public.general_academic_questions for insert
  with check (public.current_user_has_role('admin'));
create policy general_academic_questions_update
  on public.general_academic_questions for update
  using (public.current_user_has_role('admin'))
  with check (public.current_user_has_role('admin'));
create policy general_academic_questions_delete
  on public.general_academic_questions for delete
  using (public.current_user_has_role('admin'));

revoke all on public.general_academic_source_packs from public, anon, authenticated;
revoke all on public.general_academic_questions from public, anon, authenticated;
grant select on public.general_academic_source_packs, public.general_academic_questions to authenticated;

create or replace function public.create_general_academic_draft(
  p_actor_id uuid,
  p_pack jsonb,
  p_content_fingerprint text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pack_id uuid;
begin
  if not exists (
    select 1 from public.user_roles where user_id = p_actor_id and role = 'admin'
  ) then
    raise exception 'general_academic_admin_required' using errcode = '42501';
  end if;
  if (p_pack ->> 'schemaVersion') is distinct from 'general-academic-pack@1'
     or (p_pack -> 'review' ->> 'status') is distinct from 'draft' then
    raise exception 'general_academic_draft_required' using errcode = '22023';
  end if;

  insert into public.general_academic_source_packs (
    schema_version, title, domain, topic, difficulty, origin, source_meta,
    stimulus_text, stimulus_json, tags, review_status, review_notes,
    content_fingerprint, created_by
  ) values (
    p_pack ->> 'schemaVersion',
    p_pack ->> 'title',
    (p_pack ->> 'domain')::public.general_academic_domain,
    p_pack ->> 'topic',
    (p_pack ->> 'difficulty')::public.question_difficulty,
    (p_pack ->> 'origin')::public.general_academic_origin,
    p_pack -> 'sourceMeta',
    p_pack -> 'stimulus' ->> 'text',
    jsonb_build_object(
      'formulas', p_pack -> 'stimulus' -> 'formulas',
      'tables', p_pack -> 'stimulus' -> 'tables',
      'graphs', p_pack -> 'stimulus' -> 'graphs',
      'figures', p_pack -> 'stimulus' -> 'figures'
    ),
    array(select jsonb_array_elements_text(p_pack -> 'tags')),
    'draft',
    p_pack -> 'review' ->> 'notes',
    p_content_fingerprint,
    p_actor_id
  ) returning id into v_pack_id;

  insert into public.general_academic_questions (
    source_pack_id, local_id, order_index, skill, difficulty, prompt,
    options_json, correct_option, explanation_json, validation_json
  )
  select
    v_pack_id,
    question ->> 'id',
    (question ->> 'order')::integer,
    (question ->> 'skill')::public.general_academic_skill,
    (question ->> 'difficulty')::public.question_difficulty,
    question ->> 'prompt',
    question -> 'options',
    question ->> 'correctOption',
    question -> 'explanation',
    question -> 'validation'
  from jsonb_array_elements(p_pack -> 'questions') question;

  return v_pack_id;
end;
$$;

create or replace function public.update_general_academic_draft(
  p_actor_id uuid,
  p_pack_id uuid,
  p_pack jsonb,
  p_content_fingerprint text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.user_roles where user_id = p_actor_id and role = 'admin'
  ) then
    raise exception 'general_academic_admin_required' using errcode = '42501';
  end if;
  if (p_pack ->> 'schemaVersion') is distinct from 'general-academic-pack@1'
     or (p_pack -> 'review' ->> 'status') is distinct from 'draft' then
    raise exception 'general_academic_draft_required' using errcode = '22023';
  end if;
  perform 1 from public.general_academic_source_packs
    where id = p_pack_id and review_status = 'draft' and deleted_at is null
    for update;
  if not found then
    raise exception 'general_academic_draft_unavailable' using errcode = 'P0002';
  end if;

  update public.general_academic_source_packs set
    schema_version = p_pack ->> 'schemaVersion',
    title = p_pack ->> 'title',
    domain = (p_pack ->> 'domain')::public.general_academic_domain,
    topic = p_pack ->> 'topic',
    difficulty = (p_pack ->> 'difficulty')::public.question_difficulty,
    origin = (p_pack ->> 'origin')::public.general_academic_origin,
    source_meta = p_pack -> 'sourceMeta',
    stimulus_text = p_pack -> 'stimulus' ->> 'text',
    stimulus_json = jsonb_build_object(
      'formulas', p_pack -> 'stimulus' -> 'formulas',
      'tables', p_pack -> 'stimulus' -> 'tables',
      'graphs', p_pack -> 'stimulus' -> 'graphs',
      'figures', p_pack -> 'stimulus' -> 'figures'
    ),
    tags = array(select jsonb_array_elements_text(p_pack -> 'tags')),
    review_status = 'draft',
    review_notes = p_pack -> 'review' ->> 'notes',
    content_fingerprint = p_content_fingerprint,
    reviewed_by = null,
    published_at = null
  where id = p_pack_id;

  delete from public.general_academic_questions where source_pack_id = p_pack_id;
  insert into public.general_academic_questions (
    source_pack_id, local_id, order_index, skill, difficulty, prompt,
    options_json, correct_option, explanation_json, validation_json
  )
  select
    p_pack_id,
    question ->> 'id',
    (question ->> 'order')::integer,
    (question ->> 'skill')::public.general_academic_skill,
    (question ->> 'difficulty')::public.question_difficulty,
    question ->> 'prompt',
    question -> 'options',
    question ->> 'correctOption',
    question -> 'explanation',
    question -> 'validation'
  from jsonb_array_elements(p_pack -> 'questions') question;
end;
$$;

revoke all on function public.create_general_academic_draft(uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.update_general_academic_draft(uuid, uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.create_general_academic_draft(uuid, jsonb, text) to service_role;
grant execute on function public.update_general_academic_draft(uuid, uuid, jsonb, text) to service_role;

comment on table public.general_academic_source_packs is
  'Draft-first General Academic source packs. No student delivery policy exists in Phase 1.';
comment on column public.general_academic_source_packs.stimulus_json is
  'Structured formulas, tables, graphs, and non-executable figure descriptors.';
comment on column public.general_academic_source_packs.content_fingerprint is
  'Deterministic normalized-content fingerprint for exact duplicate detection groundwork.';

commit;
