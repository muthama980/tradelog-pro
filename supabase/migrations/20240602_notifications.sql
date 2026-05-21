create table if not exists public.notifications (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  title      text not null,
  message    text not null,
  type       text not null default 'info',
  read       boolean not null default false,
  link       text,
  created_at timestamptz default now(),
  constraint notifications_type_check check (type in ('info', 'success', 'warning', 'alert', 'feature'))
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_unread  on public.notifications(user_id, read) where read = false;

alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "Users can delete own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);

create or replace function insert_notification(
  p_user_id uuid,
  p_title   text,
  p_message text,
  p_type    text    default 'info',
  p_link    text    default null
) returns void as $$
begin
  insert into public.notifications (user_id, title, message, type, link)
  values (p_user_id, p_title, p_message, p_type, p_link);
end;
$$ language plpgsql security definer;
