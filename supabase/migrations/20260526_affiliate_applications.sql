create table affiliate_applications (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  platform text not null,                    -- 'youtube', 'twitter', 'facebook', 'instagram', 'tiktok', 'blog', 'other'
  channel_url text not null,                 -- link to their channel/page
  audience_size text,                        -- '1K-5K', '5K-10K', '10K-50K', '50K-100K', '100K+'
  niche text,                               -- 'forex', 'crypto', 'stocks', 'general trading', 'prop firms', 'other'
  country text,
  message text,                             -- why they want to partner
  status text not null default 'pending',   -- 'pending', 'approved', 'rejected'
  admin_notes text,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create index idx_affiliate_applications_status on affiliate_applications(status);
create index idx_affiliate_applications_email on affiliate_applications(email);

-- Public insert (anyone can apply), admin read/update
alter table affiliate_applications enable row level security;
create policy "Anyone can submit application" on affiliate_applications for insert with check (true);
create policy "Admin can view all applications" on affiliate_applications for select using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);
create policy "Admin can update applications" on affiliate_applications for update using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);
