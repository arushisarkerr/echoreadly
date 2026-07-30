-- EchoReadly background jobs: durable queue with claim/retry/cleanup.

create table if not exists public.background_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid,
  storage_path text,
  job_type text not null,
  status text not null default 'pending'
    check (status in (
      'pending',
      'running',
      'completed',
      'failed',
      'retrying',
      'cancelled'
    )),
  progress integer not null default 0
    check (progress >= 0 and progress <= 100),
  current_step text,
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  error_message text,
  attempts integer not null default 0
    check (attempts >= 0),
  max_attempts integer not null default 3
    check (max_attempts >= 1 and max_attempts <= 10),
  idempotency_key text not null,
  locked_at timestamptz,
  locked_by text,
  run_after timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists background_jobs_active_idempotency_uidx
  on public.background_jobs (user_id, job_type, idempotency_key)
  where status in ('pending', 'running', 'retrying');

create index if not exists background_jobs_claim_idx
  on public.background_jobs (status, run_after, created_at)
  where status in ('pending', 'retrying');

create index if not exists background_jobs_user_created_idx
  on public.background_jobs (user_id, created_at desc);

create index if not exists background_jobs_user_status_idx
  on public.background_jobs (user_id, status, created_at desc);

drop trigger if exists background_jobs_set_updated_at on public.background_jobs;
create trigger background_jobs_set_updated_at
  before update on public.background_jobs
  for each row
  execute function public.set_updated_at();

alter table public.background_jobs enable row level security;

drop policy if exists "background_jobs_select_own" on public.background_jobs;
create policy "background_jobs_select_own"
  on public.background_jobs
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Users may cancel their own pending/retrying jobs (not rewrite progress).
drop policy if exists "background_jobs_update_own_cancel" on public.background_jobs;
create policy "background_jobs_update_own_cancel"
  on public.background_jobs
  for update
  to authenticated
  using (
    auth.uid() = user_id
    and status in ('pending', 'retrying')
  )
  with check (
    auth.uid() = user_id
    and status = 'cancelled'
  );

revoke all on table public.background_jobs from anon;
grant select, update on table public.background_jobs to authenticated;
grant all on table public.background_jobs to service_role;

-- Atomically claim due jobs (SKIP LOCKED) for a worker.
create or replace function public.claim_background_jobs(
  p_limit integer default 1,
  p_worker_id text default 'worker',
  p_stale_seconds integer default 900
)
returns setof public.background_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  claim_limit integer := greatest(1, least(coalesce(p_limit, 1), 10));
  stale_seconds integer := greatest(60, least(coalesce(p_stale_seconds, 900), 7200));
begin
  -- Recover stale running jobs into retrying/failed.
  update public.background_jobs as bj
  set
    status = case
      when bj.attempts >= bj.max_attempts then 'failed'
      else 'retrying'
    end,
    error_message = coalesce(
      bj.error_message,
      'Worker timed out or crashed; job recovered.'
    ),
    locked_at = null,
    locked_by = null,
    run_after = case
      when bj.attempts >= bj.max_attempts then bj.run_after
      else timezone('utc', now()) + make_interval(
        secs => least(3600, power(2, greatest(bj.attempts, 1))::integer * 5)
      )
    end,
    completed_at = case
      when bj.attempts >= bj.max_attempts then timezone('utc', now())
      else null
    end,
    current_step = case
      when bj.attempts >= bj.max_attempts then 'dead'
      else 'awaiting_retry'
    end
  where bj.status = 'running'
    and bj.locked_at is not null
    and bj.locked_at < timezone('utc', now()) - make_interval(secs => stale_seconds);

  return query
  with due as (
    select bj.id
    from public.background_jobs as bj
    where bj.status in ('pending', 'retrying')
      and bj.run_after <= timezone('utc', now())
    order by bj.run_after asc, bj.created_at asc
    for update skip locked
    limit claim_limit
  )
  update public.background_jobs as bj
  set
    status = 'running',
    attempts = bj.attempts + 1,
    locked_at = timezone('utc', now()),
    locked_by = coalesce(nullif(p_worker_id, ''), 'worker'),
    started_at = coalesce(bj.started_at, timezone('utc', now())),
    current_step = coalesce(bj.current_step, 'starting'),
    progress = greatest(bj.progress, 1),
    error_message = null
  from due
  where bj.id = due.id
  returning bj.*;
end;
$$;

revoke all on function public.claim_background_jobs(integer, text, integer) from public;
grant execute on function public.claim_background_jobs(integer, text, integer)
  to service_role;

-- Delete old terminal jobs (cleanup worker / cron).
create or replace function public.cleanup_background_jobs(
  p_older_than_days integer default 14,
  p_limit integer default 500
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
  days integer := greatest(1, least(coalesce(p_older_than_days, 14), 365));
  row_limit integer := greatest(1, least(coalesce(p_limit, 500), 5000));
begin
  with doomed as (
    select id
    from public.background_jobs
    where status in ('completed', 'failed', 'cancelled')
      and coalesce(completed_at, updated_at) < timezone('utc', now()) - make_interval(days => days)
    order by coalesce(completed_at, updated_at) asc
    limit row_limit
  )
  delete from public.background_jobs
  where id in (select id from doomed);

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.cleanup_background_jobs(integer, integer) from public;
grant execute on function public.cleanup_background_jobs(integer, integer)
  to service_role;
