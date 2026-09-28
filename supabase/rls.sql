-- The Capital Room — Row Level Security policies + queue RPC
-- Apply AFTER schema.sql.

-- ---------------------------------------------------------------------------
-- Enable RLS on every table (deny-by-default once enabled).
-- ---------------------------------------------------------------------------
alter table founders        enable row level security;
alter table startups        enable row level security;
alter table submissions     enable row level security;
alter table payments        enable row level security;
alter table vc_partners     enable row level security;
alter table legal_services  enable row level security;
alter table audit_log       enable row level security;

-- Note: the service_role key bypasses RLS entirely. All mutating logic for
-- submissions/payments runs in server-only API routes using service_role, so
-- we intentionally grant NO client insert/update policies on those tables.

-- ---------------------------------------------------------------------------
-- founders: a founder can read/insert only their own row.
-- ---------------------------------------------------------------------------
create policy founders_select_own on founders
  for select using (id = auth.uid());
create policy founders_insert_own on founders
  for insert with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- startups: founders read/write only their own rows.
-- ---------------------------------------------------------------------------
create policy startups_select_own on startups
  for select using (founder_id = auth.uid());
create policy startups_insert_own on startups
  for insert with check (founder_id = auth.uid());
create policy startups_update_own on startups
  for update using (founder_id = auth.uid()) with check (founder_id = auth.uid());

-- ---------------------------------------------------------------------------
-- submissions: founders may READ their own (joined via startups). No client
-- insert/update/delete — those happen service-role-side only.
-- ---------------------------------------------------------------------------
create policy submissions_select_own on submissions
  for select using (
    exists (
      select 1 from startups s
      where s.id = submissions.startup_id and s.founder_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- payments: founders may READ their own (via submission -> startup). No client
-- writes — payment status is written only by the verified webhook handler.
-- ---------------------------------------------------------------------------
create policy payments_select_own on payments
  for select using (
    exists (
      select 1 from submissions sub
      join startups s on s.id = sub.startup_id
      where sub.id = payments.submission_id and s.founder_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- vc_partners: only rows explicitly marked public are readable by anyone.
-- ---------------------------------------------------------------------------
create policy vc_partners_public_read on vc_partners
  for select using (is_public = true);

-- ---------------------------------------------------------------------------
-- legal_services: public read (marketing content).
-- ---------------------------------------------------------------------------
create policy legal_services_public_read on legal_services
  for select using (true);

-- audit_log: no client policies -> service-role only.

-- ---------------------------------------------------------------------------
-- Queue position: computed server-side with a window function.
-- SECURITY DEFINER so it can recompute across all queued rows; callable only
-- by service_role from the API layer.
-- ---------------------------------------------------------------------------
create or replace function recompute_queue_positions()
returns void
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select id,
           row_number() over (order by submitted_at asc) as rn
    from submissions
    where status in ('queued', 'paid_priority')
  )
  update submissions sub
  set queue_position = ranked.rn
  from ranked
  where sub.id = ranked.id;
$$;

revoke all on function recompute_queue_positions() from public, anon, authenticated;
grant execute on function recompute_queue_positions() to service_role;
