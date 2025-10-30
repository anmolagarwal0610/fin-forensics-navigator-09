-- Create storage bucket for support ticket attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', false);

-- RLS policy: Users can upload to their own folder
CREATE POLICY "Users can upload support attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'support-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS policy: Users can view their own attachments
CREATE POLICY "Users can view their support attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'support-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);