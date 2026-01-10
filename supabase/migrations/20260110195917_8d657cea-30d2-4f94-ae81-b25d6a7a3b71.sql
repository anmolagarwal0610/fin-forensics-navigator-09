-- Enable RLS on jobs table (if not already enabled)
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can view their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Service role full access" ON public.jobs;

-- Allow users to insert their own jobs
CREATE POLICY "Users can insert their own jobs"
ON public.jobs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow users to view their own jobs
CREATE POLICY "Users can view their own jobs"
ON public.jobs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow users to update their own jobs (for status tracking)
CREATE POLICY "Users can update their own jobs"
ON public.jobs FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());