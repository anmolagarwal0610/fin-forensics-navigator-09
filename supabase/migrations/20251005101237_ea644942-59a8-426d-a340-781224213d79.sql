-- Add HITL-related columns to cases table
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS analysis_mode text DEFAULT 'hitl' CHECK (analysis_mode IN ('hitl', 'direct')),
ADD COLUMN IF NOT EXISTS hitl_stage text,
ADD COLUMN IF NOT EXISTS csv_zip_url text;

-- Create case_csv_files table to track CSV files
CREATE TABLE IF NOT EXISTS public.case_csv_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  pdf_file_name text NOT NULL,
  original_csv_url text NOT NULL,
  corrected_csv_url text,
  is_corrected boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on case_csv_files
ALTER TABLE public.case_csv_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for case_csv_files
CREATE POLICY "Users can view CSV files for their cases"
ON public.case_csv_files
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = case_csv_files.case_id
    AND cases.creator_id = auth.uid()
  )
);

CREATE POLICY "Users can create CSV files for their cases"
ON public.case_csv_files
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = case_csv_files.case_id
    AND cases.creator_id = auth.uid()
  )
);

CREATE POLICY "Users can update CSV files for their cases"
ON public.case_csv_files
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = case_csv_files.case_id
    AND cases.creator_id = auth.uid()
  )
);

CREATE POLICY "Users can delete CSV files for their cases"
ON public.case_csv_files
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = case_csv_files.case_id
    AND cases.creator_id = auth.uid()
  )
);

-- Add 'Review' status to case_status enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'Review' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'case_status')
  ) THEN
    ALTER TYPE case_status ADD VALUE 'Review';
  END IF;
END $$;

-- Create trigger for updated_at on case_csv_files
CREATE TRIGGER update_case_csv_files_updated_at
BEFORE UPDATE ON public.case_csv_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();