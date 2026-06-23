-- Add patient marketing/source metadata and visit scheduling metadata.
alter table public.patients
  add column if not exists father_name text,
  add column if not exists referral_source text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'patients_referral_source_check'
  ) then
    alter table public.patients
      add constraint patients_referral_source_check
      check (
        referral_source is null
        or referral_source in (
          'google', 'youtube', 'social_media', 'friend_family',
          'doctor_referral', 'walk_in', 'other'
        )
      );
  end if;
end $$;

alter table public.visits
  add column if not exists consultation_date date,
  add column if not exists consultation_time time without time zone,
  add column if not exists visit_type text;

update public.visits
set consultation_date = coalesce(consultation_date, token_date),
    consultation_time = coalesce(consultation_time, (created_at at time zone 'Asia/Kolkata')::time),
    visit_type = coalesce(visit_type, 'first_visit');

alter table public.visits
  alter column consultation_date set default current_date,
  alter column consultation_date set not null,
  alter column consultation_time set default localtime(0),
  alter column consultation_time set not null,
  alter column visit_type set default 'first_visit',
  alter column visit_type set not null;

alter table public.visits
  drop constraint if exists visits_status_check,
  drop constraint if exists visits_visit_type_check;

update public.visits
set status = 'pending'
where status in ('waiting', 'with_doctor');

alter table public.visits
  alter column status set default 'pending',
  add constraint visits_status_check
    check (status in ('pending', 'completed', 'cancelled')),
  add constraint visits_visit_type_check
    check (visit_type in ('first_visit', 'follow_up'));

create index if not exists visits_consultation_date_status_idx
  on public.visits (consultation_date, status);

-- Replace the old server-only registration RPC with the new scheduling/metadata version.
drop function if exists public.register_patient_atomic(
  text, integer, text, text, text, uuid, text, text, text, text
);

create or replace function public.register_patient_atomic(
  p_full_name text,
  p_age integer,
  p_gender text,
  p_phone text,
  p_chief_complaint text,
  p_doctor_id uuid default null,
  p_address text default null,
  p_father_name text default null,
  p_referral_source text default null,
  p_visit_type text default 'first_visit',
  p_consultation_date date default current_date,
  p_consultation_time time without time zone default localtime(0),
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
  if length(trim(coalesce(p_father_name, ''))) > 120 then
    raise exception 'INVALID_FATHER_NAME' using errcode = '22023';
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
  if p_visit_type not in ('first_visit', 'follow_up') then
    raise exception 'INVALID_VISIT_TYPE' using errcode = '22023';
  end if;
  if nullif(trim(coalesce(p_referral_source, '')), '') is not null
     and p_referral_source not in (
       'google', 'youtube', 'social_media', 'friend_family',
       'doctor_referral', 'walk_in', 'other'
     ) then
    raise exception 'INVALID_REFERRAL_SOURCE' using errcode = '22023';
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
      and consultation_date = p_consultation_date
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
        father_name = coalesce(nullif(trim(p_father_name), ''), father_name),
        referral_source = coalesce(nullif(trim(p_referral_source), ''), referral_source),
        updated_at = now()
    where id = current_patient.id
    returning * into current_patient;
  else
    insert into public.patients (
      full_name, age, gender, phone, address, father_name, referral_source
    )
    values (
      trim(p_full_name),
      p_age,
      p_gender,
      normalized_phone,
      nullif(trim(p_address), ''),
      nullif(trim(p_father_name), ''),
      nullif(trim(p_referral_source), '')
    )
    returning * into current_patient;
  end if;

  insert into public.token_counters (counter_date, last_token)
  values (p_consultation_date, 1)
  on conflict (counter_date) do update
    set last_token = public.token_counters.last_token + 1
  returning last_token into next_token;

  insert into public.visits (
    patient_id,
    doctor_id,
    token_number,
    token_date,
    consultation_date,
    consultation_time,
    visit_type,
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
    p_consultation_date,
    p_consultation_date,
    p_consultation_time,
    p_visit_type,
    trim(p_chief_complaint),
    'pending',
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
  text, integer, text, text, text, uuid, text, text, text, text, date, time without time zone, text, text
) from public, anon, authenticated;

grant execute on function public.register_patient_atomic(
  text, integer, text, text, text, uuid, text, text, text, text, date, time without time zone, text, text
) to service_role;

comment on function public.register_patient_atomic(
  text, integer, text, text, text, uuid, text, text, text, text, date, time without time zone, text, text
) is 'Server-only atomic patient registration with consultation scheduling and source metadata. Execute is restricted to service_role.';
