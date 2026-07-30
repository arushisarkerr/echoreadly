-- EchoReadly: cached audio exports (MP3) for owned page/summary narration.

insert into storage.buckets (id, name, public)
values ('audio-exports', 'audio-exports', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "audio_exports_select_own" on storage.objects;
drop policy if exists "audio_exports_insert_own" on storage.objects;
drop policy if exists "audio_exports_update_own" on storage.objects;
drop policy if exists "audio_exports_delete_own" on storage.objects;

create policy "audio_exports_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'audio-exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "audio_exports_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'audio-exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "audio_exports_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'audio-exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'audio-exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "audio_exports_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'audio-exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create table if not exists public.audio_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_storage_path text not null,
  source text not null check (source in ('page', 'summary')),
  page_number integer check (page_number is null or page_number >= 1),
  summary_type text check (
    summary_type is null
    or summary_type in ('short', 'detailed', 'bullet')
  ),
  voice text not null,
  model text not null,
  object_key text not null,
  mime_type text not null default 'audio/mpeg',
  byte_size bigint not null default 0 check (byte_size >= 0),
  original_file_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint audio_exports_source_shape_check check (
    (
      source = 'page'
      and page_number is not null
      and summary_type is null
    )
    or (
      source = 'summary'
      and summary_type is not null
      and page_number is null
    )
  )
);

create unique index if not exists audio_exports_identity_uidx
  on public.audio_exports (
    user_id,
    document_storage_path,
    source,
    coalesce(page_number, 0),
    coalesce(summary_type, ''),
    voice
  );

create index if not exists audio_exports_user_id_idx
  on public.audio_exports (user_id);

create index if not exists audio_exports_user_updated_at_idx
  on public.audio_exports (user_id, updated_at desc);

create index if not exists audio_exports_user_document_path_idx
  on public.audio_exports (user_id, document_storage_path);

drop trigger if exists audio_exports_set_updated_at on public.audio_exports;
create trigger audio_exports_set_updated_at
  before update on public.audio_exports
  for each row
  execute function public.set_updated_at();

alter table public.audio_exports enable row level security;

drop policy if exists "audio_exports_select_own" on public.audio_exports;
drop policy if exists "audio_exports_insert_own" on public.audio_exports;
drop policy if exists "audio_exports_update_own" on public.audio_exports;
drop policy if exists "audio_exports_delete_own" on public.audio_exports;

create policy "audio_exports_select_own"
  on public.audio_exports
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "audio_exports_insert_own"
  on public.audio_exports
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "audio_exports_update_own"
  on public.audio_exports
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "audio_exports_delete_own"
  on public.audio_exports
  for delete
  to authenticated
  using (auth.uid() = user_id);
