-- EchoReadly: extend user_preferences for Settings (same table).

alter table public.user_preferences
  add column if not exists display_name text,
  add column if not exists playback_speed double precision not null default 1,
  add column if not exists auto_play_next_page boolean not null default false,
  add column if not exists font_size text not null default 'md',
  add column if not exists reading_width text not null default 'default',
  add column if not exists theme_preference text not null default 'system',
  add column if not exists preferred_export_format text not null default 'mp3';

alter table public.user_preferences
  drop constraint if exists user_preferences_playback_speed_check;

alter table public.user_preferences
  add constraint user_preferences_playback_speed_check
  check (playback_speed in (1, 1.25, 1.5, 2));

alter table public.user_preferences
  drop constraint if exists user_preferences_font_size_check;

alter table public.user_preferences
  add constraint user_preferences_font_size_check
  check (font_size in ('sm', 'md', 'lg'));

alter table public.user_preferences
  drop constraint if exists user_preferences_reading_width_check;

alter table public.user_preferences
  add constraint user_preferences_reading_width_check
  check (reading_width in ('narrow', 'default', 'wide'));

alter table public.user_preferences
  drop constraint if exists user_preferences_theme_preference_check;

alter table public.user_preferences
  add constraint user_preferences_theme_preference_check
  check (theme_preference in ('light', 'dark', 'system'));

alter table public.user_preferences
  drop constraint if exists user_preferences_export_format_check;

alter table public.user_preferences
  add constraint user_preferences_export_format_check
  check (preferred_export_format in ('mp3'));

alter table public.user_preferences
  drop constraint if exists user_preferences_display_name_length_check;

alter table public.user_preferences
  add constraint user_preferences_display_name_length_check
  check (display_name is null or char_length(display_name) <= 80);
