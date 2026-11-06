alter policy travel_photo_upload on storage.objects with check (
  bucket_id = 'travel-photos' and public.can_upload_photo(name)
  and (metadata is null or metadata = '{}'::jsonb or name not like '%/thumbnail.jpg'
    or ((metadata->>'size')::bigint <= 524288 and metadata->>'mimetype' = 'image/jpeg'))
);
