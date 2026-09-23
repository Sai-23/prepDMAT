begin;

alter table public.general_academic_source_packs
  add column reviewed_at timestamptz,
  add column approved_by uuid references auth.users (id) on delete set null,
  add column approved_at timestamptz,
  add column published_by uuid references auth.users (id) on delete set null;

create table public.general_academic_review_events (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.general_academic_source_packs (id) on delete cascade,
  event_type text not null check (event_type in ('submitted_for_review', 'approval_reopened', 'returned_to_draft', 'approved', 'rejected', 'published', 'archived')),
  from_status public.general_academic_review_status not null,
  to_status public.general_academic_review_status not null,
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  notes text check (notes is null or char_length(notes) <= 5000),
  created_at timestamptz not null default timezone('utc', now())
);

create index idx_general_academic_review_events_pack_created
  on public.general_academic_review_events (pack_id, created_at desc);

alter table public.general_academic_review_events enable row level security;
revoke all on public.general_academic_review_events from public, anon, authenticated;
grant select on public.general_academic_review_events to authenticated;
create policy general_academic_review_events_select
  on public.general_academic_review_events for select
  using (public.current_user_has_role('admin'));

create or replace function public.transition_general_academic_pack(
  p_actor_id uuid,
  p_pack_id uuid,
  p_expected_from public.general_academic_review_status,
  p_to_status public.general_academic_review_status,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from public.general_academic_review_status;
  v_event text;
  v_now timestamptz := timezone('utc', now());
begin
  if not exists (
    select 1 from public.user_roles where user_id = p_actor_id and role = 'admin'
  ) then
    raise exception 'general_academic_admin_required' using errcode = '42501';
  end if;
  if p_notes is not null and char_length(p_notes) > 5000 then
    raise exception 'general_academic_review_note_too_long' using errcode = '22023';
  end if;

  select review_status into v_from
  from public.general_academic_source_packs
  where id = p_pack_id and deleted_at is null
  for update;
  if not found then
    raise exception 'general_academic_pack_unavailable' using errcode = 'P0002';
  end if;
  if v_from is distinct from p_expected_from then
    raise exception 'general_academic_stale_transition' using errcode = '40001';
  end if;
  if not (
    (v_from = 'draft' and p_to_status = 'needs_review') or
    (v_from = 'needs_review' and p_to_status in ('draft', 'approved', 'rejected')) or
    (v_from = 'approved' and p_to_status in ('needs_review', 'published')) or
    (v_from = 'rejected' and p_to_status = 'draft') or
    (v_from = 'published' and p_to_status = 'archived')
  ) then
    raise exception 'general_academic_invalid_transition' using errcode = '22023';
  end if;
  if p_to_status = 'rejected' and (p_notes is null or char_length(btrim(p_notes)) = 0) then
    raise exception 'general_academic_rejection_reason_required' using errcode = '22023';
  end if;

  v_event := case p_to_status
    when 'needs_review' then case when v_from = 'draft' then 'submitted_for_review' else 'approval_reopened' end
    when 'draft' then 'returned_to_draft'
    when 'approved' then 'approved'
    when 'rejected' then 'rejected'
    when 'published' then 'published'
    when 'archived' then 'archived'
  end;

  update public.general_academic_source_packs set
    review_status = p_to_status,
    review_notes = case when p_notes is not null then nullif(btrim(p_notes), '') else review_notes end,
    reviewed_by = case when p_to_status in ('approved', 'rejected') then p_actor_id when p_to_status = 'draft' then null else reviewed_by end,
    reviewed_at = case when p_to_status in ('approved', 'rejected') then v_now when p_to_status = 'draft' then null else reviewed_at end,
    approved_by = case when p_to_status = 'approved' then p_actor_id when p_to_status in ('draft', 'needs_review', 'rejected') then null else approved_by end,
    approved_at = case when p_to_status = 'approved' then v_now when p_to_status in ('draft', 'needs_review', 'rejected') then null else approved_at end,
    published_by = case when p_to_status = 'published' then p_actor_id else published_by end,
    published_at = case when p_to_status = 'published' then v_now else published_at end
  where id = p_pack_id;

  insert into public.general_academic_review_events (
    pack_id, event_type, from_status, to_status, actor_user_id, notes
  ) values (p_pack_id, v_event, v_from, p_to_status, p_actor_id, nullif(btrim(p_notes), ''));
end;
$$;

revoke all on function public.transition_general_academic_pack(uuid, uuid, public.general_academic_review_status, public.general_academic_review_status, text) from public, anon, authenticated;
grant execute on function public.transition_general_academic_pack(uuid, uuid, public.general_academic_review_status, public.general_academic_review_status, text) to service_role;

comment on table public.general_academic_review_events is
  'Append-only audit trail for administrator-controlled General Academic lifecycle transitions.';

commit;
