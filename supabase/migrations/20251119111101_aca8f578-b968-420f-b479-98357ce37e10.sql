-- Backfill profiles table from auth.users for existing users
-- This handles users who signed up before the profile trigger was created

INSERT INTO public.profiles (
  user_id,
  full_name,
  organization_name,
  phone_number,
  created_at,
  updated_at
)
SELECT 
  u.id,
  -- Extract full_name from metadata (handles both formats)
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    CONCAT(
      COALESCE(u.raw_user_meta_data->>'first_name', ''),
      ' ',
      COALESCE(u.raw_user_meta_data->>'last_name', '')
    ),
    'User'
  ) AS full_name,
  -- Extract organization_name from metadata (handles both formats)
  COALESCE(
    u.raw_user_meta_data->>'organization_name',
    u.raw_user_meta_data->>'organization',
    'Unknown Organization'
  ) AS organization_name,
  -- Extract phone_number from metadata
  u.raw_user_meta_data->>'phone_number' AS phone_number,
  u.created_at,
  now()
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE p.user_id IS NULL;  -- Only insert if profile doesn't exist

-- Log the backfill
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled % user profiles from auth.users', v_count;
END $$;