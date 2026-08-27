-- Pre-production security remediation.
-- This forward migration replaces legacy broad browser grants with explicit,
-- least-privilege access while preserving service-role application flows.

revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;

-- Earlier migrations intentionally used column grants after revoking table
-- SELECT. Revoke those known grants explicitly before rebuilding the browser
-- read surface below.
revoke select (
  id, module, question_type, subject, topic, subtopic, difficulty, question_text,
  passage, code, formula, table_data, diagram_data, image_url,
  estimated_time_seconds, source_type, verification_status, publication_status,
  version, published_at, created_at, updated_at
) on public.questions from anon, authenticated;

revoke select (
  id, test_id, generated_mock_id, mock_origin, display_title, user_id,
  status, started_at, submitted_at, expires_at, total_time_seconds,
  score, accuracy, last_activity_at, created_at, updated_at
) on public.test_attempts from authenticated;

-- Public question/test reads exclude answer keys, explanations, structured
-- solution metadata, private snapshots, and account-specific state.
grant select (
  id, module, question_type, subject, topic, subtopic, difficulty, question_text,
  passage, code, formula, table_data, diagram_data, image_url,
  estimated_time_seconds, source_type, verification_status, publication_status,
  version, published_at, created_at, updated_at
) on public.questions to anon, authenticated;

grant select (id, question_id, label, content, sort_order, created_at, updated_at)
  on public.question_options to anon, authenticated;

grant select (
  id, title, description, test_type, module, duration_seconds, instructions,
  is_published, randomize_questions, randomize_options, created_at, updated_at
) on public.tests to anon, authenticated;

grant select (
  id, test_id, title, section_type, module, duration_seconds, sort_order,
  template_version, is_current, created_at, updated_at
) on public.test_sections to anon, authenticated;

grant select (id, test_section_id, question_id, sort_order, created_at, updated_at)
  on public.test_questions to anon, authenticated;

-- Authenticated SSR reads used by layout/auth guards. All student mutations
-- are performed by authenticated Server Actions through the service client.
grant select on public.profiles to authenticated;
grant select on public.user_roles to authenticated;

-- Preserve safe owner-scoped attempt summaries without exposing response rows
-- or immutable snapshots.
grant select (
  id, test_id, generated_mock_id, mock_origin, display_title, user_id,
  status, started_at, submitted_at, expires_at, total_time_seconds,
  score, accuracy, last_activity_at, created_at, updated_at
) on public.test_attempts to authenticated;

-- Review/report history may be read only through the existing RLS policies.
grant select on public.question_reports to authenticated;
grant select, insert, delete on public.question_reviews to authenticated;

-- Subscription rows remain readable by their owner. Only an authenticated
-- Admin (via RLS) or the service role can mutate them.
grant select, insert, update, delete on public.subscriptions to authenticated;

drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;

drop policy if exists subscriptions_access on public.subscriptions;
drop policy if exists subscriptions_select on public.subscriptions;
drop policy if exists subscriptions_insert on public.subscriptions;
drop policy if exists subscriptions_update on public.subscriptions;
drop policy if exists subscriptions_delete on public.subscriptions;

create policy subscriptions_select
  on public.subscriptions
  for select
  using (auth.uid() = user_id or public.current_user_has_role('admin'));

create policy subscriptions_insert
  on public.subscriptions
  for insert
  with check (public.current_user_has_role('admin'));

create policy subscriptions_update
  on public.subscriptions
  for update
  using (public.current_user_has_role('admin'))
  with check (public.current_user_has_role('admin'));

create policy subscriptions_delete
  on public.subscriptions
  for delete
  using (public.current_user_has_role('admin'));

drop policy if exists question_reports_insert on public.question_reports;
drop policy if exists question_reports_update on public.question_reports;

alter table public.question_reports
  drop constraint if exists question_reports_details_length_check;
alter table public.question_reports
  add constraint question_reports_details_length_check
  check (details is null or char_length(details) <= 2000) not valid;

create or replace function public.enforce_question_report_invariants()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  encountered_user_id uuid;
  encountered_question_id uuid;
begin
  if new.practice_session_item_id is null then
    raise exception 'question_report_encounter_required';
  end if;

  if new.details is not null and char_length(new.details) > 2000 then
    raise exception 'question_report_details_too_long';
  end if;

  select session.user_id, item.source_question_id
    into encountered_user_id, encountered_question_id
  from public.practice_session_items as item
  join public.practice_sessions as session on session.id = item.session_id
  where item.id = new.practice_session_item_id;

  if encountered_user_id is null or encountered_user_id <> new.reporter_id then
    raise exception 'question_report_encounter_mismatch';
  end if;

  if new.question_id is distinct from encountered_question_id then
    raise exception 'question_report_question_mismatch';
  end if;

  if new.status <> 'open' or new.resolved_by is not null or new.resolved_at is not null then
    raise exception 'question_report_initial_state_invalid';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(new.reporter_id::text || ':' || new.practice_session_item_id::text, 29)
  );

  if exists (
    select 1
    from public.question_reports as existing
    where existing.reporter_id = new.reporter_id
      and existing.practice_session_item_id = new.practice_session_item_id
      and existing.status in ('open', 'under_review')
  ) then
    raise exception 'question_report_duplicate';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_question_report_invariants
  on public.question_reports;
create trigger enforce_question_report_invariants
  before insert on public.question_reports
  for each row execute procedure public.enforce_question_report_invariants();

drop policy if exists question_reviews_modify on public.question_reviews;
drop policy if exists question_reviews_insert on public.question_reviews;
drop policy if exists question_reviews_update on public.question_reviews;
drop policy if exists question_reviews_delete on public.question_reviews;

create policy question_reviews_insert
  on public.question_reviews
  for insert
  with check (
    reviewer_id = auth.uid()
    and public.current_user_has_any_role(array['reviewer', 'admin']::public.app_role[])
  );

-- Review decisions are append-only for reviewers. Only Admin may remove a
-- review; no authenticated UPDATE policy or UPDATE grant is present.
create policy question_reviews_delete
  on public.question_reviews
  for delete
  using (public.current_user_has_role('admin'));

create table if not exists public.security_rate_limits (
  scope text not null,
  subject_hash text not null,
  window_started_at timestamptz not null,
  attempt_count integer not null check (attempt_count > 0),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (scope, subject_hash),
  constraint security_rate_limits_scope_check
    check (scope ~ '^[a-z0-9:_-]{1,80}$'),
  constraint security_rate_limits_subject_hash_check
    check (subject_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists idx_security_rate_limits_window
  on public.security_rate_limits(window_started_at);

alter table public.security_rate_limits enable row level security;
revoke all on public.security_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.security_rate_limits to service_role;

create or replace function public.consume_security_rate_limit(
  p_scope text,
  p_subject_hash text,
  p_max_attempts integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.security_rate_limits%rowtype;
  current_time timestamptz := timezone('utc', now());
  elapsed_seconds integer;
begin
  if p_scope is null or p_scope !~ '^[a-z0-9:_-]{1,80}$' then
    raise exception 'rate_limit_scope_invalid';
  end if;
  if p_subject_hash is null or p_subject_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'rate_limit_subject_invalid';
  end if;
  if p_max_attempts < 1 or p_max_attempts > 10000 then
    raise exception 'rate_limit_max_invalid';
  end if;
  if p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'rate_limit_window_invalid';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_scope || ':' || p_subject_hash, 31)
  );

  select * into current_row
  from public.security_rate_limits
  where scope = p_scope and subject_hash = p_subject_hash
  for update;

  if not found
    or current_row.window_started_at + make_interval(secs => p_window_seconds) <= current_time
  then
    insert into public.security_rate_limits (
      scope, subject_hash, window_started_at, attempt_count, updated_at
    ) values (
      p_scope, p_subject_hash, current_time, 1, current_time
    )
    on conflict (scope, subject_hash) do update
      set window_started_at = excluded.window_started_at,
          attempt_count = 1,
          updated_at = excluded.updated_at;

    return query select true, greatest(0, p_max_attempts - 1), 0;
    return;
  end if;

  elapsed_seconds := greatest(
    0,
    floor(extract(epoch from (current_time - current_row.window_started_at)))::integer
  );

  if current_row.attempt_count >= p_max_attempts then
    return query select false, 0, greatest(1, p_window_seconds - elapsed_seconds);
    return;
  end if;

  update public.security_rate_limits
  set attempt_count = attempt_count + 1,
      updated_at = current_time
  where scope = p_scope and subject_hash = p_subject_hash;

  return query
    select true, greatest(0, p_max_attempts - current_row.attempt_count - 1), 0;
end;
$$;

-- SECURITY DEFINER/RPC functions are deny-by-default. Role helpers remain
-- callable because RLS policies depend on them; privileged mutations remain
-- service-role only.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.current_user_has_role(public.app_role)
  to anon, authenticated;
grant execute on function public.current_user_has_any_role(public.app_role[])
  to anon, authenticated;
grant execute on all functions in schema public to service_role;

revoke create on schema public from public, anon, authenticated;

alter default privileges in schema public
  revoke all privileges on tables from anon, authenticated;
alter default privileges in schema public
  revoke all privileges on sequences from anon, authenticated;
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;
alter default privileges in schema public
  grant execute on functions to service_role;
