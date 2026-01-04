-- Fix the delete_case_storage_files trigger to also delete ZIP files
CREATE OR REPLACE FUNCTION public.delete_case_storage_files()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage'
AS $function$
BEGIN
  -- Delete all files in storage that belong to this case
  -- Files are stored with pattern: {user_id}/{case_id}/filename OR case_{case_id}_* for ZIPs
  DELETE FROM storage.objects
  WHERE bucket_id = 'case-files'
    AND (
      name LIKE '%/' || OLD.id::text || '/%'
      OR name LIKE '%case_' || OLD.id::text || '_%'
    );
  
  RETURN OLD;
END;
$function$;