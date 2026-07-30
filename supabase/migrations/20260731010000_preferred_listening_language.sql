-- EchoReadly: default listening language preference (personal settings).

alter table public.user_preferences
  add column if not exists preferred_listening_language text not null default 'bn';

alter table public.user_preferences
  drop constraint if exists user_preferences_listening_language_check;

alter table public.user_preferences
  add constraint user_preferences_listening_language_check
  check (
    preferred_listening_language in (
      'en', 'es', 'fr', 'de', 'it', 'pt', 'bn', 'hi',
      'ja', 'ko', 'zh', 'ar', 'ru', 'nl', 'tr'
    )
  );
