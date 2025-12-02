-- Add bonus_pages column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN bonus_pages integer NOT NULL DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.bonus_pages IS 'Additional pages granted by admin beyond tier limit';