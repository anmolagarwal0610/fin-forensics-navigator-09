-- Update delete_case_storage_files function to also clean shared fund trails and fund_trail_views
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
  
  -- Delete shared fund trail storage files for this case
  DELETE FROM storage.objects
  WHERE bucket_id = 'shared-fund-trails'
    AND name IN (
      SELECT storage_path 
      FROM public.shared_fund_trails 
      WHERE case_id = OLD.id
    );
  
  -- Delete shared_fund_trails table records
  DELETE FROM public.shared_fund_trails
  WHERE case_id = OLD.id;
  
  -- Delete fund_trail_views records
  DELETE FROM public.fund_trail_views
  WHERE case_id = OLD.id;
  
  RETURN OLD;
END;
$function$;