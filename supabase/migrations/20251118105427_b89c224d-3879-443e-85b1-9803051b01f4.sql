-- Remove dangerous permissive RLS policies from jobs table
-- These policies allowed ANY authenticated user to insert/update jobs
-- Edge functions using service role key bypass RLS automatically, so these are unnecessary

DROP POLICY IF EXISTS "edge_insert" ON public.jobs;
DROP POLICY IF EXISTS "edge_update" ON public.jobs;

-- The existing "read_own_or_public" policy is sufficient for user reads:
-- Users can only read their own jobs or public jobs (user_id IS NULL)