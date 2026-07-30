-- EchoReadly billing: customers, subscriptions, webhook idempotency, usage.

create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text not null unique,
  email text,
  trial_used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists billing_customers_stripe_customer_id_idx
  on public.billing_customers (stripe_customer_id);

drop trigger if exists billing_customers_set_updated_at on public.billing_customers;
create trigger billing_customers_set_updated_at
  before update on public.billing_customers
  for each row
  execute function public.set_updated_at();

alter table public.billing_customers enable row level security;

drop policy if exists "billing_customers_select_own" on public.billing_customers;
create policy "billing_customers_select_own"
  on public.billing_customers
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Subscriptions: one row per user (latest known Stripe subscription state).
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan_id text not null default 'free'
    check (plan_id in ('free', 'pro')),
  status text not null default 'free'
    check (
      status in (
        'free',
        'trialing',
        'active',
        'past_due',
        'canceled',
        'unpaid',
        'incomplete',
        'incomplete_expired',
        'paused',
        'expired'
      )
    ),
  billing_interval text
    check (billing_interval is null or billing_interval in ('month', 'year')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  usage_reset_at timestamptz,
  latest_invoice_id text,
  checkout_session_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists subscriptions_stripe_subscription_id_idx
  on public.subscriptions (stripe_subscription_id);

create index if not exists subscriptions_status_idx
  on public.subscriptions (status);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row
  execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Idempotent webhook processing.
create table if not exists public.billing_webhook_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default timezone('utc', now()),
  livemode boolean not null default false,
  payload_summary text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists billing_webhook_events_type_idx
  on public.billing_webhook_events (type);

alter table public.billing_webhook_events enable row level security;
-- No authenticated policies — service role only.

-- Monthly (or period) usage counters for plan limits.
create table if not exists public.usage_counters (
  user_id uuid not null references auth.users (id) on delete cascade,
  metric text not null
    check (
      metric in (
        'documents',
        'summaries',
        'chat',
        'translation',
        'tts',
        'export'
      )
    ),
  period_start date not null,
  count integer not null default 0 check (count >= 0),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, metric, period_start)
);

create index if not exists usage_counters_user_period_idx
  on public.usage_counters (user_id, period_start);

drop trigger if exists usage_counters_set_updated_at on public.usage_counters;
create trigger usage_counters_set_updated_at
  before update on public.usage_counters
  for each row
  execute function public.set_updated_at();

alter table public.usage_counters enable row level security;

drop policy if exists "usage_counters_select_own" on public.usage_counters;
create policy "usage_counters_select_own"
  on public.usage_counters
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Atomic usage increment (service role / RPC).
create or replace function public.increment_usage_counter(
  p_user_id uuid,
  p_metric text,
  p_period_start date,
  p_amount integer default 1
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

  insert into public.usage_counters as uc (user_id, metric, period_start, count)
  values (p_user_id, p_metric, p_period_start, p_amount)
  on conflict (user_id, metric, period_start)
  do update set
    count = uc.count + excluded.count,
    updated_at = timezone('utc', now())
  returning uc.count into new_count;

  return new_count;
end;
$$;

revoke all on function public.increment_usage_counter(uuid, text, date, integer)
  from public;
grant execute on function public.increment_usage_counter(uuid, text, date, integer)
  to service_role;
