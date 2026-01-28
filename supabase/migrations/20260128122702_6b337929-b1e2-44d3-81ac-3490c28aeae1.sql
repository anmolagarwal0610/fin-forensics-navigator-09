-- Add RLS policy for admins to access result-files storage bucket
CREATE POLICY "Admins can view all result files in storage" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'result-files' 
  AND has_role(auth.uid(), 'admin')
);