-- Initialize admin password configuration in app_settings
-- This will store the hashed password, salt, and security metadata

DO $$
BEGIN
  -- Check if admin_password key already exists
  IF NOT EXISTS (
    SELECT 1 FROM public.app_settings WHERE key = 'admin_password'
  ) THEN
    -- Insert initial admin_password configuration (no password set yet)
    INSERT INTO public.app_settings (key, value, updated_at)
    VALUES (
      'admin_password',
      jsonb_build_object(
        'hash', null,
        'salt', null,
        'set_at', null,
        'failed_attempts', 0,
        'locked_until', null
      ),
      now()
    );
  END IF;
END $$;