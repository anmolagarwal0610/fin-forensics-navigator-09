-- Update delete_case_storage_files trigger to handle both buckets and cascade deletes
CREATE OR REPLACE FUNCTION public.delete_case_storage_files()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage'
AS $function$
BEGIN
  -- Delete files from case-files bucket
  -- Files are stored with pattern: {user_id}/{case_id}/filename OR case_{case_id}_* for ZIPs
  DELETE FROM storage.objects
  WHERE bucket_id = 'case-files'
    AND (
      name LIKE '%/' || OLD.id::text || '/%'
      OR name LIKE '%case_' || OLD.id::text || '_%'
    );
  
  -- Delete files from result-files bucket
  -- Files are stored with pattern: {user_id}/{case_id}/filename
  DELETE FROM storage.objects
  WHERE bucket_id = 'result-files'
    AND name LIKE '%/' || OLD.id::text || '/%';
  
  -- Delete result_files table records (tracks secure result files)
  DELETE FROM public.result_files
  WHERE case_id = OLD.id;
  
  RETURN OLD;
END;
$function$;