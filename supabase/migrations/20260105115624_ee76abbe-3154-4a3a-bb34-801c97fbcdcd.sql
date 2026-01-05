-- Add total_pages_granted column to profiles table
-- This stores the actual total pages granted for the entire subscription period
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_pages_granted INTEGER DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.total_pages_granted IS 'Total pages granted for the entire subscription period (tier pages × duration in months)';