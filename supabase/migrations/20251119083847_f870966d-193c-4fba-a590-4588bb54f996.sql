-- ========================================
-- Phase 2: Enhanced Security - Audit Log System
-- ========================================

-- 1. Create audit_log table to track all admin actions
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create index for faster queries
CREATE INDEX idx_audit_log_admin_id ON public.audit_log(admin_id);
CREATE INDEX idx_audit_log_target_user_id ON public.audit_log(target_user_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- 3. Enable RLS on audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for audit_log
-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can insert audit logs (through edge functions)
CREATE POLICY "Admins can insert audit logs"
ON public.audit_log
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- 5. Create function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_admin_id UUID,
  p_target_user_id UUID,
  p_action TEXT,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_log (admin_id, target_user_id, action, details)
  VALUES (p_admin_id, p_target_user_id, p_action, p_details)
  RETURNING id INTO v_log_id;
  
  RAISE NOTICE 'Admin action logged: % by admin % on user %', p_action, p_admin_id, p_target_user_id;
  
  RETURN v_log_id;
END;
$$;

-- 6. Add comments
COMMENT ON TABLE public.audit_log IS 
  'Tracks all admin actions for security and compliance. Includes subscription grants, revocations, and other administrative changes.';

COMMENT ON FUNCTION public.log_admin_action IS 
  'Logs admin actions to audit_log table. Called by admin edge functions to maintain audit trail.';