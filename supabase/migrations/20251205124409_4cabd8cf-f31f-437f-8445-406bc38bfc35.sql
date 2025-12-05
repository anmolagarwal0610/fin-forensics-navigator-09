-- Phase 1: Fix Missing Profile Trigger
-- Create trigger to call handle_new_user_profile on new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Backfill missing profiles for any users without profiles
INSERT INTO public.profiles (user_id, full_name, organization_name, phone_number)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  COALESCE(u.raw_user_meta_data->>'organization_name', ''),
  u.raw_user_meta_data->>'phone_number'
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL;

-- Phase 2: Add New Subscription Tiers
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'monthly';
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'yearly_tier';
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'yearly_plan';

-- Update get_subscription_status function with new tiers
CREATE OR REPLACE FUNCTION public.get_subscription_status(_user_id uuid)
 RETURNS TABLE(tier subscription_tier, is_active boolean, expires_at timestamp with time zone, pages_remaining integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- Define tier limits (pages per month/year)
  v_tier_limits := CASE v_profile.subscription_tier
    WHEN 'free' THEN 50
    WHEN 'starter' THEN 500
    WHEN 'professional' THEN 2000
    WHEN 'enterprise' THEN 10000
    WHEN 'monthly' THEN 22500
    WHEN 'yearly_tier' THEN 200000
    WHEN 'yearly_plan' THEN 250000
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
$function$;

-- Update check_subscription_before_case_insert function with new tiers
CREATE OR REPLACE FUNCTION public.check_subscription_before_case_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    WHEN 'monthly' THEN 22500
    WHEN 'yearly_tier' THEN 200000
    WHEN 'yearly_plan' THEN 250000
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
$function$;