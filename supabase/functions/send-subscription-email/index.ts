import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  type: "granted" | "revoked" | "expiry_warning";
  data: {
    tier?: string;
    expiresAt?: string;
    daysUntilExpiry?: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { to, type, data }: EmailRequest = await req.json();

    let subject = "";
    let html = "";

    switch (type) {
      case "granted":
        subject = "🎉 Your Premium Subscription Has Been Activated!";
        html = `
          <h1>Welcome to ${data.tier?.toUpperCase()} Plan!</h1>
          <p>Great news! Your premium subscription has been activated.</p>
          <p><strong>Plan:</strong> ${data.tier}</p>
          <p><strong>Valid Until:</strong> ${new Date(data.expiresAt!).toLocaleDateString()}</p>
          <p>You can now enjoy all the premium features without limits.</p>
          <p>If you have any questions, feel free to reach out to our support team.</p>
          <p>Best regards,<br>FinNavigator AI Team</p>
        `;
        break;

      case "revoked":
        subject = "Subscription Update - Downgraded to Free Plan";
        html = `
          <h1>Subscription Update</h1>
          <p>Your premium subscription has been revoked and you've been downgraded to the Free plan.</p>
          <p>If you believe this is a mistake or would like to upgrade again, please contact our support team.</p>
          <p>Best regards,<br>FinNavigator AI Team</p>
        `;
        break;

      case "expiry_warning":
        subject = `⚠️ Your Subscription Expires in ${data.daysUntilExpiry} Days`;
        html = `
          <h1>Subscription Expiring Soon</h1>
          <p>Your ${data.tier?.toUpperCase()} subscription will expire in <strong>${data.daysUntilExpiry} days</strong>.</p>
          <p><strong>Expiry Date:</strong> ${new Date(data.expiresAt!).toLocaleDateString()}</p>
          <p>To continue enjoying premium features, please contact an administrator to renew your subscription before it expires.</p>
          <p>Best regards,<br>FinNavigator AI Team</p>
        `;
        break;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FinNavigator AI <help@finnavigatorai.com>",
        to: [to],
        subject,
        html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", result);
      throw new Error(result.message || "Failed to send email");
    }

    console.log(`Email sent successfully to ${to} (${type})`);

    return new Response(JSON.stringify({ success: true, emailId: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-subscription-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
