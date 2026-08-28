-- Allow the existing user-owned notebook to reference immutable Practice,
-- Diagnostic, and Mock snapshot items without changing assessment history.
alter table public.mistake_notebook_entries
  alter column question_id drop not null,
  add column if not exists practice_session_item_id uuid
    references public.practice_session_items(id) on delete cascade,
  add column if not exists practice_attempt_item_id uuid
    references public.practice_attempt_items(id) on delete cascade;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'mistake_notebook_entries_one_source'
  ) then
    alter table public.mistake_notebook_entries
      add constraint mistake_notebook_entries_one_source check (
        num_nonnulls(
          question_id,
          practice_session_item_id,
          practice_attempt_item_id
        ) = 1
      );
  end if;
end $$;

create unique index if not exists idx_mistake_notebook_practice_item
  on public.mistake_notebook_entries(user_id, practice_session_item_id)
  where practice_session_item_id is not null;

create unique index if not exists idx_mistake_notebook_mock_item
  on public.mistake_notebook_entries(user_id, practice_attempt_item_id)
  where practice_attempt_item_id is not null;

-- The existing mistake_notebook_access policy continues to scope every row
-- to auth.uid() = user_id (with the existing admin exception).
