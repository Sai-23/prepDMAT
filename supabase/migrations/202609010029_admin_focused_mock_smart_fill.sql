begin;

alter table public.test_sections
  add column if not exists focus_difficulty public.question_difficulty;

create index if not exists idx_test_sections_current_focus
  on public.test_sections (section_type, focus_difficulty)
  where is_current and focus_difficulty is not null;

comment on column public.test_sections.focus_difficulty is
  'Admin-declared difficulty for focused sectional mock validation and inventory selection.';

commit;
