-- Allow admins to view result files in storage
CREATE POLICY "Admins can view all result files storage"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'result-files' AND public.has_role(auth.uid(), 'admin'::text));

-- Allow admins to view support attachments in storage
CREATE POLICY "Admins can view all support attachments storage"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'support-attachments' AND public.has_role(auth.uid(), 'admin'::text));

-- Allow admins to delete case files
CREATE POLICY "Admins can delete case files storage"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'case-files' AND public.has_role(auth.uid(), 'admin'::text));

-- Allow admins to delete result files
CREATE POLICY "Admins can delete result files storage"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'result-files' AND public.has_role(auth.uid(), 'admin'::text));

-- Allow admins to delete support attachments
CREATE POLICY "Admins can delete support attachments storage"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'support-attachments' AND public.has_role(auth.uid(), 'admin'::text));