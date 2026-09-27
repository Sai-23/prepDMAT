-- Keep the personalized Practice landing query index-backed as history grows.
-- Diagnostic sessions are excluded by the query after the completed rows are narrowed.
create index if not exists idx_practice_sessions_completed_history
  on public.practice_sessions(user_id, completed_at desc)
  where status = 'completed';

-- The global authenticated header previously needed separate profile and role
-- round trips on every render. security_invoker keeps both underlying RLS
-- policies authoritative while exposing only the fields used by the header.
create or replace view public.user_header_state
with (security_invoker = true)
as
select
  profile.id,
  profile.display_name,
  profile.full_name,
  profile.theme_preference,
  profile.diagnostic_status,
  coalesce(
    array_agg(user_role.role) filter (where user_role.role is not null),
    array[]::public.app_role[]
  ) as roles
from public.profiles as profile
left join public.user_roles as user_role on user_role.user_id = profile.id
group by
  profile.id,
  profile.display_name,
  profile.full_name,
  profile.theme_preference,
  profile.diagnostic_status;

revoke all on public.user_header_state from public, anon;
grant select on public.user_header_state to authenticated;
