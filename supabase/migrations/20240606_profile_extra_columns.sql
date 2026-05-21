-- Add columns used during signup flow but missing from original schema
alter table public.profiles add column if not exists plan_intent text default 'pro';
alter table public.profiles add column if not exists email_opt_in boolean default true;
