-- Create storage bucket for case files
INSERT INTO storage.buckets (id, name, public) VALUES ('case-files', 'case-files', false);

-- Create storage policies for case files
CREATE POLICY "Users can upload files to their cases" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'case-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their case files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'case-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their case files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'case-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their case files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'case-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add result_zip_url column to cases table
ALTER TABLE cases ADD COLUMN result_zip_url TEXT;

-- Add analysis_status column to track processing
ALTER TABLE cases ADD COLUMN analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed'));