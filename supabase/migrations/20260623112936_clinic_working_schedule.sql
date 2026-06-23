alter table public.clinic_settings
  add column if not exists working_schedule jsonb;

update public.clinic_settings
set working_schedule = coalesce(
  working_schedule,
  (
    select jsonb_agg(
      jsonb_build_object(
        'day', day_value,
        'enabled', day_value = any(working_days),
        'slots', case
          when day_value = any(working_days) then jsonb_build_array(jsonb_build_object(
            'start', left(working_hours_start::text, 5),
            'end', left(working_hours_end::text, 5)
          ))
          else '[]'::jsonb
        end
      )
      order by case day_value when 0 then 7 else day_value end
    )
    from unnest(array[1, 2, 3, 4, 5, 6, 0]) as day_value
  )
);

alter table public.clinic_settings
  alter column working_schedule set default '[
    {"day":1,"enabled":true,"slots":[{"start":"09:00","end":"18:00"}]},
    {"day":2,"enabled":true,"slots":[{"start":"09:00","end":"18:00"}]},
    {"day":3,"enabled":true,"slots":[{"start":"09:00","end":"18:00"}]},
    {"day":4,"enabled":true,"slots":[{"start":"09:00","end":"18:00"}]},
    {"day":5,"enabled":true,"slots":[{"start":"09:00","end":"18:00"}]},
    {"day":6,"enabled":true,"slots":[{"start":"09:00","end":"18:00"}]},
    {"day":0,"enabled":false,"slots":[]}
  ]'::jsonb,
  alter column working_schedule set not null;

comment on column public.clinic_settings.working_schedule
  is 'Per-day public registration schedule. Each day has enabled and slots [{start,end}], allowing split morning/evening clinic timings.';
