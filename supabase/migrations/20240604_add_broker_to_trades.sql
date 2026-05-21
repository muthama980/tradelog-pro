alter table public.trades add column if not exists broker text;
alter table public.trades add column if not exists mistakes jsonb;

create index if not exists trades_broker_idx on public.trades(user_id, broker);
