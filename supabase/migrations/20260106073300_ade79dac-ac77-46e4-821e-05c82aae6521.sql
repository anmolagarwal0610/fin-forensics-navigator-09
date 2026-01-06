-- Update check_subscription_before_case_insert to respect total_pages_granted
CREATE OR REPLACE FUNCTION public.check_subscription_before_case_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_subscription RECORD;
  v_effective_limit INTEGER;
BEGIN
  -- Get user's subscription status
  SELECT 
    subscription_tier,
    subscription_expires_at,
    current_period_pages_used,
    total_pages_granted,
    bonus_pages
  INTO v_subscription
  FROM public.profiles
  WHERE user_id = NEW.creator_id;
  
  -- Determine effective limit: use total_pages_granted if set, otherwise tier limit
  IF v_subscription.total_pages_granted IS NOT NULL THEN
    v_effective_limit := v_subscription.total_pages_granted;
  ELSE
    v_effective_limit := CASE v_subscription.subscription_tier
      WHEN 'free' THEN 50
      WHEN 'starter' THEN 500
      WHEN 'professional' THEN 2000
      WHEN 'enterprise' THEN 10000
      WHEN 'monthly' THEN 22500
      WHEN 'yearly_tier' THEN 200000
      WHEN 'yearly_plan' THEN 250000
      ELSE 50
    END;
  END IF;
  
  -- Add bonus pages to effective limit
  v_effective_limit := v_effective_limit + COALESCE(v_subscription.bonus_pages, 0);
  
  -- Check if subscription is expired (for non-free tiers)
  IF v_subscription.subscription_tier != 'free' AND 
     v_subscription.subscription_expires_at IS NOT NULL AND
     v_subscription.subscription_expires_at < now() THEN
    RAISE EXCEPTION 'Your subscription has expired. Please contact an administrator to renew.';
  END IF;
  
  -- Check if user has exceeded their page limit
  IF COALESCE(v_subscription.current_period_pages_used, 0) >= v_effective_limit THEN
    RAISE EXCEPTION 'You have reached your page limit (% of % pages used). Upgrade your plan or wait for the next period.', 
      v_subscription.current_period_pages_used, v_effective_limit;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update get_subscription_status to respect total_pages_granted
CREATE OR REPLACE FUNCTION public.get_subscription_status(_user_id uuid)
RETURNS TABLE(
  tier subscription_tier, 
  is_active boolean, 
  expires_at timestamp with time zone, 
  pages_remaining integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile RECORD;
  v_effective_limit INTEGER;
BEGIN
  -- Get user profile
  SELECT 
    subscription_tier,
    subscription_expires_at,
    current_period_pages_used,
    total_pages_granted,
    bonus_pages
  INTO v_profile
  FROM public.profiles
  WHERE user_id = _user_id;
  
  -- Determine effective limit: use total_pages_granted if set, otherwise tier limit
  IF v_profile.total_pages_granted IS NOT NULL THEN
    v_effective_limit := v_profile.total_pages_granted;
  ELSE
    v_effective_limit := CASE v_profile.subscription_tier
      WHEN 'free' THEN 50
      WHEN 'starter' THEN 500
      WHEN 'professional' THEN 2000
      WHEN 'enterprise' THEN 10000
      WHEN 'monthly' THEN 22500
      WHEN 'yearly_tier' THEN 200000
      WHEN 'yearly_plan' THEN 250000
      ELSE 50
    END;
  END IF;
  
  -- Add bonus pages to effective limit
  v_effective_limit := v_effective_limit + COALESCE(v_profile.bonus_pages, 0);
  
  -- Return status
  RETURN QUERY SELECT
    v_profile.subscription_tier,
    (v_profile.subscription_tier = 'free' OR 
     v_profile.subscription_expires_at IS NULL OR 
     v_profile.subscription_expires_at > now()) AS is_active,
    v_profile.subscription_expires_at,
    GREATEST(0, v_effective_limit - COALESCE(v_profile.current_period_pages_used, 0)) AS pages_remaining;
END;
$function$;