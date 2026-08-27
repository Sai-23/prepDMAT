-- Authentication-provider-neutral, explicit marketing consent foundation.
alter table public.profiles
  add column if not exists marketing_email_opt_in boolean not null default false,
  add column if not exists marketing_email_opt_in_at timestamptz,
  add column if not exists marketing_sms_opt_in boolean not null default false,
  add column if not exists marketing_sms_opt_in_at timestamptz,
  add column if not exists marketing_consent_version text;

alter table public.profiles drop constraint if exists profiles_email_consent_timestamp_check;
alter table public.profiles add constraint profiles_email_consent_timestamp_check check (
  marketing_email_opt_in or marketing_email_opt_in_at is null
);

alter table public.profiles drop constraint if exists profiles_sms_consent_timestamp_check;
alter table public.profiles add constraint profiles_sms_consent_timestamp_check check (
  marketing_sms_opt_in or marketing_sms_opt_in_at is null
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  email_marketing_consent boolean := coalesce(
    (new.raw_user_meta_data -> 'marketing_email_opt_in') = 'true'::jsonb,
    false
  );
  sms_marketing_consent boolean := coalesce(
    (new.raw_user_meta_data -> 'marketing_sms_opt_in') = 'true'::jsonb,
    false
  );
begin
  insert into public.profiles (
    id,
    display_name,
    full_name,
    marketing_email_opt_in,
    marketing_email_opt_in_at,
    marketing_sms_opt_in,
    marketing_sms_opt_in_at,
    marketing_consent_version
  )
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Student'
    ),
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), '')
    ),
    email_marketing_consent,
    case when email_marketing_consent then timezone('utc', now()) else null end,
    sms_marketing_consent,
    case when sms_marketing_consent then timezone('utc', now()) else null end,
    case
      when email_marketing_consent or sms_marketing_consent then 'auth-consent-v1'
      else null
    end
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'student')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;
