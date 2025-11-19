-- ========================================
-- Phase 1 Critical Security Fixes
-- ========================================

-- 1. Drop overly broad admin RLS policy on profiles
DROP POLICY IF EXISTS "Admins can update subscription fields" ON public.profiles;

-- 2. Create restrictive policy for admin subscription management
-- Note: Column-level validation is enforced by edge functions (grant-subscription, revoke-subscription)
-- RLS simply ensures only admins can update profiles
CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- 3. Create function to check subscription limits before case creation
CREATE OR REPLACE FUNCTION public.check_subscription_before_case_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription RECORD;
  v_tier_limit INTEGER;
BEGIN
  -- Get user's subscription status
  SELECT 
    subscription_tier,
    subscription_expires_at,
    current_period_pages_used
  INTO v_subscription
  FROM public.profiles
  WHERE user_id = NEW.creator_id;
  
  -- Define tier limits (pages per billing period)
  v_tier_limit := CASE v_subscription.subscription_tier
    WHEN 'free' THEN 50
    WHEN 'starter' THEN 500
    WHEN 'professional' THEN 2000
    WHEN 'enterprise' THEN 10000
    ELSE 50
  END;
  
  -- Check if subscription is expired (for non-free tiers)
  IF v_subscription.subscription_tier != 'free' AND 
     v_subscription.subscription_expires_at IS NOT NULL AND
     v_subscription.subscription_expires_at < now() THEN
    RAISE EXCEPTION 'Your subscription has expired. Please contact an administrator to renew.';
  END IF;
  
  -- Check if user has exceeded their page limit
  IF COALESCE(v_subscription.current_period_pages_used, 0) >= v_tier_limit THEN
    RAISE EXCEPTION 'You have reached your page limit for this billing period. Upgrade your plan or wait for the next period.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Create trigger to enforce subscription limits on case creation
DROP TRIGGER IF EXISTS enforce_subscription_limits ON public.cases;
CREATE TRIGGER enforce_subscription_limits
  BEFORE INSERT ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.check_subscription_before_case_insert();

-- 5. Create function to track page usage (called by job-webhook edge function)
CREATE OR REPLACE FUNCTION public.track_page_usage(
  p_user_id UUID,
  p_pages_processed INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update current period usage
  UPDATE public.profiles
  SET 
    current_period_pages_used = COALESCE(current_period_pages_used, 0) + p_pages_processed,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found: %', p_user_id;
  END IF;
  
  RAISE NOTICE 'Tracked % pages for user %', p_pages_processed, p_user_id;
END;
$$;

-- 6. Add comments for documentation
COMMENT ON POLICY "Admins can update profiles" ON public.profiles IS 
  'Allows admins to update user profiles. Column-level restrictions are enforced by edge functions (grant-subscription, revoke-subscription).';

COMMENT ON FUNCTION public.check_subscription_before_case_insert IS 
  'Enforces subscription limits before allowing case creation. Checks expiry and page limits at database level.';

COMMENT ON FUNCTION public.track_page_usage IS 
  'Updates user page usage count. Called by job-webhook edge function after successful PDF processing with page count.';

COMMENT ON TRIGGER enforce_subscription_limits ON public.cases IS 
  'Prevents case creation if user has exceeded subscription limits or subscription expired. Server-side enforcement.';