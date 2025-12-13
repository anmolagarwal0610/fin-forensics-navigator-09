-- Allow admins to view all case files for admin console access
CREATE POLICY "Admins can view all case files"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'case-files' 
  AND public.has_role(auth.uid(), 'admin')
);