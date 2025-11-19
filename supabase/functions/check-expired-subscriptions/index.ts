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

    console.log("=== Check Expired Subscriptions Job Started ===");

    // 1. Find users with expired subscriptions (non-free tiers)
    const { data: expiredUsers, error: fetchError } = await supabase
      .from("profiles")
      .select("user_id, full_name, subscription_tier, subscription_expires_at")
      .neq("subscription_tier", "free")
      .not("subscription_expires_at", "is", null)
      .lt("subscription_expires_at", new Date().toISOString());

    if (fetchError) {
      console.error("Error fetching expired users:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredUsers?.length || 0} expired subscriptions`);

    let downgraded = 0;
    let failed = 0;

    for (const user of expiredUsers || []) {
      try {
        console.log(`Downgrading user ${user.user_id} (${user.full_name}) from ${user.subscription_tier} to free`);

        // Downgrade to free tier
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            subscription_tier: "free",
            subscription_expires_at: null,
            subscription_granted_at: null,
            subscription_granted_by: null,
          })
          .eq("user_id", user.user_id);

        if (updateError) {
          console.error(`Failed to downgrade user ${user.user_id}:`, updateError);
          failed++;
          continue;
        }

        // Get user email for notification
        const { data: authData } = await supabase.auth.admin.getUserById(user.user_id);

        if (authData?.user?.email) {
          // Send notification email (non-blocking)
          try {
            await supabase.functions.invoke("send-subscription-email", {
              body: {
                to: authData.user.email,
                type: "revoked",
                data: {},
              },
            });
          } catch (emailError) {
            console.error(`Failed to send email to ${authData.user.email}:`, emailError);
          }
        }

        downgraded++;
      } catch (error) {
        console.error(`Error processing user ${user.user_id}:`, error);
        failed++;
      }
    }

    // 2. Find users with subscriptions expiring in 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { data: expiringUsers, error: expiringError } = await supabase
      .from("profiles")
      .select("user_id, full_name, subscription_tier, subscription_expires_at")
      .neq("subscription_tier", "free")
      .not("subscription_expires_at", "is", null)
      .gte("subscription_expires_at", new Date().toISOString())
      .lte("subscription_expires_at", sevenDaysFromNow.toISOString());

    if (expiringError) {
      console.error("Error fetching expiring users:", expiringError);
    } else {
      console.log(`Found ${expiringUsers?.length || 0} subscriptions expiring soon`);

      for (const user of expiringUsers || []) {
        try {
          const { data: authData } = await supabase.auth.admin.getUserById(user.user_id);

          if (authData?.user?.email) {
            const daysUntilExpiry = Math.ceil(
              (new Date(user.subscription_expires_at!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );

            await supabase.functions.invoke("send-subscription-email", {
              body: {
                to: authData.user.email,
                type: "expiry_warning",
                data: {
                  tier: user.subscription_tier,
                  expiresAt: user.subscription_expires_at,
                  daysUntilExpiry,
                },
              },
            });

            console.log(`Sent expiry warning to ${authData.user.email} (${daysUntilExpiry} days)`);
          }
        } catch (error) {
          console.error(`Error sending expiry warning to user ${user.user_id}:`, error);
        }
      }
    }

    console.log("=== Job Complete ===");
    console.log(`Downgraded: ${downgraded}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({
        success: true,
        downgraded,
        failed,
        warnings_sent: expiringUsers?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in check-expired-subscriptions:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
