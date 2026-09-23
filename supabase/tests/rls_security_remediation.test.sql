begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

-- Deterministic adversarial identities. Inserting Auth users exercises the
-- production signup trigger, which creates profiles and student roles.
insert into auth.users (
  id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('10000000-0000-4000-8000-000000000001', 'student-a@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('10000000-0000-4000-8000-000000000002', 'student-b@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('20000000-0000-4000-8000-000000000001', 'reviewer-a@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('20000000-0000-4000-8000-000000000002', 'reviewer-b@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('30000000-0000-4000-8000-000000000001', 'admin@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

delete from public.user_roles
where user_id in (
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000001'
);
insert into public.user_roles (user_id, role)
values
  ('20000000-0000-4000-8000-000000000001', 'reviewer'),
  ('20000000-0000-4000-8000-000000000002', 'reviewer'),
  ('30000000-0000-4000-8000-000000000001', 'admin');

insert into public.questions (
  id, module, question_type, topic, difficulty, question_text, explanation,
  estimated_time_seconds, verification_status, publication_status, created_by
)
values (
  '40000000-0000-4000-8000-000000000001', 'core', 'mathematical_equation',
  'Security fixture', 'easy', 'Fixture question?', 'Private explanation', 60,
  'approved', 'published', '30000000-0000-4000-8000-000000000001'
);

insert into public.test_attempts (
  id, test_id, user_id, status, started_at, total_time_seconds
)
values (
  '50000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'in_progress', now(), 0
);

insert into public.subscriptions (
  id, user_id, provider, plan_code, status, external_customer_id
)
values (
  '60000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'manual', 'future-plan', 'past_due', 'trusted-customer'
);

insert into public.question_reviews (id, question_id, reviewer_id, decision, comments)
values
  ('70000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'approved', 'Reviewer A'),
  ('70000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'changes_requested', 'Reviewer B');

insert into public.practice_sessions (
  id, user_id, module, difficulty_mode, question_count, timing_mode,
  source_mode, status, master_seed
)
values (
  '80000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'mathematical_equation', 'easy', 5, 'untimed', 'generated', 'completed', 'security-test'
);

insert into public.practice_session_items (
  id, session_id, source_question_id, question_key, position, question_type,
  difficulty, public_snapshot, private_snapshot, fingerprint,
  reasoning_family, reasoning_classification
)
values (
  '81000000-0000-4000-8000-000000000001',
  '80000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001', 1, 'mathematical_equation',
  'easy', '{}'::jsonb, '{"correctAnswer":1}'::jsonb, 'security-fingerprint',
  'fixture', 'fixture'
);

select ok(
  not has_table_privilege('anon', 'public.subscriptions', 'SELECT'),
  'anonymous attacker cannot read subscriptions'
);
select ok(
  not has_column_privilege('authenticated', 'public.questions', 'correct_option_id', 'SELECT'),
  'active clients cannot read correct option identifiers'
);
select ok(
  not has_column_privilege('authenticated', 'public.questions', 'explanation', 'SELECT'),
  'active clients cannot read explanations'
);
select ok(
  not has_column_privilege('authenticated', 'public.questions', 'structured_data', 'SELECT'),
  'active clients cannot read structured solution data'
);
select ok(
  not has_column_privilege('anon', 'public.questions', 'question_text', 'SELECT'),
  'anonymous clients cannot bulk-read published question text'
);
select ok(
  not has_column_privilege('authenticated', 'public.questions', 'question_text', 'SELECT'),
  'authenticated clients receive question content only through server routes'
);
select ok(
  not has_table_privilege('anon', 'public.question_options', 'SELECT'),
  'anonymous clients cannot bulk-read the option bank'
);
select ok(
  not has_table_privilege('anon', 'public.tests', 'SELECT'),
  'anonymous clients cannot enumerate the assessment catalog directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.test_questions', 'SELECT'),
  'authenticated clients cannot scrape complete test mappings directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.user_responses', 'SELECT'),
  'active clients cannot query response grading rows'
);
select ok(
  not has_table_privilege('authenticated', 'public.practice_session_items', 'SELECT'),
  'active clients cannot query immutable private snapshots'
);
select ok(
  not has_table_privilege('authenticated', 'public.mistake_notebook_entries', 'SELECT'),
  'active clients cannot enumerate notebook entries directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.mistake_notebook_entries', 'INSERT'),
  'active clients cannot insert notebook entries directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.mistake_notebook_entries', 'UPDATE'),
  'active clients cannot update notebook entries directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.mistake_notebook_entries', 'DELETE'),
  'active clients cannot delete notebook entries directly'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.save_test_response_secure(uuid,uuid,uuid,uuid,jsonb,public.response_status,boolean,integer)',
    'EXECUTE'
  ),
  'active clients cannot call the privileged Mock response RPC'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.finalize_test_attempt_secure(uuid,uuid,boolean,jsonb)',
    'EXECUTE'
  ),
  'active clients cannot call the privileged Mock finalization RPC'
);
select throws_ok(
  $$insert into public.test_attempts (
      id, test_id, user_id, status, started_at, total_time_seconds
    ) values (
      '50000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'in_progress', now(), 0
    )$$,
  'P0001'
);

select results_eq(
  $$select allowed from public.consume_security_rate_limit('auth:login:test', repeat('b', 64), 1, 60)$$,
  array[true],
  'service limiter call opens a fresh fixed window'
);
select results_eq(
  $$select allowed from public.consume_security_rate_limit('auth:login:test', repeat('b', 64), 1, 60)$$,
  array[false],
  'service limiter call rejects after the fixed-window budget is exhausted'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$select count(*)::integer from public.profiles where id = '10000000-0000-4000-8000-000000000001'$$,
  array[0],
  'Student B cannot read Student A profile'
);
select results_eq(
  $$select count(*)::integer from public.test_attempts where id = '50000000-0000-4000-8000-000000000001'$$,
  array[0],
  'Student B cannot read Student A attempt by UUID substitution'
);
select throws_ok(
  $$update public.test_attempts set score = 100 where id = '50000000-0000-4000-8000-000000000001'$$,
  '42501'
);
select throws_ok(
  $$update public.user_roles set role = 'admin' where user_id = '10000000-0000-4000-8000-000000000002'$$,
  '42501'
);
select throws_ok(
  $$select public.abandon_practice_session('10000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000001')$$,
  '42501'
);
select throws_ok(
  $$select * from public.consume_security_rate_limit('auth:login:global', repeat('a', 64), 1, 60)$$,
  '42501'
);
select throws_ok(
  $$select public.save_test_response_secure(
      '10000000-0000-4000-8000-000000000002',
      '50000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000001',
      null, null, 'unanswered', false, 0
    )$$,
  '42501'
);
select throws_ok(
  $$select * from public.finalize_test_attempt_secure(
      '10000000-0000-4000-8000-000000000002',
      '50000000-0000-4000-8000-000000000001',
      false, '[]'::jsonb
    )$$,
  '42501'
);
select throws_ok(
  $$update public.questions set publication_status = 'published' where id = '40000000-0000-4000-8000-000000000001'$$,
  '42501'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$insert into public.subscriptions (user_id, plan_code, status) values ('10000000-0000-4000-8000-000000000001', 'forged', 'active')$$,
  '42501'
);
select throws_ok(
  $$update public.subscriptions set status = 'active' where user_id = '10000000-0000-4000-8000-000000000001'$$,
  '42501'
);
select throws_ok(
  $$update public.subscriptions set external_customer_id = 'forged' where user_id = '10000000-0000-4000-8000-000000000001'$$,
  '42501'
);
select throws_ok(
  $$delete from public.subscriptions where user_id = '10000000-0000-4000-8000-000000000001'$$,
  '42501'
);
select throws_ok(
  $$update public.profiles set diagnostic_status = 'completed' where id = '10000000-0000-4000-8000-000000000001'$$,
  '42501'
);
select throws_ok(
  $$update public.profiles set marketing_consent_version = 'forged' where id = '10000000-0000-4000-8000-000000000001'$$,
  '42501'
);
select throws_ok(
  $$insert into public.question_reports (question_id, practice_session_item_id, reporter_id, reason) values ('40000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'technical_issue')$$,
  '42501'
);

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$insert into public.question_reviews (question_id, reviewer_id, decision) values ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'approved')$$,
  '42501'
);
select throws_ok(
  $$update public.question_reviews set decision = 'rejected' where id = '70000000-0000-4000-8000-000000000002'$$,
  '42501'
);
select results_eq(
  $$with removed as (delete from public.question_reviews where id = '70000000-0000-4000-8000-000000000002' returning 1) select count(*)::integer from removed$$,
  array[0],
  'Reviewer A cannot delete Reviewer B history'
);

reset role;

select throws_ok(
  $$insert into public.question_reports (question_id, practice_session_item_id, reporter_id, reason, details) values ('40000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'technical_issue', repeat('x', 2001))$$,
  'P0001'
);
select throws_ok(
  $$insert into public.question_reports (question_id, practice_session_item_id, reporter_id, reason) values ('40000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'technical_issue')$$,
  'P0001'
);
select lives_ok(
  $$insert into public.question_reports (question_id, practice_session_item_id, reporter_id, reason, details) values ('40000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'technical_issue', 'Legitimate report')$$,
  'trusted report path accepts an encountered question'
);
select throws_ok(
  $$insert into public.question_reports (question_id, practice_session_item_id, reporter_id, reason) values ('40000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'formatting_problem')$$,
  'P0001'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$insert into public.subscriptions (user_id, plan_code, status, provider) values ('10000000-0000-4000-8000-000000000002', 'admin-issued', 'active', 'manual')$$,
  '42501'
);
select throws_ok(
  $$delete from public.question_reviews where id = '70000000-0000-4000-8000-000000000002'$$,
  '42501'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$insert into public.question_reviews (question_id, reviewer_id, decision) values ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'approved')$$,
  '42501'
);
select throws_ok(
  $$update public.test_attempts set score = 100, accuracy = 100 where id = '50000000-0000-4000-8000-000000000001'$$,
  '42501'
);

reset role;

select is(
  to_regprocedure('public.current_user_has_role(public.app_role)'),
  null,
  'role helper is absent from the Data API exposed public schema'
);
select is(
  to_regprocedure('public.current_user_has_any_role(public.app_role[])'),
  null,
  'multi-role helper is absent from the Data API exposed public schema'
);
select isnt(
  to_regprocedure('private.current_user_has_role(public.app_role)'),
  null,
  'role helper exists in the non-exposed private schema'
);
select isnt(
  to_regprocedure('private.current_user_has_any_role(public.app_role[])'),
  null,
  'multi-role helper exists in the non-exposed private schema'
);
select results_eq(
  $$select count(*)::integer
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.proname in ('current_user_has_role', 'current_user_has_any_role')
      and p.prosecdef
      and exists (
        select 1 from unnest(p.proconfig) setting
        where setting ~ '^search_path=(""|)$'
      )$$,
  array[2],
  'private RLS helpers retain SECURITY DEFINER with an empty search path'
);
select results_eq(
  $$select count(*)::integer
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'set_updated_at'
      and exists (
        select 1 from unnest(p.proconfig) setting
        where setting ~ '^search_path=(""|)$'
      )$$,
  array[1],
  'set_updated_at has an empty search path'
);

select results_eq(
  $$select count(*)::integer from (values
      ('core_mock_generation_events'), ('generated_core_mocks'),
      ('practice_events'), ('practice_session_items'), ('practice_sessions'),
      ('public_diagnostic_items'), ('public_diagnostic_sessions'),
      ('security_rate_limits'), ('general_academic_bookmarks'),
      ('general_academic_mistakes'), ('general_academic_mock_answers'),
      ('general_academic_mock_attempts'), ('general_academic_practice_answers'),
      ('general_academic_practice_attempts')
    ) denied(table_name)
    where has_table_privilege('anon', 'public.' || table_name, 'SELECT,INSERT,UPDATE,DELETE')$$,
  array[0],
  'anonymous clients have no direct privileges on intentionally service-only tables'
);
select results_eq(
  $$select count(*)::integer from (values
      ('core_mock_generation_events'), ('generated_core_mocks'),
      ('practice_events'), ('practice_session_items'), ('practice_sessions'),
      ('public_diagnostic_items'), ('public_diagnostic_sessions'),
      ('security_rate_limits'), ('general_academic_bookmarks'),
      ('general_academic_mistakes'), ('general_academic_mock_answers'),
      ('general_academic_mock_attempts'), ('general_academic_practice_answers'),
      ('general_academic_practice_attempts')
    ) denied(table_name)
    where has_table_privilege('authenticated', 'public.' || table_name, 'SELECT,INSERT,UPDATE,DELETE')$$,
  array[0],
  'authenticated clients have no direct privileges on intentionally service-only tables'
);
select ok(
  has_function_privilege('service_role', 'public.create_practice_session(uuid,uuid,public.question_type,text,integer,text,text,text,timestamptz,timestamptz,uuid,jsonb,jsonb)', 'EXECUTE'),
  'Core Practice service RPC remains executable by service_role'
);
select ok(
  has_function_privilege('service_role', 'public.create_core_mock_attempt(uuid,uuid,uuid,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,timestamptz,timestamptz,uuid,timestamptz,uuid)', 'EXECUTE'),
  'Core Mock service RPC remains executable by service_role'
);
select ok(
  has_function_privilege('service_role', 'public.create_public_core_diagnostic(uuid,text,text,timestamptz,timestamptz,jsonb)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.create_public_core_diagnostic(uuid,text,text,timestamptz,timestamptz,jsonb)', 'EXECUTE'),
  'public diagnostic remains service-mediated rather than a browser RPC'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select results_eq(
  $$select count(*)::integer from public.profiles where id = '10000000-0000-4000-8000-000000000001'$$,
  array[1],
  'private role helper still grants an admin the intended RLS access'
);

reset role;
update public.profiles
set updated_at = '2000-01-01 00:00:00+00'
where id = '10000000-0000-4000-8000-000000000001';
update public.profiles
set display_name = display_name
where id = '10000000-0000-4000-8000-000000000001';
select ok(
  (select updated_at > '2000-01-01 00:00:00+00'
   from public.profiles where id = '10000000-0000-4000-8000-000000000001'),
  'set_updated_at trigger still advances timestamps after search-path hardening'
);

select * from finish();
rollback;
