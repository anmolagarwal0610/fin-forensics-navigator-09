-- Create subscription tier enum
CREATE TYPE public.subscription_tier AS ENUM (
  'free',
  'starter', 
  'professional',
  'enterprise'
);

-- Add subscription columns to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN subscription_tier subscription_tier DEFAULT 'free' NOT NULL,
  ADD COLUMN subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN subscription_granted_at TIMESTAMPTZ,
  ADD COLUMN subscription_granted_by UUID,
  ADD COLUMN current_period_start TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN current_period_pages_used INTEGER DEFAULT 0 NOT NULL;

-- Create usage history table
CREATE TABLE public.usage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  pages_processed INTEGER NOT NULL DEFAULT 0,
  tier subscription_tier NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.usage_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage history
CREATE POLICY "Users can view own usage history"
  ON public.usage_history FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all usage history
CREATE POLICY "Admins can view all usage history"
  ON public.usage_history FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Function to check subscription status
CREATE OR REPLACE FUNCTION public.get_subscription_status(
  _user_id UUID
)
RETURNS TABLE (
  tier subscription_tier,
  is_active BOOLEAN,
  expires_at TIMESTAMPTZ,
  pages_remaining INTEGER
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_tier_limits INTEGER;
BEGIN
  -- Get user profile
  SELECT 
    subscription_tier,
    subscription_expires_at,
    current_period_pages_used
  INTO v_profile
  FROM public.profiles
  WHERE user_id = _user_id;
  
  -- Define tier limits (pages per month)
  v_tier_limits := CASE v_profile.subscription_tier
    WHEN 'free' THEN 50
    WHEN 'starter' THEN 500
    WHEN 'professional' THEN 2000
    WHEN 'enterprise' THEN 10000
    ELSE 50
  END;
  
  -- Return status
  RETURN QUERY SELECT
    v_profile.subscription_tier,
    (v_profile.subscription_tier = 'free' OR 
     v_profile.subscription_expires_at IS NULL OR 
     v_profile.subscription_expires_at > now()) AS is_active,
    v_profile.subscription_expires_at,
    (v_tier_limits - COALESCE(v_profile.current_period_pages_used, 0)) AS pages_remaining;
END;
$$;

-- Function to reset monthly usage
CREATE OR REPLACE FUNCTION public.reset_usage_period()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Archive current period to usage_history
  INSERT INTO public.usage_history (user_id, period_start, period_end, pages_processed, tier)
  SELECT 
    user_id,
    current_period_start,
    now(),
    current_period_pages_used,
    subscription_tier
  FROM public.profiles
  WHERE current_period_start IS NOT NULL;
  
  -- Reset counters
  UPDATE public.profiles
  SET 
    current_period_pages_used = 0,
    current_period_start = now();
END;
$$;

-- Update RLS policies on profiles to allow admin subscription management
CREATE POLICY "Admins can update subscription fields"
  ON public.profiles FOR UPDATE
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));