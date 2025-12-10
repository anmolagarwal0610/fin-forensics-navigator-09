-- Add column to store previous result URL for version history
ALTER TABLE public.cases
ADD COLUMN previous_result_zip_url TEXT DEFAULT NULL;