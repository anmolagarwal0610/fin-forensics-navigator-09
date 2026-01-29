import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getClientIP(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIP = req.headers.get('x-real-ip');
  if (realIP) return realIP;
  const cfIP = req.headers.get('cf-connecting-ip');
  if (cfIP) return cfIP;
  return 'unknown';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract client metadata for audit logging
    const clientIP = getClientIP(req);
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Authenticate admin user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get request body
    const { target_user_id, pages_to_add } = await req.json();

    if (!target_user_id || !pages_to_add || pages_to_add <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid parameters. target_user_id and positive pages_to_add required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin ${user.id} adding ${pages_to_add} bonus pages to user ${target_user_id} from IP ${clientIP}`);

    // Fetch current bonus_pages value
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('bonus_pages')
      .eq('user_id', target_user_id)
      .single();

    if (fetchError || !currentProfile) {
      console.error('Failed to fetch current profile:', fetchError);
      return new Response(JSON.stringify({ error: 'User profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate new bonus_pages value
    const newBonusPages = (currentProfile.bonus_pages || 0) + pages_to_add;

    // Update profile with new value
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        bonus_pages: newBonusPages,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', target_user_id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to add bonus pages:', updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log admin action with IP and user agent
    await supabase.rpc('log_admin_action', {
      p_admin_id: user.id,
      p_target_user_id: target_user_id,
      p_action: 'add_bonus_pages',
      p_details: {
        pages_added: pages_to_add,
        new_total_bonus: updatedProfile.bonus_pages,
      },
      p_ip_address: clientIP,
      p_user_agent: userAgent,
    });

    console.log(`Successfully added ${pages_to_add} bonus pages to user ${target_user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        new_bonus_pages: updatedProfile.bonus_pages,
        pages_added: pages_to_add,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error('Error in add-bonus-pages:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
