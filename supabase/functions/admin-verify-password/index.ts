import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PBKDF2_ITERATIONS = 100000;
const HASH_ALGORITHM = 'SHA-256';
const KEY_LENGTH = 256;
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  const importedKey = await crypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGORITHM,
    },
    importedKey,
    KEY_LENGTH
  );

  return btoa(String.fromCharCode(...new Uint8Array(derivedBits)));
}

function generateSessionToken(): string {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...tokenBytes));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: hasAdminRole, error: roleError } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });

    if (roleError || !hasAdminRole) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current password settings
    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'admin_password')
      .single();

    if (settingsError) {
      console.error('Error fetching admin password settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify password' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const passwordData = settings.value as {
      hash: string;
      salt: string;
      failed_attempts: number;
      locked_until: string | null;
    };

    // Check if account is locked
    if (passwordData.locked_until) {
      const lockedUntil = new Date(passwordData.locked_until);
      if (lockedUntil > new Date()) {
        return new Response(
          JSON.stringify({ 
            error: 'Too many failed attempts. Please try again later.',
            locked: true,
            lockedUntil: passwordData.locked_until,
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Parse request body
    const { password } = await req.json();

    if (!password || typeof password !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Password is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash the provided password with stored salt
    const saltBytes = Uint8Array.from(atob(passwordData.salt), c => c.charCodeAt(0));
    const hashedInput = await hashPassword(password, saltBytes);

    // Compare hashes
    if (hashedInput === passwordData.hash) {
      // Password correct - reset failed attempts and generate session token
      const sessionToken = generateSessionToken();
      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours

      await supabase
        .from('app_settings')
        .update({
          value: {
            ...passwordData,
            failed_attempts: 0,
            locked_until: null,
          },
        })
        .eq('key', 'admin_password');

      console.log(`[Admin Password] Successful verification by admin ${user.email}`);

      return new Response(
        JSON.stringify({ 
          success: true,
          sessionToken,
          expiresAt: expiresAt.toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Password incorrect - increment failed attempts
      const newFailedAttempts = (passwordData.failed_attempts || 0) + 1;
      const shouldLock = newFailedAttempts >= MAX_ATTEMPTS;
      const lockedUntil = shouldLock 
        ? new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString()
        : null;

      await supabase
        .from('app_settings')
        .update({
          value: {
            ...passwordData,
            failed_attempts: newFailedAttempts,
            locked_until: lockedUntil,
          },
        })
        .eq('key', 'admin_password');

      console.log(`[Admin Password] Failed attempt ${newFailedAttempts}/${MAX_ATTEMPTS} by admin ${user.email}`);

      return new Response(
        JSON.stringify({ 
          error: 'Incorrect password',
          attemptsRemaining: Math.max(0, MAX_ATTEMPTS - newFailedAttempts),
          locked: shouldLock,
          lockedUntil,
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('Error in admin-verify-password:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});