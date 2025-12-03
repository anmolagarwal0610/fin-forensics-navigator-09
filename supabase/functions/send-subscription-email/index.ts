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
  };
  return names[tier] || tier;
};

const getTierPageLimit = (tier: string) => {
  const limits: Record<string, string> = {
    starter: "500",
    professional: "2,000",
    enterprise: "10,000",
    free: "50",
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

  const baseStyles = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    </style>
  `;

  const header = `
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f1f33 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
      <img src="https://app.finnavigatorai.com/email-logo.png" alt="FinNavigator AI" style="height: 50px; margin-bottom: 16px;" />
    </div>
  `;

  const footer = `
    <div style="background: #f8fafc; padding: 32px 40px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0 0 12px 0; color: #64748b; font-size: 14px;">
        Need help? Contact us at <a href="mailto:hello@finnavigatorai.com" style="color: #1e3a5f; text-decoration: none;">hello@finnavigatorai.com</a>
      </p>
      <p style="margin: 0; color: #94a3b8; font-size: 12px;">
        © ${new Date().getFullYear()} FinNavigator AI. All rights reserved.
      </p>
    </div>
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
            ${baseStyles}
          </head>
          <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden;">
                ${header}
                
                <div style="padding: 40px;">
                  <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 32px;">✓</span>
                    </div>
                    <h1 style="margin: 0 0 8px 0; color: #0f172a; font-size: 24px; font-weight: 700;">
                      Welcome to ${tierName}!
                    </h1>
                    <p style="margin: 0; color: #64748b; font-size: 16px;">
                      Your premium subscription has been activated
                    </p>
                  </div>

                  <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
                    <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 16px; font-weight: 600;">
                      Subscription Details
                    </h3>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Plan</td>
                        <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">
                          <span style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                            ${tierName}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0;">Monthly Pages</td>
                        <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right; border-top: 1px solid #e2e8f0;">${pageLimit} pages</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0;">Valid Until</td>
                        <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right; border-top: 1px solid #e2e8f0;">${expiryDate}</td>
                      </tr>
                    </table>
                  </div>

                  <div style="text-align: center; margin-bottom: 24px;">
                    <a href="https://app.finnavigatorai.com/app/dashboard" 
                       style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 14px 0 rgba(30, 58, 95, 0.39);">
                      Go to Dashboard →
                    </a>
                  </div>

                  <p style="margin: 0; color: #64748b; font-size: 14px; text-align: center; line-height: 1.6;">
                    You now have access to all premium features. Start analyzing your financial documents with enhanced capabilities!
                  </p>
                </div>

                ${footer}
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
            ${baseStyles}
          </head>
          <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden;">
                ${header}
                
                <div style="padding: 40px;">
                  <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 32px;">⚠</span>
                    </div>
                    <h1 style="margin: 0 0 8px 0; color: #0f172a; font-size: 24px; font-weight: 700;">
                      Subscription Update
                    </h1>
                    <p style="margin: 0; color: #64748b; font-size: 16px;">
                      Your account has been downgraded to the Free plan
                    </p>
                  </div>

                  <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                    <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                      Your premium subscription has been revoked. You now have access to the Free tier with 50 pages per month.
                    </p>
                  </div>

                  <p style="margin: 0 0 24px 0; color: #64748b; font-size: 14px; text-align: center; line-height: 1.6;">
                    If you believe this is a mistake or would like to upgrade again, please contact our support team.
                  </p>

                  <div style="text-align: center;">
                    <a href="mailto:hello@finnavigatorai.com" 
                       style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                      Contact Support
                    </a>
                  </div>
                </div>

                ${footer}
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
            ${baseStyles}
          </head>
          <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden;">
                ${header}
                
                <div style="padding: 40px;">
                  <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 32px;">⏰</span>
                    </div>
                    <h1 style="margin: 0 0 8px 0; color: #0f172a; font-size: 24px; font-weight: 700;">
                      Subscription Expiring Soon
                    </h1>
                    <p style="margin: 0; color: #64748b; font-size: 16px;">
                      Your ${tierName} plan expires in <strong style="color: #ef4444;">${data.daysUntilExpiry} days</strong>
                    </p>
                  </div>

                  <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
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
                    <a href="mailto:hello@finnavigatorai.com?subject=Subscription%20Renewal%20Request" 
                       style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 14px 0 rgba(30, 58, 95, 0.39);">
                      Renew Subscription
                    </a>
                  </div>
                </div>

                ${footer}
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
  } catch (error: any) {
    console.error("Error in send-subscription-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
