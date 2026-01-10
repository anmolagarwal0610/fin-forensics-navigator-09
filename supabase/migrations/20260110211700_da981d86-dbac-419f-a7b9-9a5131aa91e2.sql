-- Add cumulative files processed counter to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_files_processed INTEGER NOT NULL DEFAULT 0;

-- Create function to increment file count when case_files are inserted
CREATE OR REPLACE FUNCTION public.increment_files_processed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_creator_id UUID;
BEGIN
  -- Get the case creator
  SELECT creator_id INTO v_creator_id
  FROM public.cases
  WHERE id = NEW.case_id;
  
  IF v_creator_id IS NOT NULL THEN
    UPDATE public.profiles
    SET total_files_processed = total_files_processed + 1
    WHERE user_id = v_creator_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on case_files insert
DROP TRIGGER IF EXISTS trigger_increment_files_processed ON public.case_files;
CREATE TRIGGER trigger_increment_files_processed
AFTER INSERT ON public.case_files
FOR EACH ROW
EXECUTE FUNCTION increment_files_processed();

-- Backfill total_files_processed from existing case_files
UPDATE public.profiles p
SET total_files_processed = COALESCE((
  SELECT COUNT(*)
  FROM public.case_files cf
  JOIN public.cases c ON cf.case_id = c.id
  WHERE c.creator_id = p.user_id
), 0);