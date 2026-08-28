# PrepDMAT

PrepDMAT is an independent preparation platform for the Digital Master Test Core Module: Figure Sequences, Mathematical Equations, and Latin Squares. It is not affiliated with or endorsed by the official dMAT examination authorities.

## Current product

- Free launch-stage student experience with onboarding and a 15-question diagnostic
- Generated Core practice with secure persistence, answer locking, feedback, and worked explanations
- Curated and on-demand Core mock tests with restorable timers and autosave
- Dashboard, results, mistake review, bookmarks, and deterministic progress analytics
- Role-protected Admin authoring, review, validated generator, and publishing workflows
- Supabase authentication, Row Level Security, server-only privileged operations, and database-backed rate limiting
- Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS 4, and Vitest

Future subscription and entitlement data structures are retained, but no pricing or paywall is exposed in the current student product. Direct visits to `/pricing` redirect to the landing page.

## Environment

Copy `.env.example` to `.env.local` and provide the deployment-specific values. The schema in `src/lib/validators/env-schema.ts` is the source of truth for supported variables.

Required base configuration:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY`, `SECURITY_RATE_LIMIT_SECRET`, and all local environment files are server-only secrets and must never be committed or exposed to browser code.

## Development

```bash
npm ci
npm run dev
```

Run the complete local verification gate:

```bash
npm run check
npm run build
npm audit --audit-level=high
git diff --check
```

Focused generator audits and report-rendering commands are available under `scripts/`. Audit summaries and human-review evidence are retained under `reports/`; regenerable per-item render inputs and shard intermediates are intentionally ignored.

## Database and deployment

Supabase configuration is in `supabase/config.toml`, with ordered, immutable history in `supabase/migrations/`. Never edit an applied migration; add a new migration for future schema changes.

The application targets Vercel. Configure the same validated environment variables in each deployment environment and follow `docs/AUTH-DEPLOYMENT.md` plus `docs/ON-DEMAND-CORE-MOCK-STAGING.md` for provider and staging checks.

Architecture and product policy live in `docs/`. Historical audits and removal reports are retained as dated evidence and should not be treated as current implementation inventories.
