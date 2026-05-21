-- Admin flag on profiles
alter table public.profiles add column if not exists is_admin boolean default false;

-- Log table so admin can see history of sent notifications
create table if not exists public.admin_notification_log (
  id               uuid        default gen_random_uuid() primary key,
  title            text        not null,
  message          text        not null,
  type             text        not null,
  link             text,
  to_all           boolean     default false,
  recipient_count  integer     default 0,
  sent_email       boolean     default false,
  sent_by          uuid        references public.profiles(id),
  created_at       timestamptz default now()
);

alter table public.admin_notification_log enable row level security;

create policy "Admins can read notification log"
  on public.admin_notification_log for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );
