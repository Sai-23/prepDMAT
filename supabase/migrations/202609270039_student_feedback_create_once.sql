begin;

create or replace function private.enforce_student_feedback_update()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if private.current_user_has_role('admin'::public.app_role) then
    if new.id is distinct from old.id
      or new.user_id is distinct from old.user_id
      or new.rating is distinct from old.rating
      or new.liked_most is distinct from old.liked_most
      or new.improvements is distinct from old.improvements
      or new.public_consent is distinct from old.public_consent
      or new.created_at is distinct from old.created_at
    then
      raise exception 'student_feedback_original_update_not_allowed' using errcode = '42501';
    end if;
    return new;
  end if;

  raise exception 'student_feedback_update_not_allowed' using errcode = '42501';
end;
$function$;

drop policy if exists student_feedback_update on public.student_feedback;
drop policy if exists student_feedback_admin_update on public.student_feedback;
create policy student_feedback_admin_update
  on public.student_feedback
  for update
  using (private.current_user_has_role('admin'::public.app_role))
  with check (private.current_user_has_role('admin'::public.app_role));

-- UPDATE remains a table-level grant to authenticated because admins authenticate
-- through the same Postgres role. The admin-only RLS policy above denies students.
grant update on public.student_feedback to authenticated;

revoke all on function private.enforce_student_feedback_update() from public, anon, authenticated;

comment on policy student_feedback_admin_update on public.student_feedback is
  'Only authorized admins may update moderation fields. Student submissions are immutable.';

commit;
