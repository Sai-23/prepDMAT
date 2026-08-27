begin;

-- Repair environments where application code for versioned Mock templates was
-- deployed before the corresponding columns reached the database.
alter table public.test_sections
  add column if not exists template_version integer not null default 1
    check (template_version > 0),
  add column if not exists is_current boolean not null default true;

alter table public.test_sections
  drop constraint if exists test_sections_test_id_sort_order_key;

create unique index if not exists idx_test_sections_current_order
  on public.test_sections (test_id, sort_order)
  where is_current;

create index if not exists idx_test_sections_template_version
  on public.test_sections (test_id, template_version, is_current);

drop policy if exists test_sections_select on public.test_sections;
create policy test_sections_select
  on public.test_sections
  for select
  using (
    public.current_user_has_any_role(array['reviewer', 'admin']::public.app_role[])
    or (
      is_current
      and exists (
        select 1 from public.tests
        where tests.id = test_sections.test_id and tests.is_published
      )
    )
  );

drop policy if exists test_questions_select on public.test_questions;
create policy test_questions_select
  on public.test_questions
  for select
  using (
    public.current_user_has_any_role(array['reviewer', 'admin']::public.app_role[])
    or exists (
      select 1
      from public.test_sections
      join public.tests on tests.id = test_sections.test_id
      where test_sections.id = test_questions.test_section_id
        and test_sections.is_current
        and tests.is_published
    )
  );

commit;
