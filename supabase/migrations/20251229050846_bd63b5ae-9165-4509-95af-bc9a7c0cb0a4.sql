-- Create a function to delete storage files when a case is deleted
CREATE OR REPLACE FUNCTION public.delete_case_storage_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  -- Delete all files in storage that belong to this case
  -- Files are stored with pattern: {user_id}/{case_id}/filename
  DELETE FROM storage.objects
  WHERE bucket_id = 'case-files'
    AND name LIKE '%/' || OLD.id::text || '/%';
  
  RETURN OLD;
END;
$$;

-- Create trigger to run before case deletion
CREATE TRIGGER trigger_delete_case_storage_files
  BEFORE DELETE ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_case_storage_files();