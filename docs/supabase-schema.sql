create table if not exists public.projects (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  url text default '',
  github_url text default '',
  deploy_status text not null default 'unknown',
  adsense_status text not null default 'not_applied',
  today_revenue numeric not null default 0,
  month_revenue numeric not null default 0,
  next_action text not null default 'none',
  next_action_due_date date,
  next_action_note text default '',
  note text default '',
  updated_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists next_action text not null default 'none',
  add column if not exists next_action_due_date date,
  add column if not exists next_action_note text default '';

alter table public.projects enable row level security;

-- Personal Control Tower mode:
-- Owner email must match src/config.js allowedEmail.
drop policy if exists "Owners can read projects" on public.projects;
create policy "Owners can read projects"
  on public.projects
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and (select auth.uid()) = owner_id
    and (select auth.jwt() ->> 'email') = 'seoha376@gmail.com'
  );

drop policy if exists "Owners can insert projects" on public.projects;
create policy "Owners can insert projects"
  on public.projects
  for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and (select auth.uid()) = owner_id
    and (select auth.jwt() ->> 'email') = 'seoha376@gmail.com'
  );

drop policy if exists "Owners can update projects" on public.projects;
create policy "Owners can update projects"
  on public.projects
  for update
  to authenticated
  using (
    (select auth.uid()) is not null
    and (select auth.uid()) = owner_id
    and (select auth.jwt() ->> 'email') = 'seoha376@gmail.com'
  )
  with check (
    (select auth.uid()) is not null
    and (select auth.uid()) = owner_id
    and (select auth.jwt() ->> 'email') = 'seoha376@gmail.com'
  );

drop policy if exists "Owners can delete projects" on public.projects;
create policy "Owners can delete projects"
  on public.projects
  for delete
  to authenticated
  using (
    (select auth.uid()) is not null
    and (select auth.uid()) = owner_id
    and (select auth.jwt() ->> 'email') = 'seoha376@gmail.com'
  );

create index if not exists projects_owner_updated_idx
  on public.projects (owner_id, updated_at desc);
