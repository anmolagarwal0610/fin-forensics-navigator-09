-- Add IP address and user agent columns to audit_log
ALTER TABLE public.audit_log 
ADD COLUMN IF NOT EXISTS ip_address text,
ADD COLUMN IF NOT EXISTS user_agent text;

-- Update log_admin_action function to accept new parameters
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_admin_id uuid, 
  p_target_user_id uuid, 
  p_action text, 
  p_details jsonb DEFAULT '{}'::jsonb,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_log (admin_id, target_user_id, action, details, ip_address, user_agent)
  VALUES (p_admin_id, p_target_user_id, p_action, p_details, p_ip_address, p_user_agent)
  RETURNING id INTO v_log_id;
  
  RAISE NOTICE 'Admin action logged: % by admin % on user % from IP %', 
    p_action, p_admin_id, p_target_user_id, p_ip_address;
  
  RETURN v_log_id;
END;
$$;