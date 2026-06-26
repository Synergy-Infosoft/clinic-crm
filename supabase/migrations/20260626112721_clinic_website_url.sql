alter table public.clinic_settings
  add column if not exists website_url text not null default '';

update public.clinic_settings
set website_url = trim(website_url)
where website_url is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'clinic_settings_website_url_format'
      and conrelid = 'public.clinic_settings'::regclass
  ) then
    alter table public.clinic_settings
      add constraint clinic_settings_website_url_format
      check (
        website_url = ''
        or website_url ~* '^https://[^[:space:]]+\.[^[:space:]]+$'
      );
  end if;
end $$;

comment on column public.clinic_settings.website_url
  is 'Optional hospital or clinic website URL shown on public registration and staff navigation.';
