-- broker_connections: store MT4/MT5 broker connection metadata
-- NOTE: passwords are NEVER stored here. Only connection metadata.

create table if not exists public.broker_connections (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  broker_name     text not null,
  platform        text not null default 'mt5' check (platform in ('mt4', 'mt5')),
  account_number  text not null,
  server          text not null,
  status          text not null default 'pending'
                    check (status in ('pending', 'verified', 'connected', 'failed', 'disconnected')),
  last_synced_at  timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists broker_connections_user_id_idx on public.broker_connections(user_id);

alter table public.broker_connections enable row level security;

create policy "Users can view own broker connections"
  on public.broker_connections for select
  using (auth.uid() = user_id);

create policy "Users can insert own broker connections"
  on public.broker_connections for insert
  with check (auth.uid() = user_id);

create policy "Users can update own broker connections"
  on public.broker_connections for update
  using (auth.uid() = user_id);

create policy "Users can delete own broker connections"
  on public.broker_connections for delete
  using (auth.uid() = user_id);
