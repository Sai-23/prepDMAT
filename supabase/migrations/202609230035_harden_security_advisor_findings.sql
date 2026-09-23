begin;

-- The trigger body uses only NEW plus pg_catalog functions, so an empty path
-- is safe and prevents object-shadowing if another schema becomes writable.
alter function public.set_updated_at() set search_path = '';

-- RLS role predicates must bypass user_roles RLS, but they do not belong in
-- the Data API's exposed public schema. ALTER ... SET SCHEMA preserves the
-- function OIDs, so every existing policy dependency follows the move.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to anon, authenticated, service_role;

do $migration$
begin
  if to_regprocedure('private.current_user_has_role(public.app_role)') is null then
    if to_regprocedure('public.current_user_has_role(public.app_role)') is null then
      raise exception 'required function public.current_user_has_role(public.app_role) is missing';
    end if;
    alter function public.current_user_has_role(public.app_role) set schema private;
  elsif to_regprocedure('public.current_user_has_role(public.app_role)') is not null then
    raise exception 'both public and private current_user_has_role functions exist';
  end if;

  if to_regprocedure('private.current_user_has_any_role(public.app_role[])') is null then
    if to_regprocedure('public.current_user_has_any_role(public.app_role[])') is null then
      raise exception 'required function public.current_user_has_any_role(public.app_role[]) is missing';
    end if;
    alter function public.current_user_has_any_role(public.app_role[]) set schema private;
  elsif to_regprocedure('public.current_user_has_any_role(public.app_role[])') is not null then
    raise exception 'both public and private current_user_has_any_role functions exist';
  end if;
end
$migration$;

create or replace function private.current_user_has_role(target_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = target_role
  );
$function$;

create or replace function private.current_user_has_any_role(target_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = any (target_roles)
  );
$function$;

revoke all on function private.current_user_has_role(public.app_role)
  from public, anon, authenticated;
revoke all on function private.current_user_has_any_role(public.app_role[])
  from public, anon, authenticated;
-- These grants are needed while RLS evaluates policies as the calling role.
-- The private schema is not exposed by PostgREST, so they are not RPC routes.
grant execute on function private.current_user_has_role(public.app_role)
  to anon, authenticated, service_role;
grant execute on function private.current_user_has_any_role(public.app_role[])
  to anon, authenticated, service_role;

comment on function private.current_user_has_role(public.app_role) is
  'SECURITY DEFINER RLS predicate. Private-schema only; not a Data API RPC.';
comment on function private.current_user_has_any_role(public.app_role[]) is
  'SECURITY DEFINER RLS predicate. Private-schema only; not a Data API RPC.';

-- These relations are deliberately service-only. Application server paths use
-- service_role and ownership-scoped RPCs; browser roles must have no direct
-- table privileges. RLS with no browser policy is intentional deny-by-default.
revoke all on table
  public.core_mock_generation_events,
  public.generated_core_mocks,
  public.practice_events,
  public.practice_session_items,
  public.practice_sessions,
  public.public_diagnostic_items,
  public.public_diagnostic_sessions,
  public.security_rate_limits,
  public.general_academic_bookmarks,
  public.general_academic_mistakes,
  public.general_academic_mock_answers,
  public.general_academic_mock_attempts,
  public.general_academic_practice_answers,
  public.general_academic_practice_attempts
from public, anon, authenticated;

comment on table public.core_mock_generation_events is 'Service-only Core mock generation audit data; browser access is intentionally denied.';
comment on table public.generated_core_mocks is 'Service-only immutable generated Core mock snapshots; browser access is intentionally denied.';
comment on table public.practice_events is 'Service-only Core practice events; browser access is intentionally denied.';
comment on table public.practice_session_items is 'Service-only Core practice snapshots and answers; browser access is intentionally denied.';
comment on table public.practice_sessions is 'Service-only Core practice sessions; browser access is intentionally denied.';
comment on table public.public_diagnostic_items is 'Service-only public diagnostic question and answer snapshots; browser access is intentionally denied.';
comment on table public.public_diagnostic_sessions is 'Service-only opaque public diagnostic sessions; browser access is intentionally denied.';
comment on table public.security_rate_limits is 'Service-only security enforcement state; browser access is intentionally denied.';
comment on table public.general_academic_bookmarks is 'Service-only General Academic student state; GAM is production-disabled and browser access is intentionally denied.';
comment on table public.general_academic_mistakes is 'Service-only General Academic student state; GAM is production-disabled and browser access is intentionally denied.';
comment on table public.general_academic_mock_answers is 'Service-only General Academic answer data; GAM is production-disabled and browser access is intentionally denied.';
comment on table public.general_academic_mock_attempts is 'Service-only General Academic attempts; GAM is production-disabled and browser access is intentionally denied.';
comment on table public.general_academic_practice_answers is 'Service-only General Academic answer data; GAM is production-disabled and browser access is intentionally denied.';
comment on table public.general_academic_practice_attempts is 'Service-only General Academic attempts; GAM is production-disabled and browser access is intentionally denied.';

-- Preserve least-privilege defaults for future public-schema objects created by
-- the migration owner. Explicit grants remain required for every browser path.
alter default privileges in schema public revoke all privileges on tables from public, anon, authenticated;
alter default privileges in schema public revoke all privileges on sequences from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema public grant execute on functions to service_role;

commit;
