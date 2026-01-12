import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate 8-char alphanumeric code (avoiding ambiguous characters)
function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => 
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { caseId, expiresAt, htmlContent } = await req.json();

    if (!caseId || !htmlContent) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: caseId and htmlContent" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user owns this case
    const { data: caseData, error: caseError } = await serviceClient
      .from('cases')
      .select('id, creator_id')
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      return new Response(
        JSON.stringify({ error: "Case not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (caseData.creator_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "You don't have permission to share this case" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique short code
    let shortCode = generateShortCode();
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const { data: existing } = await serviceClient
        .from('shared_fund_trails')
        .select('id')
        .eq('short_code', shortCode)
        .maybeSingle();

      if (!existing) break;
      shortCode = generateShortCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return new Response(
        JSON.stringify({ error: "Failed to generate unique short code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store HTML file in public bucket
    const storagePath = `shared/${shortCode}.html`;
    const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
    
    const { error: uploadError } = await serviceClient.storage
      .from('shared-fund-trails')
      .upload(storagePath, htmlBlob, {
        contentType: 'text/html',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to store share file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create database record
    const { data: share, error: insertError } = await serviceClient
      .from('shared_fund_trails')
      .insert({
        case_id: caseId,
        short_code: shortCode,
        user_id: user.id,
        expires_at: expiresAt || null,
        storage_path: storagePath
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      // Clean up storage on failure
      await serviceClient.storage
        .from('shared-fund-trails')
        .remove([storagePath]);
      
      return new Response(
        JSON.stringify({ error: "Failed to create share record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the request origin to construct the share URL
    const origin = req.headers.get('origin') || 'https://your-domain.com';
    const shareUrl = `${origin}/s/${shortCode}`;

    return new Response(
      JSON.stringify({
        shareUrl,
        shareId: share.id,
        shortCode
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in create-fund-trail-share:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});