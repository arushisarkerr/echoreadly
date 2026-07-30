-- Shared durable rate-limit counters for multi-instance production.
-- Used by the Node API via the service role (SECURITY DEFINER RPC).

create table if not exists public.rate_limit_counters (
  key text primary key,
  count integer not null default 0 check (count >= 0),
  reset_at timestamptz not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists rate_limit_counters_reset_at_idx
  on public.rate_limit_counters (reset_at);

alter table public.rate_limit_counters enable row level security;

revoke all on table public.rate_limit_counters from public, anon, authenticated;
grant all on table public.rate_limit_counters to service_role;

-- Atomically enforce dual-key fixed-window semantics (user then IP).
-- Check both limits, then increment both or neither.
-- Returns jsonb: { ok, remaining?, reset_at, retry_after_seconds?, limited_by? }
create or replace function public.consume_rate_limit_pair(
  p_user_key text,
  p_user_limit integer,
  p_ip_key text,
  p_ip_limit integer,
  p_window_ms integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_window interval := (p_window_ms::double precision * interval '1 millisecond');
  v_user public.rate_limit_counters%rowtype;
  v_ip public.rate_limit_counters%rowtype;
  v_user_count integer;
  v_ip_count integer;
  v_user_reset timestamptz;
  v_ip_reset timestamptz;
  v_reset timestamptz;
begin
  if p_user_key is null or length(trim(p_user_key)) = 0 then
    raise exception 'p_user_key is required';
  end if;
  if p_ip_key is null or length(trim(p_ip_key)) = 0 then
    raise exception 'p_ip_key is required';
  end if;
  if p_user_limit is null or p_user_limit < 1 then
    raise exception 'p_user_limit must be >= 1';
  end if;
  if p_ip_limit is null or p_ip_limit < 1 then
    raise exception 'p_ip_limit must be >= 1';
  end if;
  if p_window_ms is null or p_window_ms < 1 then
    raise exception 'p_window_ms must be >= 1';
  end if;

  insert into public.rate_limit_counters (key, count, reset_at)
  values
    (p_user_key, 0, v_now + v_window),
    (p_ip_key, 0, v_now + v_window)
  on conflict (key) do nothing;

  -- Lock both rows in a stable order to avoid deadlocks.
  if p_user_key < p_ip_key then
    select * into v_user from public.rate_limit_counters where key = p_user_key for update;
    select * into v_ip from public.rate_limit_counters where key = p_ip_key for update;
  else
    select * into v_ip from public.rate_limit_counters where key = p_ip_key for update;
    select * into v_user from public.rate_limit_counters where key = p_user_key for update;
  end if;

  if v_user.reset_at <= v_now then
    v_user_count := 0;
    v_user_reset := v_now + v_window;
  else
    v_user_count := v_user.count;
    v_user_reset := v_user.reset_at;
  end if;

  if v_ip.reset_at <= v_now then
    v_ip_count := 0;
    v_ip_reset := v_now + v_window;
  else
    v_ip_count := v_ip.count;
    v_ip_reset := v_ip.reset_at;
  end if;

  if v_user_count >= p_user_limit then
    update public.rate_limit_counters
    set count = v_user_count,
        reset_at = v_user_reset,
        updated_at = v_now
    where key = p_user_key;

    update public.rate_limit_counters
    set count = v_ip_count,
        reset_at = v_ip_reset,
        updated_at = v_now
    where key = p_ip_key;

    return jsonb_build_object(
      'ok', false,
      'limited_by', 'user',
      'reset_at', floor(extract(epoch from v_user_reset) * 1000)::bigint,
      'retry_after_seconds', greatest(
        1,
        ceil(extract(epoch from (v_user_reset - v_now)))::integer
      )
    );
  end if;

  if v_ip_count >= p_ip_limit then
    update public.rate_limit_counters
    set count = v_user_count,
        reset_at = v_user_reset,
        updated_at = v_now
    where key = p_user_key;

    update public.rate_limit_counters
    set count = v_ip_count,
        reset_at = v_ip_reset,
        updated_at = v_now
    where key = p_ip_key;

    return jsonb_build_object(
      'ok', false,
      'limited_by', 'ip',
      'reset_at', floor(extract(epoch from v_ip_reset) * 1000)::bigint,
      'retry_after_seconds', greatest(
        1,
        ceil(extract(epoch from (v_ip_reset - v_now)))::integer
      )
    );
  end if;

  v_user_count := v_user_count + 1;
  v_ip_count := v_ip_count + 1;
  v_reset := least(v_user_reset, v_ip_reset);

  update public.rate_limit_counters
  set count = v_user_count,
      reset_at = v_user_reset,
      updated_at = v_now
  where key = p_user_key;

  update public.rate_limit_counters
  set count = v_ip_count,
      reset_at = v_ip_reset,
      updated_at = v_now
  where key = p_ip_key;

  return jsonb_build_object(
    'ok', true,
    'remaining', least(
      p_user_limit - v_user_count,
      p_ip_limit - v_ip_count
    ),
    'reset_at', floor(extract(epoch from v_reset) * 1000)::bigint
  );
end;
$$;

revoke all on function public.consume_rate_limit_pair(
  text,
  integer,
  text,
  integer,
  integer
) from public, anon, authenticated;

grant execute on function public.consume_rate_limit_pair(
  text,
  integer,
  text,
  integer,
  integer
) to service_role;
