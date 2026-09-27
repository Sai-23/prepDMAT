begin;

do $migration$
begin
  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'feedback_moderation_status'
  ) then
    create type public.feedback_moderation_status as enum ('pending', 'approved', 'rejected');
  end if;
end
$migration$;

create table if not exists public.student_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  liked_most text check (liked_most is null or char_length(liked_most) <= 200),
  improvements text check (improvements is null or char_length(improvements) <= 200),
  public_consent boolean not null default false,
  status public.feedback_moderation_status not null default 'pending',
  is_featured boolean not null default false,
  testimonial_public text check (
    testimonial_public is null or char_length(testimonial_public) <= 200
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  constraint student_feedback_feature_eligibility check (
    not is_featured or (
      status = 'approved'
      and public_consent
      and nullif(btrim(liked_most), '') is not null
      and nullif(btrim(testimonial_public), '') is not null
    )
  )
);

create index if not exists idx_student_feedback_moderation
  on public.student_feedback(status, created_at desc);
create index if not exists idx_student_feedback_featured
  on public.student_feedback(created_at desc)
  where status = 'approved'
    and public_consent
    and is_featured
    and nullif(btrim(testimonial_public), '') is not null;

drop trigger if exists set_student_feedback_updated_at on public.student_feedback;
create trigger set_student_feedback_updated_at
  before update on public.student_feedback
  for each row execute procedure public.set_updated_at();

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

  if auth.uid() is null
    or old.user_id <> auth.uid()
    or old.status <> 'pending'::public.feedback_moderation_status
    or new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.status is distinct from old.status
    or new.is_featured is distinct from old.is_featured
    or new.testimonial_public is distinct from old.testimonial_public
    or new.reviewed_at is distinct from old.reviewed_at
    or new.reviewed_by is distinct from old.reviewed_by
    or new.created_at is distinct from old.created_at
  then
    raise exception 'student_feedback_update_not_allowed' using errcode = '42501';
  end if;

  return new;
end;
$function$;

drop trigger if exists enforce_student_feedback_update on public.student_feedback;
create trigger enforce_student_feedback_update
  before update on public.student_feedback
  for each row execute procedure private.enforce_student_feedback_update();

alter table public.student_feedback enable row level security;

drop policy if exists student_feedback_select on public.student_feedback;
create policy student_feedback_select
  on public.student_feedback
  for select
  using (
    auth.uid() = user_id
    or private.current_user_has_role('admin'::public.app_role)
  );

drop policy if exists student_feedback_insert on public.student_feedback;
create policy student_feedback_insert
  on public.student_feedback
  for insert
  with check (
    auth.uid() = user_id
    and status = 'pending'::public.feedback_moderation_status
    and not is_featured
    and testimonial_public is null
    and reviewed_at is null
    and reviewed_by is null
  );

drop policy if exists student_feedback_update on public.student_feedback;
create policy student_feedback_update
  on public.student_feedback
  for update
  using (
    (auth.uid() = user_id and status = 'pending'::public.feedback_moderation_status)
    or private.current_user_has_role('admin'::public.app_role)
  )
  with check (
    (auth.uid() = user_id and status = 'pending'::public.feedback_moderation_status)
    or private.current_user_has_role('admin'::public.app_role)
  );

revoke all on public.student_feedback from public, anon, authenticated;
grant select on public.student_feedback to authenticated;
grant insert (user_id, rating, liked_most, improvements, public_consent)
  on public.student_feedback to authenticated;
grant update on public.student_feedback to authenticated;

revoke all on function private.enforce_student_feedback_update() from public, anon, authenticated;

comment on table public.student_feedback is
  'Private student product feedback. Public testimonials are emitted only through a server-side safe projection.';

commit;
