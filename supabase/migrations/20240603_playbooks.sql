create table if not exists public.playbooks (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  name            text not null,
  description     text,
  market          text,
  timeframe       text,
  entry_rules     text,
  exit_rules      text,
  risk_per_trade  text,
  notes           text,
  status          text not null default 'active',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  constraint playbooks_status_check check (status in ('active', 'paused', 'archived'))
);

create index if not exists idx_playbooks_user_id on public.playbooks(user_id);

alter table public.playbooks enable row level security;

create policy "Users can manage own playbooks"
  on public.playbooks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
