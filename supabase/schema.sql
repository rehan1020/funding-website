-- The Capital Room — schema + Row Level Security
-- Run in Supabase SQL editor. Order matters (tables, then RLS, then policies, then RPC).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists founders (
  id uuid primary key references auth.users(id),
  email text unique not null,
  created_at timestamptz default now()
);

create table if not exists startups (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid references founders(id) not null,
  company_name text not null,
  work_email text not null,
  pitch_summary text not null,
  deck_url text,                       -- Supabase Storage private bucket path
  created_at timestamptz default now()
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references startups(id) not null,
  review_type text check (review_type in ('standard','priority')) not null,
  status text check (status in ('queued','paid_priority','under_review','contacted','rejected')) default 'queued',
  queue_position int,                  -- computed server-side, never client-set
  submitted_at timestamptz default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) not null,
  provider text not null,
  provider_ref text unique not null,   -- idempotency anchor
  amount numeric not null,
  currency text not null,
  status text check (status in ('pending','succeeded','failed')) default 'pending',
  created_at timestamptz default now()
);

create table if not exists vc_partners (
  id uuid primary key default gen_random_uuid(),
  name text, firm text, focus_areas text[], logo_url text,
  is_public boolean default false      -- gated by "shared with permission"
);

create table if not exists legal_services (
  id uuid primary key default gen_random_uuid(),
  title text, description text, sort_order int
);

create table if not exists audit_log (
  id bigint generated always as identity primary key,
  actor uuid, action text, target_table text, target_id uuid,
  ip inet, created_at timestamptz default now()
);
