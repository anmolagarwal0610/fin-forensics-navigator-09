import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract client metadata for audit logging
    const clientIP = getClientIP(req);
    const userAgent = req.headers.get('user-agent') || 'unknown';

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
    const { userId, tier, expiresAt, sendEmail = true, totalPagesGranted, customTierData } = await req.json();

    // Validate input
    if (!userId || !tier) {
      return new Response(JSON.stringify({ error: "Missing required fields: userId, tier" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate tier (allow professional as base for custom tiers)
    const validTiers = ["free", "starter", "professional", "enterprise", "monthly", "yearly_tier", "yearly_plan"];
    if (!validTiers.includes(tier)) {
      return new Response(JSON.stringify({ error: "Invalid tier. Must be one of: free, starter, professional, enterprise, monthly, yearly_tier, yearly_plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate expiry date if provided
    if (expiresAt) {
      const expiryDate = new Date(expiresAt);
      const now = new Date();
      const tenYearsFromNow = new Date();
      tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10);

      if (expiryDate <= now) {
        return new Response(JSON.stringify({ error: "Expiry date must be in the future" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (expiryDate > tenYearsFromNow) {
        return new Response(JSON.stringify({ error: "Expiry date cannot be more than 10 years in the future" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check that user is not granting to themselves
    if (userId === user.id) {
      return new Response(JSON.stringify({ error: "Cannot modify your own subscription. This is a safety measure to prevent accidental self-lockout." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile with subscription details
    const updateData: Record<string, any> = {
      subscription_tier: tier,
      subscription_expires_at: expiresAt || null,
      subscription_granted_at: new Date().toISOString(),
      subscription_granted_by: user.id,
      current_period_pages_used: 0, // Reset usage when granting new subscription
    };

    // Set total_pages_granted if provided
    if (totalPagesGranted !== undefined && totalPagesGranted !== null) {
      updateData.total_pages_granted = totalPagesGranted;
      console.log(`Setting total_pages_granted to ${totalPagesGranted}`);
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("user_id", userId);

    if (updateError) {
      console.error("Failed to update subscription:", updateError);
      throw updateError;
    }

    // Build details for audit log
    const logDetails: Record<string, any> = {
      tier,
      expires_at: expiresAt,
      total_pages_granted: totalPagesGranted,
    };
    
    if (customTierData) {
      logDetails.custom_tier = customTierData;
    }

    // Log the admin action with IP and user agent
    await supabase.rpc("log_admin_action", {
      p_admin_id: user.id,
      p_target_user_id: userId,
      p_action: "grant_subscription",
      p_details: logDetails,
      p_ip_address: clientIP,
      p_user_agent: userAgent,
    });

    const tierLabel = customTierData?.isCustom ? customTierData.tierName : tier;
    console.log(`Admin ${user.email} granted ${tierLabel} subscription (${totalPagesGranted} pages) to user ${userId} from IP ${clientIP}`);

    // Get target user email for notification (only if sendEmail is true)
    if (sendEmail) {
      const { data: targetAuthData } = await supabase.auth.admin.getUserById(userId);

      if (targetAuthData?.user?.email) {
        // Send email notification (non-blocking)
        try {
          await supabase.functions.invoke("send-subscription-email", {
            body: {
              to: targetAuthData.user.email,
              type: "granted",
              data: {
                tier: tierLabel,
                expiresAt,
                totalPages: totalPagesGranted,
              },
            },
          });
          console.log(`Notification email sent to ${targetAuthData.user.email}`);
        } catch (emailError) {
          console.error("Failed to send notification email:", emailError);
          // Don't fail the whole request if email fails
        }
      }
    } else {
      console.log("Email notification skipped (sendEmail=false)");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully granted ${tierLabel} subscription with ${totalPagesGranted?.toLocaleString() || 'default'} pages` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in grant-subscription:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
