import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * BOOTSTRAP ADMIN FUNCTION
 * 
 * This is a TEMPORARY function to make your first admin user.
 * 
 * HOW TO USE:
 * 1. Deploy this function (it deploys automatically)
 * 2. Call it from your browser console while logged in:
 * 
 *    const { data, error } = await supabase.functions.invoke('bootstrap-admin');
 *    console.log(data, error);
 * 
 * 3. Once you have your first admin, DELETE this function for security
 * 
 * SECURITY NOTE: This function makes the currently logged-in user an admin.
 * Only use it once to bootstrap your first admin, then delete it immediately.
 */

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

    // Verify user is authenticated
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already has admin role
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (existingRole) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "You are already an admin!",
          user_id: user.id,
          email: user.email,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Grant admin role
    const { error: insertError } = await supabase
      .from("user_roles")
      .insert({
        user_id: user.id,
        role: "admin",
      });

    if (insertError) {
      console.error("Failed to grant admin role:", insertError);
      throw insertError;
    }

    console.log(`✅ Bootstrap complete: ${user.email} is now an admin`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "🎉 You are now an admin! Please delete this function immediately for security.",
        user_id: user.id,
        email: user.email,
        next_steps: [
          "1. Refresh your browser",
          "2. Go to Admin Panel at /app/admin/cases",
          "3. DELETE this bootstrap-admin function from supabase/functions/",
          "4. Commit and deploy the changes"
        ]
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in bootstrap-admin:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
