-- EchoReadly analytics: daily aggregates + recent activity feed.

create table if not exists public.analytics_daily (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  event_name text not null,
  count integer not null default 0 check (count >= 0),
  total_value numeric not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, day, event_name)
);

create index if not exists analytics_daily_user_day_idx
  on public.analytics_daily (user_id, day desc);

create index if not exists analytics_daily_user_event_idx
  on public.analytics_daily (user_id, event_name, day desc);

drop trigger if exists analytics_daily_set_updated_at on public.analytics_daily;
create trigger analytics_daily_set_updated_at
  before update on public.analytics_daily
  for each row
  execute function public.set_updated_at();

alter table public.analytics_daily enable row level security;

drop policy if exists "analytics_daily_select_own" on public.analytics_daily;
create policy "analytics_daily_select_own"
  on public.analytics_daily
  for select
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.analytics_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_name text not null,
  label text not null,
  document_id uuid,
  storage_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists analytics_activity_user_created_idx
  on public.analytics_activity (user_id, created_at desc);

alter table public.analytics_activity enable row level security;

drop policy if exists "analytics_activity_select_own" on public.analytics_activity;
create policy "analytics_activity_select_own"
  on public.analytics_activity
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Atomic daily counter upsert (service role).
create or replace function public.increment_analytics_daily(
  p_user_id uuid,
  p_day date,
  p_event_name text,
  p_amount integer default 1,
  p_value numeric default 0
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  if p_amount is null or p_amount < 1 then
    raise exception 'amount must be >= 1';
  end if;

  insert into public.analytics_daily as ad (
    user_id,
    day,
    event_name,
    count,
    total_value
  )
  values (
    p_user_id,
    p_day,
    p_event_name,
    p_amount,
    coalesce(p_value, 0)
  )
  on conflict (user_id, day, event_name)
  do update set
    count = ad.count + excluded.count,
    total_value = ad.total_value + excluded.total_value,
    updated_at = timezone('utc', now())
  returning ad.count into new_count;

  return new_count;
end;
$$;

revoke all on function public.increment_analytics_daily(uuid, date, text, integer, numeric)
  from public;
grant execute on function public.increment_analytics_daily(uuid, date, text, integer, numeric)
  to service_role;

-- Keep recent activity feed bounded per user.
create or replace function public.trim_analytics_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.analytics_activity
  where id in (
    select id
    from public.analytics_activity
    where user_id = new.user_id
    order by created_at desc
    offset 100
  );
  return new;
end;
$$;

drop trigger if exists analytics_activity_trim on public.analytics_activity;
create trigger analytics_activity_trim
  after insert on public.analytics_activity
  for each row
  execute function public.trim_analytics_activity();
