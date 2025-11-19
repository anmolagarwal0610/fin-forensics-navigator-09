import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is authenticated and is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has admin role
    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { userId } = await req.json();

    // Validate input
    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing required field: userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check that admin is not revoking their own subscription
    if (userId === user.id) {
      return new Response(JSON.stringify({ error: "Cannot revoke your own subscription. This is a safety measure to prevent accidental self-lockout." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if target user is also an admin
    const { data: targetIsAdmin, error: targetRoleError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (targetRoleError) {
      console.error("Failed to check target user role:", targetRoleError);
    }

    // Warn if revoking another admin's subscription
    if (targetIsAdmin) {
      console.warn(`Admin ${user.email} is revoking subscription for another admin ${userId}`);
    }

    // Revoke subscription by setting to free tier
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        subscription_tier: "free",
        subscription_expires_at: null,
        subscription_granted_at: null,
        subscription_granted_by: null,
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Failed to revoke subscription:", updateError);
      throw updateError;
    }

    console.log(`Admin ${user.email} revoked subscription for user ${userId}`);

    // TODO: Send email notification to user about subscription revocation
    // This would require getting the user's email and calling the email service

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Successfully revoked subscription and downgraded to free tier" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in revoke-subscription:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
