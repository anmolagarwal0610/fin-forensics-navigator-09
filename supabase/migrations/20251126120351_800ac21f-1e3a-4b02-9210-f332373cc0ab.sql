-- Fix database functions missing SET search_path
-- This prevents potential SQL injection vulnerabilities

-- Update handle_new_user_profile function
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, organization_name, phone_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'organization_name', ''),
    NEW.raw_user_meta_data ->> 'phone_number'
  );
  RETURN NEW;
END;
$function$;

-- Update check_subscription_before_case_insert function
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