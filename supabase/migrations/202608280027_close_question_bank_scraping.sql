-- Student content is served through authenticated, ownership-aware Next.js
-- data services. Direct PostgREST reads are unnecessary and allow bulk
-- scraping of the full published bank even though answer columns are hidden.

revoke select (
  id, module, question_type, subject, topic, subtopic, difficulty, question_text,
  passage, code, formula, table_data, diagram_data, image_url,
  estimated_time_seconds, source_type, verification_status, publication_status,
  version, published_at, created_at, updated_at
) on public.questions from anon, authenticated;

revoke select on public.question_options from anon, authenticated;
revoke select on public.tests from anon, authenticated;
revoke select on public.test_sections from anon, authenticated;
revoke select on public.test_questions from anon, authenticated;

-- Reviewer/Admin mutations must also pass the current Server Action schemas,
-- fresh role checks, workflow validation, and audit writes. Keep read policies
-- for operational visibility, but remove direct browser mutation privileges.
revoke insert, update, delete on public.question_reviews from authenticated;
revoke insert, update, delete on public.subscriptions from authenticated;

-- Keep RLS policies in place as defense in depth and for future narrowly
-- scoped grants. Current application reads continue through service_role-only
-- server data modules after fresh authentication/authorization.
