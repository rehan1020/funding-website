-- The Capital Room — migration v2
-- Removes founder auth dependency, adds contact/marketing fields, adds admins.
-- Run in Supabase SQL Editor AFTER the original schema. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. founders: no longer tied to auth.users. Auto-created per submission,
--    deduped by email. Adds submitting person's name + WhatsApp phone.
-- ---------------------------------------------------------------------------
alter table founders drop constraint if exists founders_id_fkey;
alter table founders alter column id set default gen_random_uuid();
alter table founders add column if not exists name text;
alter table founders add column if not exists phone text;

-- ---------------------------------------------------------------------------
-- 2. startups: optional website + socials.
-- ---------------------------------------------------------------------------
alter table startups add column if not exists website text;
alter table startups add column if not exists socials text;

-- ---------------------------------------------------------------------------
-- 3. admins allowlist. An auth user is an admin iff they have a row here.
--    Create the auth user first (Authentication > Users > Add user, with a
--    password), then insert their id/email below.
-- ---------------------------------------------------------------------------
create table if not exists admins (
  id uuid primary key references auth.users(id),
  email text unique not null,
  created_at timestamptz default now()
);

alter table admins enable row level security;

-- An admin may confirm their own admin row (used by the dashboard guard).
drop policy if exists admins_select_self on admins;
create policy admins_select_self on admins
  for select using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. Drop the now-unused founder self-read policies (founders don't log in).
--    Admin reads happen server-side via the service-role key.
-- ---------------------------------------------------------------------------
drop policy if exists founders_select_own on founders;
drop policy if exists founders_insert_own on founders;
drop policy if exists startups_select_own on startups;
drop policy if exists startups_insert_own on startups;
drop policy if exists startups_update_own on startups;
drop policy if exists submissions_select_own on submissions;
drop policy if exists payments_select_own on payments;

-- founders/startups/submissions/payments now have RLS enabled with NO policies
-- => zero client access. All reads/writes go through server-only API routes
-- using the service-role key, which bypasses RLS.

-- ---------------------------------------------------------------------------
-- 5. Register your admin(s). Replace the id + email with real values.
--    id must equal the auth.users id created in the dashboard.
-- ---------------------------------------------------------------------------
-- insert into admins (id, email) values
--   ('00000000-0000-0000-0000-000000000000', 'you@example.com')
-- on conflict (id) do nothing;
