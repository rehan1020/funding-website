-- The Capital Room — Storage bucket for pitch decks (private, signed URLs only).
-- Run after schema.sql / rls.sql.

-- Create a PRIVATE bucket. Objects are never public; access is via short-lived
-- signed URLs generated server-side with the service_role key.
insert into storage.buckets (id, name, public)
values ('pitch-decks', 'pitch-decks', false)
on conflict (id) do nothing;

-- Storage RLS: founders may read only objects under their own uid prefix
-- (path convention: "<founder_uid>/<startup_id>/<filename>.pdf").
-- Uploads are performed server-side (service_role) after validation, so no
-- client insert policy is granted here.
create policy "deck_read_own"
  on storage.objects for select
  using (
    bucket_id = 'pitch-decks'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
