alter table public.clinic_settings
  add column if not exists logo_url text not null default '',
  add column if not exists theme_color text not null default '#1D9E75',
  add column if not exists theme_color_hover text not null default '#0F6E56',
  add column if not exists theme_color_light text not null default '#E8F8F2';

update public.clinic_settings
set
  logo_url = coalesce(logo_url, ''),
  theme_color = coalesce(nullif(theme_color, ''), '#1D9E75'),
  theme_color_hover = coalesce(nullif(theme_color_hover, ''), '#0F6E56'),
  theme_color_light = coalesce(nullif(theme_color_light, ''), '#E8F8F2');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'clinic_settings_theme_color_format'
      and conrelid = 'public.clinic_settings'::regclass
  ) then
    alter table public.clinic_settings
      add constraint clinic_settings_theme_color_format
      check (
        theme_color ~ '^#[0-9A-Fa-f]{6}$'
        and theme_color_hover ~ '^#[0-9A-Fa-f]{6}$'
        and theme_color_light ~ '^#[0-9A-Fa-f]{6}$'
      );
  end if;
end;
$$;

comment on column public.clinic_settings.logo_url
  is 'Optional clinic logo image URL shown on public registration and dashboard branding.';

comment on column public.clinic_settings.theme_color
  is 'Primary brand color for tenant-specific clinic theme, stored as #RRGGBB.';

comment on column public.clinic_settings.theme_color_hover
  is 'Darker interactive brand color for buttons and hover states, stored as #RRGGBB.';

comment on column public.clinic_settings.theme_color_light
  is 'Light brand tint for subtle backgrounds, stored as #RRGGBB.';
