-- =============================================================================
-- TradeLog Pro — Referral Program
-- Two-tier: partner (36%) created by admin, user (10%) self-serve
-- =============================================================================

-- Referral links table
create table if not exists public.referral_links (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  code            text unique not null,
  type            text not null default 'user' check (type in ('partner', 'user')),
  commission_rate numeric not null default 0.10,
  label           text,
  is_active       boolean not null default true,
  total_clicks    integer not null default 0,
  created_at      timestamptz default now()
);

-- Referral tracking table
create table if not exists public.referrals (
  id                  uuid default gen_random_uuid() primary key,
  referral_link_id    uuid references public.referral_links(id) on delete cascade not null,
  referrer_id         uuid references auth.users(id) on delete cascade not null,
  referred_id         uuid references auth.users(id) on delete cascade not null,
  status              text not null default 'signed_up' check (status in ('signed_up', 'subscribed', 'churned')),
  plan                text,
  subscription_amount numeric,
  commission_amount   numeric,
  commission_paid     numeric not null default 0,
  signed_up_at        timestamptz default now(),
  subscribed_at       timestamptz,
  unique(referred_id)
);

-- Referral payouts table
create table if not exists public.referral_payouts (
  id          uuid default gen_random_uuid() primary key,
  referrer_id uuid references auth.users(id) on delete cascade not null,
  amount      numeric not null,
  method      text,
  reference   text,
  notes       text,
  paid_at     timestamptz default now()
);

-- Indexes
create index if not exists idx_referral_links_user on public.referral_links(user_id);
create index if not exists idx_referral_links_code on public.referral_links(code);
create index if not exists idx_referrals_referrer  on public.referrals(referrer_id);
create index if not exists idx_referrals_referred  on public.referrals(referred_id);
create index if not exists idx_referrals_link      on public.referrals(referral_link_id);

-- Add referred_by to profiles
alter table public.profiles add column if not exists referred_by text;
alter table public.profiles add column if not exists is_admin    boolean default false;
alter table public.profiles add column if not exists email_opt_in boolean default true;
alter table public.profiles add column if not exists plan_intent text default 'pro';

-- RLS
alter table public.referral_links  enable row level security;
alter table public.referrals       enable row level security;
alter table public.referral_payouts enable row level security;

-- referral_links policies
create policy "Users can view own referral links"
  on public.referral_links for select
  using (auth.uid() = user_id);

create policy "Users can insert own user referral links"
  on public.referral_links for insert
  with check (auth.uid() = user_id and type = 'user');

create policy "Admin can manage all referral links"
  on public.referral_links for all
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- referrals policies
create policy "Users can view own referrals"
  on public.referrals for select
  using (auth.uid() = referrer_id);

create policy "Admin can view all referrals"
  on public.referrals for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

create policy "System can insert referrals"
  on public.referrals for insert
  with check (true);

create policy "Admin can update referrals"
  on public.referrals for update
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- referral_payouts policies
create policy "Users can view own payouts"
  on public.referral_payouts for select
  using (auth.uid() = referrer_id);

create policy "Admin can manage payouts"
  on public.referral_payouts for all
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Atomic click increment function (security definer bypasses RLS for the update)
create or replace function public.increment_referral_clicks(link_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.referral_links set total_clicks = total_clicks + 1 where id = link_id;
end;
$$;
