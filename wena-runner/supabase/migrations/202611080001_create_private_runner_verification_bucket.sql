insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'runner-verification',
  'runner-verification',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
