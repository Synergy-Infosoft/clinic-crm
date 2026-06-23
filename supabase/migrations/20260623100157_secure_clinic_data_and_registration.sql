-- Security hardening and atomic public registration for ClinicFlow.
-- This migration intentionally replaces all existing policies on sensitive tables.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'receptionist', 'doctor')),
  created_at timestamptz not null default now()
);

create table if not exists public.doctors (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  specialization text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  age integer not null check (age > 0 and age < 150),
  gender text not null check (gender in ('male', 'female', 'other')),
  phone text not null,
  address text,
  blood_group text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.visits (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id),
  doctor_id uuid references public.doctors(id),
  token_number integer not null,
  token_date date not null default current_date,
  chief_complaint text not null,
  status text not null default 'waiting'
    check (status in ('waiting', 'with_doctor', 'completed', 'cancelled')),
  notes text,
  prescription text,
  registered_by text not null default 'self'
    check (registered_by in ('self', 'receptionist')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.token_counters (
  id uuid primary key default uuid_generate_v4(),
  counter_date date not null unique default current_date,
  last_token integer not null default 0
);

create table if not exists public.invoices (
  id uuid primary key default uuid_generate_v4(),
  visit_id uuid not null unique references public.visits(id),
  patient_id uuid not null references public.patients(id),
  invoice_number text not null unique,
  line_items jsonb not null default '[]'::jsonb,
  subtotal numeric(10, 2) not null default 0,
  discount numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid_cash', 'paid_online')),
  payment_method text check (payment_method in ('cash', 'online_upi')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.charge_presets (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  amount numeric(10, 2) not null check (amount >= 0),
  category text not null default 'general',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.charge_presets (name, amount, category)
select 'Consultation fee', 300, 'consultation'
where not exists (
  select 1 from public.charge_presets where lower(trim(name)) = 'consultation fee'
);

create or replace function public.get_next_token()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_token integer;
begin
  insert into public.token_counters (counter_date, last_token)
  values (current_date, 1)
  on conflict (counter_date) do update
    set last_token = public.token_counters.last_token + 1
  returning last_token into next_token;
  return next_token;
end;
$$;

create or replace function public.generate_invoice_number()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  count_today integer;
begin
  select count(*) + 1 into count_today
  from public.invoices
  where created_at::date = current_date;
  return to_char(current_date, 'YYMMDD') || '-' || lpad(count_today::text, 4, '0');
end;
$$;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

create table if not exists public.clinic_settings (
  id smallint primary key default 1 check (id = 1),
  clinic_name text not null default 'ClinicFlow Medical Center',
  address text not null default '',
  phone text not null default '',
  doctor_name text not null default '',
  registration_number text not null default '',
  working_hours_start time not null default '09:00',
  working_hours_end time not null default '18:00',
  working_days integer[] not null default array[1, 2, 3, 4, 5, 6],
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.clinic_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

create table if not exists private.invoice_counters (
  counter_date date primary key,
  last_number integer not null default 0 check (last_number >= 0)
);

create table if not exists private.registration_rate_limits (
  identifier_hash text primary key,
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 1 check (attempt_count > 0)
);

alter table public.visits
  add column if not exists confirmation_token uuid not null default gen_random_uuid();

create unique index if not exists visits_confirmation_token_key
  on public.visits (confirmation_token);

create unique index if not exists visits_token_date_token_number_key
  on public.visits (token_date, token_number);

create index if not exists visits_token_date_status_idx
  on public.visits (token_date, status);

create index if not exists patients_phone_digits_idx
  on public.patients ((regexp_replace(phone, '[^0-9]', '', 'g')));

create index if not exists invoices_paid_at_idx
  on public.invoices (paid_at)
  where paid_at is not null;

create or replace function private.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.profiles
  where id = (select auth.uid())
  limit 1;
$$;

revoke all on function private.current_user_role() from public, anon;
grant execute on function private.current_user_role() to authenticated, service_role;

create or replace function private.capture_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_id uuid;
begin
  changed_id := case when tg_op = 'DELETE' then old.id else new.id end;

  insert into public.audit_logs (actor_id, table_name, record_id, action)
  values ((select auth.uid()), tg_table_name, changed_id, tg_op);

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.capture_audit_log() from public, anon, authenticated;

create or replace function private.enforce_invoice_totals()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select coalesce(sum(
    greatest(coalesce((item ->> 'quantity')::integer, 0), 0)
      * greatest(coalesce((item ->> 'amount')::numeric, 0), 0)
  ), 0)
  into new.subtotal
  from jsonb_array_elements(new.line_items) as item;

  new.discount := least(greatest(coalesce(new.discount, 0), 0), new.subtotal);
  new.total := new.subtotal - new.discount;
  new.updated_at := now();

  if new.payment_status = 'pending' then
    new.payment_method := null;
    new.paid_at := null;
  elsif new.payment_status = 'paid_cash' then
    new.payment_method := 'cash';
    new.paid_at := coalesce(new.paid_at, now());
  elsif new.payment_status = 'paid_online' then
    new.payment_method := 'online_upi';
    new.paid_at := coalesce(new.paid_at, now());
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_invoice_totals() from public, anon, authenticated;
drop trigger if exists enforce_invoice_totals on public.invoices;
create trigger enforce_invoice_totals
before insert or update of line_items, discount, payment_status, payment_method
on public.invoices
for each row execute function private.enforce_invoice_totals();

do $$
declare
  target_table text;
begin
  foreach target_table in array array['patients', 'visits', 'invoices']
  loop
    execute format('drop trigger if exists %I on public.%I', 'audit_' || target_table, target_table);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function private.capture_audit_log()',
      'audit_' || target_table,
      target_table
    );
  end loop;
end;
$$;

-- Remove every legacy policy before creating the intended access model. This is
-- deliberately broader than dropping policy names from the original prompt.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any(array[
        'profiles', 'patients', 'visits', 'invoices', 'token_counters',
        'charge_presets', 'doctors', 'clinic_settings', 'audit_logs'
      ])
  loop
    execute format(
      'drop policy %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.visits enable row level security;
alter table public.invoices enable row level security;
alter table public.token_counters enable row level security;
alter table public.charge_presets enable row level security;
alter table public.doctors enable row level security;
alter table public.clinic_settings enable row level security;
alter table public.audit_logs enable row level security;

revoke all on public.profiles, public.patients, public.visits, public.invoices,
  public.token_counters, public.charge_presets, public.clinic_settings,
  public.audit_logs from anon;
revoke all on public.profiles, public.patients, public.visits, public.invoices,
  public.token_counters, public.charge_presets, public.doctors,
  public.clinic_settings, public.audit_logs from authenticated;

grant select on public.profiles, public.patients, public.visits, public.invoices,
  public.token_counters, public.charge_presets, public.doctors,
  public.clinic_settings, public.audit_logs to authenticated;
grant insert, update on public.patients, public.visits to authenticated;
grant insert, update on public.invoices to authenticated;
grant insert, update, delete on public.doctors, public.charge_presets,
  public.clinic_settings, public.profiles to authenticated;
grant select on public.doctors to anon;
grant all on public.profiles, public.patients, public.visits, public.invoices,
  public.token_counters, public.charge_presets, public.doctors,
  public.clinic_settings, public.audit_logs to service_role;
grant usage, select on all sequences in schema public to service_role;

create policy "profiles_select_self_or_admin"
on public.profiles for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.current_user_role()) = 'admin'
);

create policy "profiles_admin_manage"
on public.profiles for all
to authenticated
using ((select private.current_user_role()) = 'admin')
with check ((select private.current_user_role()) = 'admin');

create policy "patients_staff_select"
on public.patients for select
to authenticated
using ((select private.current_user_role()) in ('admin', 'receptionist', 'doctor'));

create policy "patients_staff_insert"
on public.patients for insert
to authenticated
with check ((select private.current_user_role()) in ('admin', 'receptionist', 'doctor'));

create policy "patients_staff_update"
on public.patients for update
to authenticated
using ((select private.current_user_role()) in ('admin', 'receptionist', 'doctor'))
with check ((select private.current_user_role()) in ('admin', 'receptionist', 'doctor'));

create policy "visits_staff_select"
on public.visits for select
to authenticated
using ((select private.current_user_role()) in ('admin', 'receptionist', 'doctor'));

create policy "visits_staff_insert"
on public.visits for insert
to authenticated
with check ((select private.current_user_role()) in ('admin', 'receptionist', 'doctor'));

create policy "visits_staff_update"
on public.visits for update
to authenticated
using ((select private.current_user_role()) in ('admin', 'receptionist', 'doctor'))
with check ((select private.current_user_role()) in ('admin', 'receptionist', 'doctor'));

create policy "invoices_staff_select"
on public.invoices for select
to authenticated
using ((select private.current_user_role()) in ('admin', 'receptionist', 'doctor'));

create policy "invoices_billing_insert"
on public.invoices for insert
to authenticated
with check ((select private.current_user_role()) in ('admin', 'receptionist'));

create policy "invoices_billing_update"
on public.invoices for update
to authenticated
using ((select private.current_user_role()) in ('admin', 'receptionist'))
with check ((select private.current_user_role()) in ('admin', 'receptionist'));

create policy "token_counters_staff_select"
on public.token_counters for select
to authenticated
using ((select private.current_user_role()) in ('admin', 'receptionist', 'doctor'));

create policy "doctors_public_select_active"
on public.doctors for select
to anon
using (is_active = true);

create policy "doctors_staff_select"
on public.doctors for select
to authenticated
using ((select private.current_user_role()) in ('admin', 'receptionist', 'doctor'));

create policy "doctors_admin_manage"
on public.doctors for all
to authenticated
using ((select private.current_user_role()) = 'admin')
with check ((select private.current_user_role()) = 'admin');

create policy "charge_presets_staff_select"
on public.charge_presets for select
to authenticated
using ((select private.current_user_role()) in ('admin', 'receptionist', 'doctor'));

create policy "charge_presets_admin_manage"
on public.charge_presets for all
to authenticated
using ((select private.current_user_role()) = 'admin')
with check ((select private.current_user_role()) = 'admin');

create policy "clinic_settings_staff_select"
on public.clinic_settings for select
to authenticated
using ((select private.current_user_role()) in ('admin', 'receptionist', 'doctor'));

create policy "clinic_settings_admin_manage"
on public.clinic_settings for all
to authenticated
using ((select private.current_user_role()) = 'admin')
with check ((select private.current_user_role()) = 'admin');

create policy "audit_logs_admin_select"
on public.audit_logs for select
to authenticated
using ((select private.current_user_role()) = 'admin');

create or replace function public.register_patient_atomic(
  p_full_name text,
  p_age integer,
  p_gender text,
  p_phone text,
  p_chief_complaint text,
  p_doctor_id uuid default null,
  p_address text default null,
  p_blood_group text default null,
  p_registered_by text default 'self',
  p_request_hash text default null
)
returns table (
  token_number integer,
  visit_id uuid,
  patient_name text,
  confirmation_token uuid,
  duplicate_registration boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_phone text;
  current_patient public.patients%rowtype;
  existing_visit public.visits%rowtype;
  created_visit public.visits%rowtype;
  next_token integer;
  next_invoice integer;
  invoice_number text;
  preset public.charge_presets%rowtype;
  invoice_items jsonb := '[]'::jsonb;
  invoice_subtotal numeric(10, 2) := 0;
  rate_limit_count integer;
begin
  normalized_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');

  if length(trim(coalesce(p_full_name, ''))) < 2 or length(p_full_name) > 120 then
    raise exception 'INVALID_NAME' using errcode = '22023';
  end if;
  if p_age < 1 or p_age > 120 then
    raise exception 'INVALID_AGE' using errcode = '22023';
  end if;
  if p_gender not in ('male', 'female', 'other') then
    raise exception 'INVALID_GENDER' using errcode = '22023';
  end if;
  if normalized_phone !~ '^[0-9]{10}$' then
    raise exception 'INVALID_PHONE' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_chief_complaint, ''))) < 5
     or length(p_chief_complaint) > 1000 then
    raise exception 'INVALID_COMPLAINT' using errcode = '22023';
  end if;
  if p_registered_by not in ('self', 'receptionist') then
    raise exception 'INVALID_REGISTRATION_SOURCE' using errcode = '22023';
  end if;

  if p_request_hash is not null then
    insert into private.registration_rate_limits (
      identifier_hash,
      window_started_at,
      attempt_count
    )
    values (p_request_hash, now(), 1)
    on conflict (identifier_hash) do update
      set window_started_at = case
            when private.registration_rate_limits.window_started_at < now() - interval '15 minutes'
              then now()
            else private.registration_rate_limits.window_started_at
          end,
          attempt_count = case
            when private.registration_rate_limits.window_started_at < now() - interval '15 minutes'
              then 1
            else private.registration_rate_limits.attempt_count + 1
          end
    returning attempt_count into rate_limit_count;

    if rate_limit_count > 5 then
      raise exception 'RATE_LIMITED' using errcode = 'P0001';
    end if;
  end if;

  select * into current_patient
  from public.patients
  where regexp_replace(phone, '[^0-9]', '', 'g') = normalized_phone
  order by created_at asc
  limit 1
  for update;

  if current_patient.id is not null then
    select * into existing_visit
    from public.visits
    where patient_id = current_patient.id
      and token_date = current_date
      and status <> 'cancelled'
    order by created_at desc
    limit 1;

    if existing_visit.id is not null then
      return query
      select
        existing_visit.token_number,
        existing_visit.id,
        current_patient.full_name,
        existing_visit.confirmation_token,
        true;
      return;
    end if;

    update public.patients
    set full_name = trim(p_full_name),
        age = p_age,
        gender = p_gender,
        address = coalesce(nullif(trim(p_address), ''), address),
        blood_group = coalesce(nullif(trim(p_blood_group), ''), blood_group),
        updated_at = now()
    where id = current_patient.id
    returning * into current_patient;
  else
    insert into public.patients (
      full_name, age, gender, phone, address, blood_group
    )
    values (
      trim(p_full_name),
      p_age,
      p_gender,
      normalized_phone,
      nullif(trim(p_address), ''),
      nullif(trim(p_blood_group), '')
    )
    returning * into current_patient;
  end if;

  insert into public.token_counters (counter_date, last_token)
  values (current_date, 1)
  on conflict (counter_date) do update
    set last_token = public.token_counters.last_token + 1
  returning last_token into next_token;

  insert into public.visits (
    patient_id,
    doctor_id,
    token_number,
    token_date,
    chief_complaint,
    status,
    notes,
    prescription,
    registered_by
  )
  values (
    current_patient.id,
    p_doctor_id,
    next_token,
    current_date,
    trim(p_chief_complaint),
    'waiting',
    null,
    null,
    p_registered_by
  )
  returning * into created_visit;

  select * into preset
  from public.charge_presets
  where is_active = true
    and lower(trim(name)) = 'consultation fee'
  order by created_at asc
  limit 1;

  if preset.id is not null then
    invoice_subtotal := preset.amount;
    invoice_items := jsonb_build_array(jsonb_build_object(
      'id', gen_random_uuid(),
      'name', preset.name,
      'quantity', 1,
      'amount', preset.amount
    ));
  end if;

  insert into private.invoice_counters (counter_date, last_number)
  values (current_date, 1)
  on conflict (counter_date) do update
    set last_number = private.invoice_counters.last_number + 1
  returning last_number into next_invoice;

  invoice_number := to_char(current_date, 'YYMMDD') || '-' || lpad(next_invoice::text, 4, '0');

  insert into public.invoices (
    visit_id,
    patient_id,
    invoice_number,
    line_items,
    subtotal,
    discount,
    total,
    payment_status,
    payment_method,
    paid_at
  )
  values (
    created_visit.id,
    current_patient.id,
    invoice_number,
    invoice_items,
    invoice_subtotal,
    0,
    invoice_subtotal,
    'pending',
    null,
    null
  );

  return query
  select
    created_visit.token_number,
    created_visit.id,
    current_patient.full_name,
    created_visit.confirmation_token,
    false;
end;
$$;

revoke all on function public.register_patient_atomic(
  text, integer, text, text, text, uuid, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.register_patient_atomic(
  text, integer, text, text, text, uuid, text, text, text, text
) to service_role;

revoke all on function public.get_next_token() from public, anon, authenticated;
revoke all on function public.generate_invoice_number() from public, anon, authenticated;
grant execute on function public.get_next_token() to service_role;
grant execute on function public.generate_invoice_number() to service_role;

comment on function public.register_patient_atomic(
  text, integer, text, text, text, uuid, text, text, text, text
) is 'Server-only atomic patient registration. Execute is restricted to service_role.';
