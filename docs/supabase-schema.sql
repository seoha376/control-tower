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

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.connected_accounts (
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_account_id text default '',
  refresh_token_ciphertext text not null,
  access_token_ciphertext text default '',
  access_token_expires_at timestamptz,
  connection_status text not null default 'connected',
  last_synced_at timestamptz,
  last_error text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, provider)
);

alter table public.profiles enable row level security;
alter table public.connected_accounts enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can upsert own profile" on public.profiles;
create policy "Users can upsert own profile"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users can read own connected accounts" on public.connected_accounts;
create policy "Users can read own connected accounts"
  on public.connected_accounts
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "Users can delete own connected accounts" on public.connected_accounts;
create policy "Users can delete own connected accounts"
  on public.connected_accounts
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- Multi-user Control Tower mode:
-- Every signed-in user can manage only rows whose owner_id matches auth.uid().
drop policy if exists "Owners can read projects" on public.projects;
create policy "Owners can read projects"
  on public.projects
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and (select auth.uid()) = owner_id
  );

drop policy if exists "Owners can insert projects" on public.projects;
create policy "Owners can insert projects"
  on public.projects
  for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and (select auth.uid()) = owner_id
  );

drop policy if exists "Owners can update projects" on public.projects;
create policy "Owners can update projects"
  on public.projects
  for update
  to authenticated
  using (
    (select auth.uid()) is not null
    and (select auth.uid()) = owner_id
  )
  with check (
    (select auth.uid()) is not null
    and (select auth.uid()) = owner_id
  );

drop policy if exists "Owners can delete projects" on public.projects;
create policy "Owners can delete projects"
  on public.projects
  for delete
  to authenticated
  using (
    (select auth.uid()) is not null
    and (select auth.uid()) = owner_id
  );

create index if not exists projects_owner_updated_idx
  on public.projects (owner_id, updated_at desc);

create index if not exists connected_accounts_owner_provider_idx
  on public.connected_accounts (owner_id, provider);

notify pgrst, 'reload schema';
