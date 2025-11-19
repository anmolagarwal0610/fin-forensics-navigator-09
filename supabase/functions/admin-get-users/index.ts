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
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has admin role using security definer function
    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleError) {
      console.error("Role check error:", roleError);
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

    // Parse search query from URL params
    const url = new URL(req.url);
    const searchQuery = url.searchParams.get("search") || "";

    // Get all profiles with service role (bypasses RLS)
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      throw profileError;
    }

    // Get subscription status for all users and fetch emails
    const usersWithStatus = [];

    for (const profile of profiles) {
      // Get subscription status
      const { data: statusData } = await supabase.rpc("get_subscription_status", {
        _user_id: profile.user_id,
      });

      // Get email from auth.users using service role
      const { data: authData, error: authUserError } = await supabase.auth.admin.getUserById(
        profile.user_id
      );

      if (authUserError) {
        console.error(`Failed to get auth data for user ${profile.user_id}:`, authUserError);
      }

      usersWithStatus.push({
        user_id: profile.user_id,
        email: authData?.user?.email || "Unknown",
        full_name: profile.full_name,
        organization_name: profile.organization_name,
        subscription_tier: statusData?.[0]?.tier || profile.subscription_tier,
        subscription_expires_at: profile.subscription_expires_at,
        current_period_pages_used: profile.current_period_pages_used,
        created_at: profile.created_at,
      });
    }

    // Filter by search query
    let filteredUsers = usersWithStatus;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredUsers = usersWithStatus.filter(
        (u) =>
          u.email.toLowerCase().includes(query) ||
          u.user_id.toLowerCase().includes(query) ||
          u.full_name.toLowerCase().includes(query) ||
          u.organization_name.toLowerCase().includes(query)
      );
    }

    return new Response(JSON.stringify({ users: filteredUsers }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in admin-get-users:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
