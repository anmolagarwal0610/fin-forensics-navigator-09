-- Fix: Admin password hash publicly readable via RLS policy
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view app settings" ON app_settings;

-- Create policy for non-sensitive settings (maintenance_mode, etc.) - anyone can view
CREATE POLICY "Users can view non-sensitive settings"
ON app_settings FOR SELECT
USING (key != 'admin_password');

-- Create policy for admin_password - only admins can view
CREATE POLICY "Only admins can view admin_password"
ON app_settings FOR SELECT
USING (key = 'admin_password' AND has_role(auth.uid(), 'admin'::text));