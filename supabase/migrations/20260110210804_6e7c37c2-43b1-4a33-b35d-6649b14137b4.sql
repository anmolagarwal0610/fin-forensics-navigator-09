-- Create admin RPC to list storage objects safely
-- This bypasses PostgREST schema restrictions by running inside Postgres

CREATE OR REPLACE FUNCTION public.admin_list_storage_objects(
  p_bucket_id TEXT DEFAULT NULL,
  p_file_type_category TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_order TEXT DEFAULT 'desc',
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  bucket_id TEXT,
  created_at TIMESTAMPTZ,
  size_bytes BIGINT,
  file_type_category TEXT,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_total BIGINT;
BEGIN
  -- Verify caller is admin or service_role
  IF NOT (has_role(auth.uid(), 'admin') OR current_setting('request.jwt.claim.role', true) = 'service_role') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Validate sort_by to prevent SQL injection
  IF p_sort_by NOT IN ('created_at', 'size') THEN
    p_sort_by := 'created_at';
  END IF;

  -- Validate sort_order
  IF p_sort_order NOT IN ('asc', 'desc') THEN
    p_sort_order := 'desc';
  END IF;

  -- Cap limit to prevent abuse
  IF p_limit > 200 THEN
    p_limit := 200;
  END IF;

  -- Get total count first
  SELECT COUNT(*)
  INTO v_total
  FROM storage.objects o
  WHERE 
    (p_bucket_id IS NULL OR o.bucket_id = p_bucket_id)
    AND (
      p_file_type_category IS NULL
      OR (
        CASE 
          WHEN o.name LIKE '%/zips/%' THEN 'ZIP'
          WHEN o.name ILIKE '%.pdf' THEN 'PDF'
          WHEN o.name ILIKE '%.csv' THEN 'CSV'
          WHEN o.name ILIKE '%.xlsx' OR o.name ILIKE '%.xls' THEN 'Excel'
          ELSE 'Other'
        END
      ) = p_file_type_category
    );

  -- Return paginated results with sorting
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.bucket_id,
    o.created_at,
    COALESCE((o.metadata->>'size')::BIGINT, 0) AS size_bytes,
    CASE 
      WHEN o.name LIKE '%/zips/%' THEN 'ZIP'
      WHEN o.name ILIKE '%.pdf' THEN 'PDF'
      WHEN o.name ILIKE '%.csv' THEN 'CSV'
      WHEN o.name ILIKE '%.xlsx' OR o.name ILIKE '%.xls' THEN 'Excel'
      ELSE 'Other'
    END AS file_type_category,
    v_total AS total_count
  FROM storage.objects o
  WHERE 
    (p_bucket_id IS NULL OR o.bucket_id = p_bucket_id)
    AND (
      p_file_type_category IS NULL
      OR (
        CASE 
          WHEN o.name LIKE '%/zips/%' THEN 'ZIP'
          WHEN o.name ILIKE '%.pdf' THEN 'PDF'
          WHEN o.name ILIKE '%.csv' THEN 'CSV'
          WHEN o.name ILIKE '%.xlsx' OR o.name ILIKE '%.xls' THEN 'Excel'
          ELSE 'Other'
        END
      ) = p_file_type_category
    )
  ORDER BY
    CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN o.created_at END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN o.created_at END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'size' AND p_sort_order = 'desc' THEN COALESCE((o.metadata->>'size')::BIGINT, 0) END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'size' AND p_sort_order = 'asc' THEN COALESCE((o.metadata->>'size')::BIGINT, 0) END ASC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;