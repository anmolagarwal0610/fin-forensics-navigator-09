import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

const getTierDisplayName = (tier: string) => {
  const names: Record<string, string> = {
    starter: "Starter",
    professional: "Professional",
    enterprise: "Enterprise",
    free: "Free",
    monthly: "Monthly",
    yearly_tier: "Yearly Tier",
    yearly_plan: "Yearly Plan",
  };
  return names[tier] || tier;
};

const getTierPageLimit = (tier: string) => {
  const limits: Record<string, string> = {
    starter: "500",
    professional: "2,000",
    enterprise: "10,000",
    free: "50",
    monthly: "22,500",
    yearly_tier: "200,000",
    yearly_plan: "250,000",
  };
  return limits[tier] || "50";
};

const getEmailTemplate = (type: string, data: EmailRequest["data"]) => {
  const tierName = getTierDisplayName(data.tier || "");
  const pageLimit = getTierPageLimit(data.tier || "");
  const expiryDate = data.expiresAt ? new Date(data.expiresAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }) : "";
  const currentYear = new Date().getFullYear();

  const baseStyles = `
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
    .details-box { background: #f9fafb; padding: 20px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #667eea; }
    .warning-box { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .danger-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; }
    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
  `;

  switch (type) {
    case "granted":
      return {
        subject: `Welcome to ${tierName} - Your Premium Access is Now Active`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>${baseStyles}</style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <img src="https://finnavigatorai.com/logo.png" alt="FinNavigator Logo" style="width: 162px; height: 71px; margin-bottom: 15px;" />
                <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px;">✓</span>
                </div>
                <h1 style="margin: 0 0 8px 0; font-size: 24px;">Welcome to ${tierName}!</h1>
                <p style="margin: 0; opacity: 0.9; font-size: 14px;">Your premium subscription has been activated</p>
              </div>
              
              <div class="content">
                <div class="details-box">
                  <h3 style="margin: 0 0 16px 0; color: #374151; font-size: 16px; font-weight: 600;">Subscription Details</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Plan</td>
                      <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">
                        <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">${tierName}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-top: 1px solid #e5e7eb;">Monthly Pages</td>
                      <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right; border-top: 1px solid #e5e7eb;">${pageLimit} pages</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-top: 1px solid #e5e7eb;">Valid Until</td>
                      <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right; border-top: 1px solid #e5e7eb;">${expiryDate}</td>
                    </tr>
                  </table>
                </div>

                <div style="text-align: center; margin-bottom: 24px;">
                  <a href="https://app.finnavigatorai.com/app/dashboard" class="button">Go to Dashboard →</a>
                </div>

                <p style="margin: 0; color: #64748b; font-size: 14px; text-align: center; line-height: 1.6;">
                  You now have access to all premium features. Start analyzing your financial documents with enhanced capabilities!
                </p>
              </div>

              <div class="footer">
                <p style="margin: 0 0 12px 0;">Need help? Contact us at <a href="mailto:hello@finnavigatorai.com" style="color: #667eea; text-decoration: none;">hello@finnavigatorai.com</a></p>
                <p style="margin: 0; color: #94a3b8; font-size: 12px;">© ${currentYear} FinNavigator AI. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    case "revoked":
      return {
        subject: "Subscription Update - Your Account Has Been Downgraded",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>${baseStyles}</style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <img src="https://finnavigatorai.com/logo.png" alt="FinNavigator Logo" style="width: 162px; height: 71px; margin-bottom: 15px;" />
                <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px;">⚠</span>
                </div>
                <h1 style="margin: 0 0 8px 0; font-size: 24px;">Subscription Update</h1>
                <p style="margin: 0; opacity: 0.9; font-size: 14px;">Your account has been downgraded to the Free plan</p>
              </div>
              
              <div class="content">
                <div class="warning-box">
                  <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                    Your premium subscription has been revoked. You now have access to the Free tier with 50 pages per month.
                  </p>
                </div>

                <p style="margin: 0 0 24px 0; color: #64748b; font-size: 14px; text-align: center; line-height: 1.6;">
                  If you believe this is a mistake or would like to upgrade again, please contact our support team.
                </p>

                <div style="text-align: center;">
                  <a href="mailto:hello@finnavigatorai.com" class="button">Contact Support</a>
                </div>
              </div>

              <div class="footer">
                <p style="margin: 0 0 12px 0;">Need help? Contact us at <a href="mailto:hello@finnavigatorai.com" style="color: #667eea; text-decoration: none;">hello@finnavigatorai.com</a></p>
                <p style="margin: 0; color: #94a3b8; font-size: 12px;">© ${currentYear} FinNavigator AI. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    case "expiry_warning":
      return {
        subject: `Action Required: Your ${tierName} Subscription Expires in ${data.daysUntilExpiry} Days`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>${baseStyles}</style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <img src="https://finnavigatorai.com/logo.png" alt="FinNavigator Logo" style="width: 162px; height: 71px; margin-bottom: 15px;" />
                <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px;">⏰</span>
                </div>
                <h1 style="margin: 0 0 8px 0; font-size: 24px;">Subscription Expiring Soon</h1>
                <p style="margin: 0; opacity: 0.9; font-size: 14px;">Your ${tierName} plan expires in <strong>${data.daysUntilExpiry} days</strong></p>
              </div>
              
              <div class="content">
                <div class="danger-box">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #991b1b; font-size: 14px;">Current Plan</td>
                      <td style="padding: 8px 0; color: #991b1b; font-size: 14px; font-weight: 600; text-align: right;">${tierName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #991b1b; font-size: 14px; border-top: 1px solid #fecaca;">Expiry Date</td>
                      <td style="padding: 8px 0; color: #991b1b; font-size: 14px; font-weight: 600; text-align: right;">${expiryDate}</td>
                    </tr>
                  </table>
                </div>

                <p style="margin: 0 0 24px 0; color: #64748b; font-size: 14px; text-align: center; line-height: 1.6;">
                  To continue enjoying premium features without interruption, please contact our team to renew your subscription.
                </p>

                <div style="text-align: center;">
                  <a href="mailto:hello@finnavigatorai.com?subject=Subscription%20Renewal%20Request" class="button">Renew Subscription</a>
                </div>
              </div>

              <div class="footer">
                <p style="margin: 0 0 12px 0;">Need help? Contact us at <a href="mailto:hello@finnavigatorai.com" style="color: #667eea; text-decoration: none;">hello@finnavigatorai.com</a></p>
                <p style="margin: 0; color: #94a3b8; font-size: 12px;">© ${currentYear} FinNavigator AI. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    default:
      return { subject: "", html: "" };
  }
};

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

    console.log(`Sending ${type} email to ${to}`);

    const { subject, html } = getEmailTemplate(type, data);

    if (!subject || !html) {
      throw new Error(`Invalid email type: ${type}`);
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FinNavigator AI <hello@finnavigatorai.com>",
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-subscription-email:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
