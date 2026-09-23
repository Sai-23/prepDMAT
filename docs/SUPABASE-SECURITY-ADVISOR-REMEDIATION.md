# Supabase Security Advisor remediation — 2026-09-23

## Dependency audit

The repository defines `public.set_updated_at()` as a `plpgsql` trigger function. It reads only `NEW.updated_at` and the `pg_catalog` functions `timezone` and `now`. It is attached to timestamped Core, auth-support, test, public-diagnostic, and General Academic tables. No application code calls it. Its migration definition had no function-level `search_path`, causing the mutable-path finding.

`public.current_user_has_role(public.app_role)` and `public.current_user_has_any_role(public.app_role[])` are stable SQL `SECURITY DEFINER` functions. Both read the schema-qualified `public.user_roles` table and compare its `user_id` with schema-qualified `auth.uid()`. The enum arguments only select a role to test; neither helper writes data or accepts a user ID, so callers cannot test or assign roles for another identity. Application TypeScript does not call either function directly. RLS policies across profiles, roles, question authoring/review, test administration, reporting, subscriptions, fidelity review, and General Academic administration depend on them.

The original migrations set both helpers to `search_path = public` and explicitly granted `EXECUTE` to `anon` and `authenticated`. The production Advisor finding confirms that state. Migration `202609230035` moves the same function objects to `private`, retaining their policy dependencies, recreates their bodies with `search_path = ''`, and grants only the execution needed during RLS evaluation. The configured Data API exposes `public`, `storage`, and `graphql_public`, not `private`; therefore the helpers cease to be `/rpc/...` endpoints.

Function ownership is not encoded in migration source. Supabase migrations normally create these functions as the project migration owner (typically `postgres`), and `ALTER FUNCTION ... SET SCHEMA` preserves that owner. Verify the live owner and post-migration state with the catalog query below rather than assuming it:

```sql
select n.nspname as schema_name,
       p.proname,
       pg_get_function_identity_arguments(p.oid) as signature,
       pg_get_userbyid(p.proowner) as owner,
       p.prosecdef as security_definer,
       p.proconfig as function_config,
       p.proacl as execute_acl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname in ('set_updated_at', 'current_user_has_role', 'current_user_has_any_role')
order by n.nspname, p.proname;
```

All other repository `SECURITY DEFINER` functions already have an explicit function-level `search_path = public`. Their referenced application relations are schema-qualified, browser execution is revoked, and `CREATE` on `public` is revoked from `PUBLIC`, `anon`, and `authenticated`. They are therefore pinned rather than mutable. Moving every service-only RPC in this focused remediation would create unnecessary application and PostgREST compatibility risk; the new migration reasserts deny-by-default function privileges for future objects.

## RLS-no-policy classification

| Tables | Classification | Intended access |
| --- | --- | --- |
| `core_mock_generation_events`, `generated_core_mocks` | A — internal/service-only | Core mock server orchestration and service-role RPCs |
| `practice_events`, `practice_session_items`, `practice_sessions` | A — internal/service-only | Core Practice server DAL and ownership-scoped service-role RPCs |
| `public_diagnostic_items`, `public_diagnostic_sessions` | C — public-flow data, service mediated | Opaque public diagnostic token flow through server-only RPCs; never raw browser table access |
| `security_rate_limits` | A — internal/service-only | Server-side security enforcement only |
| `general_academic_bookmarks`, `general_academic_mistakes`, `general_academic_mock_answers`, `general_academic_mock_attempts`, `general_academic_practice_answers`, `general_academic_practice_attempts` | D — General Academic currently disabled | Server/admin development paths only; no student or browser table access |

RLS with no browser policy is intentional for every listed table. The migration explicitly revokes direct table privileges from `PUBLIC`, `anon`, and `authenticated` and documents the deny-all intent. It does not add `USING (true)` or synthetic policies merely to silence informational Advisor warnings.

## Hosted Auth manual action

Leaked-password protection is a hosted Supabase Auth setting, not a database migration. In the production project Dashboard, open **Authentication → Settings** (the current UI may label the subsection **Password security**), enable **Leaked password protection**, save, and rerun Security Advisor. Supabase documents this setting as available on Pro plans and above. The application currently enforces 8–128 characters with at least one letter and one number for registration/reset. This remediation does not change that application contract or existing-user authentication behavior.

## Production verification

After applying the migration, run the catalog query above, `supabase db lint`, and `supabase test db`. Confirm that `public.current_user_has_role(...)` and `public.current_user_has_any_role(...)` are absent, their `private` equivalents are `SECURITY DEFINER` with `search_path=` in `proconfig`, the owner is the expected trusted migration owner, and the two helpers are not present in the Data API OpenAPI/RPC list. The RLS-no-policy entries may remain as documented informational deny-all findings.
