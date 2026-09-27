begin;

create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('91000000-0000-4000-8000-000000000001', 'feedback-a@example.test', 'unused', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('91000000-0000-4000-8000-000000000002', 'feedback-b@example.test', 'unused', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('93000000-0000-4000-8000-000000000001', 'feedback-admin@example.test', 'unused', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

delete from public.user_roles where user_id = '93000000-0000-4000-8000-000000000001';
insert into public.user_roles (user_id, role) values ('93000000-0000-4000-8000-000000000001', 'admin');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$insert into public.student_feedback (user_id, rating, liked_most, improvements, public_consent)
    values ('91000000-0000-4000-8000-000000000001', 5, 'Focused practice', 'More examples', true)$$,
  'student A can insert their own feedback'
);
select throws_ok(
  $$insert into public.student_feedback (user_id, rating, public_consent)
    values ('91000000-0000-4000-8000-000000000002', 5, false)$$,
  'student A cannot spoof student B'
);
select throws_ok(
  $$insert into public.student_feedback (user_id, rating, public_consent)
    values ('91000000-0000-4000-8000-000000000001', 4, false)$$,
  'student A cannot submit feedback twice'
);
select is(
  (with changed as (update public.student_feedback set rating = 1 returning id) select count(*)::integer from changed),
  0,
  'student A cannot edit their own pending feedback'
);
select is((select count(*)::integer from public.student_feedback), 1, 'student A sees their own row');

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.student_feedback), 0, 'student B cannot read student A');
select is(
  (with changed as (update public.student_feedback set rating = 1 returning id) select count(*)::integer from changed),
  0,
  'student B cannot edit student A'
);
select lives_ok(
  $$insert into public.student_feedback (user_id, rating, liked_most, public_consent)
    values ('91000000-0000-4000-8000-000000000002', 3, 'Useful', false)$$,
  'student B can insert their own feedback once'
);

reset role;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);
select throws_ok($$select * from public.student_feedback$$, 'anonymous cannot read raw feedback');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.student_feedback), 2, 'admin can read all feedback');
select lives_ok(
  $$update public.student_feedback
    set status = 'approved', testimonial_public = liked_most,
        reviewed_by = '93000000-0000-4000-8000-000000000001', reviewed_at = now()
    where user_id = '91000000-0000-4000-8000-000000000001'$$,
  'admin can approve and set separate public text'
);
select lives_ok(
  $$update public.student_feedback set is_featured = true
    where user_id = '91000000-0000-4000-8000-000000000001'$$,
  'admin can feature eligible feedback'
);
select lives_ok(
  $$update public.student_feedback
    set status = 'rejected', reviewed_by = '93000000-0000-4000-8000-000000000001', reviewed_at = now()
    where user_id = '91000000-0000-4000-8000-000000000002'$$,
  'admin can reject feedback'
);
select is(
  (select liked_most from public.student_feedback where user_id = '91000000-0000-4000-8000-000000000001'),
  'Focused practice',
  'moderation preserves original liked_most'
);
select is(
  (select improvements from public.student_feedback where user_id = '91000000-0000-4000-8000-000000000001'),
  'More examples',
  'private improvement text remains stored but is not a public projection'
);
select throws_ok(
  $$update public.student_feedback set liked_most = 'Admin rewrite'
    where user_id = '91000000-0000-4000-8000-000000000001'$$,
  'admin moderation cannot overwrite the original student response'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
select is(
  (with changed as (update public.student_feedback set public_consent = false returning id) select count(*)::integer from changed),
  0,
  'student A cannot edit approved feedback'
);
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000002', true);
select is(
  (with changed as (update public.student_feedback set improvements = 'Changed' returning id) select count(*)::integer from changed),
  0,
  'student B cannot edit rejected feedback'
);

select * from finish();
rollback;
