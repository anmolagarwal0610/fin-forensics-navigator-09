-- Fix Security Issues: Restrict data access policies

-- ============================================
-- 1. FIX: profiles table - ensure only authenticated users can read their own profile
-- The current policy already restricts to (auth.uid() = user_id) which is correct.
-- RLS is enabled so anonymous users cannot read. No change needed for this table.
-- ============================================

-- ============================================
-- 2. FIX: app_settings table - restrict ALL settings to admins only
-- Current policy allows all authenticated users to read non-admin_password settings
-- Change: Only admins can read any app_settings
-- ============================================

-- Drop the permissive policy that exposes non-sensitive settings to all users
DROP POLICY IF EXISTS "Users can view non-sensitive settings" ON public.app_settings;

-- Create new policy: Only admins can read all app_settings
CREATE POLICY "Only admins can view all app settings"
ON public.app_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::text));

-- Drop the admin-only policy for admin_password since the new policy covers it
DROP POLICY IF EXISTS "Only admins can view admin_password" ON public.app_settings;

-- ============================================
-- 3. FIX: jobs table - remove the NULL user_id public read policy
-- Current policy allows reading jobs where user_id IS NULL
-- This exposes internal processing jobs to all authenticated users
-- ============================================

-- Drop the problematic policy that allows reading NULL user_id jobs
DROP POLICY IF EXISTS "read_own_or_public" ON public.jobs;

-- The existing "Users can view their own jobs" policy is correct:
-- USING (user_id = auth.uid())
-- This already exists and will remain in place