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

    // Create client with user's token to check if they're authenticated
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
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

    if (roleError) {
      return new Response(JSON.stringify({ error: "Failed to check permissions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Optimized: Get all cases with creator profiles in a single query using JOIN
    const { data: cases, error: casesError } = await supabase
      .from("cases")
      .select(`
        *,
        profiles!cases_creator_id_fkey (
          full_name,
          organization_name,
          user_id
        )
      `)
      .order("created_at", { ascending: false });

    if (casesError) {
      throw casesError;
    }

    // Get all unique user IDs to batch fetch emails
    const userIds = [...new Set(cases?.map(c => c.creator_id) || [])];
    
    // Batch fetch user emails
    const userEmailMap = new Map<string, string>();
    if (userIds.length > 0) {
      const emailPromises = userIds.map(userId =>
        supabase.auth.admin.getUserById(userId)
          .then(({ data }) => ({ userId, email: data?.user?.email || "Unknown" }))
          .catch(() => ({ userId, email: "Unknown" }))
      );
      const emailResults = await Promise.all(emailPromises);
      emailResults.forEach(({ userId, email }) => userEmailMap.set(userId, email));
    }

    // Map the data with user info
    const casesWithUserInfo = (cases || []).map(caseItem => ({
      ...caseItem,
      user_email: userEmailMap.get(caseItem.creator_id) || "Unknown",
      user_name: (caseItem.profiles as any)?.full_name || "Unknown",
      organization: (caseItem.profiles as any)?.organization_name || "Unknown",
    }));

    return new Response(JSON.stringify({ cases: casesWithUserInfo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[admin-get-all-cases] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
