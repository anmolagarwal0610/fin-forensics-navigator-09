-- Add input_zip_url column to cases table for admin download access
ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS input_zip_url TEXT NULL;

COMMENT ON COLUMN public.cases.input_zip_url IS 'Signed URL to the input ZIP file containing user uploaded files';