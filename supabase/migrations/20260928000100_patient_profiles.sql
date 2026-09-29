-- REVIEW REQUIRED: remote schema inspection was unavailable (HTTP 401).
-- Reconcile this candidate with the team's existing profile schema before applying.
-- This migration deliberately refuses to replace an existing profile table.
begin;

do $$
begin
  if to_regclass('public.profiles') is not null
     or to_regclass('public.patient_profiles') is not null then
    raise exception 'Existing profile table detected. Reconcile MediTrack profile schema and policies before applying this migration.';
  end if;
end $$;

create table public.patient_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 100),
  age_at_registration smallint not null check (age_at_registration between 1 and 120),
  age_recorded_at timestamptz not null default now(),
  gender text not null check (gender in ('Female', 'Male', 'Other', 'Prefer not to say')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.patient_profiles.age_at_registration is
  'Reported age when age_recorded_at was recorded; not a date of birth or perpetually current age. Prototype bounds are not an eligibility policy.';

alter table public.patient_profiles enable row level security;
revoke all on public.patient_profiles from anon, authenticated;
grant select on public.patient_profiles to authenticated;
grant update (full_name, gender) on public.patient_profiles to authenticated;
create policy patient_profile_read_self on public.patient_profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy patient_profile_update_self on public.patient_profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create function public.meditrack_profile_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.meditrack_profile_updated_at() from public, anon, authenticated;
create trigger patient_profile_timestamp before update on public.patient_profiles
  for each row execute function public.meditrack_profile_updated_at();

-- No auth.users signup trigger: signup with no session cannot insert a profile.
-- The app calls this after phone verification and retries it on future logins.
-- User-editable metadata supplies demographics only, never roles or privileges.
create function public.ensure_patient_profile(p_full_name text, p_age integer, p_gender text)
returns setof public.patient_profiles
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not exists (select 1 from auth.users where id = caller and phone_confirmed_at is not null and phone is not null) then
    raise exception 'Verified phone required' using errcode = '42501';
  end if;
  if p_full_name is null or char_length(btrim(p_full_name)) not between 2 and 100
     or p_age is null or p_age not between 1 and 120
     or p_gender is null or p_gender not in ('Female', 'Male', 'Other', 'Prefer not to say') then
    raise exception 'Invalid profile fields' using errcode = '22023';
  end if;
  insert into public.patient_profiles (id, full_name, age_at_registration, gender)
    values (caller, btrim(p_full_name), p_age, p_gender)
    on conflict (id) do nothing;
  return query select * from public.patient_profiles where id = caller;
end;
$$;
revoke all on function public.ensure_patient_profile(text, integer, text) from public, anon;
grant execute on function public.ensure_patient_profile(text, integer, text) to authenticated;
commit;
