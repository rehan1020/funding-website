-- Seed marketing content (safe to re-run).
insert into legal_services (title, description, sort_order) values
  ('Fundraising readiness', 'Term sheet orientation, data room preparation, and diligence hygiene.', 1),
  ('Corporate structure', 'Entity structuring and governance that can stand up to the next round.', 2),
  ('Commercial support', 'Practical support for core commercial terms and key agreements.', 3)
on conflict do nothing;
