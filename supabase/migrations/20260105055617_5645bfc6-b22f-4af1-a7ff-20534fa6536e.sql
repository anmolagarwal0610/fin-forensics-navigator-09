-- Fix the security_definer_view issue by making storage_metrics use invoker's permissions
DROP VIEW IF EXISTS public.storage_metrics;

CREATE VIEW public.storage_metrics 
WITH (security_invoker = true)
AS
SELECT 
  bucket_id,
  file_type,
  COUNT(*) as file_count,
  ROUND(SUM(size_bytes) / 1024.0 / 1024.0, 2) as total_mb
FROM (
  SELECT 
    bucket_id,
    CASE 
      WHEN name LIKE '%/zips/%' THEN 'ZIP'
      WHEN name LIKE '%.pdf' THEN 'PDF'
      WHEN name LIKE '%.csv' THEN 'CSV'
      WHEN name LIKE '%.xlsx' OR name LIKE '%.xls' THEN 'Excel'
      ELSE 'Other'
    END as file_type,
    COALESCE((metadata->>'size')::bigint, 0) as size_bytes
  FROM storage.objects
) sub
GROUP BY bucket_id, file_type;