-- Apply only after reviewing the preflight report and taking a database backup.
-- This is additive: existing Django tables/IDs/passwords/medical records are untouched.
begin;
create table public.meditrack_accounts (
 id uuid primary key references auth.users(id) on delete restrict,
 legacy_user_id bigint unique references public.accounts_user(id) on delete restrict,
 legacy_pending_id bigint unique references public.pending_doctors(id) on delete restrict,
 username varchar(150) not null check(length(btrim(username)) > 0),
 role text not null check(role in ('patient','doctor','lab','admin')),
 approval_status text not null check(approval_status in ('approved','pending','rejected')),
 phone varchar(15), "NIC_number" varchar(12), birthday date,
 degrees varchar(100), university varchar(100), working_hospital varchar(150),
 "doctorID" varchar(50), lab_name varchar(150), lab_address varchar(255), license_id varchar(50),
 created_at timestamptz not null default now()
);
create unique index meditrack_accounts_username_ci on public.meditrack_accounts(lower(username));
alter table public.meditrack_accounts enable row level security;
revoke all on public.meditrack_accounts from public, anon, authenticated;
grant select on public.meditrack_accounts to authenticated;
grant all on public.meditrack_accounts to service_role;

create function public.meditrack_is_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.meditrack_accounts where id=(select auth.uid()) and role='admin' and approval_status='approved');
$$;
revoke all on function public.meditrack_is_admin() from public, anon;
grant execute on function public.meditrack_is_admin() to authenticated;
create policy meditrack_read_own_account on public.meditrack_accounts for select to authenticated using(id=(select auth.uid()));
create policy meditrack_admin_read_accounts on public.meditrack_accounts for select to authenticated using((select public.meditrack_is_admin()));

create table public.meditrack_approval_audit (
 id bigint generated always as identity primary key,
 account_id uuid not null references public.meditrack_accounts(id),
 reviewer_id uuid not null references public.meditrack_accounts(id),
 decision text not null check(decision in ('approved','rejected')),
 created_at timestamptz not null default now()
);
alter table public.meditrack_approval_audit enable row level security;
revoke all on public.meditrack_approval_audit from public, anon, authenticated;
grant select on public.meditrack_approval_audit to authenticated;
create policy meditrack_admin_read_audit on public.meditrack_approval_audit for select to authenticated using((select public.meditrack_is_admin()));

create function public.meditrack_review_doctor(account_id uuid, decision text) returns void
language plpgsql security definer set search_path='' as $$
declare target public.meditrack_accounts;
begin
 if not public.meditrack_is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 if decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
 select * into target from public.meditrack_accounts where id=account_id for update;
 if not found or target.role <> 'doctor' or target.approval_status <> 'pending' then raise exception 'Pending doctor not found'; end if;
 update public.meditrack_accounts set approval_status=decision where id=account_id;
 insert into public.meditrack_approval_audit(account_id,reviewer_id,decision) values(account_id,auth.uid(),decision);
 -- Retain the existing record and synchronize its review status without copying passwords.
 if target.legacy_pending_id is not null then
  update public.pending_doctors set status=decision, updated_at=now() where id=target.legacy_pending_id;
 end if;
end;
$$;
revoke all on function public.meditrack_review_doctor(uuid,text) from public, anon;
grant execute on function public.meditrack_review_doctor(uuid,text) to authenticated;

create function public.meditrack_create_auth_profile() returns trigger
language plpgsql security definer set search_path='' as $$
declare
 m jsonb := coalesce(new.raw_user_meta_data,'{}'::jsonb);
 trusted jsonb := coalesce(new.raw_app_meta_data,'{}'::jsonb);
 legacy jsonb;
 source text := trusted->>'meditrack_legacy_source';
 legacy_id bigint;
 requested text;
 account_status text;
begin
 -- app_metadata can only be set by a trusted admin API, never public signUp/updateUser.
 if source in ('user','pending') then
  legacy_id := (trusted->>'meditrack_legacy_id')::bigint;
  if source='user' then
   select to_jsonb(u) into legacy from public.accounts_user u where u.id=legacy_id;
  else
   select to_jsonb(p) into legacy from public.pending_doctors p where p.id=legacy_id and p.status in ('pending','rejected');
  end if;
  if legacy is null or lower(btrim(legacy->>'email')) is distinct from lower(btrim(new.email)) then raise exception 'Legacy identity does not match'; end if;
  requested := case when source='pending' then 'doctor' when (legacy->>'is_superuser')::boolean then 'admin' else legacy->>'role' end;
  account_status := case when source='pending' then legacy->>'status'
    when not coalesce((legacy->>'is_active')::boolean,true) then 'rejected'
    when coalesce((legacy->>'is_approved')::boolean,false) or coalesce((legacy->>'is_superuser')::boolean,false) then 'approved' else 'pending' end;
  m := legacy;
 else
  requested := coalesce(m->>'requested_role','patient');
  if requested not in ('patient','doctor','lab') then raise exception 'Invalid signup role'; end if;
  if coalesce(btrim(new.email),'')='' or coalesce(btrim(m->>'username'),'')='' or coalesce(btrim(m->>'phone'),'')='' or coalesce(btrim(m->>'NIC_number'),'')='' or coalesce(m->>'birthday','')='' then raise exception 'Required signup fields are missing'; end if;
  if requested='lab' and (coalesce(btrim(m->>'lab_name'),'')='' or coalesce(btrim(m->>'lab_address'),'')='' or coalesce(btrim(m->>'license_id'),'')='') then raise exception 'Laboratory details are required'; end if;
  if exists(select 1 from public.accounts_user where lower(btrim(email))=lower(btrim(new.email)) or lower(username)=lower(btrim(m->>'username')))
    or exists(select 1 from public.pending_doctors where lower(btrim(email))=lower(btrim(new.email)) or lower(username)=lower(btrim(m->>'username'))) then
   raise exception 'An existing account requires migration. Contact support.';
  end if;
  account_status := case when requested='doctor' then 'pending' else 'approved' end;
 end if;
 insert into public.meditrack_accounts(id,legacy_user_id,legacy_pending_id,username,role,approval_status,phone,"NIC_number",birthday,degrees,university,working_hospital,"doctorID",lab_name,lab_address,license_id)
 values(new.id,case when source='user' then legacy_id end,case when source='pending' then legacy_id end,
 btrim(m->>'username'),requested,account_status,m->>'phone',m->>'NIC_number',nullif(m->>'birthday','')::date,
 m->>'degrees',m->>'university',m->>'working_hospital',case when source is not null then m->>'doctorID' end,m->>'lab_name',m->>'lab_address',m->>'license_id');
 return new;
end;
$$;
revoke all on function public.meditrack_create_auth_profile() from public, anon, authenticated;
create trigger meditrack_auth_profile_after_insert after insert on auth.users for each row execute function public.meditrack_create_auth_profile();
commit;
