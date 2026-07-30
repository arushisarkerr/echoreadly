-- EchoReadly: per-user per-document listening / reading progress for true Resume.

create table if not exists public.document_listening_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  document_id uuid references public.documents (id) on delete cascade,
  page_number integer not null default 1 check (page_number >= 1),
  page_count integer check (page_count is null or page_count >= 1),
  scroll_ratio double precision not null default 0
    check (scroll_ratio >= 0 and scroll_ratio <= 1),
  playback_seconds double precision not null default 0
    check (playback_seconds >= 0),
  playback_source text
    check (
      playback_source is null
      or playback_source in ('page', 'summary')
    ),
  last_opened_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint document_listening_progress_user_storage_key
    unique (user_id, storage_path)
);

create index if not exists document_listening_progress_user_id_idx
  on public.document_listening_progress (user_id);

create index if not exists document_listening_progress_user_last_opened_idx
  on public.document_listening_progress (user_id, last_opened_at desc);

create index if not exists document_listening_progress_document_id_idx
  on public.document_listening_progress (document_id);

drop trigger if exists document_listening_progress_set_updated_at
  on public.document_listening_progress;
create trigger document_listening_progress_set_updated_at
  before update on public.document_listening_progress
  for each row
  execute function public.set_updated_at();

alter table public.document_listening_progress enable row level security;

drop policy if exists "document_listening_progress_select_own"
  on public.document_listening_progress;
drop policy if exists "document_listening_progress_insert_own"
  on public.document_listening_progress;
drop policy if exists "document_listening_progress_update_own"
  on public.document_listening_progress;
drop policy if exists "document_listening_progress_delete_own"
  on public.document_listening_progress;

create policy "document_listening_progress_select_own"
  on public.document_listening_progress
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "document_listening_progress_insert_own"
  on public.document_listening_progress
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "document_listening_progress_update_own"
  on public.document_listening_progress
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "document_listening_progress_delete_own"
  on public.document_listening_progress
  for delete
  to authenticated
  using (auth.uid() = user_id);
