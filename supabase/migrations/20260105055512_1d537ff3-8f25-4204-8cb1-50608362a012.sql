-- Phase 1: Delete duplicate ZIP files (keep only newest per case)
-- This is a one-time cleanup to free up ~113 MB

WITH ranked_zips AS (
  SELECT 
    id,
    name,
    created_at,
    SUBSTRING(name FROM 'case_([a-f0-9-]+)_') as case_id,
    ROW_NUMBER() OVER (
      PARTITION BY SUBSTRING(name FROM 'case_([a-f0-9-]+)_')
      ORDER BY created_at DESC
    ) as rn
  FROM storage.objects
  WHERE bucket_id = 'case-files'
    AND name LIKE '%/zips/case_%'
)
DELETE FROM storage.objects
WHERE id IN (
  SELECT id FROM ranked_zips WHERE rn > 1
);

-- Phase 5: Create storage monitoring view for admin dashboard
CREATE OR REPLACE VIEW public.storage_metrics AS
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